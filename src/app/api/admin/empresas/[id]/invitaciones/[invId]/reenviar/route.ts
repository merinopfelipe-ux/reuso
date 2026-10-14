import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { enviarInvitacion } from '@/lib/email'

// Reenvía una invitación pendiente: genera un enlace nuevo (el anterior deja de
// servir), extiende la vigencia 7 días y manda el correo otra vez. Si el correo
// no sale, no cambia nada, así la invitación anterior sigue siendo válida.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string; invId: string }> }) {
  const { id, invId } = await props.params
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data: inv } = await guard.adminClient
    .from('invitaciones')
    .select('id, email, estado, empresa_id')
    .eq('id', invId)
    .eq('empresa_id', id)
    .maybeSingle()
  if (!inv) return NextResponse.json({ error: 'Invitación no encontrada.' }, { status: 404 })
  if (inv.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Solo se reenvían invitaciones pendientes.' }, { status: 400 })
  }

  const { data: empresa } = await guard.adminClient
    .from('empresas')
    .select('nombre, codigo_registro')
    .eq('id', id)
    .single()
  if (!empresa?.nombre) return NextResponse.json({ error: 'Empresa no encontrada.' }, { status: 404 })

  const token = randomBytes(32).toString('hex')
  const token_hash = createHash('sha256').update(token).digest('hex')
  const expires_at = new Date(Date.now() + 7 * 86_400_000).toISOString()

  let resendEmailId: string | null = null
  try {
    const r = await enviarInvitacion(inv.email, token, empresa.nombre, empresa.codigo_registro ?? null)
    resendEmailId = r.resendEmailId ?? null
  } catch (err) {
    console.error('[reenviar invitacion]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'No se pudo enviar el correo. Inténtalo otra vez.' }, { status: 502 })
  }
  if (!resendEmailId) {
    return NextResponse.json({ error: 'No se pudo enviar el correo. Inténtalo otra vez.' }, { status: 502 })
  }

  await guard.adminClient
    .from('invitaciones')
    .update({ token_hash, expires_at, resend_email_id: resendEmailId })
    .eq('id', inv.id)

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'reenviar_invitacion',
    detalle: { invitacion_id: inv.id, empresa_id: id, email: inv.email },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true, expires_at })
}
