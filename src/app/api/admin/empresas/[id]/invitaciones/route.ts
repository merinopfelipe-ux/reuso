import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes, createHash } from 'crypto'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { checkLimiteEmpleados } from '@/lib/plan-limits'
import { enviarInvitacion } from '@/lib/email'
import type { Plan } from '@/types'

const schema = z.object({ email: z.string().trim().toLowerCase().email() })

// El super admin invita al administrador de una empresa existente.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Escribe un correo válido.' }, { status: 400 })
  const email = parsed.data.email

  const { data: empresa } = await guard.adminClient
    .from('empresas')
    .select('nombre, codigo_registro, plan')
    .eq('id', id)
    .maybeSingle()
  if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada.' }, { status: 404 })

  const { data: miembro } = await guard.adminClient
    .from('profiles')
    .select('id')
    .eq('empresa_id', id)
    .eq('email', email)
    .maybeSingle()
  if (miembro) return NextResponse.json({ error: 'Esa persona ya es parte de la empresa.' }, { status: 409 })

  const { data: pendiente } = await guard.adminClient
    .from('invitaciones')
    .select('id')
    .eq('empresa_id', id)
    .eq('email', email)
    .eq('estado', 'pendiente')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (pendiente) return NextResponse.json({ error: 'Ya hay una invitación pendiente para ese correo.' }, { status: 409 })

  const errorLimite = await checkLimiteEmpleados(id, (empresa.plan ?? 'free') as Plan)
  if (errorLimite) return NextResponse.json({ error: errorLimite }, { status: 429 })

  const token = randomBytes(32).toString('hex')
  const token_hash = createHash('sha256').update(token).digest('hex')
  const expires_at = new Date(Date.now() + 7 * 86_400_000).toISOString()

  const { data: invitacion, error } = await guard.adminClient
    .from('invitaciones')
    .insert({ empresa_id: id, email, token_hash, rol_asignado: 'empresa_admin', expires_at })
    .select('id')
    .single()
  if (error || !invitacion) return NextResponse.json({ error: 'No se pudo crear la invitación.' }, { status: 500 })

  try {
    const { resendEmailId } = await enviarInvitacion(email, token, empresa.nombre, empresa.codigo_registro ?? null)
    if (resendEmailId) {
      await guard.adminClient.from('invitaciones').update({ resend_email_id: resendEmailId }).eq('id', invitacion.id)
    }
  } catch (err) {
    console.error('[admin invitaciones] correo:', err instanceof Error ? err.message : err)
    await guard.adminClient.from('invitaciones').delete().eq('id', invitacion.id)
    return NextResponse.json({ error: 'No se pudo enviar el correo. Inténtalo otra vez.' }, { status: 502 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'invitacion_creada',
    detalle: { invitacion_id: invitacion.id, email, rol_asignado: 'empresa_admin', empresa_id: id },
    ip: getIp(request),
  })
  return NextResponse.json({ ok: true })
}
