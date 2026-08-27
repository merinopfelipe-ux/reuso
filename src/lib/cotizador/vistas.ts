// Vistas guardadas de la lista de cotizaciones (/empresa/cotizador) — mismo
// espíritu de "funciones puras, sin tocar Supabase" que src/lib/calculos/co2.ts.
// El filtrado/orden ya era client-side sobre los datos que trae
// GET /api/cotizador/cotizaciones (hasta 200 filas), esto solo lo hace
// configurable en vez de fijo (búsqueda + pestañas de estado).

export interface CotizacionParaVista {
  id: string
  codigo_cotizacion: string
  estado: string
  total: number
  co2_evitado_total_kg: number
  created_at: string
  updated_at: string
  fecha_enviada: string | null
  fecha_apertura_cliente: string | null
  fecha_ultima_apertura_cliente: string | null
  fecha_cierre: string | null
  veces_abierta: number
  crm_clientes: {
    nombre: string
    apellido: string | null
    telefono: string | null
    telefono_indicativo: string | null
    email: string | null
    crm_empresas_clientes: { razon_social: string; nombre_comercial: string | null } | null
  } | null
}

export type ClaveColumna =
  | 'cliente_nombre' | 'cliente_telefono' | 'created_at' | 'fecha_apertura_cliente'
  | 'codigo_cotizacion' | 'estado' | 'total' | 'co2_evitado_total_kg'
  | 'fecha_enviada' | 'veces_abierta'
  | 'empresa_principal' | 'correo' | 'ultima_actividad' | 'dias_para_cierre'
  | 'tipo_cliente'

export type TipoColumna = 'texto' | 'fecha' | 'numero'

export interface DefinicionColumna {
  clave: ClaveColumna
  label: string
  tipo: TipoColumna
  accessor: (c: CotizacionParaVista) => string | number | null
}

export const COLUMNAS_DISPONIBLES: DefinicionColumna[] = [
  {
    clave: 'cliente_nombre',
    label: 'Nombre',
    tipo: 'texto',
    accessor: c => {
      if (!c.crm_clientes) return null
      const emp = c.crm_clientes.crm_empresas_clientes
      const empInfo = Array.isArray(emp) ? emp[0] : emp
      if (empInfo) {
        return empInfo.nombre_comercial || empInfo.razon_social || null
      }
      return [c.crm_clientes.nombre, c.crm_clientes.apellido].filter(Boolean).join(' ') || null
    },
  },
  {
    clave: 'tipo_cliente',
    label: 'Tipo\ncliente',
    tipo: 'texto',
    accessor: c => {
      if (!c.crm_clientes) return null
      const emp = c.crm_clientes.crm_empresas_clientes
      const empInfo = Array.isArray(emp) ? emp[0] : emp
      return empInfo ? 'B2B' : 'B2C'
    },
  },
  { clave: 'cliente_telefono', label: 'Número de teléfono', tipo: 'texto', accessor: c => c.crm_clientes?.telefono ?? null },
  { clave: 'created_at', label: 'Fecha de creación', tipo: 'fecha', accessor: c => c.created_at },
  // Usa fecha_ultima_apertura_cliente (se actualiza en CADA apertura), no
  // fecha_apertura_cliente (esa solo guarda la primera, la usa
  // sales-dashboard.tsx para el tiempo de respuesta y no debe pisarse).
  { clave: 'fecha_apertura_cliente', label: 'Apertura reciente', tipo: 'fecha', accessor: c => c.fecha_ultima_apertura_cliente },
  { clave: 'codigo_cotizacion', label: 'Cotización', tipo: 'texto', accessor: c => c.codigo_cotizacion },
  { clave: 'estado', label: 'Estado', tipo: 'texto', accessor: c => c.estado },
  { clave: 'total', label: 'Total', tipo: 'numero', accessor: c => c.total },
  { clave: 'co2_evitado_total_kg', label: 'CO2 evitado', tipo: 'numero', accessor: c => c.co2_evitado_total_kg },
  { clave: 'fecha_enviada', label: 'Fecha enviada', tipo: 'fecha', accessor: c => c.fecha_enviada },
  { clave: 'veces_abierta', label: 'Veces abierta', tipo: 'numero', accessor: c => c.veces_abierta },
  { clave: 'empresa_principal', label: 'Empresa principal', tipo: 'texto', accessor: c => c.crm_clientes?.crm_empresas_clientes?.nombre_comercial ?? c.crm_clientes?.crm_empresas_clientes?.razon_social ?? null },
  { clave: 'correo', label: 'Correo', tipo: 'texto', accessor: c => c.crm_clientes?.email ?? null },
  { clave: 'ultima_actividad', label: 'Última actividad', tipo: 'fecha', accessor: c => c.updated_at },
  {
    clave: 'dias_para_cierre',
    label: 'Días para el cierre',
    tipo: 'numero',
    // Solo tiene valor si la cotización se envió Y ya cerró (ganada,
    // perdida o inviable) — mide cuánto tardó el negocio en resolverse
    // desde que el cliente la recibió, no desde que se creó.
    accessor: c => {
      if (!c.fecha_enviada || !c.fecha_cierre) return null
      const dias = Math.round((new Date(c.fecha_cierre).getTime() - new Date(c.fecha_enviada).getTime()) / 86_400_000)
      return dias >= 0 ? dias : null
    },
  },
]

export function definicionDe(clave: ClaveColumna): DefinicionColumna {
  const def = COLUMNAS_DISPONIBLES.find(d => d.clave === clave)
  if (!def) throw new Error(`Columna desconocida: ${clave}`)
  return def
}

// Ancho tope de columna, afinado POR TIPO de dato (no un mismo número para
// todas) — regla general de la plataforma, no solo del Cotizador. Fecha
// necesita más espacio ("D de mes. de AAAA H:MM a.m./p.m." es largo),
// número casi nunca necesita mucho, texto varía según el campo. Encabezado
// y celda comparten la MISMA proporción para que la columna quede
// coherente de arriba a abajo — el salto de línea sigue siendo "solo si
// hace falta" (line-clamp, nunca forzado), esto solo cambia cuánto espacio
// tiene antes de que haga falta.
// 5. Tablet/móvil: Se asignan min-w estrictos para asegurar que la tabla
// haga scroll horizontal (overflow-x-auto) en pantallas pequeñas, evitando
// que las columnas se aplasten "todo encima de todo" (solicitud del usuario).
export function anchoColumna(clave: ClaveColumna): { celda: string; encabezado: string } {
  if (clave === 'cliente_telefono') return { celda: 'min-w-[145px] max-w-[145px] xl:max-w-[190px]', encabezado: 'min-w-[110px] max-w-[110px] xl:max-w-[140px]' }
  if (clave === 'cliente_nombre') return { celda: 'min-w-[100px] max-w-[100px] xl:max-w-[220px]', encabezado: 'min-w-[80px] max-w-[80px] xl:max-w-[160px]' }
  // "B2C"/"B2B" son 3 caracteres fijos — la CELDA va lo más angosta posible
  // el ENCABEZADO necesita más ancho que la celda para que quepa "Tipo cliente"
  // en una sola línea (o en dos con whitespace-pre). "cliente" ocupa ~45px.
  if (clave === 'tipo_cliente') return { celda: 'min-w-[24px] max-w-[30px] xl:max-w-[40px]', encabezado: 'min-w-[38px] max-w-[42px] xl:max-w-[50px]' }
  // "COT XXXXXXXX" nunca debe cortarse. El ancho se ajusta para garantizar que quepa completo.
  if (clave === 'codigo_cotizacion') return { celda: 'min-w-[115px] max-w-[115px] xl:max-w-[130px]', encabezado: 'min-w-[95px] max-w-[95px] xl:max-w-[110px]' }
  const tipo = definicionDe(clave).tipo
  if (tipo === 'fecha') return { celda: 'min-w-[135px] max-w-[135px] xl:max-w-[230px]', encabezado: 'min-w-[95px] max-w-[95px] xl:max-w-[175px]' }
  if (tipo === 'numero') return { celda: 'min-w-[90px] max-w-[90px] xl:max-w-[150px]', encabezado: 'min-w-[75px] max-w-[75px] xl:max-w-[130px]' }
  return { celda: 'min-w-[115px] max-w-[115px] xl:max-w-[200px]', encabezado: 'min-w-[80px] max-w-[80px] xl:max-w-[150px]' }
}

// Alineación del contenido de celda según el tipo de dato: texto izquierda,
// fechas y teléfonos al centro, números a la derecha. Ahora aplica tanto a
// la celda como al título de la columna (encabezado).
export function alineacionColumna(clave: ClaveColumna): 'text-left' | 'text-center' | 'text-right' {
  if (clave === 'cliente_telefono' || clave === 'tipo_cliente' || clave === 'codigo_cotizacion') return 'text-center'
  const tipo = definicionDe(clave).tipo
  if (tipo === 'fecha') return 'text-center'
  if (tipo === 'numero') return 'text-right'
  return 'text-left'
}

// Orden por defecto pedido explícitamente: fecha de creación, de la más
// reciente a la más antigua — coincide con el .order() que ya trae la API.
export const COLUMNAS_DEFAULT: ClaveColumna[] = ['codigo_cotizacion', 'tipo_cliente', 'cliente_nombre', 'cliente_telefono', 'created_at', 'fecha_apertura_cliente']
export const ORDEN_DEFAULT: OrdenVista = { campo: 'created_at', dir: 'desc' }

export type FiltroCondicion =
  | { campo: ClaveColumna; tipo: 'texto'; contiene: string }
  | { campo: ClaveColumna; tipo: 'fecha'; desde?: string; hasta?: string }
  | { campo: ClaveColumna; tipo: 'numero'; min?: number; max?: number }

export interface OrdenVista {
  campo: ClaveColumna
  dir: 'asc' | 'desc'
}

export interface VistaCotizador {
  id: string
  nombre: string
  columnas: ClaveColumna[]
  filtros: FiltroCondicion[]
  orden: OrdenVista
}

export function vistaPorDefecto(): VistaCotizador {
  return {
    id: 'default',
    nombre: 'Todas las cotizaciones',
    columnas: COLUMNAS_DEFAULT,
    filtros: [],
    orden: ORDEN_DEFAULT,
  }
}

export function aplicarFiltros<T extends CotizacionParaVista>(cotizaciones: T[], filtros: FiltroCondicion[]): T[] {
  if (filtros.length === 0) return cotizaciones
  return cotizaciones.filter(c => filtros.every(f => cumpleFiltro(c, f)))
}

function cumpleFiltro(c: CotizacionParaVista, f: FiltroCondicion): boolean {
  const valor = definicionDe(f.campo).accessor(c)
  if (f.tipo === 'texto') {
    if (!f.contiene) return true
    return (String(valor ?? '')).toLowerCase().includes(f.contiene.toLowerCase())
  }
  if (f.tipo === 'fecha') {
    if (!valor) return !f.desde && !f.hasta
    const t = new Date(valor as string).getTime()
    if (f.desde && t < new Date(f.desde).getTime()) return false
    if (f.hasta && t > new Date(f.hasta).getTime() + 86_400_000 - 1) return false
    return true
  }
  // numero
  const n = valor == null ? null : Number(valor)
  if (n == null || Number.isNaN(n)) return f.min == null && f.max == null
  if (f.min != null && n < f.min) return false
  if (f.max != null && n > f.max) return false
  return true
}

export function aplicarOrden<T extends CotizacionParaVista>(cotizaciones: T[], orden: OrdenVista): T[] {
  const def = definicionDe(orden.campo)
  return [...cotizaciones].sort((a, b) => {
    const va = def.accessor(a)
    const vb = def.accessor(b)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    if (def.tipo === 'fecha') {
      const diff = new Date(va as string).getTime() - new Date(vb as string).getTime()
      return orden.dir === 'asc' ? diff : -diff
    }
    if (def.tipo === 'numero') {
      const diff = Number(va) - Number(vb)
      return orden.dir === 'asc' ? diff : -diff
    }
    const cmp = String(va).toLowerCase().localeCompare(String(vb).toLowerCase(), 'es')
    return orden.dir === 'asc' ? cmp : -cmp
  })
}
