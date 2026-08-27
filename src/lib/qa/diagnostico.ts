import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

export type Severidad = 'ok' | 'aviso' | 'falla'

export interface Comprobacion {
  grupo: string
  nombre: string
  estado: Severidad
  detalle: string
}

export interface Diagnostico {
  generado: string
  entorno: string
  base: string
  resumen: { total: number; ok: number; avisos: number; fallas: number }
  comprobaciones: Comprobacion[]
}

// Tablas sin las cuales la plataforma no funciona. La lista es explícita a
// propósito: en producción no hay código fuente que recorrer, así que no se
// puede deducir en tiempo de ejecución como sí hace el barrido de terminal.
const TABLAS_CRITICAS = [
  'profiles', 'empresas', 'calculos', 'items', 'categorias', 'modulos',
  'modulos_empresas', 'invitaciones', 'informes', 'tickets', 'tickets_mensajes',
  'alertas', 'leads', 'logs_auditoria', 'config_sistema',
  'item_materiales', 'item_servicios', 'item_insumos',
  'crm_cotizaciones', 'crm_clientes', 'crm_muebles_cotizados',
  'dpp_activos', 'dpp_ciclos', 'dpp_verificaciones',
]

// Columnas que ya rompieron el sistema en el pasado por existir en `sql/` pero
// no en la base. Se comprueban una por una para que el fallo diga cuál falta,
// en vez de un 500 genérico a la hora de guardar.
const COLUMNAS_CRITICAS: [string, string][] = [
  ['items', 'agua_por_unidad'],
  ['items', 'co2_por_unidad'],
  ['items', 'peso_kg'],
  ['calculos', 'hash_previo'],
  ['calculos', 'hash_interno'],
  ['calculos', 'factor_snapshot_json'],
  ['profiles', 'acepta_terminos_at'],
  ['empresas', 'plan'],
]

// Consultas con embed que PostgREST rechaza entera si la relación no existe.
// Un fallo aquí no da error de columna: tumba la pantalla completa.
const CONSULTAS_CRITICAS: [string, string][] = [
  ['calculos', 'id, fecha, total_co2, user_id, empresa_id, empresas(nombre)'],
  ['crm_cotizaciones', 'id, codigo_cotizacion, estado, total, crm_clientes(nombre)'],
  ['items', 'id, nombre, peso_kg, co2_por_unidad, categorias(nombre)'],
]

const BUCKETS_PRIVADOS = ['documentos', 'dpp', 'firmas', 'cotizador']
const BUCKETS_PUBLICOS = ['logos']

const VARIABLES_REQUERIDAS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_KEY',
  'OR_KEY',
  'CRON_SECRET',
  'APP_DATA_ENCRYPTION_KEY',
]

export async function correrDiagnostico(adminClient: AdminClient): Promise<Diagnostico> {
  const c: Comprobacion[] = []
  const add = (grupo: string, nombre: string, estado: Severidad, detalle: string) =>
    c.push({ grupo, nombre, estado, detalle })

  // ── Variables de entorno ────────────────────────────────────────────────
  for (const v of VARIABLES_REQUERIDAS) {
    const valor = process.env[v]
    add('Configuración', v, valor ? 'ok' : 'falla',
      valor ? 'presente' : 'FALTA — la función que la usa fallará en tiempo de ejecución')
  }

  // ── Tablas ──────────────────────────────────────────────────────────────
  for (const t of TABLAS_CRITICAS) {
    const { error } = await adminClient.from(t).select('*', { head: true, count: 'exact' }).limit(1)
    add('Tablas', t, error ? 'falla' : 'ok', error ? error.message : 'existe y responde')
  }

  // ── Columnas ────────────────────────────────────────────────────────────
  for (const [tabla, col] of COLUMNAS_CRITICAS) {
    const { error } = await adminClient.from(tabla).select(col).limit(1)
    add('Columnas', `${tabla}.${col}`, error ? 'falla' : 'ok',
      error ? `${error.message} — revisa si falta correr una migración de sql/` : 'existe')
  }

  // ── Consultas con relación ──────────────────────────────────────────────
  for (const [tabla, select] of CONSULTAS_CRITICAS) {
    const { error } = await adminClient.from(tabla).select(select).limit(1)
    add('Consultas', tabla, error ? 'falla' : 'ok',
      error ? `${error.message} — la pantalla que usa esta consulta queda vacía` : 'la base la acepta')
  }

  // ── Almacenamiento ──────────────────────────────────────────────────────
  const { data: buckets, error: errBuckets } = await adminClient.storage.listBuckets()
  if (errBuckets) {
    add('Archivos', 'listar buckets', 'falla', errBuckets.message)
  } else {
    const porNombre = new Map((buckets ?? []).map(b => [b.name, b]))
    for (const nombre of BUCKETS_PRIVADOS) {
      const b = porNombre.get(nombre)
      if (!b) add('Archivos', nombre, 'falla', 'no existe')
      else if (b.public) add('Archivos', nombre, 'falla', 'ES PÚBLICO y debería ser privado')
      else add('Archivos', nombre, 'ok', 'privado, como corresponde')
    }
    for (const nombre of BUCKETS_PUBLICOS) {
      const b = porNombre.get(nombre)
      if (!b) add('Archivos', nombre, 'falla', 'no existe')
      else add('Archivos', nombre, b.public ? 'ok' : 'aviso',
        b.public ? 'público, como corresponde' : 'es privado — los logos no se verán')
    }
  }

  // ── Coherencia de datos ─────────────────────────────────────────────────
  // Un usuario_libre sin empresa es normal: todavía no ha creado la suya.
  // Un empresa_admin o un empleado sin empresa sí es una inconsistencia real:
  // esos roles solo existen dentro de una empresa, y sin ella su panel no
  // puede resolver a qué datos tienen acceso.
  const { count: sinEmpresa } = await adminClient
    .from('profiles').select('*', { head: true, count: 'exact' })
    .is('empresa_id', null).in('rol', ['empresa_admin', 'empleado'])
  add('Datos', 'perfiles de empresa sin empresa asignada', (sinEmpresa ?? 0) === 0 ? 'ok' : 'falla',
    `${sinEmpresa ?? 0} perfil(es) con rol de empresa pero sin empresa_id — su panel no puede resolver a qué datos acceden`)

  const { count: itemsSinPeso } = await adminClient
    .from('items').select('*', { head: true, count: 'exact' }).is('peso_kg', null)
  add('Datos', 'ítems sin peso', (itemsSinPeso ?? 0) === 0 ? 'ok' : 'aviso',
    `${itemsSinPeso ?? 0} ítem(s) sin peso — su cálculo de CO2 dará cero`)

  const { count: itemsSinCo2 } = await adminClient
    .from('items').select('*', { head: true, count: 'exact' }).is('co2_por_unidad', null)
  add('Datos', 'ítems sin factor de CO2', (itemsSinCo2 ?? 0) === 0 ? 'ok' : 'aviso',
    `${itemsSinCo2 ?? 0} ítem(s) sin factor de CO2`)

  const { count: empresasSinPlan } = await adminClient
    .from('empresas').select('*', { head: true, count: 'exact' }).is('plan', null)
  add('Datos', 'empresas sin plan', (empresasSinPlan ?? 0) === 0 ? 'ok' : 'falla',
    `${empresasSinPlan ?? 0} empresa(s) sin plan — sus límites no se pueden calcular`)

  const resumen = {
    total: c.length,
    ok: c.filter(x => x.estado === 'ok').length,
    avisos: c.filter(x => x.estado === 'aviso').length,
    fallas: c.filter(x => x.estado === 'falla').length,
  }

  return {
    generado: new Date().toISOString(),
    entorno: process.env.VERCEL_ENV ?? 'local',
    base: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace('https://', '').replace('.supabase.co', ''),
    resumen,
    comprobaciones: c,
  }
}

/** Convierte el diagnóstico en el texto plano que se descarga como .txt */
export function comoTexto(d: Diagnostico): string {
  const fecha = new Date(d.generado).toLocaleString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const l: string[] = []
  l.push('DIAGNÓSTICO AUTOMÁTICO — Calculadora de Reúso')
  l.push('='.repeat(60))
  l.push(`Fecha:   ${fecha}`)
  l.push(`Entorno: ${d.entorno}`)
  l.push(`Base:    ${d.base}`)
  l.push('')
  l.push(`Comprobaciones: ${d.resumen.total}   Correctas: ${d.resumen.ok}   Avisos: ${d.resumen.avisos}   Fallas: ${d.resumen.fallas}`)
  l.push('')

  if (d.resumen.fallas > 0) {
    l.push('FALLAS QUE HAY QUE CORREGIR')
    l.push('-'.repeat(60))
    for (const x of d.comprobaciones.filter(x => x.estado === 'falla')) {
      l.push(`  [${x.grupo}] ${x.nombre}`)
      l.push(`      ${x.detalle}`)
    }
    l.push('')
  }

  if (d.resumen.avisos > 0) {
    l.push('AVISOS (no bloquean, conviene revisarlos)')
    l.push('-'.repeat(60))
    for (const x of d.comprobaciones.filter(x => x.estado === 'aviso')) {
      l.push(`  [${x.grupo}] ${x.nombre}: ${x.detalle}`)
    }
    l.push('')
  }

  l.push('DETALLE COMPLETO')
  l.push('-'.repeat(60))
  let grupoActual = ''
  for (const x of d.comprobaciones) {
    if (x.grupo !== grupoActual) { grupoActual = x.grupo; l.push(''); l.push(grupoActual) }
    const marca = x.estado === 'ok' ? 'OK  ' : x.estado === 'aviso' ? 'AVISO' : 'FALLA'
    l.push(`  ${marca}  ${x.nombre} — ${x.detalle}`)
  }
  l.push('')
  l.push(d.resumen.fallas === 0
    ? 'Sin fallas. El sistema responde a todas las comprobaciones automáticas.'
    : `${d.resumen.fallas} falla(s) por corregir. Pásale este archivo a Claude.`)
  return l.join('\n')
}
