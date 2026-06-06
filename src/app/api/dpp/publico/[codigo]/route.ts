import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getIp } from '@/lib/admin-guard'

const rateLimitStore = new Map<string, { count: number; reset: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)
  if (!entry || now > entry.reset) {
    rateLimitStore.set(ip, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

export async function GET(
  request: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const ip = getIp(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Demasiadas consultas. Intenta de nuevo en un momento.' }, { status: 429 })
  }

  const adminClient = await createAdminClient()
  const { codigo } = params

  const { data: activo } = await adminClient
    .from('dpp_activos')
    .select('id, codigo_dpp, nombre, descripcion, estado, n_ciclos, peso_total_kg, composicion_json, hash_integridad, created_at, empresa_id')
    .eq('codigo_dpp', codigo)
    .single()

  if (!activo) {
    return NextResponse.json(
      { error: 'No encontramos este pasaporte. Verifica el código e intenta de nuevo.' },
      { status: 404 }
    )
  }

  const [ciclosRes, empresaRes] = await Promise.all([
    adminClient
      .from('dpp_ciclos')
      .select('numero_ciclo, fecha_inicio, fecha_fin, operacion_realizada, co2_evitado_kg')
      .eq('activo_id', activo.id)
      .order('numero_ciclo'),
    adminClient
      .from('empresas')
      .select('nombre')
      .eq('id', activo.empresa_id)
      .single(),
  ])

  // Registrar visita (se awaita para asegurar ejecución en entornos serverless)
  await adminClient.from('dpp_verificaciones').insert({
    activo_id: activo.id,
    codigo_dpp: activo.codigo_dpp,
    ip_address: ip,
    user_agent: request.headers.get('user-agent') ?? null,
    pais: null,
  })

  const composicion = Array.isArray(activo.composicion_json)
    ? (activo.composicion_json as { material: string; peso_kg: number; origen_fuente?: string; nivel_confianza?: string }[])
        .map(({ material, peso_kg, origen_fuente, nivel_confianza }) => ({ material, peso_kg, origen_fuente, nivel_confianza }))
    : []

  const co2_evitado_total_kg = (ciclosRes.data ?? []).reduce(
    (sum, c) => sum + (c.co2_evitado_kg ?? 0), 0
  )

  return NextResponse.json({
    data: {
      codigo_dpp: activo.codigo_dpp,
      nombre: activo.nombre,
      descripcion: activo.descripcion,
      estado: activo.estado,
      empresa_nombre: empresaRes.data?.nombre ?? null,
      composicion,
      n_ciclos: activo.n_ciclos,
      co2_evitado_total_kg: Math.round(co2_evitado_total_kg * 10000) / 10000,
      ciclos: ciclosRes.data ?? [],
      hash_integridad: activo.hash_integridad
        ? activo.hash_integridad.slice(0, 16) + '...'
        : null,
      created_at: activo.created_at,
    },
  })
}
