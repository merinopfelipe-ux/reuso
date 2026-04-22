import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  nombre: z.string().min(2).max(100),
  email: z.string().email(),
  tipo: z.string().min(2).max(100),
  mensaje: z.string().min(10).max(2000),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`dudas:${ip}`, 3, 60_000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const { nombre, email, tipo, mensaje } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase.from('leads').insert({
    nombre,
    email,
    tipo: 'consulta_legal',
    mensaje: `[${tipo}] ${mensaje}`,
    plan: null,
  })

  if (error) {
    return NextResponse.json({ error: 'No pudimos guardar tu consulta. Inténtalo de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
