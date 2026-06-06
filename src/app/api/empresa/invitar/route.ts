import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { randomBytes, createHash } from 'crypto'
import { checkLimiteEmpleados } from '@/lib/plan-limits'
import { enviarInvitacion } from '@/lib/email'
import type { Plan } from '@/types'

const bodySchema = z.object({
  email: z.string().email('Correo electrónico inválido.'),
  rol_asignado: z.enum(['empleado', 'empresa_admin']),
  empresa_id: z.uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'empresa_admin' && perfil?.rol !== 'super_admin') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { email, rol_asignado, empresa_id } = parsed.data

  // empresa_admin solo puede invitar a su propia empresa
  if (perfil.rol === 'empresa_admin' && perfil.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No tienes permiso para esta empresa.' }, { status: 403 })
  }

  const adminClient = await createAdminClient()
  const ip = getIp(request)

  // Verificar límite de empleados por plan
  const { data: empresaData } = await adminClient
    .from('empresas')
    .select('plan')
    .eq('id', empresa_id)
    .single()
  const errorLimite = await checkLimiteEmpleados(empresa_id, (empresaData?.plan ?? 'free') as Plan)
  if (errorLimite) {
    return NextResponse.json({ error: errorLimite }, { status: 403 })
  }

  // Generar token único
  const token = randomBytes(32).toString('hex')
  const token_hash = createHash('sha256').update(token).digest('hex')

  const { data: invitacion, error: insertError } = await adminClient
    .from('invitaciones')
    .insert({
      empresa_id,
      email,
      token_hash,
      rol_asignado,
    })
    .select('id, email, estado, rol_asignado, created_at, expires_at')
    .single()

  if (insertError || !invitacion) {
    return NextResponse.json({ error: 'Error al crear la invitación.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'invitacion_creada',
    detalle: { invitacion_id: invitacion.id, email, rol_asignado, empresa_id },
    ip,
  })

  // Enviar email de invitación (no bloquea si falla)
  try {
    const { data: empresa } = await adminClient
      .from('empresas')
      .select('nombre')
      .eq('id', empresa_id)
      .single()
    if (empresa?.nombre) {
      await enviarInvitacion(email, token, empresa.nombre)
    }
  } catch (emailError) {
    console.error('[invitar] Email no enviado:', emailError)
    // El admin puede copiar el link manualmente desde rawToken
  }

  return NextResponse.json({ invitacion, rawToken: token })
}
