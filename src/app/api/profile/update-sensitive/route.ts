import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { encryptSensitive } from '@/lib/encryption.server'
import { createAdminClient } from '@/lib/supabase/admin'

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

async function checkSensitiveRateLimit(userId: string): Promise<boolean> {
  try {
    const adminSupabase = await createAdminClient()
    const cutoff = new Date(Date.now() - 3600000).toISOString() // 1 hora

    // Contar cuántos intentos fallidos hay en la última hora para este usuario
    const { count, error } = await adminSupabase
      .from('rate_limits_sensibles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('exitoso', false)
      .gt('creado_en', cutoff)

    if (error) {
      console.error('Error counting sensitive rate limits:', error)
      return true // Fallback
    }

    if (count !== null && count >= 5) {
      return false
    }

    return true
  } catch (err) {
    console.error('Sensitive rate limit exception:', err)
    return true
  }
}

async function recordSensitiveAttempt(userId: string, ip: string, accion: string, exitoso: boolean) {
  try {
    const adminSupabase = await createAdminClient()
    const { error } = await adminSupabase
      .from('rate_limits_sensibles')
      .insert({ user_id: userId, ip, accion, exitoso })
    if (error) {
      console.error('Error recording sensitive attempt:', error)
    }
  } catch (err) {
    console.error('Sensitive attempt log exception:', err)
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Validar intentos fallidos previos del usuario
  const allowed = process.env.SKIP_RATE_LIMIT === 'true' || await checkSensitiveRateLimit(user.id)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos fallidos. Acciones sensibles bloqueadas por una hora.' },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Datos inválidos.' }, { status: 400 })
  }

  const { field } = parsed.data

  if (field === 'email') {
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email ?? '', password: parsed.data.password })
    if (authError) {
      await recordSensitiveAttempt(user.id, ip, 'email_change', false)
      return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
    }
    const { error } = await supabase.auth.updateUser({ email: parsed.data.newValue })
    if (error) {
      await recordSensitiveAttempt(user.id, ip, 'email_change', false)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await recordSensitiveAttempt(user.id, ip, 'email_change', true)
    return NextResponse.json({ ok: true, masked: maskEmail(parsed.data.newValue) })
  }

  if (field === 'phone') {
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email ?? '', password: parsed.data.password })
    if (authError) {
      await recordSensitiveAttempt(user.id, ip, 'phone_change', false)
      return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
    }
    const encrypted = await encryptSensitive(parsed.data.newValue)
    const { error } = await supabase.from('profiles').update({ telefono: encrypted }).eq('user_id', user.id)
    if (error) {
      await recordSensitiveAttempt(user.id, ip, 'phone_change', false)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await recordSensitiveAttempt(user.id, ip, 'phone_change', true)
    return NextResponse.json({ ok: true, masked: maskPhone(parsed.data.newValue) })
  }

  if (field === 'password_step1') {
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email ?? '', password: parsed.data.password })
    if (authError) {
      await recordSensitiveAttempt(user.id, ip, 'password_change_step1', false)
      return NextResponse.json({ error: 'Contraseña incorrecta.' }, { status: 401 })
    }
    const { error } = await supabase.auth.signInWithOtp({ email: user.email ?? '', options: { shouldCreateUser: false } })
    if (error) {
      await recordSensitiveAttempt(user.id, ip, 'password_change_step1', false)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await recordSensitiveAttempt(user.id, ip, 'password_change_step1', true)
    return NextResponse.json({ ok: true })
  }

  if (field === 'password_step2') {
    const { error: otpError } = await supabase.auth.verifyOtp({ email: user.email ?? '', token: parsed.data.code, type: 'email' })
    if (otpError) {
      await recordSensitiveAttempt(user.id, ip, 'password_change_step2', false)
      return NextResponse.json({ error: 'Código incorrecto o expirado.' }, { status: 401 })
    }
    const { error } = await supabase.auth.updateUser({ password: parsed.data.newValue })
    if (error) {
      await recordSensitiveAttempt(user.id, ip, 'password_change_step2', false)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await recordSensitiveAttempt(user.id, ip, 'password_change_step2', true)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Campo no válido.' }, { status: 400 })
}
