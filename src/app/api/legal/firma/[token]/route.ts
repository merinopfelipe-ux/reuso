import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash, randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { documentoFirmable } from '@/lib/firmas/documentos'
import { enviarConfirmacionFirma } from '@/lib/email'

const schema = z.object({
  indicativo: z.string().regex(/^\+\d{1,4}$/),
  telefono: z.string().min(5).max(20),
  firma: z.string().startsWith('data:image/'),
  nombre: z.string().optional(),
  apellido: z.string().optional(),
  tipoDocumento: z.string().optional(),
  numeroIdentidad: z.string().optional(),
  // QA pub-16: el firmante puede representar a una empresa (razón social +
  // NIT), además de sus propios datos — persona natural no envía esto.
  esEmpresa: z.boolean().optional(),
  razonSocial: z.string().trim().min(1).max(200).optional(),
  nit: z.string().trim().min(1).max(30).optional(),
}).refine(
  d => !d.esEmpresa || (d.razonSocial && d.nit),
  { message: 'Si firmas a nombre de una empresa, indica su razón social y NIT.' }
)

// Firma efectiva de la solicitud: valida el token server-side (nunca desde
// el navegador con anon key, siempre con service role), genera el PDF,
// invalida el token de un solo uso (pendiente -> firmado) y envía la copia.
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await rateLimit(`firma_token:${ip}`, 5, 5 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Espera un momento.' }, { status: 429 })
  }

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const tokenHash = createHash('sha256').update(params.token).digest('hex')

  const { data: solicitud, error: fetchError } = await adminClient
    .from('firmas_solicitudes')
    .select('id, tipo_documento, nombre, numero_identidad, email, estado, expira_at')
    .eq('token_hash', tokenHash)
    .single()

  if (fetchError || !solicitud) {
    return NextResponse.json({ error: 'Enlace inválido.' }, { status: 404 })
  }
  if (solicitud.estado === 'firmado') {
    return NextResponse.json({ error: 'Este documento ya fue firmado.' }, { status: 409 })
  }
  if (new Date(solicitud.expira_at) < new Date()) {
    return NextResponse.json({ error: 'Este enlace expiró. Pide que te envíen uno nuevo.' }, { status: 410 })
  }

  const documento = documentoFirmable(solicitud.tipo_documento)
  if (!documento) {
    return NextResponse.json({ error: 'Tipo de documento no soportado.' }, { status: 400 })
  }

  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'medium' })
  const verificationCode = randomUUID().toUpperCase()

  const nombreCompleto = [parsed.data.nombre, parsed.data.apellido].filter(Boolean).join(' ').trim() || solicitud.nombre
  const docIdCompleto = parsed.data.numeroIdentidad
    ? `${parsed.data.tipoDocumento ? parsed.data.tipoDocumento + ' ' : ''}${parsed.data.numeroIdentidad}`.trim()
    : solicitud.numero_identidad

  let pdfBuffer: Buffer
  try {
    pdfBuffer = documento.generarPDF(
      {
        nombre: nombreCompleto,
        numeroIdentidad: docIdCompleto,
        email: solicitud.email,
        indicativo: parsed.data.indicativo,
        telefono: parsed.data.telefono,
        firma: parsed.data.firma,
        ...(parsed.data.esEmpresa ? { razonSocial: parsed.data.razonSocial, nit: parsed.data.nit } : {}),
      },
      fecha, ip, userAgent, verificationCode
    )
  } catch (err) {
    console.error('[POST /api/legal/firma/[token]] generar PDF', err)
    return NextResponse.json({ error: 'No se pudo generar el PDF.' }, { status: 500 })
  }

  const pdfPath = `${solicitud.tipo_documento}/${solicitud.id}.pdf`
  const { error: uploadError } = await adminClient.storage
    .from('firmas')
    .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    console.error('[POST /api/legal/firma/[token]] subir PDF', uploadError)
    return NextResponse.json({ error: 'No se pudo guardar el documento firmado.' }, { status: 500 })
  }

  // Invalida el token para siempre (un solo uso): solo transiciona pendiente -> firmado.
  const { error: updateError } = await adminClient
    .from('firmas_solicitudes')
    .update({
      estado: 'firmado',
      firmado_at: new Date().toISOString(),
      nombre: nombreCompleto,
      numero_identidad: docIdCompleto,
      indicativo: parsed.data.indicativo,
      telefono: parsed.data.telefono,
      ip_address: ip,
      user_agent: userAgent,
      pdf_path: pdfPath,
      es_empresa: !!parsed.data.esEmpresa,
      razon_social: parsed.data.esEmpresa ? parsed.data.razonSocial : null,
      nit: parsed.data.esEmpresa ? parsed.data.nit : null,
    })
    .eq('id', solicitud.id)
    .eq('estado', 'pendiente') // defensa extra contra doble envío concurrente

  if (updateError) {
    console.error('[POST /api/legal/firma/[token]] actualizar solicitud', updateError)
    return NextResponse.json({ error: 'No se pudo registrar la firma.' }, { status: 500 })
  }

  try {
    await enviarConfirmacionFirma(solicitud.email, solicitud.nombre, documento.label, fecha, pdfBuffer)
  } catch (err) {
    console.error('[POST /api/legal/firma/[token]] envío de confirmación', err)
    // La firma ya quedó registrada — el correo es no crítico, no se revierte nada.
  }

  return NextResponse.json({ ok: true })
}
