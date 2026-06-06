import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { calcularMetricasFinancieras } from '@/lib/calculos/financiero'

const schema = z.object({
  p_virgin_usd_kg: z.number().min(0),
  q_circular_kg: z.number().min(0),
  c_adquisicion: z.number().min(0),
  c_operacion: z.number().min(0),
  c_mantenimiento: z.number().min(0),
  c_disposicion: z.number().min(0),
  v_reventa: z.number().min(0),
  m_secundario_kg: z.number().min(0),
  m_renovable_kg: z.number().min(0),
  m_total_input_kg: z.number().min(0),
  n_ciclos: z.number().int().min(0),
  ahorro_operativo: z.number().min(0).optional(),
  inversion_ce: z.number().min(0).optional(),
  fp_ce: z.number().min(0).optional(),
  fp_lineal: z.number().min(0).optional(),
  c_impuesto_evitado: z.number().min(0).optional(),
  moneda: z.enum(['COP', 'USD', 'EUR']).default('COP'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Solo el administrador puede calcular métricas financieras.' },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, rol, adminClient } = auth
  const { id } = params
  const ip = getIp(request)

  const { data: activo } = await adminClient
    .from('dpp_activos')
    .select('id, empresa_id')
    .eq('id', id)
    .single()

  if (!activo) return NextResponse.json({ error: 'No encontramos este activo.' }, { status: 404 })
  if (rol !== 'super_admin' && activo.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No tienes permiso para este activo.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisa los valores financieros.' },
      { status: 400 }
    )
  }

  const resultados = calcularMetricasFinancieras(parsed.data)

  // tco es GENERATED en BD — no se inserta directamente
  const { data: metrica, error: insertError } = await adminClient
    .from('dpp_metricas_financieras')
    .insert({
      activo_id: id,
      empresa_id: activo.empresa_id,
      p_virgin_usd_kg: parsed.data.p_virgin_usd_kg,
      q_circular_kg: parsed.data.q_circular_kg,
      c_adquisicion: parsed.data.c_adquisicion,
      c_operacion: parsed.data.c_operacion,
      c_mantenimiento: parsed.data.c_mantenimiento,
      c_disposicion: parsed.data.c_disposicion,
      v_reventa: parsed.data.v_reventa,
      m_secundario_kg: parsed.data.m_secundario_kg,
      m_renovable_kg: parsed.data.m_renovable_kg,
      m_total_input_kg: parsed.data.m_total_input_kg,
      costo_evitado: resultados.costo_evitado,
      e_roi: resultados.e_roi,
      ice_porcentaje: resultados.ice_porcentaje,
      inflow_circular_pct: resultados.inflow_circular_pct,
      snapshot_json: resultados.snapshot,
      version: resultados.snapshot.version,
    })
    .select()
    .single()

  if (insertError || !metrica) {
    return NextResponse.json({ error: 'Error al guardar las métricas. Intenta de nuevo.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'dpp_metricas_calculadas',
    detalle: { activo_id: id, tco: resultados.tco, e_roi: resultados.e_roi },
    ip,
  })

  return NextResponse.json({ data: { ...resultados, id: metrica.id } }, { status: 201 })
}
