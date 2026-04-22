import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EstadoCuentaClient } from './components/estado-cuenta-client'
import { ModulosEmpresaClient } from './components/modulos-empresa-client'
import type { Plan, ModuloConActivo } from '@/types'

const LIMITES: Record<Plan, { empleados: number; calculos_mes: number; certificados_mes: number; informes_mes: number }> = {
  free:      { empleados: 1,        calculos_mes: 10,       certificados_mes: 0,        informes_mes: 0 },
  lab:       { empleados: 5,        calculos_mes: 200,      certificados_mes: 2,        informes_mes: 5 },
  impulso:   { empleados: 10,       calculos_mes: 200,      certificados_mes: 2,        informes_mes: 5 },
  ilimitado: { empleados: Infinity, calculos_mes: Infinity, certificados_mes: Infinity, informes_mes: Infinity },
}

export default async function EmpresaDetallePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()
  const { id } = params

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [empresaRes, empleadosRes, calculosMesRes, logsRes, modulosRes, asignadosRes] = await Promise.all([
    adminClient.from('empresas').select('*').eq('id', id).single(),
    adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('empresa_id', id),
    adminClient
      .from('calculos')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', id)
      .gte('fecha', inicioMes),
    adminClient
      .from('logs_auditoria')
      .select('user_id, accion, detalle_json, created_at')
      .eq('accion', 'actualizar_empresa')
      .filter('detalle_json->>id', 'eq', id)
      .order('created_at', { ascending: false })
      .limit(30),
    adminClient
      .from('modulos')
      .select('id, nombre, icono_lucide, descripcion, activo, orden, created_at, updated_at')
      .eq('activo', true)
      .order('orden', { ascending: true }),
    adminClient
      .from('modulos_empresas')
      .select('modulo_id, activo')
      .eq('empresa_id', id),
  ])

  if (!empresaRes.data || empresaRes.error) notFound()

  const empresa = empresaRes.data
  const plan = empresa.plan as Plan
  const limite = LIMITES[plan] ?? LIMITES.free

  const logsEmpresa = logsRes.data ?? []

  // Resolver nombres de admins en logs
  const adminIds = Array.from(new Set(logsEmpresa.map((l) => l.user_id).filter(Boolean)))
  let adminsMap = new Map<string, string>()
  if (adminIds.length > 0) {
    const { data: admins } = await adminClient
      .from('profiles')
      .select('user_id, nombre')
      .in('user_id', adminIds)
    adminsMap = new Map((admins ?? []).map((a) => [a.user_id, a.nombre]))
  }

  const historialPlan = logsEmpresa
    .map((log) => {
      const d = log.detalle_json as Record<string, unknown> | null
      const cambios = d?.cambios as Record<string, unknown> | undefined
      return {
        created_at: log.created_at as string,
        admin: adminsMap.get(log.user_id as string) ?? 'Admin',
        cambios: cambios ?? {},
      }
    })
    .filter((l) => 'plan' in l.cambios)

  const asignadosMap = new Map(
    (asignadosRes.data ?? []).map((a) => [a.modulo_id, a.activo])
  )
  const modulosConActivo: ModuloConActivo[] = (modulosRes.data ?? []).map((m) => ({
    ...m,
    activo_en_empresa: asignadosMap.get(m.id) ?? false,
  }))

  return (
    <div>
      <EstadoCuentaClient
        empresa={empresa}
        totalEmpleados={empleadosRes.count ?? 0}
        limiteEmpleados={limite.empleados}
        calculosMes={calculosMesRes.count ?? 0}
        limiteCalculosMes={limite.calculos_mes}
        historialPlan={historialPlan}
      />
      <div style={{ marginTop: 32, padding: '0 0 40px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A3A38', marginBottom: 4 }}>Módulos activos</h3>
        <p style={{ fontSize: 13, color: '#4D7C79', marginBottom: 16 }}>
          Activa o desactiva los módulos disponibles para esta empresa.
        </p>
        <ModulosEmpresaClient empresaId={id} modulos={modulosConActivo} />
      </div>
    </div>
  )
}
