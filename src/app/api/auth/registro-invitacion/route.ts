import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { createHash, randomBytes } from 'crypto'
import { rateLimit } from '@/lib/rate-limit'
import { sincronizarContactoLoops } from '@/lib/loops'
import { generarSlugEmpresa } from '@/lib/generar-slug'
import { sincronizarModulosSegunPlan } from '@/lib/permisos/sync-modulos-plan'

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
    nombre_empresa: z.string().min(2).max(120).optional(),
    nit: z.string().min(1).max(100).optional(),
    telefono: z.string().min(1).max(100).optional(),
    pais: z.string().min(1).max(100).optional(),
    ciudad: z.string().min(1).max(100).optional(),
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
    .select('id, email, empresa_id, rol_asignado, estado, expires_at, plan_invitado')
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

  // Invitación "abierta" (empresa_id nulo, Camino B del onboarding de
  // empresas pagas): la empresa se crea aquí, ANTES del usuario, para nunca
  // dejar un usuario sin empresa si esto falla. Si el usuario falla después,
  // se hace rollback de la empresa recién creada (ver más abajo).
  let empresaIdFinal = invitacion.empresa_id
  let empresaCreadaId: string | null = null

  if (!invitacion.empresa_id) {
    const { nombre_empresa, nit, telefono, pais, ciudad } = parsed.data
    if (!nombre_empresa || !nit || !telefono || !pais || !ciudad) {
      return NextResponse.json(
        { error: 'Faltan datos de la empresa: nombre, NIT, teléfono, país y ciudad son obligatorios.' },
        { status: 400 }
      )
    }

    // plan_invitado siempre viene lleno cuando empresa_id es nulo (invariante
    // aplicado en /api/admin/empresas/invitar al crear la invitación).
    const plan = invitacion.plan_invitado as 'lab' | 'impulso' | 'ilimitado'

    let slug = generarSlugEmpresa(nombre_empresa)
    const { data: existente } = await adminClient.from('empresas').select('id').eq('slug', slug).maybeSingle()
    if (existente) slug = `${slug}-${randomBytes(2).toString('hex')}`

    const { data: empresaNueva, error: empresaError } = await adminClient
      .from('empresas')
      .insert({ nombre: nombre_empresa, slug, plan, activa: true, nit, telefono, pais, ciudad })
      .select('id')
      .single()

    if (empresaError || !empresaNueva) {
      return NextResponse.json({ error: 'Error al crear la empresa. Intenta de nuevo.' }, { status: 500 })
    }

    empresaIdFinal = empresaNueva.id
    empresaCreadaId = empresaNueva.id
    await sincronizarModulosSegunPlan(adminClient, empresaIdFinal as string, plan)
  }

  // Crear usuario - email_confirm: true porque el admin ya verificó el email al invitarlo
  const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
    email: invitacion.email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  })

  if (createError || !authData.user) {
    if (empresaCreadaId) await adminClient.from('empresas').delete().eq('id', empresaCreadaId)
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
      empresa_id: empresaIdFinal,
    })
    .eq('user_id', authData.user.id)

  if (profileError) {
    // Rollback: Eliminar usuario de Supabase Auth para permitir reintentos
    await adminClient.auth.admin.deleteUser(authData.user.id)
    if (empresaCreadaId) await adminClient.from('empresas').delete().eq('id', empresaCreadaId)
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
      empresa_id: empresaIdFinal,
      rol_asignado: invitacion.rol_asignado,
    },
    ip,
  })

  // Alta en Loops del empleado invitado. No-op sin LOOPS_API_KEY.
  await sincronizarContactoLoops({
    email: invitacion.email,
    firstName: nombre,
    source: 'invitacion',
    subscribed: false,
    rol: invitacion.rol_asignado,
  })

  return NextResponse.json({ ok: true })
}
