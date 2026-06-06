import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { encryptSensitive } from '@/lib/encryption.server'

function maskEmail(e: string) {
  const [local, domain] = e.split('@')
  if (!domain || local.length <= 2) return `${local?.[0] ?? ''}***@${domain ?? ''}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local.slice(-1)}@${domain}`
}

function maskPhone(p: string) {
  if (p.length <= 6) return p
  return p.slice(0, 3) + '*'.repeat(p.length - 7) + p.slice(-4)
}

const schema = z.discriminatedUnion('field', [
  z.object({ field: z.literal('email'),          password: z.string().min(1), newValue: z.string().email('Correo inválido') }),
  z.object({ field: z.literal('phone'),          password: z.string().min(1), newValue: z.string().min(7).max(20) }),
  z.object({ field: z.literal('password_step1'), password: z.string().min(1), newValue: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres') }),
  z.object({ field: z.literal('password_step2'), code: z.string().length(6, 'El código debe tener 6 dígitos'), newValue: z.string().min(8) }),
])

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Datos inválidos.' }, { status: 400 })
  }

  const { field } = parsed.data

  if (field === 'email') {
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email ?? '', password: parsed.data.password })
    if (authError) return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
    const { error } = await supabase.auth.updateUser({ email: parsed.data.newValue })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, masked: maskEmail(parsed.data.newValue) })
  }

  if (field === 'phone') {
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email ?? '', password: parsed.data.password })
    if (authError) return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
    const encrypted = await encryptSensitive(parsed.data.newValue)
    const { error } = await supabase.from('profiles').update({ telefono: encrypted }).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, masked: maskPhone(parsed.data.newValue) })
  }

  if (field === 'password_step1') {
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email ?? '', password: parsed.data.password })
    if (authError) return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
    const { error } = await supabase.auth.signInWithOtp({ email: user.email ?? '', options: { shouldCreateUser: false } })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (field === 'password_step2') {
    const { error: otpError } = await supabase.auth.verifyOtp({ email: user.email ?? '', token: parsed.data.code, type: 'email' })
    if (otpError) return NextResponse.json({ error: 'Código incorrecto o expirado.' }, { status: 401 })
    const { error } = await supabase.auth.updateUser({ password: parsed.data.newValue })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Campo no válido.' }, { status: 400 })
}
