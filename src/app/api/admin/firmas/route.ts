import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes, createHash } from 'crypto'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { enviarInvitacionFirma } from '@/lib/email'
import { documentoFirmable } from '@/lib/firmas/documentos'

const DIAS_EXPIRACION = 7

// Panel /admin/firmas: historial de solicitudes de firma enviadas.
export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data, error } = await guard.supabase
    .from('firmas_solicitudes')
    .select('id, tipo_documento, nombre, numero_identidad, email, estado, expira_at, firmado_at, pdf_path, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    console.error('[GET /api/admin/firmas]', error)
    return NextResponse.json({ error: 'Error al cargar las solicitudes.' }, { status: 500 })
  }

  return NextResponse.json({ solicitudes: data ?? [] })
}

const schema = z.object({
  tipo_documento: z.string().min(1),
  nombre: z.string().min(2, 'El nombre es obligatorio.').max(200),
  numero_identidad: z.string().min(3, 'El número de documento es obligatorio.').max(50),
  email: z.string().email('Correo inválido.'),
})

// Genera la invitación cerrada, de un solo uso: crea el token, lo guarda
// hasheado (nunca en texto plano) y envía el correo con el enlace real.
export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const documento = documentoFirmable(parsed.data.tipo_documento)
  if (!documento) {
    return NextResponse.json({ error: 'Tipo de documento no soportado.' }, { status: 400 })
  }

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')
  const expiraAt = new Date(Date.now() + DIAS_EXPIRACION * 24 * 60 * 60 * 1000).toISOString()

  const { data: solicitud, error } = await guard.adminClient
    .from('firmas_solicitudes')
    .insert({
      tipo_documento: documento.tipo,
      nombre: parsed.data.nombre,
      numero_identidad: parsed.data.numero_identidad,
      email: parsed.data.email,
      token_hash: tokenHash,
      expira_at: expiraAt,
      enviado_por: guard.user.id,
    })
    .select('id, tipo_documento, nombre, numero_identidad, email, estado, expira_at, created_at')
    .single()

  if (error || !solicitud) {
    console.error('[POST /api/admin/firmas]', error)
    return NextResponse.json({ error: 'Error al crear la solicitud.' }, { status: 500 })
  }

  try {
    await enviarInvitacionFirma(parsed.data.email, rawToken, parsed.data.nombre, documento.label)
  } catch (err) {
    console.error('[POST /api/admin/firmas] envío de correo', err)
    return NextResponse.json({ solicitud, warning: 'La solicitud se creó pero no se pudo enviar el correo.' }, { status: 201 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'firma_solicitud_creada',
    detalle: { solicitud_id: solicitud.id, tipo_documento: documento.tipo, email: parsed.data.email },
    ip: getIp(request),
  })

  return NextResponse.json({ solicitud }, { status: 201 })
}
