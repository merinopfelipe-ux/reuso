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
  }
  const despues = {
    precio_cop: actual.borrador_precio_cop, precio_usd: actual.borrador_precio_usd, precio_eur: actual.borrador_precio_eur,
    precio_anual_cop: actual.borrador_precio_anual_cop, precio_anual_usd: actual.borrador_precio_anual_usd, precio_anual_eur: actual.borrador_precio_anual_eur,
    limite_empleados: actual.borrador_limite_empleados, limite_calculos_mes: actual.borrador_limite_calculos_mes, limite_informes_mes: actual.borrador_limite_informes_mes,
    limite_cotizaciones_mes: actual.borrador_limite_cotizaciones_mes,
  }

  const { error } = await adminClient
    .from('config_planes')
    .update({
      ...despues,
      tiene_borrador_sin_publicar: false,
      publicado_at: new Date().toISOString(),
      actualizado_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'No se pudo publicar' }, { status: 500 })

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'plan_publicado',
    detalle: { plan_id: id, antes, despues },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true, plan: despues })
}
