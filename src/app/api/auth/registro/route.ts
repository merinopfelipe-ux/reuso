import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { encryptSensitive } from '@/lib/encryption.server'

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

const bodySchema = z
  .object({
    nombre: z.string().min(2).max(100),
    apellido: z.string().max(100).optional(),
    apodo: z.string().max(15).regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ.]*$/).optional(),
    telefono: z.string().optional(),
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    password_confirm: z.string(),
    turnstile_token: z.string().optional(),
    acepta_terminos: z.literal(true),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirm'],
  })

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const formData = new FormData()
  const secret = process.env.TURNSTILE_SECRET_KEY || ''
  formData.append('secret', secret)
  formData.append('response', token)
  if (ip && ip !== 'unknown') {
    formData.append('remoteip', ip)
  }

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    )
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Rate limit: 3/min por IP
  if (!checkRateLimit(ip, 3, 60_000)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo en un momento.' },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Completa todos los campos correctamente para continuar.' },
      { status: 400 }
    )
  }

  const { nombre, apellido, apodo, telefono, email, password, turnstile_token } = parsed.data

  const skipTurnstile = process.env.SKIP_TURNSTILE === 'true'
  if (!skipTurnstile) {
    const turnstileOk = await verifyTurnstile(turnstile_token ?? '', ip)
    if (!turnstileOk) {
      return NextResponse.json(
        { error: 'Verificación de seguridad fallida. Intenta de nuevo.' },
        { status: 400 }
      )
    }
  }

  const acepta_terminos_at = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
  ).toISOString()

  // Ciframos los datos PII a Nivel de Aplicación antes de que toquen la BD
  const encryptedTelefono = await encryptSensitive(telefono)

  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, apellido: apellido ?? null, apodo: apodo ?? null, telefono: encryptedTelefono ?? null, rol: 'usuario_libre', acepta_terminos_at },
    },
  })

  if (error) {
    return NextResponse.json(
      { error: 'Ingresa un email válido para continuar.' },
      { status: 400 }
    )
  }



  return NextResponse.json({ ok: true })
}
