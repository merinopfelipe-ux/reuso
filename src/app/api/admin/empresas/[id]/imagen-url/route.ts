import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'

// Descarga una imagen de una URL externa pegada por el admin y la re-aloja
// en Storage — nunca se guarda la URL externa tal cual. Dos razones: (1) el
// CSP `img-src` del sitio solo permite imágenes de Supabase, una URL externa
// simplemente no cargaría en la cotización pública; (2) skill
// `seguridad-reuso` → "Subida de archivos de un tercero": todo archivo de un
// tercero se valida y optimiza antes de guardarse, nunca se referencia un
// origen externo directamente.

const schema = z.object({ url: z.string().url() })
const MAX_BYTES = 3 * 1024 * 1024

// SSRF: bloquea localhost/IPs privadas/metadata cloud — quien pega la URL es
// super_admin autenticado, pero igual no debe poder usar el servidor para
// tocar red interna.
function hostBloqueado(hostname: string): boolean {
  return /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[?::1\]?)/i.test(hostname)
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pega una URL válida.' }, { status: 400 })
  }

  let urlDestino: URL
  try {
    urlDestino = new URL(parsed.data.url)
  } catch {
    return NextResponse.json({ error: 'Pega una URL válida.' }, { status: 400 })
  }
  if (urlDestino.protocol !== 'https:') {
    return NextResponse.json({ error: 'La URL debe empezar con https://' }, { status: 400 })
  }
  if (hostBloqueado(urlDestino.hostname)) {
    return NextResponse.json({ error: 'Esa URL no está permitida.' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8_000)
  let res: Response
  try {
    res = await fetch(urlDestino.toString(), { signal: controller.signal })
  } catch {
    clearTimeout(timeoutId)
    return NextResponse.json({ error: 'No se pudo descargar la imagen de esa URL. Revisa que el enlace sea directo a la imagen.' }, { status: 400 })
  }
  clearTimeout(timeoutId)

  if (!res.ok) {
    return NextResponse.json({ error: 'No se pudo descargar la imagen de esa URL.' }, { status: 400 })
  }
  const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim()
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Esa URL no apunta directamente a una imagen.' }, { status: 400 })
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length === 0) {
    return NextResponse.json({ error: 'La imagen descargada está vacía.' }, { status: 400 })
  }
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen supera 3 MB. Usa una más liviana.' }, { status: 400 })
  }

  const ext = contentType.split('/')[1] || 'jpg'
  const nombreArchivo = `por-que-elegirnos/${params.id}/${randomUUID()}.${ext}`
  const { error: uploadError } = await guard.adminClient.storage
    .from('logos')
    .upload(nombreArchivo, buffer, { contentType, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: 'Error al guardar la imagen. Intenta de nuevo.' }, { status: 500 })
  }

  const url = guard.adminClient.storage.from('logos').getPublicUrl(nombreArchivo).data.publicUrl

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'subir_imagen_por_que_elegirnos',
    detalle: { id: params.id, url, fuente_original: urlDestino.hostname },
    ip: getIp(request),
  })

  return NextResponse.json({ url })
}
