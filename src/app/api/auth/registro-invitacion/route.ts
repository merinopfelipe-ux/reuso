import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { createHash } from 'crypto'
import { rateLimit } from '@/lib/rate-limit'

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const formData = new FormData()
  const secret = process.env.TURNSTILE_SECRET_KEY || ''
  formData.append('secret', secret)
  formData.append('response', token)
  if (ip && ip !== 'unknown') {
    formData.append('remoteip', ip)
  }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

const bodySchema = z
  .object({
    token: z.string().min(1),
    nombre: z.string().min(2).max(100),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula.')
      .regex(/[0-9]/, 'Debe contener al menos un número.'),
    password_confirm: z.string(),
    acepta_terminos: z.literal(true),
    turnstile_token: z.string().optional(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Las contraseñas no coinciden.',
    path: ['password_confirm'],
  })

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const allowed = await rateLimit(`registro_invitacion:${ip}`, 3, 60_000)
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
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }

  const { token, nombre, password, turnstile_token } = parsed.data

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

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const adminClient = await createAdminClient()

  const { data: invitacion, error: invError } = await adminClient
    .from('invitaciones')
    .select('id, email, empresa_id, rol_asignado, estado, expires_at')
    .eq('token_hash', tokenHash)
    .single()

  if (invError || !invitacion) {
    return NextResponse.json({ error: 'Invitación inválida o no encontrada.' }, { status: 404 })
  }

  if (invitacion.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Esta invitación ya fue utilizada.' }, { status: 409 })
  }

  if (new Date(invitacion.expires_at) < new Date()) {
    // Marcar explícitamente como expirada para mantener el estado limpio en BD
    await adminClient.from('invitaciones').update({ estado: 'expirada' }).eq('id', invitacion.id)
    return NextResponse.json({ error: 'Esta invitación ha expirado.' }, { status: 410 })
  }

  // Crear usuario - email_confirm: true porque el admin ya verificó el email al invitarlo
  const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
    email: invitacion.email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  })

  if (createError || !authData.user) {
    if (createError?.message?.includes('already registered')) {
      return NextResponse.json(
        { error: 'Este email ya tiene una cuenta registrada.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Error al crear la cuenta. Intenta de nuevo.' }, { status: 500 })
  }

  // El trigger handle_new_user crea el profile con usuario_libre - actualizamos rol y empresa
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      rol: invitacion.rol_asignado,
      empresa_id: invitacion.empresa_id,
    })
    .eq('user_id', authData.user.id)

  if (profileError) {
    // Rollback: Eliminar usuario de Supabase Auth para permitir reintentos
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Error al asignar el perfil. Contacta soporte.' }, { status: 500 })
  }

  await adminClient
    .from('invitaciones')
    .update({ estado: 'aceptada' })
    .eq('id', invitacion.id)

  await logAuditoria(adminClient, {
    user_id: authData.user.id,
    accion: 'invitacion_aceptada',
    detalle: {
      invitacion_id: invitacion.id,
      empresa_id: invitacion.empresa_id,
      rol_asignado: invitacion.rol_asignado,
    },
    ip,
  })

  return NextResponse.json({ ok: true })
}
