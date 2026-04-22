import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-guard'

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

  const ext = file.type === 'image/svg+xml' ? 'svg' : file.type === 'image/png' ? 'png' : 'jpg'
  const fileName = `firma-${Date.now()}.${ext}`

  const { data, error } = await guard.adminClient.storage
    .from('firmas')
    .upload(fileName, buffer, { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ error: 'No se pudo subir la imagen.' }, { status: 500 })
  }

  const { data: { publicUrl } } = guard.adminClient.storage
    .from('firmas')
    .getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl })
}
