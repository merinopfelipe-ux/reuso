// Operaciones de Storage para borrar una empresa sin dejar basura.
//
// Orden seguro (lo usa la API de borrado, en este orden):
//   1. manifiestoEmpresa: lista TODO lo que pertenece a la empresa (carpetas
//      completas y archivos exactos que apuntan las filas de la base).
//   2. ejecutarBorradoStorage: borra esos archivos y verifica que las carpetas
//      quedaron vacías. Si algo falla, se detiene ANTES de tocar la base: la
//      empresa sigue intacta y se puede reintentar.
//   3. La función SQL borra las filas en una transacción.
//   4. Se borran las cuentas de acceso de los miembros.

import { createAdminClient } from '@/lib/supabase/admin'
import {
  carpetasDeBorradoPorBucket,
  rutaDesdeUrl,
  rutaSegura,
  type Bucket,
} from './empresa-rutas'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

export interface CarpetaBorrado {
  bucket: Bucket
  prefijo: string
}

export interface ArchivoExacto {
  bucket: string
  path: string
  origen: string // tabla.columna, solo para el registro
}

export interface Manifiesto {
  carpetas: CarpetaBorrado[]
  exactos: ArchivoExacto[]
  rechazados: Array<{ origen: string; valor: string }>
}

export interface ResultadoBorrado {
  ok: boolean
  archivosBorrados: number
  restantes: number
  errores: string[]
}

const LOTE = 500
const PAGINA = 1000

// Lista TODOS los archivos bajo un prefijo, entrando en las subcarpetas.
// Devuelve rutas completas dentro del bucket.
export async function listarTodo(admin: AdminClient, bucket: string, prefijo: string): Promise<string[]> {
  const carpeta = prefijo.replace(/\/$/, '')
  const archivos: string[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list(carpeta, {
      limit: PAGINA,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) throw new Error(`No se pudo listar ${bucket}/${carpeta}: ${error.message}`)
    if (!data || data.length === 0) break
    for (const item of data) {
      const ruta = carpeta ? `${carpeta}/${item.name}` : item.name
      if (item.id === null) {
        // Carpeta: entrar en ella.
        archivos.push(...(await listarTodo(admin, bucket, `${ruta}/`)))
      } else {
        archivos.push(ruta)
      }
    }
    if (data.length < PAGINA) break
    offset += PAGINA
  }
  return archivos
}

// Borra una lista de rutas en lotes. Devuelve cuántas se borraron y los errores.
async function borrarRutas(admin: AdminClient, bucket: string, rutas: string[]): Promise<{ borrados: number; errores: string[] }> {
  let borrados = 0
  const errores: string[] = []
  for (let i = 0; i < rutas.length; i += LOTE) {
    const lote = rutas.slice(i, i + LOTE)
    const { data, error } = await admin.storage.from(bucket).remove(lote)
    if (error) {
      errores.push(`${bucket}: ${error.message}`)
    } else {
      borrados += data?.length ?? lote.length
    }
  }
  return { borrados, errores }
}

// Obtiene el manifiesto de la empresa: carpetas y archivos exactos a borrar.
// Lee la base SOLO para encontrar archivos; no cambia nada.
export async function manifiestoEmpresa(
  admin: AdminClient,
  empresaId: string,
  miembros: string[]
): Promise<Manifiesto> {
  const exactos: ArchivoExacto[] = []
  const rechazados: Manifiesto['rechazados'] = []

  const agregar = (origen: string, bucket: string, path: string) => {
    if (!rutaSegura(path, empresaId)) {
      rechazados.push({ origen, valor: path })
      return
    }
    exactos.push({ bucket, path, origen })
  }

  // Un valor puede ser una URL de Storage (se lee bucket y ruta) o una ruta
  // simple (el bucket lo dice la columna).
  const agregarValor = (origen: string, valor: string | null | undefined, bucketPorDefecto?: string) => {
    if (!valor) return
    const desdeUrl = rutaDesdeUrl(valor)
    if (desdeUrl) return agregar(origen, desdeUrl.bucket, desdeUrl.path)
    if (bucketPorDefecto) agregar(origen, bucketPorDefecto, valor)
  }

  // 1. Empresa: logos y las imágenes de "por qué elegirnos" (dentro del JSON).
  const { data: emp } = await admin
    .from('empresas')
    .select('logo_url, logo_svg_url, logo_propuesta_url, por_que_elegirnos_json')
    .eq('id', empresaId)
    .maybeSingle()
  if (emp) {
    agregarValor('empresas.logo_url', emp.logo_url)
    agregarValor('empresas.logo_svg_url', emp.logo_svg_url)
    agregarValor('empresas.logo_propuesta_url', emp.logo_propuesta_url)
    const urls = JSON.stringify(emp.por_que_elegirnos_json ?? {}).match(/https?:\/\/[^"\\\s]+/g) ?? []
    for (const url of urls) agregarValor('empresas.por_que_elegirnos_json', url)
  }

  // 2. Cotizador: imagen de cada mueble (ruta simple, bucket cotizador).
  const { data: muebles } = await admin
    .from('crm_muebles_cotizados')
    .select('imagen_url')
    .eq('empresa_id', empresaId)
  for (const m of muebles ?? []) agregarValor('crm_muebles_cotizados.imagen_url', m.imagen_url, 'cotizador')

  // 3. DPP: imagen y QR de cada activo, y documentos de ingesta.
  const { data: activos } = await admin
    .from('dpp_activos')
    .select('imagen_url, qr_url')
    .eq('empresa_id', empresaId)
  for (const a of activos ?? []) {
    agregarValor('dpp_activos.imagen_url', a.imagen_url, 'dpp')
    agregarValor('dpp_activos.qr_url', a.qr_url)
  }
  const { data: docs } = await admin
    .from('dpp_documentos_ingesta')
    .select('archivo_url')
    .eq('empresa_id', empresaId)
  for (const d of docs ?? []) agregarValor('dpp_documentos_ingesta.archivo_url', d.archivo_url, 'dpp')

  // 4. Informes de la empresa y los personales de sus miembros.
  let consultaInformes = admin.from('informes').select('pdf_url')
  consultaInformes = miembros.length > 0
    ? consultaInformes.or(`empresa_id.eq.${empresaId},user_id.in.(${miembros.join(',')})`)
    : consultaInformes.eq('empresa_id', empresaId)
  const { data: informes } = await consultaInformes
  for (const i of informes ?? []) agregarValor('informes.pdf_url', i.pdf_url, 'documentos')

  // 5. Avatares de los miembros (solo si son URL de Storage).
  if (miembros.length > 0) {
    const { data: perfiles } = await admin.from('profiles').select('avatar_url').in('user_id', miembros)
    for (const p of perfiles ?? []) agregarValor('profiles.avatar_url', p.avatar_url)
  }

  return {
    carpetas: carpetasDeBorradoPorBucket(empresaId).map(c => ({ bucket: c.bucket, prefijo: c.prefijo })),
    exactos,
    rechazados,
  }
}

// Borra lo que indica el manifiesto y verifica que no quedó nada.
// No se detiene a la primera: intenta todo y reporta. El caller decide si sigue.
export async function ejecutarBorradoStorage(admin: AdminClient, manifiesto: Manifiesto): Promise<ResultadoBorrado> {
  let archivosBorrados = 0
  let restantes = 0
  const errores: string[] = []

  // Carpetas completas: listar, borrar, volver a listar para comprobar.
  for (const carpeta of manifiesto.carpetas) {
    try {
      const archivos = await listarTodo(admin, carpeta.bucket, carpeta.prefijo)
      if (archivos.length === 0) continue
      const r = await borrarRutas(admin, carpeta.bucket, archivos)
      archivosBorrados += r.borrados
      errores.push(...r.errores)
      const quedan = await listarTodo(admin, carpeta.bucket, carpeta.prefijo)
      restantes += quedan.length
    } catch (e) {
      errores.push(e instanceof Error ? e.message : String(e))
    }
  }

  // Archivos exactos que apuntan las filas (incluidos los legados fuera de la carpeta nueva).
  const porBucket = new Map<string, string[]>()
  for (const ex of manifiesto.exactos) {
    porBucket.set(ex.bucket, [...(porBucket.get(ex.bucket) ?? []), ex.path])
  }
  for (const [bucket, rutas] of porBucket) {
    const r = await borrarRutas(admin, bucket, [...new Set(rutas)])
    archivosBorrados += r.borrados
    errores.push(...r.errores)
  }

  return { ok: errores.length === 0 && restantes === 0, archivosBorrados, restantes, errores }
}

// Cuenta lo que se borraría, sin borrar nada (para la vista previa).
export async function contarStorageEmpresa(admin: AdminClient, empresaId: string, miembros: string[]) {
  const m = await manifiestoEmpresa(admin, empresaId, miembros)
  let enCarpetas = 0
  for (const carpeta of m.carpetas) {
    enCarpetas += (await listarTodo(admin, carpeta.bucket, carpeta.prefijo)).length
  }
  return { archivos: enCarpetas + m.exactos.length, rechazados: m.rechazados.length }
}
