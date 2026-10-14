// Migración de archivos existentes a la carpeta de cada empresa (empresas/<id>/...).
//
// Tres fases, en este orden:
//   1. planificarMigracion: NO cambia nada. Lee la base y lista los archivos
//      de cada empresa: qué moverá y qué filas actualizará.
//   2. aplicarMigracion: por cada archivo, actualiza sus filas y luego lo
//      mueve. Si cualquiera de los dos pasos falla, se deshace el otro. Así
//      nunca queda una fila apuntando a un archivo que ya no está allí.
//      Devuelve un registro completo para revertir.
//   3. revertirMigracion: deshace lo aplicado con ese registro.
//
// Solo se mueven archivos que son de la empresa (por su ruta, o porque una
// fila de la empresa los apunta). Nunca se mueve un archivo de otra empresa.

import { createAdminClient } from '@/lib/supabase/admin'
import {
  CARPETAS_LEGADAS,
  rutaDesdeUrl,
  rutaEmpresa,
  rutaInformeUsuario,
  rutaNuevaDesdeLegada,
  rutaSegura,
} from './empresa-rutas'
import { listarTodo } from './empresa-storage'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

const COLUMNA_JSON = 'por_que_elegirnos_json'

// Una referencia de una fila a un archivo. En columnas de ruta simple, `bucketPorDefecto`
// dice el bucket. Las URL públicas traen bucket y ruta.
interface Referencia {
  tabla: string
  id: string
  columna: string
  valor: string
  bucketPorDefecto?: string
}

export interface Movimiento {
  bucket: string
  desde: string
  hacia: string
  empresa: string
  origen: string
}

export interface ActualizacionFila {
  tabla: string
  id: string
  columna: string
  antes: string // valor de la columna antes de la migración (texto; para la columna JSON, el JSON completo)
  reemplazos: Array<{ bucket: string; desde: string; hacia: string }>
}

export interface Plan {
  empresas: string[]
  movimientos: Movimiento[]
  actualizaciones: ActualizacionFila[]
  sinRegla: Array<{ origen: string; valor: string }>
  rechazados: Array<{ origen: string; valor: string }>
}

export interface RegistroFila {
  tabla: string
  id: string
  columna: string
  antes: string
  despues: string
  archivo: string // desde del movimiento que la cambió
}

export interface Registro {
  fecha: string
  movimientos: Array<Movimiento & { ok: boolean; error?: string }>
  filas: RegistroFila[]
}

// Valor de la columna en el formato que se guarda en la base.
function aValorDb(columna: string, texto: string): unknown {
  return columna === COLUMNA_JSON ? JSON.parse(texto) : texto
}

// Ruta nueva de un archivo, o null si no hay regla o ya está en su lugar.
function rutaNueva(bucket: string, ruta: string, empresa: string, referencia?: Referencia): string | null {
  if (ruta.startsWith(`empresas/${empresa}/`) || ruta.startsWith('usuarios/')) return null

  const legada = rutaNuevaDesdeLegada(ruta, empresa)
  if (legada) return legada.hacia

  // Logo de empresa anterior: "logos/<archivo>" en empresas.logo_url.
  if (bucket === 'logos' && /^logos\/[^/]+$/.test(ruta) && referencia?.tabla === 'empresas') {
    return rutaEmpresa(empresa, 'logoEmpresa', ruta.slice('logos/'.length))
  }

  // Foto de activo DPP anterior: "dpp/imagenes/<archivo>" en dpp_activos.imagen_url.
  if (bucket === 'dpp' && /^dpp\/imagenes\/[^/]+$/.test(ruta) && referencia?.tabla === 'dpp_activos') {
    return rutaEmpresa(empresa, 'dppImagenes', ruta.slice('dpp/imagenes/'.length))
  }

  // Informe personal de un usuario: "informes/usuario/<id>/<archivo>".
  const informeUsuario = /^informes\/usuario\/([^/]+)\/([^/]+)$/.exec(ruta)
  if (informeUsuario) return rutaInformeUsuario(informeUsuario[1], informeUsuario[2])

  return null
}

// Referencias de la empresa: filas que apuntan a archivos suyos.
async function referenciasDe(admin: AdminClient, empresa: string, miembros: string[]): Promise<Referencia[]> {
  const refs: Referencia[] = []

  const { data: emp } = await admin
    .from('empresas')
    .select('id, logo_url, logo_svg_url, logo_propuesta_url, por_que_elegirnos_json')
    .eq('id', empresa)
    .maybeSingle()
  if (emp) {
    for (const col of ['logo_url', 'logo_svg_url', 'logo_propuesta_url'] as const) {
      const v = emp[col] as string | null
      if (v) refs.push({ tabla: 'empresas', id: emp.id, columna: col, valor: v, bucketPorDefecto: 'logos' })
    }
    // El JSON completo es una sola fila; sus URLs se tratan dentro de ella.
    refs.push({ tabla: 'empresas', id: emp.id, columna: COLUMNA_JSON, valor: JSON.stringify(emp.por_que_elegirnos_json ?? {}) })
  }

  const { data: muebles } = await admin.from('crm_muebles_cotizados').select('id, imagen_url').eq('empresa_id', empresa)
  for (const m of muebles ?? []) {
    if (m.imagen_url) refs.push({ tabla: 'crm_muebles_cotizados', id: m.id, columna: 'imagen_url', valor: m.imagen_url, bucketPorDefecto: 'cotizador' })
  }

  const { data: activos } = await admin.from('dpp_activos').select('id, imagen_url').eq('empresa_id', empresa)
  for (const a of activos ?? []) {
    if (a.imagen_url) refs.push({ tabla: 'dpp_activos', id: a.id, columna: 'imagen_url', valor: a.imagen_url, bucketPorDefecto: 'dpp' })
  }

  const { data: docs } = await admin.from('dpp_documentos_ingesta').select('id, archivo_url').eq('empresa_id', empresa)
  for (const d of docs ?? []) {
    if (d.archivo_url) refs.push({ tabla: 'dpp_documentos_ingesta', id: d.id, columna: 'archivo_url', valor: d.archivo_url, bucketPorDefecto: 'dpp' })
  }

  let consultaInformes = admin.from('informes').select('id, pdf_url')
  consultaInformes = miembros.length > 0
    ? consultaInformes.or(`empresa_id.eq.${empresa},user_id.in.(${miembros.join(',')})`)
    : consultaInformes.eq('empresa_id', empresa)
  const { data: informes } = await consultaInformes
  for (const i of informes ?? []) {
    if (i.pdf_url) refs.push({ tabla: 'informes', id: i.id, columna: 'pdf_url', valor: i.pdf_url, bucketPorDefecto: 'documentos' })
  }

  return refs
}

// Bucket y ruta de un valor que apunta a un archivo de Storage. null si no es nuestro.
function bucketYRuta(valor: string, bucketPorDefecto?: string): { bucket: string; ruta: string } | null {
  const desdeUrl = rutaDesdeUrl(valor)
  if (desdeUrl) return { bucket: desdeUrl.bucket, ruta: desdeUrl.path }
  if (bucketPorDefecto && !valor.startsWith('http')) return { bucket: bucketPorDefecto, ruta: valor }
  return null
}

// URLs de Storage dentro de un texto (sirve para el JSON de por qué elegirnos).
function urlsDeStorage(texto: string): string[] {
  return (texto.match(/https?:\/\/[^"\\\s]+/g) ?? []).filter(u => rutaDesdeUrl(u) !== null)
}

// Calcula el plan de una lista de empresas. No modifica nada.
export async function planificarMigracion(admin: AdminClient, empresas: string[]): Promise<Plan> {
  const plan: Plan = { empresas, movimientos: [], actualizaciones: [], sinRegla: [], rechazados: [] }
  const movidos = new Map<string, Movimiento>()

  for (const empresa of empresas) {
    const { data: perfiles } = await admin.from('profiles').select('user_id').eq('empresa_id', empresa)
    const miembros = (perfiles ?? []).map(p => p.user_id as string)
    const refs = await referenciasDe(admin, empresa, miembros)

    for (const ref of refs) {
      // Columna JSON: cada URL de Storage dentro del JSON es un archivo, y el JSON es una fila.
      const candidatos: Array<{ valor: string; bucket?: string }> = ref.columna === COLUMNA_JSON
        ? urlsDeStorage(ref.valor).map(valor => ({ valor }))
        : [{ valor: ref.valor, bucket: ref.bucketPorDefecto }]

      for (const cand of candidatos) {
        const leido = bucketYRuta(cand.valor, cand.bucket)
        if (!leido) {
          if (!cand.valor.startsWith('http')) plan.sinRegla.push({ origen: `${ref.tabla}.${ref.columna}`, valor: cand.valor })
          continue
        }
        if (!rutaSegura(leido.ruta, empresa)) {
          plan.rechazados.push({ origen: `${ref.tabla}.${ref.columna}`, valor: leido.ruta })
          continue
        }
        const hacia = rutaNueva(leido.bucket, leido.ruta, empresa, ref)
        if (!hacia) {
          const yaEnSuSitio = leido.ruta.startsWith(`empresas/${empresa}/`) || leido.ruta.startsWith('usuarios/')
          if (!yaEnSuSitio) plan.sinRegla.push({ origen: `${ref.tabla}.${ref.columna}`, valor: leido.ruta })
          continue
        }

        const clave = `${leido.bucket}|${leido.ruta}`
        if (!movidos.has(clave)) {
          const mov: Movimiento = { bucket: leido.bucket, desde: leido.ruta, hacia, empresa, origen: `${ref.tabla}.${ref.columna}` }
          movidos.set(clave, mov)
          plan.movimientos.push(mov)
        }

        let fila = plan.actualizaciones.find(a => a.tabla === ref.tabla && a.id === ref.id && a.columna === ref.columna)
        if (!fila) {
          fila = { tabla: ref.tabla, id: ref.id, columna: ref.columna, antes: ref.valor, reemplazos: [] }
          plan.actualizaciones.push(fila)
        }
        fila.reemplazos.push({ bucket: leido.bucket, desde: leido.ruta, hacia })
      }
    }

    // Archivos sueltos en las carpetas antiguas de la empresa (sin fila que los apunte).
    for (const legada of CARPETAS_LEGADAS) {
      const archivos = await listarTodo(admin, legada.bucket, legada.prefijo(empresa))
      for (const ruta of archivos) {
        const clave = `${legada.bucket}|${ruta}`
        if (movidos.has(clave)) continue
        const hacia = legada.nueva(empresa, ruta.slice(legada.prefijo(empresa).length))
        const mov: Movimiento = { bucket: legada.bucket, desde: ruta, hacia, empresa, origen: 'carpeta antigua' }
        movidos.set(clave, mov)
        plan.movimientos.push(mov)
      }
    }
  }

  return plan
}

// Escribe el valor de una fila. Devuelve el error de la base, si lo hubo.
async function escribirFila(admin: AdminClient, tabla: string, id: string, columna: string, texto: string): Promise<string | undefined> {
  const { error } = await admin.from(tabla).update({ [columna]: aValorDb(columna, texto) }).eq('id', id)
  return error?.message
}

// Aplica el plan. Por cada archivo: actualiza sus filas y luego lo mueve.
// Si falla cualquiera de los dos pasos, deshace lo que ya cambió de ese archivo.
export async function aplicarMigracion(admin: AdminClient, plan: Plan): Promise<Registro> {
  const registro: Registro = { fecha: new Date().toISOString(), movimientos: [], filas: [] }
  const valorActual = new Map<string, string>() // "tabla|id|columna" -> texto actual

  for (const mov of plan.movimientos) {
    const filas = plan.actualizaciones.filter(f => f.reemplazos.some(r => r.bucket === mov.bucket && r.desde === mov.desde))
    const cambios: Array<{ tabla: string; id: string; columna: string; antes: string; despues: string }> = []
    let fallo: string | undefined

    for (const f of filas) {
      const clave = `${f.tabla}|${f.id}|${f.columna}`
      const previo = valorActual.get(clave) ?? f.antes
      const nuevo = previo.split(mov.desde).join(mov.hacia)
      if (nuevo === previo) {
        fallo = `La fila ${f.tabla}.${f.id} no contiene la ruta esperada`
        break
      }
      const error = await escribirFila(admin, f.tabla, f.id, f.columna, nuevo)
      if (error) {
        fallo = `No se pudo actualizar ${f.tabla}.${f.id}: ${error}`
        break
      }
      cambios.push({ tabla: f.tabla, id: f.id, columna: f.columna, antes: previo, despues: nuevo })
    }

    if (!fallo) {
      const { error } = await admin.storage.from(mov.bucket).move(mov.desde, mov.hacia)
      if (error) fallo = `No se pudo mover el archivo: ${error.message}`
    }

    if (fallo) {
      // Deshacer las filas de este archivo (el archivo no se movió, o se volvió a su sitio).
      for (const c of [...cambios].reverse()) {
        await escribirFila(admin, c.tabla, c.id, c.columna, c.antes)
      }
      registro.movimientos.push({ ...mov, ok: false, error: fallo })
      continue
    }

    for (const c of cambios) {
      valorActual.set(`${c.tabla}|${c.id}|${c.columna}`, c.despues)
      registro.filas.push({ ...c, archivo: mov.desde })
    }
    registro.movimientos.push({ ...mov, ok: true })
  }

  return registro
}

// Deshace lo aplicado: restaura las filas (en orden inverso) y devuelve los archivos a su lugar.
export async function revertirMigracion(admin: AdminClient, registro: Registro): Promise<{ restaurados: number; errores: string[] }> {
  const errores: string[] = []
  let restaurados = 0
  for (const f of [...registro.filas].reverse()) {
    const error = await escribirFila(admin, f.tabla, f.id, f.columna, f.antes)
    if (error) errores.push(`${f.tabla}.${f.id}: ${error}`)
    else restaurados++
  }
  for (const mov of [...registro.movimientos].filter(m => m.ok).reverse()) {
    const { error } = await admin.storage.from(mov.bucket).move(mov.hacia, mov.desde)
    if (error) errores.push(`${mov.bucket}/${mov.hacia}: ${error.message}`)
  }
  return { restaurados, errores }
}
