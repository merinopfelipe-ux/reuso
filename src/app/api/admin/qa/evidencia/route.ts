import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'

const BUCKET = 'qa-evidencias'
const URL_TTL = 60 * 60 * 24 * 7 // 7 días

const EXT_POR_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

const subirSchema = z.object({
  taskId: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/i),
  dataUrl: z.string().startsWith('data:image/'),
})

// POST — sube una captura. Body: { taskId, dataUrl }. Devuelve { path, url }.
export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = subirSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const m = parsed.data.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/)
  if (!m) {
    return NextResponse.json({ error: 'Formato de imagen no admitido (usa PNG, JPG o WebP).' }, { status: 400 })
  }
  const mime = m[1]
  const buffer = Buffer.from(m[2], 'base64')
  if (buffer.byteLength > 5_242_880) {
    return NextResponse.json({ error: 'La imagen supera los 5 MB.' }, { status: 400 })
  }

  const path = `${parsed.data.taskId}/${Date.now()}.${EXT_POR_MIME[mime]}`
  const { error } = await guard.adminClient.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: false })

  if (error) {
    return NextResponse.json({ error: 'No se pudo guardar la captura.' }, { status: 500 })
  }

  const { data: firma } = await guard.adminClient.storage.from(BUCKET).createSignedUrl(path, URL_TTL)
  return NextResponse.json({ path, url: firma?.signedUrl ?? null })
}

// GET ?path=... — devuelve una URL firmada fresca para ver la miniatura.
export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const path = request.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Falta path.' }, { status: 400 })

  const { data, error } = await guard.adminClient.storage.from(BUCKET).createSignedUrl(path, URL_TTL)
  if (error || !data) return NextResponse.json({ error: 'No encontrada.' }, { status: 404 })
  return NextResponse.json({ url: data.signedUrl })
}

// DELETE — body: { path } borra una, { all: true } borra todas las del QA.
export async function DELETE(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)

  if (body?.all === true) {
    const store = guard.adminClient.storage.from(BUCKET)
    const { data: carpetas } = await store.list('', { limit: 1000 })
    const rutas: string[] = []
    for (const c of carpetas ?? []) {
      if (c.id) { rutas.push(c.name); continue } // archivo suelto en la raíz
      const { data: archivos } = await store.list(c.name, { limit: 1000 })
      for (const a of archivos ?? []) rutas.push(`${c.name}/${a.name}`)
    }
    if (rutas.length > 0) await store.remove(rutas)
    return NextResponse.json({ ok: true, borradas: rutas.length })
  }

  const path = typeof body?.path === 'string' ? body.path : null
  if (!path) return NextResponse.json({ error: 'Falta path.' }, { status: 400 })

  const { error } = await guard.adminClient.storage.from(BUCKET).remove([path])
  if (error) return NextResponse.json({ error: 'No se pudo borrar.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
