import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-guard'
import DOMPurify from 'isomorphic-dompurify'

const MIME_PERMITIDOS = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_BYTES = 2 * 1024 * 1024 // 2MB

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo requerido.' }, { status: 400 })
  }

  // Validar tipo MIME real (desde el servidor, no el cliente)
  if (!MIME_PERMITIDOS.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipo de archivo no permitido. Sube una imagen PNG, JPG o SVG.' },
      { status: 400 }
    )
  }

  // Validar tamaño
  const buffer = await file.arrayBuffer()
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: 'La imagen supera el tamaño máximo de 2 MB.' },
      { status: 400 }
    )
  }

  const bytes = new Uint8Array(buffer)
  let fileIsValid = false
  let uploadData: ArrayBuffer | Uint8Array = buffer

  if (file.type === 'image/png') {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      fileIsValid = true
    }
  } else if (file.type === 'image/jpeg') {
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      fileIsValid = true
    }
  } else if (file.type === 'image/svg+xml') {
    const text = new TextDecoder('utf-8').decode(bytes)
    if (text.toLowerCase().includes('<svg')) {
      fileIsValid = true
      // DOMPurify elimina scripts, eventos inline y javascript: — más robusto que regex
      const sanitized = DOMPurify.sanitize(text, { USE_PROFILES: { svg: true, svgFilters: true } })
      uploadData = new TextEncoder().encode(sanitized)
    }
  }

  if (!fileIsValid) {
    return NextResponse.json(
      { error: 'Firma digital del archivo inválida o tipo no coincidente.' },
      { status: 400 }
    )
  }

  const ext = file.type === 'image/svg+xml' ? 'svg' : file.type === 'image/png' ? 'png' : 'jpg'
  const fileName = `firma-${Date.now()}.${ext}`

  const { data, error } = await guard.adminClient.storage
    .from('firmas')
    .upload(fileName, uploadData, { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ error: 'No se pudo subir la imagen.' }, { status: 500 })
  }

  const { data: urlData, error: urlError } = await guard.adminClient.storage
    .from('firmas')
    .createSignedUrl(data.path, 3600)

  if (urlError || !urlData) {
    return NextResponse.json({ error: 'No se pudo generar el enlace de la imagen.' }, { status: 500 })
  }

  return NextResponse.json({ url: urlData.signedUrl })
}
