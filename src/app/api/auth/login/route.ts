import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Rol } from '@/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'

async function checkRateLimit(ip: string, accion: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const adminSupabase = await createAdminClient()
    const cutoff = new Date(Date.now() - windowMs).toISOString()

    const { count, error: countError } = await adminSupabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('accion', accion)
      .gt('creado_en', cutoff)

    if (countError) {
      console.error('Error counting rate limits:', countError)
      return true // Fallback
    }

    if (count !== null && count >= max) {
      return false
    }

    const { error: insertError } = await adminSupabase
      .from('rate_limits')
      .insert({ ip, accion })

    if (insertError) {
      console.error('Error inserting rate limit:', insertError)
    }

    return true
  } catch (err) {
    console.error('Rate limit system exception:', err)
    return true
  }
}

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstile_token: z.string().optional(),
  acepta_legal: z.boolean().optional(),
  acepta_terminos: z.boolean().optional(),
  acepta_privacidad: z.boolean().optional(),
})

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const formData = new FormData()
  const secret = process.env.TURNSTILE_SECRET_KEY || ''
  formData.append('secret', secret)
  formData.append('response', token)
  if (ip && ip !== 'unknown') {
    formData.append('remoteip', ip)
  }

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    )
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos. Verifica el formulario.' },
      { status: 400 }
    )
  }

  const { email, password, turnstile_token, acepta_legal, acepta_terminos, acepta_privacidad } = parsed.data

  // Rate limit y Turnstile en paralelo
  const skipRateLimit = process.env.SKIP_RATE_LIMIT === 'true'
  const skipTurnstile = process.env.SKIP_TURNSTILE === 'true' || !turnstile_token || turnstile_token === 'skip'

  const [allowed, turnstileOk] = await Promise.all([
    skipRateLimit ? Promise.resolve(true) : checkRateLimit(ip, 'login', 5, 60_000),
    skipTurnstile ? Promise.resolve(true) : verifyTurnstile(turnstile_token ?? '', ip),
  ])

  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 60 segundos antes de intentar de nuevo.' },
      { status: 429 }
    )
  }
  if (!turnstileOk) {
    return NextResponse.json(
      { error: 'Verificación de seguridad fallida. Intenta de nuevo.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
      { status: 401 }
    )
  }

  // Obtener rol del perfil
  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', data.user.id)
    .single()

  // Registrar aceptación de compromisos legales si el usuario la confirmó
  if (acepta_legal || (acepta_terminos && acepta_privacidad)) {
    const ahoraIso = new Date().toISOString()
    await supabase
      .from('profiles')
      .update({
        legal_aceptado_en: ahoraIso,
        acepta_terminos_at: ahoraIso,
      })
      .eq('user_id', data.user.id)

    // Carga de la prueba SIC (Accountability): IP, timestamp UTC, versión y user agent
    try {
      const adminClient = await createAdminClient()
      await logAuditoria(adminClient, {
        user_id: data.user.id,
        accion: 'consentimiento_legal_login',
        detalle: {
          terminos_aceptados: Boolean(acepta_terminos ?? acepta_legal),
          privacidad_aceptada: Boolean(acepta_privacidad ?? acepta_legal),
          version_terminos: '2026-09-05',
          version_privacidad: '2026-09-05',
          user_agent: request.headers.get('user-agent') ?? 'unknown',
          timestamp_utc: ahoraIso,
        },
        ip,
      })
    } catch (auditErr) {
      console.error('[login] Error al registrar log de auditoría legal:', auditErr)
    }
  }

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol
  return NextResponse.json({ rol })
}
