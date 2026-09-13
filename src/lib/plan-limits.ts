import { createAdminClient } from '@/lib/supabase/admin'
import type { Plan } from '@/types'

export const NOMBRES_PLAN: Record<Plan, string> = {
  free:     'Explora',
  lab:      'Circular Lab',
  impulso:  'Impulso Sostenible',
  ilimitado: 'Impacto Ilimitado',
}

// Fuente de verdad real de límites: tabla config_planes (editable por
// super_admin desde /admin/planes, ver sql/115). Si la empresa tiene su
// propia fila en empresas_negociaciones, esa SIEMPRE gana completa sobre
// el plan global — nunca se mezclan campo por campo, para que no haya
// ambigüedad sobre qué significa un límite en NULL en cada tabla (en las
// dos, NULL = ilimitado). Si algo falla al leer la base, se cae de vuelta
// a los límites históricos fijos para no dejar el sistema sin límite por
// un error de red.
const LIMITES_RESPALDO: Record<Plan, { empleados: number; calculos_mes: number; informes_mes: number; cotizaciones_mes: number; dpp_mes: number; incluye_ia: boolean; incluye_mci: boolean; incluye_excel_csv: boolean }> = {
  free:     { empleados: 1,        calculos_mes: 5,        informes_mes: 0,        cotizaciones_mes: 0,        dpp_mes: 0,        incluye_ia: false, incluye_mci: false, incluye_excel_csv: false },
  lab:      { empleados: 5,        calculos_mes: 0,        informes_mes: 5,        cotizaciones_mes: 0,        dpp_mes: 5,        incluye_ia: false, incluye_mci: false, incluye_excel_csv: false },
  impulso:  { empleados: 10,       calculos_mes: 0,        informes_mes: 5,        cotizaciones_mes: 200,      dpp_mes: 200,      incluye_ia: true,  incluye_mci: false, incluye_excel_csv: false },
  ilimitado: { empleados: Infinity, calculos_mes: Infinity, informes_mes: Infinity, cotizaciones_mes: Infinity, dpp_mes: Infinity, incluye_ia: true,  incluye_mci: true,  incluye_excel_csv: true },
}

interface LimitesEfectivos {
  empleados: number
  calculos_mes: number
  informes_mes: number
  cotizaciones_mes: number
  dpp_mes: number
  incluye_ia: boolean
  incluye_mci: boolean
  incluye_excel_csv: boolean
}

const aInfinito = (v: number | null | undefined): number => (v === null || v === undefined ? Infinity : v)

export async function obtenerLimitesEfectivos(empresaId: string, plan: Plan): Promise<LimitesEfectivos> {
  try {
    const adminClient = await createAdminClient()
    const [{ data: negociacion }, { data: config }] = await Promise.all([
      adminClient.from('empresas_negociaciones').select('limite_empleados, limite_calculos_mes, limite_informes_mes, limite_cotizaciones_mes, limite_dpp_mes, incluye_ia, incluye_mci, incluye_excel_csv').eq('empresa_id', empresaId).maybeSingle(),
      adminClient.from('config_planes').select('limite_empleados, limite_calculos_mes, limite_informes_mes, limite_cotizaciones_mes, limite_dpp_mes, incluye_ia, incluye_mci, incluye_excel_csv').eq('id', plan).single(),
    ])
    const fuente = negociacion ?? config
    if (!fuente) return LIMITES_RESPALDO[plan]
    // `incluye_ia`, `incluye_mci` o `incluye_excel_csv` pueden venir NULL en una negociación — en ese
    // caso caen al valor del plan global, no a false.
    const iaEfectiva = fuente.incluye_ia ?? config?.incluye_ia ?? LIMITES_RESPALDO[plan].incluye_ia
    const mciEfectivo = (fuente as unknown as { incluye_mci?: boolean | null }).incluye_mci ?? (config as unknown as { incluye_mci?: boolean | null })?.incluye_mci ?? LIMITES_RESPALDO[plan].incluye_mci
    const excelCsvEfectivo = (fuente as unknown as { incluye_excel_csv?: boolean | null }).incluye_excel_csv ?? (config as unknown as { incluye_excel_csv?: boolean | null })?.incluye_excel_csv ?? LIMITES_RESPALDO[plan].incluye_excel_csv
    return {
      empleados: aInfinito(fuente.limite_empleados),
      calculos_mes: aInfinito(fuente.limite_calculos_mes),
      informes_mes: aInfinito(fuente.limite_informes_mes),
      cotizaciones_mes: aInfinito(fuente.limite_cotizaciones_mes),
      dpp_mes: aInfinito(fuente.limite_dpp_mes),
      incluye_ia: !!iaEfectiva,
      incluye_mci: !!mciEfectivo,
      incluye_excel_csv: !!excelCsvEfectivo,
    }
  } catch {
    return LIMITES_RESPALDO[plan]
  }
}

function inicioYFinMesActual(): { inicioMes: string; finMes: string } {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1).toISOString()
  return { inicioMes, finMes }
}

export async function checkLimiteEmpleados(empresaId: string, plan: Plan): Promise<string | null> {
  const { empleados: limite } = await obtenerLimitesEfectivos(empresaId, plan)
  if (limite === Infinity) return null

  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} empleado. Contacta a servicio@calculadoradereuso.com para ampliar tu plan.`
  }
  return null
}

export async function checkLimiteCalculos(empresaId: string, plan: Plan): Promise<string | null> {
  const { calculos_mes: limite } = await obtenerLimitesEfectivos(empresaId, plan)
  if (limite === Infinity) return null

  const { inicioMes, finMes } = inicioYFinMesActual()
  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('calculos')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .gte('created_at', inicioMes)
    .lt('created_at', finMes)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} cálculos por mes. Contacta a servicio@calculadoradereuso.com para ampliar tu plan.`
  }
  return null
}

export async function checkLimiteInformes(empresaId: string, plan: Plan): Promise<string | null> {
  const { informes_mes: limite } = await obtenerLimitesEfectivos(empresaId, plan)
  if (limite === Infinity) return null
  if (limite === 0) {
    return `El plan ${NOMBRES_PLAN[plan]} no incluye generación de informes. Contacta a servicio@calculadoradereuso.com para ampliar tu plan.`
  }

  const { inicioMes, finMes } = inicioYFinMesActual()
  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('informes')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .gte('created_at', inicioMes)
    .lt('created_at', finMes)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} informes por mes. Contacta a servicio@calculadoradereuso.com para ampliar tu plan.`
  }
  return null
}

export async function checkLimiteCotizaciones(empresaId: string, plan: Plan): Promise<string | null> {
  const { cotizaciones_mes: limite } = await obtenerLimitesEfectivos(empresaId, plan)
  if (limite === Infinity) return null
  if (limite === 0) {
    return `El plan ${NOMBRES_PLAN[plan]} no incluye el Cotizador. Contacta a servicio@calculadoradereuso.com para ampliar tu plan.`
  }

  const { inicioMes, finMes } = inicioYFinMesActual()
  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('crm_cotizaciones')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .gte('created_at', inicioMes)
    .lt('created_at', finMes)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} cotizaciones por mes. Contacta a servicio@calculadoradereuso.com para ampliar tu plan.`
  }
  return null
}

export async function checkLimiteDpp(empresaId: string, plan: Plan): Promise<string | null> {
  const { dpp_mes: limite } = await obtenerLimitesEfectivos(empresaId, plan)
  if (limite === Infinity) return null
  if (limite === 0) {
    return `El plan ${NOMBRES_PLAN[plan]} no incluye el Pasaporte Digital de Producto. Contacta a servicio@calculadoradereuso.com para ampliar tu plan.`
  }

  const { inicioMes, finMes } = inicioYFinMesActual()
  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('dpp_activos')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .gte('created_at', inicioMes)
    .lt('created_at', finMes)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} pasaportes por mes. Contacta a servicio@calculadoradereuso.com para ampliar tu plan.`
  }
  return null
}

/**
 * ¿El plan de la empresa incluye el asistente de IA (ingesta de DPP,
 * diagnóstico del cotizador)? Circular Lab no, Impulso e Ilimitado sí.
 */
export async function planIncluyeIA(empresaId: string, plan: Plan): Promise<boolean> {
  const { incluye_ia } = await obtenerLimitesEfectivos(empresaId, plan)
  return incluye_ia
}

/**
 * ¿El plan de la empresa incluye el Indicador de Circularidad de Materiales (MCI - ISO 59020)?
 */
export async function planIncluyeMCI(empresaId: string, plan: Plan): Promise<boolean> {
  const { incluye_mci } = await obtenerLimitesEfectivos(empresaId, plan)
  return incluye_mci
}

/**
 * ¿El plan de la empresa incluye exportación de informes a Excel y CSV?
 */
export async function planIncluyeExcelCSV(empresaId: string, plan: Plan): Promise<boolean> {
  const { incluye_excel_csv } = await obtenerLimitesEfectivos(empresaId, plan)
  return incluye_excel_csv
}

