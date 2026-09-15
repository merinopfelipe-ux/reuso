import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash, randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { documentoFirmable } from '@/lib/firmas/documentos'
import { enviarConfirmacionFirma } from '@/lib/email'

const schema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido.').optional(),
  indicativo: z.string().regex(/^\+\d{1,4}$/),
  telefono: z.string().min(5).max(20),
  firma: z.string().startsWith('data:image/'),
  nombre: z.string().trim().min(1).max(120),
  apellido: z.string().trim().min(1).max(120),
  tipoDocumento: z.enum(['CC', 'CE', 'NIT', 'Pasaporte']),
  numeroIdentidad: z.string().trim().min(1).max(30),
  // El representante de empresa se identifica tanto a título personal como
  // por su cargo. Nada se toma de la invitación: el firmante lo diligencia.
  esEmpresa: z.boolean(),
  razonSocial: z.string().trim().min(1).max(200).optional(),
  nit: z.string().trim().min(1).max(30).optional(),
  cargo: z.string().trim().max(120).optional(),
}).refine(
  d => !d.esEmpresa || (d.razonSocial && d.nit && d.cargo),
  { message: 'Si firmas a nombre de una empresa, indica su razón social, NIT y cargo.' }
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
  const isDemo = params.token.includes('demo') || params.token === '[token]'
  const tokenHash = createHash('sha256').update(params.token).digest('hex')

  let solicitud: {
    id: string
    tipo_documento: string
    nombre?: string | null
    numero_identidad?: string | null
    email?: string | null
    estado: string
    expira_at: string
  } | null = null

  const { data: dbSolicitud } = await adminClient
    .from('firmas_solicitudes')
    .select('id, tipo_documento, nombre, numero_identidad, email, estado, expira_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (dbSolicitud) {
    solicitud = dbSolicitud
  } else if (isDemo) {
    solicitud = {
      id: 'demo-solicitud-001',
      tipo_documento: 'confidencialidad',
      nombre: `${parsed.data.nombre} ${parsed.data.apellido}`.trim(),
      numero_identidad: `${parsed.data.tipoDocumento} ${parsed.data.numeroIdentidad}`,
      email: parsed.data.email ?? null,
      estado: 'pendiente',
      expira_at: new Date(Date.now() + 86400000 * 365).toISOString(),
    }
  }

  if (!solicitud) {
    return NextResponse.json({ error: 'Enlace inválido.' }, { status: 404 })
  }
  if (solicitud.estado === 'firmado') {
    return NextResponse.json({ error: 'Este documento ya fue firmado.' }, { status: 409 })
  }
  if (new Date(solicitud.expira_at) < new Date()) {
    return NextResponse.json({ error: 'Este enlace expiró. Pide que te envíen uno nuevo.' }, { status: 410 })
  }

  const emailDestino = parsed.data.email?.trim() || solicitud.email
  if (!emailDestino) {
    return NextResponse.json({ error: 'Debes ingresar un correo electrónico para recibir tu copia.' }, { status: 400 })
  }

  const documento = documentoFirmable(solicitud.tipo_documento)
  if (!documento) {
    return NextResponse.json({ error: 'Tipo de documento no soportado.' }, { status: 400 })
  }

  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'medium' })
  const verificationCode = randomUUID().toUpperCase()

  const nombreCompleto = `${parsed.data.nombre} ${parsed.data.apellido}`.trim()
  const docIdCompleto = `${parsed.data.tipoDocumento} ${parsed.data.numeroIdentidad}`

  let pdfBuffer: Buffer
  try {
    pdfBuffer = documento.generarPDF(
      {
        nombre: nombreCompleto,
        tipoIdentidad: parsed.data.tipoDocumento,
        numeroIdentidad: parsed.data.numeroIdentidad,
        email: emailDestino,
        indicativo: parsed.data.indicativo,
        telefono: parsed.data.telefono,
        firma: parsed.data.firma,
        ...(parsed.data.esEmpresa
          ? { razonSocial: parsed.data.razonSocial, nit: parsed.data.nit, cargoRepresentante: parsed.data.cargo }
          : {}),
      },
      fecha, ip, userAgent, verificationCode
    )
  } catch (err) {
    console.error('[POST /api/legal/firma/[token]] generar PDF', err)
    return NextResponse.json({ error: 'No se pudo generar el PDF.' }, { status: 500 })
  }

  if (!isDemo) {
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
        email: emailDestino,
        indicativo: parsed.data.indicativo,
        telefono: parsed.data.telefono,
        ip_address: ip,
        user_agent: userAgent,
        pdf_path: pdfPath,
        es_empresa: !!parsed.data.esEmpresa,
        razon_social: parsed.data.esEmpresa ? parsed.data.razonSocial : null,
        nit: parsed.data.esEmpresa ? parsed.data.nit : null,
        cargo_representante: parsed.data.esEmpresa ? parsed.data.cargo : null,
      })
      .eq('id', solicitud.id)
      .eq('estado', 'pendiente') // defensa extra contra doble envío concurrente

    if (updateError) {
      console.error('[POST /api/legal/firma/[token]] actualizar solicitud', updateError)
      return NextResponse.json({ error: 'No se pudo registrar la firma.' }, { status: 500 })
    }
  }

  try {
    await enviarConfirmacionFirma(emailDestino, nombreCompleto, documento.label, fecha, pdfBuffer)
  } catch (err) {
    console.error('[POST /api/legal/firma/[token]] envío de confirmación', err)
    // La firma ya quedó registrada — el correo es no crítico, no se revierte nada.
  }

  return NextResponse.json({ ok: true })
}
