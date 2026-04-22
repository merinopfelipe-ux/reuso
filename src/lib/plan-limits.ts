import { createAdminClient } from '@/lib/supabase/admin'
import type { Plan } from '@/types'

const LIMITES: Record<Plan, { empleados: number; calculos_mes: number; certificados_mes: number; informes_mes: number }> = {
  free:     { empleados: 1,        calculos_mes: 10,       certificados_mes: 0,        informes_mes: 0 },
  lab:      { empleados: 5,        calculos_mes: 200,      certificados_mes: 2,        informes_mes: 5 },
  impulso:  { empleados: 10,       calculos_mes: 200,      certificados_mes: 2,        informes_mes: 5 },
  ilimitado: { empleados: Infinity, calculos_mes: Infinity, certificados_mes: Infinity, informes_mes: Infinity },
}

export const NOMBRES_PLAN: Record<Plan, string> = {
  free:     'Explora',
  lab:      'Circular Lab',
  impulso:  'Impulso Sostenible',
  ilimitado: 'Impacto Ilimitado',
}

function inicioYFinMesActual(): { inicioMes: string; finMes: string } {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1).toISOString()
  return { inicioMes, finMes }
}

export async function checkLimiteEmpleados(empresaId: string, plan: Plan): Promise<string | null> {
  const limite = LIMITES[plan].empleados
  if (limite === Infinity) return null

  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} empleado. Contacta a reuso.lurdes.co para ampliar tu plan.`
  }
  return null
}

export async function checkLimiteCalculos(empresaId: string, plan: Plan): Promise<string | null> {
  const limite = LIMITES[plan].calculos_mes
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
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} cálculos por mes. Contacta a reuso.lurdes.co para ampliar tu plan.`
  }
  return null
}

export async function checkLimiteCertificados(empresaId: string, plan: Plan): Promise<string | null> {
  const limite = LIMITES[plan].certificados_mes
  if (limite === Infinity) return null
  if (limite === 0) {
    return `El plan ${NOMBRES_PLAN[plan]} no incluye generación de certificados. Contacta a reuso.lurdes.co para ampliar tu plan.`
  }

  const { inicioMes, finMes } = inicioYFinMesActual()
  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('certificados')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('tipo', 'certificado')
    .gte('created_at', inicioMes)
    .lt('created_at', finMes)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} certificados por mes. Contacta a reuso.lurdes.co para ampliar tu plan.`
  }
  return null
}

export async function checkLimiteInformes(empresaId: string, plan: Plan): Promise<string | null> {
  const limite = LIMITES[plan].informes_mes
  if (limite === Infinity) return null
  if (limite === 0) {
    return `El plan ${NOMBRES_PLAN[plan]} no incluye generación de informes. Contacta a reuso.lurdes.co para ampliar tu plan.`
  }

  const { inicioMes, finMes } = inicioYFinMesActual()
  const adminClient = await createAdminClient()
  const { count } = await adminClient
    .from('certificados')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId)
    .eq('tipo', 'informe')
    .gte('created_at', inicioMes)
    .lt('created_at', finMes)

  if ((count ?? 0) >= limite) {
    return `El plan ${NOMBRES_PLAN[plan]} permite máximo ${limite} informes por mes. Contacta a reuso.lurdes.co para ampliar tu plan.`
  }
  return null
}
