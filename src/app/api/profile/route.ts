import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellido, apodo, email, rol, avatar_color, avatar_text, notificaciones_json')
    .eq('user_id', user.id)
    .single()

  if (perfil) return NextResponse.json(perfil)

  // Fallback inteligente: tratar de inferir nombre/apellido de metadata de Supabase
  const meta = user.user_metadata || {}
  const fullName = meta.full_name || meta.name || ''
  const parts = fullName.split(' ')
  
  const fallback = {
    email: user.email ?? '',
    nombre: meta.first_name || parts[0] || '',
    apellido: meta.last_name || parts.slice(1).join(' ') || '',
    rol: 'usuario_libre',
    avatar_color: '#D6F391',
    avatar_text: '',
    notificaciones_json: null
  }
  
  return NextResponse.json(fallback)
}


const patchSchema = z.object({
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  apodo: z.string().max(200).optional().nullable(),
  avatar_color: z.string().optional().nullable(),
  avatar_text: z.string().max(2).optional().nullable(),
  notificaciones_json: z.record(z.string(), z.unknown()).optional().nullable(),
})

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      email: user.email ?? '',
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido ?? '',
      apodo: parsed.data.apodo ?? null,
      avatar_color: parsed.data.avatar_color ?? null,
      avatar_text: parsed.data.avatar_text ?? null,
      notificaciones_json: parsed.data.notificaciones_json ?? undefined,
    }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: 'No se pudieron guardar los cambios.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
