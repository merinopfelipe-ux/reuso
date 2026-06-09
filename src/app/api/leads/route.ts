import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const leadSchema = z.object({
  nombre: z.string().min(2, 'El nombre es muy corto.'),
  email: z.string().email('Email inválido.'),
  empresa: z.string().optional(),
  interes: z.string().optional(),
  mensaje: z.string().min(5, 'Por favor escribe un mensaje más detallado.').max(1000),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await rateLimit(`leads:${ip}`, 3, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, { status: 429 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const result = leadSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? 'Datos inválidos.' },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from('leads')
      .insert([result.data])
      .select('id')
      .single()

    if (error) {
      console.error('Error guardando lead:', error)
      return NextResponse.json(
        { error: 'Error al enviar el mensaje. Inténtalo de nuevo.' },
        { status: 500 }
      )
    }

    // Nota: Aquí se podría integrar Resend para enviar notificación al admin
    // pero por ahora lo dejamos solo en BD como "todo lo gratis".

    return NextResponse.json({ ok: true, id: data.id })
  } catch {
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 })
  }
}
