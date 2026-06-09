import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { pdfATexto } from '@/lib/pdf-to-txt'

const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'] as const
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const TIPOS_DOCUMENTO = ['factura_compra', 'recibo_energia', 'certificado_origen', 'foto_objeto', 'otro'] as const

const metaSchema = z.object({
  activo_id: z.uuid('El ID del activo es inválido.'),
  tipo: z.enum(TIPOS_DOCUMENTO, { error: 'Selecciona un tipo de documento válido.' }),
})

export async function POST(request: NextRequest) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso para subir documentos.' },
      { status: auth.status }
    )
  }
  const { rol, empresa_id, adminClient } = auth
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'El archivo no se pudo procesar. Intenta de nuevo.' }, { status: 400 })
  }

  const archivo = form.get('archivo') as File | null
  const activo_id_raw = form.get('activo_id')
  const tipo_raw = form.get('tipo')

  if (!archivo) return NextResponse.json({ error: 'Adjunta un archivo para continuar.' }, { status: 400 })
  if (archivo.size > MAX_BYTES) return NextResponse.json({ error: 'El archivo supera el límite de 10 MB.' }, { status: 400 })
  if (!TIPOS_PERMITIDOS.includes(archivo.type as typeof TIPOS_PERMITIDOS[number])) {
    return NextResponse.json({ error: 'Solo se aceptan archivos PDF, JPG o PNG.' }, { status: 400 })
  }

  const metaParsed = metaSchema.safeParse({ activo_id: activo_id_raw, tipo: tipo_raw })
  if (!metaParsed.success) {
    return NextResponse.json(
      { error: metaParsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }
  const { activo_id, tipo } = metaParsed.data

  // Verificar que el activo existe (y pertenece a la empresa si no es super_admin)
  let queryActivo = adminClient
    .from('dpp_activos')
    .select('id, empresa_id')
    .eq('id', activo_id)

  if (rol !== 'super_admin') {
    queryActivo = queryActivo.eq('empresa_id', empresa_id)
  }

  const { data: activo } = await queryActivo.single()

  if (!activo) {
    return NextResponse.json(
      { error: rol === 'super_admin' ? 'No encontramos este activo.' : 'No encontramos este activo en tu empresa.' },
      { status: 404 }
    )
  }

  const nombreSanitizado = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)
  const baseTimestamp = Date.now()

  const buffer = Buffer.from(await archivo.arrayBuffer())

  // Si es PDF → convertir a TXT estructurado para ahorrar tokens de IA
  let storedBuffer: Buffer = buffer
  let storedContentType: string = archivo.type
  let storedNombreSanitizado = nombreSanitizado
  let displayNombre = archivo.name.slice(0, 255)

  if (archivo.type === 'application/pdf') {
    try {
      const txtContent = await pdfATexto(buffer, archivo.name)
      storedBuffer = Buffer.from(txtContent, 'utf-8')
      storedContentType = 'text/plain'
      storedNombreSanitizado = nombreSanitizado.replace(/\.pdf$/i, '') + '.txt'
      displayNombre = archivo.name.replace(/\.pdf$/i, '') + '.txt'
    } catch (convErr) {
      console.error('[dpp/ingesta/subir] Conversión PDF→TXT fallida, guardando PDF original:', convErr)
      // fallback: guardar PDF original para no perder el documento
    }
  }

  const storagePath = `dpp/ingestas/${activo.empresa_id}/${activo_id}/${baseTimestamp}_${storedNombreSanitizado}`

  const { error: uploadError } = await adminClient.storage
    .from('dpp')
    .upload(storagePath, storedBuffer, { contentType: storedContentType, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: 'Error al subir el archivo. Intenta de nuevo.' }, { status: 500 })
  }

  const { data: doc, error: insertError } = await adminClient
    .from('dpp_documentos_ingesta')
    .insert({
      activo_id,
      empresa_id: activo.empresa_id,
      tipo,
      archivo_url: storagePath,
      nombre_archivo: displayNombre,
      estado_ocr: 'pendiente',
    })
    .select('id, tipo, nombre_archivo, estado_ocr, created_at')
    .single()

  if (insertError || !doc) {
    // Rollback storage
    await adminClient.storage.from('dpp').remove([storagePath])
    return NextResponse.json({ error: 'Error al registrar el documento. Intenta de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ data: doc }, { status: 201 })
}
