import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { rutaEmpresa } from '@/lib/storage/empresa-rutas'

// Foto de un activo DPP: se sube por el servidor, a la carpeta de la empresa.
// El activo solo acepta rutas con este formato (ver activos/crear).

const MAX_BYTES = 5 * 1024 * 1024
const TIPOS: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }

export async function POST(request: NextRequest) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) return NextResponse.json({ error: 'No autorizado.' }, { status: auth.status })
  if (!auth.empresa_id) return NextResponse.json({ error: 'Tu cuenta no tiene empresa asociada.' }, { status: 400 })

  const form = await request.formData().catch(() => null)
  const archivo = form?.get('archivo')
  if (!(archivo instanceof File)) return NextResponse.json({ error: 'Sube una imagen.' }, { status: 400 })
  const ext = TIPOS[archivo.type]
  if (!ext) return NextResponse.json({ error: 'Formato no permitido.' }, { status: 400 })
  if (archivo.size > MAX_BYTES) return NextResponse.json({ error: 'La imagen no puede superar 5 MB.' }, { status: 400 })

  const ruta = rutaEmpresa(auth.empresa_id, 'dppImagenes', `${randomUUID()}.${ext}`)
  const buffer = Buffer.from(await archivo.arrayBuffer())
  const { error } = await auth.adminClient.storage
    .from('dpp')
    .upload(ruta, buffer, { contentType: archivo.type, upsert: false })
  if (error) return NextResponse.json({ error: 'Error al subir la imagen. Intenta de nuevo.' }, { status: 500 })

  return NextResponse.json({ path: ruta })
}
