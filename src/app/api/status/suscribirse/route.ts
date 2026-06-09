import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { getIp } from '@/lib/admin-guard'

const bodySchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`status_sub_${getIp(request)}`, 3, 60_000)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dirección de correo inválida' }, { status: 400 })
    }

    const { email } = parsed.data
    const adminClient = await createAdminClient()

    // Registrar al suscriptor en la tabla de leads con interés específico
    const { error } = await adminClient
      .from('leads')
      .insert({
        nombre: 'Suscriptor Estatus',
        email: email,
        empresa: 'Visitante Externo',
        interes: 'Suscripción Estatus',
        mensaje: 'Suscrito desde la página pública de estado para recibir alertas y reportes de operatividad.',
        estado: 'nuevo'
      })

    if (error) {
      console.error('Error al registrar suscriptor en leads:', error)
      return NextResponse.json({ error: 'Error al procesar la suscripción' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error en ruta de suscripción:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
