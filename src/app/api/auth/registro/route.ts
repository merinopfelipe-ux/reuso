import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { encryptSensitive } from '@/lib/encryption.server'
import { createAdminClient } from '@/lib/supabase/admin'

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

const bodySchema = z
  .object({
    nombre: z.string().min(2).max(100),
    apellido: z.string().min(2, 'El apellido es muy corto.').max(100),
    apodo: z.string().max(15).regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ.]*$/).optional(),
    telefono: z.string().min(1, 'El teléfono es requerido.'),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    password_confirm: z.string(),
    turnstile_token: z.string().optional(),
    acepta_terminos: z.literal(true),
    // Campos de perfil (paso 2)
    sector: z.string().max(50).optional(),
    frecuencia_reuso: z.string().max(20).optional(),
    motivacion: z.string().max(80).optional(),
    quiere_asesoria: z.boolean().optional(),
    // Código de empresa (paso 1)
    codigo_empresa: z.string().max(10).regex(/^[A-Z0-9]*$/).optional(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirm'],
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

  // Rate limit: 3/min por IP
  const allowed = process.env.SKIP_RATE_LIMIT === 'true' || await checkRateLimit(ip, 'registro', 3, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 60 segundos antes de intentar de nuevo.' },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Completa todos los campos correctamente para continuar.' },
      { status: 400 }
    )
  }

  const { nombre, apellido, apodo, telefono, email, password, turnstile_token,
          sector, frecuencia_reuso, motivacion, quiere_asesoria, codigo_empresa } = parsed.data

  const skipTurnstile = process.env.SKIP_TURNSTILE === 'true' || !turnstile_token || turnstile_token === 'skip'
  if (!skipTurnstile) {
    const turnstileOk = await verifyTurnstile(turnstile_token ?? '', ip)
    if (!turnstileOk) {
      return NextResponse.json(
        { error: 'Verificación de seguridad fallida. Intenta de nuevo.' },
        { status: 400 }
      )
    }
  }

  const legal_aceptado_en = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
  ).toISOString()

  // Ciframos los datos PII a Nivel de Aplicación antes de que toquen la BD
  const encryptedTelefono = await encryptSensitive(telefono)

  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        apellido: apellido ?? null,
        apodo: apodo ?? null,
        telefono: encryptedTelefono ?? null,
        rol: 'usuario_libre',
        legal_aceptado_en,
        sector: sector ?? null,
        frecuencia_reuso: frecuencia_reuso ?? null,
        motivacion: motivacion ?? null,
        quiere_asesoria: quiere_asesoria ?? false,
        codigo_empresa: codigo_empresa ?? null,
      },
    },
  })

  if (error) {
    console.error('SUPABASE SIGNUP ERROR:', error)
    return NextResponse.json(
      { error: `Error de registro: ${error.message}` },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true })
}
