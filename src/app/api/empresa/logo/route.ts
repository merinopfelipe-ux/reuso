import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rutaEmpresa } from '@/lib/storage/empresa-rutas'

// Logo de la empresa: se sube por el servidor, a su carpeta. Así la URL que
// guarda la empresa siempre apunta a un archivo suyo, y borrarla la borra entera.

const MAX_BYTES = 2 * 1024 * 1024
const TIPOS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const adminClient = await createAdminClient()
  const { data: perfil } = await adminClient
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()
  if (!perfil?.rol || !perfil.empresa_id) {
    return NextResponse.json({ error: 'No tienes empresa asociada.' }, { status: 400 })
  }

  const form = await request.formData().catch(() => null)
  const archivo = form?.get('archivo')
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: 'Sube un archivo de imagen.' }, { status: 400 })
  }
  const ext = TIPOS[archivo.type]
  if (!ext) return NextResponse.json({ error: 'Formato no permitido. Usa PNG, JPG, WebP o SVG.' }, { status: 400 })
  if (archivo.size > MAX_BYTES) return NextResponse.json({ error: 'El logo no puede superar 2 MB.' }, { status: 400 })

  const ruta = rutaEmpresa(perfil.empresa_id, 'logoEmpresa', `${randomUUID()}.${ext}`)
  const buffer = Buffer.from(await archivo.arrayBuffer())
  const { error } = await adminClient.storage
    .from('logos')
    .upload(ruta, buffer, { contentType: archivo.type, upsert: false })
  if (error) return NextResponse.json({ error: 'Error al subir el logo. Intenta de nuevo.' }, { status: 500 })

  const { data } = adminClient.storage.from('logos').getPublicUrl(ruta)
  return NextResponse.json({ url: data.publicUrl })
}
