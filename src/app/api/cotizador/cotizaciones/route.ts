import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

export async function GET(request: NextRequest) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth
  const { searchParams } = new URL(request.url)
  const estado = searchParams.get('estado')
  const q = searchParams.get('q')

  let query = adminClient
    .from('crm_cotizaciones')
    .select(`
      id, codigo_cotizacion, estado, total, subtotal,
      co2_evitado_total_kg, created_at, updated_at,
      fecha_enviada, fecha_apertura_cliente, veces_abierta,
      enlace_publico_token,
      crm_clientes ( nombre, telefono ),
      profiles ( nombre )
    `)
    .eq('empresa_id', empresa_id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Error al cargar cotizaciones.' }, { status: 500 })

  let cotizaciones = data ?? []

  // Filtro de texto local (supabase ilike en columnas relacionadas es complejo)
  if (q) {
    const lq = q.toLowerCase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cotizaciones = cotizaciones.filter((c: any) => {
      const cliente = Array.isArray(c.crm_clientes) ? c.crm_clientes[0] : c.crm_clientes
      return (
        (c.codigo_cotizacion as string).toLowerCase().includes(lq) ||
        ((cliente?.nombre as string) ?? '').toLowerCase().includes(lq)
      )
    })
  }

  return NextResponse.json({ cotizaciones })
}

const schema = z.object({
  cliente_id: z.uuid('ID de cliente inválido.').optional(),
})

function generarCodigoCot(empresaId: string): string {
  const año = new Date().getFullYear()
  const prefijo = empresaId.replace(/-/g, '').slice(0, 4).toUpperCase()
  const sufijo = randomBytes(3).toString('hex').toUpperCase()
  return `COT-${año}-${prefijo}-${sufijo}`
}

export async function POST(request: NextRequest) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso para crear cotizaciones.' },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, adminClient } = auth
  const ip = getIp(request)

  const raw = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }

  // Generar código único COT-YYYY-XXXX-XXXXXX (máx 3 intentos)
  let codigo_cotizacion = ''
  for (let i = 0; i < 3; i++) {
    const candidato = generarCodigoCot(empresa_id)
    const { data: existente } = await adminClient
      .from('crm_cotizaciones')
      .select('id')
      .eq('codigo_cotizacion', candidato)
      .single()
    if (!existente) { codigo_cotizacion = candidato; break }
  }
  if (!codigo_cotizacion) {
    return NextResponse.json({ error: 'Error al generar el código. Intenta de nuevo.' }, { status: 500 })
  }

  const { data: cotizacion, error } = await adminClient
    .from('crm_cotizaciones')
    .insert({
      empresa_id,
      asesor_id: user_id,
      codigo_cotizacion,
      estado: 'por_cotizar',
      cliente_id: parsed.data.cliente_id ?? null,
    })
    .select('id, codigo_cotizacion, estado, created_at')
    .single()

  if (error || !cotizacion) {
    return NextResponse.json({ error: 'Error al crear la cotización. Intenta de nuevo.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'cotizacion_creada',
    detalle: { cotizacion_id: cotizacion.id, codigo: codigo_cotizacion },
    ip,
  })

  return NextResponse.json(cotizacion, { status: 201 })
}
