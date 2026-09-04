import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EstadoCuentaClient } from './components/estado-cuenta-client'
import { ModulosEmpresaClient } from './components/modulos-empresa-client'
import { MarcaEmpresaClient } from './components/marca-empresa-client'
import { AdminEmpresaClient } from './components/admin-empresa-client'
import { CatalogoRestringidoEmpresaClient } from './components/catalogo-restringido-empresa-client'
import { LineasEmpresaClient } from './components/lineas-empresa-client'
import { NegociacionEmpresaClient } from './components/negociacion-empresa-client'
import type { Plan, ModuloConActivo, LineaNegocioConActivo } from '@/types'

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
    .select('nombre, apellido, rol')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'super_admin') redirect('/dashboard')

  const adminClient = await createAdminClient()
  const { id } = params

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [empresaRes, empleadosRes, calculosMesRes, logsRes, modulosRes, asignadosRes, lineasRes, lineasAsignadasRes, adminsEmpresaRes, negociacionRes] = await Promise.all([
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
      .select('id, clave, nombre, icono_lucide, descripcion, activo, orden, created_at, updated_at')
      .eq('activo', true)
      .order('orden', { ascending: true }),
    adminClient
      .from('modulos_empresas')
      .select('modulo_id, activo')
      .eq('empresa_id', id),
    adminClient
      .from('lineas_negocio')
      .select('id, clave, nombre, icono_lucide, descripcion, activa, orden, created_at, updated_at')
      .eq('activa', true)
      .order('orden', { ascending: true }),
    adminClient
      .from('lineas_negocio_empresas')
      .select('linea_negocio_id, activa')
      .eq('empresa_id', id),
    adminClient
      .from('profiles')
      .select('user_id, nombre, apellido, email')
      .eq('empresa_id', id)
      .eq('rol', 'empresa_admin'),
    adminClient
      .from('empresas_negociaciones')
      .select('*')
      .eq('empresa_id', id)
      .maybeSingle(),
  ])

  if (!empresaRes.data || empresaRes.error) notFound()

  const empresa = empresaRes.data
  const plan = empresa.plan as Plan

  // Límites y precio REALES de esta empresa — antes esta página traía una
  // tabla fija hardcodeada en el propio archivo (LIMITES), desincronizada
  // de config_planes desde que /admin/planes se volvió editable (sql/115).
  // Corregido 2026-09-04 de paso, al mover aquí el módulo de negociación:
  // si la empresa tiene fila en empresas_negociaciones, ESA reemplaza al
  // plan global por completo (regla ya establecida en sql/115, nunca una
  // mezcla campo por campo). Si no, se consulta config_planes de verdad.
  const negociacion = negociacionRes.data
  const { data: configPlanRow } = negociacion
    ? { data: null }
    : await adminClient
        .from('config_planes')
        .select('precio_cop, precio_anual_cop, limite_empleados, limite_calculos_mes, limite_informes_mes, limite_cotizaciones_mes')
        .eq('id', plan)
        .single()

  const planReal = negociacion
    ? {
        origen: 'negociacion' as const,
        precio_cop: negociacion.precio_cop,
        precio_anual_cop: null as number | null,
        limite_empleados: negociacion.limite_empleados,
        limite_calculos_mes: negociacion.limite_calculos_mes,
        limite_informes_mes: negociacion.limite_informes_mes,
        limite_cotizaciones_mes: negociacion.limite_cotizaciones_mes,
      }
    : {
        origen: 'global' as const,
        precio_cop: configPlanRow?.precio_cop ?? 0,
        precio_anual_cop: configPlanRow?.precio_anual_cop ?? null,
        limite_empleados: configPlanRow?.limite_empleados ?? null,
        limite_calculos_mes: configPlanRow?.limite_calculos_mes ?? null,
        limite_informes_mes: configPlanRow?.limite_informes_mes ?? null,
        limite_cotizaciones_mes: configPlanRow?.limite_cotizaciones_mes ?? null,
      }

  const logsEmpresa = logsRes.data ?? []

  // Resolver nombres de admins en logs
  const adminIds = Array.from(new Set(logsEmpresa.map((l) => l.user_id).filter(Boolean)))
  let adminsMap = new Map<string, { nombreCompleto: string; rol: string }>()
  if (adminIds.length > 0) {
    const { data: admins } = await adminClient
      .from('profiles')
      .select('user_id, nombre, apellido, rol')
      .in('user_id', adminIds)
    adminsMap = new Map((admins ?? []).map((a) => [
      a.user_id,
      {
        nombreCompleto: `${a.nombre || ''} ${a.apellido || ''}`.trim() || 'Admin',
        rol: a.rol === 'super_admin' ? 'superadmin' : a.rol === 'empresa_admin' ? 'empresa admin' : a.rol || '',
      }
    ]))
  }

  const historialCambios = logsEmpresa
    .map((log) => {
      const d = log.detalle_json as Record<string, unknown> | null
      const cambios = d?.cambios as Record<string, unknown> | undefined
      const adminData = adminsMap.get(log.user_id as string) ?? { nombreCompleto: 'Admin', rol: 'superadmin' }
      return {
        created_at: log.created_at as string,
        admin: adminData.nombreCompleto,
        adminRol: adminData.rol,
        cambios: cambios ?? {},
      }
    })
    .filter((l) => Object.keys(l.cambios).length > 0)

  const asignadosMap = new Map(
    (asignadosRes.data ?? []).map((a) => [a.modulo_id, a.activo])
  )
  const modulosConActivo: ModuloConActivo[] = (modulosRes.data ?? []).map((m) => ({
    ...m,
    activo_en_empresa: asignadosMap.get(m.id) ?? false,
  }))

  const lineasAsignadasMap = new Map(
    (lineasAsignadasRes.data ?? []).map((a) => [a.linea_negocio_id, a.activa])
  )
  const lineasConActivo: LineaNegocioConActivo[] = (lineasRes.data ?? []).map((l) => ({
    ...l,
    activa_en_empresa: lineasAsignadasMap.get(l.id) ?? false,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 w-full space-y-8">
      <EstadoCuentaClient
        empresa={empresa}
        totalEmpleados={empleadosRes.count ?? 0}
        calculosMes={calculosMesRes.count ?? 0}
        planReal={planReal}
        historialPlan={historialCambios}
        adminNombre={`${perfil?.nombre || ''} ${perfil?.apellido || ''}`.trim() || 'Admin'}
      />

      <MarcaEmpresaClient empresa={empresa} />

      <AdminEmpresaClient empresaId={id} admins={adminsEmpresaRes.data ?? []} />

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Módulos activos</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Qué partes de la plataforma puede usar esta empresa. Apagar un módulo bloquea de inmediato sus rutas para todos sus usuarios.
        </p>
        <ModulosEmpresaClient empresaId={id} modulos={modulosConActivo} />
      </div>

      <div className="border-t pt-8" style={{ borderColor: 'var(--border)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Líneas de Negocio (Industrias/Productos)</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Habilita las verticales de negocio sobre las que operan los módulos habilitados arriba.
        </p>
        <LineasEmpresaClient empresaId={id} lineas={lineasConActivo} />
      </div>

      <div className="border-t pt-8" style={{ borderColor: 'var(--border)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Permisos de Insumos y Materiales Base</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Habilita qué materiales e insumos (creados por otras empresas o por la tuya) pueden usarse en los cálculos ambientales de esta empresa.
        </p>
        <CatalogoRestringidoEmpresaClient empresaId={id} />
      </div>

      <div className="border-t pt-8 pb-10" style={{ borderColor: 'var(--border)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Negociación de plan</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Precios y límites propios para esta empresa, distintos del plan global. Si no la necesitas, esta empresa sigue usando lo publicado en Planes normalmente.
        </p>
        <NegociacionEmpresaClient empresaId={id} />
      </div>
    </div>
  )
}
