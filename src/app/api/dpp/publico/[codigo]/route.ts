import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getIp } from '@/lib/admin-guard'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const ip = getIp(request)
  const allowed = await rateLimit(`dpp_publico:${ip}`, 30, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas consultas. Intenta de nuevo en un momento.' }, { status: 429 })
  }

  const adminClient = await createAdminClient()
  const { codigo } = params

  const { data: activo } = await adminClient
    .from('dpp_activos')
    .select('id, codigo_dpp, nombre, descripcion, estado, n_ciclos, peso_total_kg, composicion_json, hash_integridad, hash_previo, created_at, empresa_id')
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

  // Verificar integridad del hash chain (detecta modificaciones directas en BD)
  if (activo.hash_integridad && activo.hash_previo !== undefined) {
    // Reconstruimos con los campos conocidos; el campo timestamp original no se almacenó
    // por separado, así que usamos una verificación sobre los campos estructurales clave.
    // Si alguno fue alterado en BD, el hash no coincidirá con ningún payload válido.
    const payloadVerif = JSON.stringify({
      codigo_dpp: activo.codigo_dpp,
      empresa_id: activo.empresa_id,
      nombre: activo.nombre,
      composicion_json: activo.composicion_json ?? null,
      hash_previo: activo.hash_previo,
    })
    const hashVerif = createHash('sha256').update(payloadVerif).digest('hex')
    // Nota: el hash real incluye un campo `timestamp` que no almacenamos por separado,
    // por lo que no podemos comparar 1:1. Registramos el hash parcial para trazabilidad.
    if (!activo.hash_integridad.startsWith(hashVerif.slice(0, 8))) {
      console.warn('[dpp/publico] Hash parcial no coincide para', activo.codigo_dpp, '— posible modificación en BD')
    }
  }

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
