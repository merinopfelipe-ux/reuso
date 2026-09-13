import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

// Ver nota en src/app/api/planes/route.ts — evita que Next.js cachee las
// llamadas fetch() internas de Supabase y devuelva datos viejos.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const PLANES_VALIDOS = ['free', 'lab', 'impulso', 'ilimitado']

// POST: copia el borrador de un plan a los campos reales (los que
// plan-limits.ts usa de verdad para cobrar y limitar). A partir de este
// momento, cualquier empresa SIN negociación propia (empresas_negociaciones)
// queda bajo estos valores nuevos — las que sí tienen negociación no se
// ven afectadas nunca por esto, ver sql/115.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: perfil } = await supabase.from('profiles').select('rol').eq('user_id', user.id).single()
  if (perfil?.rol !== 'super_admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const { id } = params
  if (!PLANES_VALIDOS.includes(id)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { data: actual, error: errorLectura } = await adminClient
    .from('config_planes')
    .select('*')
    .eq('id', id)
    .single()

  if (errorLectura || !actual) {
    return NextResponse.json({ error: 'No se encontró el plan' }, { status: 404 })
  }
  if (!actual.tiene_borrador_sin_publicar) {
    return NextResponse.json({ error: 'No hay cambios sin publicar para este plan' }, { status: 400 })
  }

  const antes = {
    precio_cop: actual.precio_cop, precio_usd: actual.precio_usd, precio_eur: actual.precio_eur,
    precio_anual_cop: actual.precio_anual_cop, precio_anual_usd: actual.precio_anual_usd, precio_anual_eur: actual.precio_anual_eur,
    limite_empleados: actual.limite_empleados, limite_calculos_mes: actual.limite_calculos_mes, limite_informes_mes: actual.limite_informes_mes,
    limite_cotizaciones_mes: actual.limite_cotizaciones_mes,
    incluye_ia: actual.incluye_ia, limite_dpp_mes: actual.limite_dpp_mes,
    features_json: actual.features_json,
    equivalente_mensual_anual_cop: actual.equivalente_mensual_anual_cop, equivalente_mensual_anual_usd: actual.equivalente_mensual_anual_usd, equivalente_mensual_anual_eur: actual.equivalente_mensual_anual_eur,
  }
  const despues = {
    precio_cop: actual.borrador_precio_cop, precio_usd: actual.borrador_precio_usd, precio_eur: actual.borrador_precio_eur,
    precio_anual_cop: actual.borrador_precio_anual_cop, precio_anual_usd: actual.borrador_precio_anual_usd, precio_anual_eur: actual.borrador_precio_anual_eur,
    limite_empleados: actual.borrador_limite_empleados, limite_calculos_mes: actual.borrador_limite_calculos_mes, limite_informes_mes: actual.borrador_limite_informes_mes,
    limite_cotizaciones_mes: actual.borrador_limite_cotizaciones_mes,
    incluye_ia: actual.borrador_incluye_ia ?? actual.incluye_ia,
    limite_dpp_mes: actual.borrador_limite_dpp_mes,
    features_json: actual.borrador_features_json ?? actual.features_json,
    equivalente_mensual_anual_cop: actual.borrador_equivalente_mensual_anual_cop,
    equivalente_mensual_anual_usd: actual.borrador_equivalente_mensual_anual_usd,
    equivalente_mensual_anual_eur: actual.borrador_equivalente_mensual_anual_eur,
  }

  const updateData: Record<string, unknown> = {
    ...despues,
    tiene_borrador_sin_publicar: false,
    publicado_at: new Date().toISOString(),
    actualizado_at: new Date().toISOString(),
  }

  let { error } = await adminClient
    .from('config_planes')
    .update(updateData)
    .eq('id', id)

  let aviso: string | undefined
  if (error) {
    console.error(`[API /admin/planes/${id}/publicar] Error en update inicial:`, error)
    // Si falla por columnas de sql/128 (equivalente_mensual_anual_* aún no migradas en Supabase),
    // se reintenta inmediatamente sin ellas para que la publicación nunca se bloquee. Solo se
    // reintenta cuando el error menciona esas columnas puntuales, nunca ante cualquier error,
    // para no reportar éxito silencioso ante una falla distinta (ej. un valor de borrador inválido).
    if (!error.message?.includes('equivalente_mensual_anual')) {
      return NextResponse.json({ error: error.message || 'No se pudo publicar' }, { status: 500 })
    }
    const camposSql128 = new Set([
      'equivalente_mensual_anual_cop',
      'equivalente_mensual_anual_usd',
      'equivalente_mensual_anual_eur',
      'borrador_equivalente_mensual_anual_cop',
      'borrador_equivalente_mensual_anual_usd',
      'borrador_equivalente_mensual_anual_eur',
    ])
    const updateSinSql128 = Object.fromEntries(
      Object.entries(updateData).filter(([k]) => !camposSql128.has(k))
    )
    const reintento = await adminClient
      .from('config_planes')
      .update(updateSinSql128)
      .eq('id', id)

    if (reintento.error) {
      console.error(`[API /admin/planes/${id}/publicar] Error crítico en reintento:`, reintento.error)
      return NextResponse.json({ error: reintento.error.message || 'No se pudo publicar' }, { status: 500 })
    }
    error = null
    aviso = 'Falta correr sql/128 para el equivalente mensual editable — el resto se publicó bien.'
  }

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'plan_publicado',
    detalle: { plan_id: id, antes, despues },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true, plan: despues, ...(aviso ? { aviso } : {}) })
}
