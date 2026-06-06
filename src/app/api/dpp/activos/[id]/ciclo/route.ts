import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

const FACTOR_TRANSPORTE_KG_CO2_KM = 0.21

const schema = z.object({
  operacion_realizada: z.string().min(1, 'Describe la operación realizada.').max(500),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresa una fecha válida (YYYY-MM-DD).'),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  descripcion: z.string().max(2000).optional(),
  distancia_transporte_km: z.number().min(0, 'La distancia no puede ser negativa.').default(0),
  evidencia_json: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso para registrar ciclos.' },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, rol, adminClient } = auth
  const { id } = params
  const ip = getIp(request)

  const { data: activo, error: activoError } = await adminClient
    .from('dpp_activos')
    .select('id, empresa_id, n_ciclos, peso_total_kg, composicion_json')
    .eq('id', id)
    .single()

  if (activoError || !activo) {
    return NextResponse.json({ error: 'No encontramos este activo.' }, { status: 404 })
  }
  if (rol !== 'super_admin' && activo.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No tienes permiso para este activo.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisa los datos del ciclo.' },
      { status: 400 }
    )
  }
  const { operacion_realizada, fecha_inicio, fecha_fin, descripcion, distancia_transporte_km, evidencia_json } = parsed.data

  // CO2 generado en este ciclo (solo transporte por ahora)
  const co2_ciclo_kg = Math.round(distancia_transporte_km * FACTOR_TRANSPORTE_KG_CO2_KM * 10000) / 10000

  // CO2 evitado = lo que se habría emitido fabricando el activo desde cero
  const composicion = Array.isArray(activo.composicion_json) ? activo.composicion_json as { peso_kg: number; factor_co2_kg: number }[] : []
  const co2_evitado_kg = Math.round(
    composicion.reduce((sum, m) => sum + (m.peso_kg ?? 0) * (m.factor_co2_kg ?? 0), 0) * 10000
  ) / 10000

  const numero_ciclo = (activo.n_ciclos ?? 0) + 1

  const { data: ciclo, error: cicloError } = await adminClient
    .from('dpp_ciclos')
    .insert({
      activo_id: id,
      empresa_id: activo.empresa_id,
      numero_ciclo,
      fecha_inicio,
      fecha_fin: fecha_fin ?? null,
      descripcion: descripcion ?? null,
      operacion_realizada,
      distancia_transporte_km,
      co2_ciclo_kg,
      co2_evitado_kg,
      evidencia_json: evidencia_json ?? null,
    })
    .select()
    .single()

  if (cicloError || !ciclo) {
    return NextResponse.json({ error: 'Error al guardar el ciclo. Intenta de nuevo.' }, { status: 500 })
  }

  await adminClient
    .from('dpp_activos')
    .update({ n_ciclos: numero_ciclo, updated_at: new Date().toISOString() })
    .eq('id', id)

  await logAuditoria(adminClient, {
    user_id,
    accion: 'dpp_ciclo_registrado',
    detalle: { activo_id: id, numero_ciclo, co2_ciclo_kg, co2_evitado_kg },
    ip,
  })

  return NextResponse.json({ data: ciclo }, { status: 201 })
}
