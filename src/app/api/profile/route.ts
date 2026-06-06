import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { decryptSensitive } from '@/lib/encryption.server'

function maskEmail(e: string) {
  const [local, domain] = e.split('@')
  if (!domain || local.length <= 2) return `${local?.[0] ?? ''}***@${domain ?? ''}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local.slice(-1)}@${domain}`
}

function maskPhone(p: string) {
  if (p.length <= 6) return p
  return p.slice(0, 3) + '*'.repeat(p.length - 7) + p.slice(-4)
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellido, apodo, email, rol, tema_preferido, telefono')
    .eq('user_id', user.id)
    .single()

  const meta = user.user_metadata || {}
  const fullName = meta.full_name || meta.name || ''
  const parts = fullName.trim().split(' ')
  const fallbackNombre = meta.nombre || meta.first_name || parts[0] || user.email?.split('@')[0] || ''
  const fallbackApellido = meta.apellido || meta.last_name || parts.slice(1).join(' ') || ''

  const emailFinal = perfil?.email || user.email || ''
  const telefonoDecrypted = await decryptSensitive(perfil?.telefono ?? null)

  if (perfil) {
    const nombreFinal = perfil.nombre?.trim() || fallbackNombre
    const apodoFinal = perfil.apodo?.trim() || nombreFinal.split(' ')[0]
    return NextResponse.json({
      nombre: nombreFinal,
      apellido: perfil.apellido?.trim() || fallbackApellido,
      apodo: apodoFinal,
      rol: perfil.rol,
      tema_preferido: perfil.tema_preferido,
      email: emailFinal,
      emailMasked: maskEmail(emailFinal),
      telefonoMasked: telefonoDecrypted ? maskPhone(telefonoDecrypted) : null,
    })
  }

  return NextResponse.json({
    nombre: fallbackNombre,
    apellido: fallbackApellido,
    apodo: fallbackNombre.split(' ')[0] || null,
    rol: 'usuario_libre',
    tema_preferido: 'light',
    email: user.email ?? '',
    emailMasked: maskEmail(user.email ?? ''),
    telefonoMasked: null,
  })
}


const patchSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(100),
  apellido: z.string().max(100).optional().default(''),
  apodo: z.string().max(200).optional().nullable(),
  tema_preferido: z.enum(['light', 'dark', 'system']).optional().default('light'),
  avatar_color: z.string().max(20).optional().nullable(),
  avatar_text: z.string().max(2).optional().nullable(),
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
    const msg = parsed.error.issues[0]?.message || 'Datos inválidos.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      email: user.email ?? '',
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido ?? '',
      apodo: parsed.data.apodo ?? null,
      tema_preferido: parsed.data.tema_preferido ?? 'light',
      avatar_color: parsed.data.avatar_color ?? null,
      avatar_text: parsed.data.avatar_text ?? null,
    }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
