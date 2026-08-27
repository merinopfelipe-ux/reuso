import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'

// Imagen de la sección "¿Por qué elegirnos?" de la cotización pública. Ver
// skill `seguridad-reuso` → "Subida de archivos de un tercero": el cliente ya
// la recomprime a WebP en <canvas> antes de mandarla (nunca se sube el
// archivo original), esto solo valida tamaño y la sube a Storage.

const MAX_BYTES = 2 * 1024 * 1024

const schema = z.object({
  imagen_base64: z.string().max(3_000_000),
  mime: z.enum(['image/webp', 'image/png', 'image/jpeg']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const buffer = Buffer.from(parsed.data.imagen_base64, 'base64')
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen no puede superar 2 MB.' }, { status: 400 })
  }

  const empresaId = params.id
  const ext = parsed.data.mime.split('/')[1]
  const carpetaEmpresa = `por-que-elegirnos/${empresaId}`
  const nombreArchivo = `${carpetaEmpresa}/${randomUUID()}.${ext}`

  // Limpieza automática: Eliminar imágenes anteriores de esta empresa para ahorrar espacio en Storage
  try {
    const { data: existentes } = await guard.adminClient.storage
      .from('logos')
      .list(carpetaEmpresa)
    if (existentes && existentes.length > 0) {
      const aEliminar = existentes.map((f) => `${carpetaEmpresa}/${f.name}`)
      await guard.adminClient.storage.from('logos').remove(aEliminar)
    }
  } catch {
    // Si falla la búsqueda previa, continúa con la subida
  }

  const { error: uploadError } = await guard.adminClient.storage
    .from('logos')
    .upload(nombreArchivo, buffer, { contentType: parsed.data.mime, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: 'Error al subir la imagen. Intenta de nuevo.' }, { status: 500 })
  }

  const url = guard.adminClient.storage.from('logos').getPublicUrl(nombreArchivo).data.publicUrl

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'subir_imagen_por_que_elegirnos',
    detalle: { id: empresaId, url },
    ip: getIp(request),
  })

  return NextResponse.json({ url })
}
