import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSecret } from '@/lib/infisical.server'
import type { Rol } from '@/types'

// Rate limiting en memoria: IP → { count, resetAt }
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false

  entry.count++
  return true
}

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstile_token: z.string().min(1),
})

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const formData = new FormData()
  const secret = await getSecret('TURNSTILE_SECRET_KEY')
  formData.append('secret', secret)
  formData.append('response', token)
  formData.append('remoteip', ip)

  const res = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body: formData }
  )
  const data = await res.json()
  return data.success === true
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Rate limit: 5/min por IP
  if (!checkRateLimit(ip, 5, 60_000)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo en un momento.' },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos. Verifica el formulario.' },
      { status: 400 }
    )
  }

  const { email, password, turnstile_token } = parsed.data

  // Verificar Turnstile
  const skipTurnstile = process.env.SKIP_TURNSTILE === 'true'
  if (!skipTurnstile) {
    const turnstileOk = await verifyTurnstile(turnstile_token, ip)
    if (!turnstileOk) {
      return NextResponse.json(
        { error: 'Verificación de seguridad fallida. Intenta de nuevo.' },
        { status: 400 }
      )
    }
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: 'Credenciales incorrectas. Verifica tu email y contraseña.' },
      { status: 401 }
    )
  }

  // Obtener rol del perfil
  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', data.user.id)
    .single()

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol
  return NextResponse.json({ rol })
}
