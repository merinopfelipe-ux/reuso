import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const CLAVES_PERMITIDAS = ['terminos', 'privacidad', 'datos', 'cookies', 'reglamento', 'confidencialidad'] as const

async function verificarSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()
  if (profile?.rol !== 'super_admin') return null
  return user
}

export async function GET() {
  const admin = await createAdminClient()
  const { data, error } = await admin.from('contenido_legal').select('*').order('clave')
  if (error) return NextResponse.json({ error: 'Error al cargar el contenido.' }, { status: 500 })
  return NextResponse.json({ data })
}

const patchSchema = z.object({
  clave: z.enum(CLAVES_PERMITIDAS),
  titulo: z.string().min(2).max(200),
  cuerpo_html: z.string().min(10),
})

export async function PATCH(req: NextRequest) {
  const user = await verificarSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Sin autorización.' }, { status: 403 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })

  const { clave, titulo, cuerpo_html } = parsed.data
  const admin = await createAdminClient()

  const { error } = await admin.from('contenido_legal').upsert(
    { clave, titulo, cuerpo_html, updated_by: user.id },
    { onConflict: 'clave' }
  )

  if (error) return NextResponse.json({ error: 'Error al guardar el contenido.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
