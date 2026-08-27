import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import DOMPurify from 'isomorphic-dompurify'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'

// Logo vectorial de una empresa (día/noche, header de la cotización pública)
// + su derivado raster para el PDF (jsPDF no soporta SVG). Ver skill
// `seguridad-reuso` → "Subida de archivos de un tercero": el SVG se sanitiza
// con DOMPurify antes de subirse (nunca se guarda el archivo tal cual llegó),
// y el PNG ya llega recomprimido desde el cliente (rasterizado en <canvas>).

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB, mismo límite que el logo de empresa_admin

const schema = z.object({
  svg_base64: z.string().max(3_000_000),
  png_base64: z.string().max(3_000_000),
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

  const svgBuffer = Buffer.from(parsed.data.svg_base64, 'base64')
  const pngBuffer = Buffer.from(parsed.data.png_base64, 'base64')

  if (svgBuffer.length > MAX_BYTES || pngBuffer.length > MAX_BYTES) {
    return NextResponse.json({ error: 'El logo no puede superar 2 MB.' }, { status: 400 })
  }

  // Validar contenido real (no confiar en que el cliente mandó lo que dice) y
  // sanitizar el SVG — puede llevar <script>/on*= embebidos.
  const svgTexto = svgBuffer.toString('utf-8')
  if (!svgTexto.trim().startsWith('<') || !svgTexto.includes('<svg')) {
    return NextResponse.json({ error: 'El archivo no es un SVG válido.' }, { status: 400 })
  }
  const svgLimpio = DOMPurify.sanitize(svgTexto, { USE_PROFILES: { svg: true, svgFilters: false } })

  const empresaId = params.id
  const carpeta = `logos-admin/${empresaId}/${randomUUID()}`

  const [subidaSvg, subidaPng] = await Promise.all([
    guard.adminClient.storage.from('logos').upload(`${carpeta}.svg`, svgLimpio, { contentType: 'image/svg+xml', upsert: false }),
    guard.adminClient.storage.from('logos').upload(`${carpeta}.png`, pngBuffer, { contentType: 'image/png', upsert: false }),
  ])

  if (subidaSvg.error || subidaPng.error) {
    return NextResponse.json({ error: 'Error al subir el logo. Intenta de nuevo.' }, { status: 500 })
  }

  const logo_svg_url = guard.adminClient.storage.from('logos').getPublicUrl(`${carpeta}.svg`).data.publicUrl
  const logo_propuesta_url = guard.adminClient.storage.from('logos').getPublicUrl(`${carpeta}.png`).data.publicUrl

  const { data, error } = await guard.supabase
    .from('empresas')
    .update({ logo_svg_url, logo_propuesta_url })
    .eq('id', empresaId)
    .select('logo_svg_url, logo_propuesta_url')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Error al guardar el logo.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'actualizar_logo_empresa',
    detalle: { id: empresaId, logo_svg_url, logo_propuesta_url },
    ip: getIp(request),
  })

  return NextResponse.json(data)
}
