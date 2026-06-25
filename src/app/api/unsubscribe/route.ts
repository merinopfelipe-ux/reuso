// src/app/api/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const Schema = z.object({
  token: z.string().uuid(),
  motivo: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const allowed = await rateLimit(`unsubscribe:${ip}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'Demasiados intentos. Espera un momento.' }, { status: 429 })
  }

  let token: string
  let motivo: string | undefined
  try {
    const body = await request.json()
    const parsed = Schema.parse(body)
    token = parsed.token
    motivo = parsed.motivo
  } catch {
    return NextResponse.json({ ok: false, error: 'Token inválido.' }, { status: 400 })
  }

  try {
    const admin = await createAdminClient()

    // Buscar perfil por token
    const { data: perfil, error: findError } = await admin
      .from('profiles')
      .select('id')
      .eq('unsubscribe_token', token)
      .maybeSingle()

    if (findError || !perfil) {
      // Respuesta genérica para no revelar si el token existe
      return NextResponse.json({ ok: true })
    }

    // Marcar baja y rotar token en una sola operación
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        marketing_opt_out: true,
        unsubscribe_token: crypto.randomUUID(),
        ...(motivo ? { unsubscribe_reason: motivo } : {}),
      })
      .eq('id', perfil.id)

    if (updateError) {
      return NextResponse.json({ ok: false, error: 'Error al procesar la baja.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno.' }, { status: 500 })
  }
}
