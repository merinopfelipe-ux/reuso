import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Sin esto, Next.js cachea las llamadas fetch() internas de Supabase (parchea
// el fetch global) y esta ruta puede devolver precios viejos aunque la base
// ya tenga el valor recién publicado — bug real encontrado el 2026-09-02.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET público (sin sesión): solo los precios y límites PUBLICADOS de los 4
// planes — la landing los usa para no depender de números fijos en el
// bundle de JavaScript. Nunca expone las columnas borrador_* (eso es
// interno del panel de super_admin).
export async function GET() {
  const adminClient = await createAdminClient()
  let { data, error } = await adminClient
    .from('config_planes')
    .select(`
      id, precio_cop, precio_usd, precio_eur,
      precio_anual_cop, precio_anual_usd, precio_anual_eur,
      equivalente_mensual_anual_cop, equivalente_mensual_anual_usd, equivalente_mensual_anual_eur,
      limite_empleados, limite_calculos_mes, limite_informes_mes, limite_cotizaciones_mes, limite_dpp_mes,
      incluye_ia, incluye_mci, incluye_excel_csv, tarifa_implementacion_cop, tarifa_implementacion_usd, tarifa_implementacion_eur,
      features_json
    `)
    .order('precio_cop', { ascending: true })

  if (error && (error.message?.includes('incluye_mci') || error.message?.includes('incluye_excel_csv'))) {
    const fallback = await adminClient
      .from('config_planes')
      .select(`
        id, precio_cop, precio_usd, precio_eur,
        precio_anual_cop, precio_anual_usd, precio_anual_eur,
        equivalente_mensual_anual_cop, equivalente_mensual_anual_usd, equivalente_mensual_anual_eur,
        limite_empleados, limite_calculos_mes, limite_informes_mes, limite_cotizaciones_mes, limite_dpp_mes,
        incluye_ia, tarifa_implementacion_cop, tarifa_implementacion_usd, tarifa_implementacion_eur,
        features_json
      `)
      .order('precio_cop', { ascending: true })
    data = fallback.data as typeof data
    error = fallback.error
  }

  if (error || !data) {
    return NextResponse.json({ error: 'No se pudo cargar la información de planes' }, { status: 500 })
  }

  return NextResponse.json({ planes: data })
}
