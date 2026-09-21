import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { validarTelefono } from '@/lib/telefono'
import { waLink } from '@/lib/constants/contacto'
import { getEventoActual } from '@/lib/eventos'
import { enviarSeguimientoEvento, enviarAvisoLeadEvento } from '@/lib/email'

// Captura de leads en eventos: nombre y apellido, empresa, y basta el celular
// O el correo. Página pública sin sesión (mismo patrón que /api/leads).
const schema = z.object({
  nombre: z.string().trim().min(3, 'Escribe tu nombre y apellido.').max(100)
    .refine(v => v.split(/\s+/).filter(p => p.length >= 2).length >= 2, 'Escribe tu nombre y apellido.'),
  empresa: z.string().trim().min(2, 'Escribe el nombre de tu empresa.').max(100),
  email: z.string().trim().max(150).optional(),
  indicativo: z.string().trim().max(6).optional(),
  telefono: z.string().trim().max(20).optional(),
  sitio_web: z.string().optional(), // señuelo anti bots
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  // En un evento muchas personas comparten wifi (misma IP), por eso el tope es alto.
  if (!(await rateLimit(`eventos_lead:${ip}`, 60, 5 * 60_000))) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, { status: 429 })
  }

  try {
    const parsed = schema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
    }
    const { nombre, empresa, sitio_web } = parsed.data
    if (sitio_web) return NextResponse.json({ ok: true }) // bot: éxito falso, no se guarda nada

    const email = parsed.data.email || ''
    const digitos = (parsed.data.telefono ?? '').replace(/\D/g, '')
    const indicativo = parsed.data.indicativo || '+57'
    if (!email && !digitos) {
      return NextResponse.json({ error: 'Escribe tu celular o tu correo.' }, { status: 400 })
    }
    if (email && !z.string().email().safeParse(email).success) {
      return NextResponse.json({ error: 'Escribe un correo válido.' }, { status: 400 })
    }
    if (digitos) {
      const errTel = validarTelefono(digitos, indicativo)
      if (errTel) return NextResponse.json({ error: errTel }, { status: 400 })
    }
    const celular = digitos ? `${indicativo} ${digitos}` : ''

    const admin = await createAdminClient()
    const evento = await getEventoActual(admin)

    // Un solo correo de seguimiento por dirección cada 24 horas: evita que el
    // formulario sirva para llenar de mensajes el correo de otra persona.
    let yaContactado = false
    if (email) {
      const desde = new Date(Date.now() - 24 * 3600_000).toISOString()
      const { count } = await admin.from('leads').select('id', { count: 'exact', head: true })
        .ilike('email', email.replace(/[\\%_]/g, '\\$&')).eq('interes', 'Eventos').gte('created_at', desde)
      yaContactado = (count ?? 0) > 0
    }

    const { error } = await admin.from('leads').insert([{
      nombre, empresa, email: email || null, telefono: celular || null,
      interes: 'Eventos', evento_nombre: evento?.nombre ?? null,
      mensaje: evento ? `Evento: ${evento.nombre}` : 'Evento sin nombre programado',
    }])
    if (error) {
      console.error('Error guardando lead de evento:', error)
      return NextResponse.json({ error: 'No pudimos guardar tus datos. Intenta de nuevo.' }, { status: 500 })
    }

    // Correo inmediato a la persona (si dejó correo) y aviso al equipo con un
    // botón de WhatsApp (no hay API de WhatsApp). Un fallo de correo no rompe el envío.
    const whatsappUrl = digitos
      ? waLink(`Hola ${nombre.split(/\s+/)[0]}, nos conocemos${evento ? ` en ${evento.nombre}` : ' en el evento'} y quedamos en contacto. Te escribimos de la Calculadora de Reúso.`, `${indicativo.replace(/\D/g, '')}${digitos}`)
      : ''
    await Promise.allSettled([
      email && !yaContactado ? enviarSeguimientoEvento(email, { nombre, empresa, evento: evento?.nombre }) : Promise.resolve(),
      enviarAvisoLeadEvento({ nombre, empresa, email, celular, whatsappUrl, evento: evento?.nombre }),
    ])

    return NextResponse.json({ ok: true, correoEnviado: !!email && !yaContactado })
  } catch {
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 })
  }
}
