// Organización de archivos de Storage por empresa. Fuente única de la regla.
//
// Regla: todo archivo que pertenece a una empresa vive bajo
//   empresas/<empresaId>/<área>/...
// dentro de su bucket. Así borrar una empresa es borrar esa carpeta y nada
// más, y nunca se toca el archivo de otra empresa.
//
// Los informes personales de un usuario (no de la empresa) viven en
//   usuarios/<userId>/informes/...
//
// Las rutas anteriores a esta regla siguen existiendo en la base de datos.
// Están listadas en CARPETAS_LEGADAS para poder detectarlas, moverlas y borrarlas.

export const BUCKETS = {
  logos: 'logos',
  cotizador: 'cotizador',
  dpp: 'dpp',
  documentos: 'documentos',
} as const

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS]

const RAIZ = 'empresas'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

// Áreas válidas dentro de la carpeta de cada empresa, por bucket.
export const AREAS = {
  logoAdmin: { bucket: 'logos', carpeta: 'logos/admin' },
  logoPropuesta: { bucket: 'logos', carpeta: 'logos/propuesta' },
  logoPorQueElegirnos: { bucket: 'logos', carpeta: 'logos/por-que-elegirnos' },
  logoEmpresa: { bucket: 'logos', carpeta: 'logos/empresa' },
  cotizador: { bucket: 'cotizador', carpeta: 'cotizador' },
  dppImagenes: { bucket: 'dpp', carpeta: 'dpp/imagenes' },
  dppIngestas: { bucket: 'dpp', carpeta: 'dpp/ingestas' },
  informes: { bucket: 'documentos', carpeta: 'informes' },
} as const

export type Area = keyof typeof AREAS

// Trozo de ruta seguro: sin vacíos, sin subida de nivel, sin barras.
function validarTrozo(trozo: string): string {
  if (!trozo || trozo === '.' || trozo === '..' || trozo.includes('/') || trozo.includes('\\')) {
    throw new Error('Nombre de archivo o carpeta no válido.')
  }
  return trozo
}

// Ruta nueva de un archivo de empresa. `subcarpeta` es opcional (p. ej. el id del activo).
export function rutaEmpresa(empresaId: string, area: Area, nombre: string, subcarpeta?: string): string {
  const partes = [RAIZ, validarTrozo(empresaId), ...AREAS[area].carpeta.split('/')]
  if (subcarpeta) partes.push(validarTrozo(subcarpeta))
  partes.push(validarTrozo(nombre))
  return partes.join('/')
}

// Carpeta de un área de una empresa (para listar o limpiar).
export function carpetaArea(empresaId: string, area: Area): string {
  return `${RAIZ}/${validarTrozo(empresaId)}/${AREAS[area].carpeta}`
}

// Carpeta raíz de una empresa dentro de un bucket.
export function carpetaEmpresa(empresaId: string): string {
  return `${RAIZ}/${empresaId}/`
}

// Ruta de los informes personales de un usuario (no de la empresa).
export function rutaInformeUsuario(userId: string, nombre: string): string {
  return `usuarios/${validarTrozo(userId)}/informes/${validarTrozo(nombre)}`
}

// Carpetas de la forma anterior. `prefijo` recibe el id de empresa; `nueva`
// recibe el mismo resto de la ruta y devuelve la ruta nueva.
export interface CarpetaLegada {
  bucket: Bucket
  prefijo: (empresaId: string) => string
  nueva: (empresaId: string, resto: string) => string
}

export const CARPETAS_LEGADAS: CarpetaLegada[] = [
  {
    bucket: 'logos',
    prefijo: e => `logos-admin/${e}/`,
    nueva: (e, r) => rutaEmpresa(e, 'logoAdmin', r),
  },
  {
    bucket: 'logos',
    prefijo: e => `propuesta-logos/${e}/`,
    nueva: (e, r) => rutaEmpresa(e, 'logoPropuesta', r),
  },
  {
    bucket: 'logos',
    prefijo: e => `por-que-elegirnos/${e}/`,
    nueva: (e, r) => rutaEmpresa(e, 'logoPorQueElegirnos', r),
  },
  {
    bucket: 'cotizador',
    prefijo: e => `cotizador/${e}/`,
    nueva: (e, r) => rutaEmpresa(e, 'cotizador', r),
  },
  {
    bucket: 'dpp',
    prefijo: e => `dpp/ingestas/${e}/`,
    nueva: (e, r) => `${RAIZ}/${e}/dpp/ingestas/${r}`,
  },
  {
    bucket: 'documentos',
    prefijo: e => `informes/empresa/${e}/`,
    nueva: (e, r) => rutaEmpresa(e, 'informes', r),
  },
]

// Carpetas de empresa de cada bucket, para borrar en bloque: la nueva y las legadas.
export function carpetasDeBorradoPorBucket(empresaId: string): Array<{ bucket: Bucket; prefijo: string }> {
  const lista: Array<{ bucket: Bucket; prefijo: string }> = []
  for (const bucket of Object.values(BUCKETS)) {
    lista.push({ bucket, prefijo: carpetaEmpresa(empresaId) })
  }
  for (const legada of CARPETAS_LEGADAS) {
    lista.push({ bucket: legada.bucket, prefijo: legada.prefijo(empresaId) })
  }
  return lista
}

// Si la ruta pertenece a OTRA empresa (por su id en la ruta), devuelve ese id.
// Sirve para no borrar, por error, un archivo de otra empresa que una fila
// pudo haber apuntado.
export function empresaDueniaDeRuta(ruta: string): string | null {
  const nueva = new RegExp(`^${RAIZ}/(${UUID})/`).exec(ruta)
  if (nueva) return nueva[1]
  for (const legada of CARPETAS_LEGADAS) {
    const m = new RegExp(`^${legada.prefijo('(' + UUID + ')').replace(/\//g, '\\/')}`).exec(ruta)
    if (m) return m[1]
  }
  return null
}

// ¿Esta ruta es segura de borrar para la empresa dada?
// Segura = no es de otra empresa. Las rutas sin id de empresa (p. ej. un
// informe personal) se aceptan solo si el caso que las pidió es suyo; eso lo
// decide quien llama.
export function rutaSegura(ruta: string, empresaId: string): boolean {
  const dueño = empresaDueniaDeRuta(ruta)
  return dueño === null || dueño === empresaId
}

// Traduce una ruta legada a su ruta nueva para la empresa dada. Devuelve null
// si la ruta no es de ninguna carpeta legada de esa empresa.
export function rutaNuevaDesdeLegada(ruta: string, empresaId: string): { bucket: Bucket; desde: string; hacia: string } | null {
  for (const legada of CARPETAS_LEGADAS) {
    const prefijo = legada.prefijo(empresaId)
    if (ruta.startsWith(prefijo)) {
      const resto = ruta.slice(prefijo.length)
      return { bucket: legada.bucket, desde: ruta, hacia: legada.nueva(empresaId, resto) }
    }
  }
  return null
}

// Extrae bucket y ruta de una URL pública o firmada de Supabase Storage.
// Para valores que ya son solo una ruta, devuelve null (el caller sabe el bucket).
export function rutaDesdeUrl(valor: string): { bucket: string; path: string } | null {
  if (!valor.startsWith('http')) return null
  const m = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?#]+)/.exec(valor)
  if (!m) return null
  return { bucket: m[1], path: decodeURIComponent(m[2]) }
}
