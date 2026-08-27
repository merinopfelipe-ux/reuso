import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { enviarInvitacionFirma } from '@/lib/email'
import { documentoFirmable } from '@/lib/firmas/documentos'

const DIAS_EXPIRACION = 7

// Reenvía el correo de invitación. Genera un token nuevo (invalida el
// anterior, incluso si no había expirado) y reinicia la ventana de 7 días —
// así "reenviar" también sirve para revivir una solicitud ya expirada.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data: solicitud, error: fetchError } = await guard.adminClient
    .from('firmas_solicitudes')
    .select('id, tipo_documento, nombre, email, estado')
    .eq('id', params.id)
    .single()

  if (fetchError || !solicitud) {
    return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 })
  }
  if (solicitud.estado === 'firmado') {
    return NextResponse.json({ error: 'Este documento ya fue firmado.' }, { status: 409 })
  }

  const documento = documentoFirmable(solicitud.tipo_documento)
  if (!documento) {
    return NextResponse.json({ error: 'Tipo de documento no soportado.' }, { status: 400 })
  }

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const expiraAt = new Date(Date.now() + DIAS_EXPIRACION * 24 * 60 * 60 * 1000).toISOString()

  const { data: actualizada, error } = await guard.adminClient
    .from('firmas_solicitudes')
    .update({ token_hash: tokenHash, expira_at: expiraAt })
    .eq('id', params.id)
    .select('id, tipo_documento, nombre, numero_identidad, email, estado, expira_at, created_at')
    .single()

  if (error || !actualizada) {
    console.error('[POST /api/admin/firmas/[id]/reenviar]', error)
    return NextResponse.json({ error: 'Error al reenviar la solicitud.' }, { status: 500 })
  }

  try {
    await enviarInvitacionFirma(solicitud.email, rawToken, solicitud.nombre, documento.label)
  } catch (err) {
    console.error('[POST /api/admin/firmas/[id]/reenviar] envío de correo', err)
    return NextResponse.json({ solicitud: actualizada, warning: 'Se generó el nuevo enlace pero no se pudo enviar el correo.' })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'firma_solicitud_reenviada',
    detalle: { solicitud_id: params.id },
    ip: getIp(request),
  })

  return NextResponse.json({ solicitud: actualizada })
}
