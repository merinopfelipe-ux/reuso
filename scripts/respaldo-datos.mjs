#!/usr/bin/env node
/**
 * Respaldo de los DATOS de la base, vía API de Supabase.
 *
 * Por qué no `pg_dump`: la conexión directa de Supabase resuelve solo a IPv6
 * y los runners de GitHub no lo soportan, mientras que el pooler impone
 * restricciones que hacen fallar el volcado. Este script usa la API REST con
 * la llave de servicio: la misma que ya usa la aplicación, sin depender de
 * la red de Postgres ni de la versión del cliente.
 *
 * El ESQUEMA (tablas, funciones, políticas) no se incluye a propósito: ya
 * está versionado en `sql/` dentro del repositorio. Aquí van los datos, que
 * son lo único que no se puede reconstruir.
 *
 * Uso:  node scripts/respaldo-datos.mjs [carpeta-destino]
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const LLAVE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !LLAVE) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const destino = process.argv[2] || '.'
const admin = createClient(URL, LLAVE, { auth: { persistSession: false } })

// Inventario de tablas. Se mantiene explícito y no por descubrimiento
// automático: así, si alguien agrega una tabla y olvida incluirla aquí, el
// respaldo lo denuncia en vez de omitirla en silencio.
const TABLAS = [
  'profiles', 'empresas', 'invitaciones', 'modulos', 'modulos_empresas',
  'categorias', 'items', 'calculos', 'informes', 'metas',
  'tickets', 'tickets_mensajes', 'alertas', 'leads', 'logs_auditoria',
  'config_sistema', 'log_firmas_confidencialidad',
  'dpp_activos', 'dpp_ciclos', 'dpp_metricas_financieras',
  'dpp_documentos_ingesta', 'dpp_verificaciones',
  'item_materiales', 'item_servicios', 'item_insumos',
  'categoria_materiales_base', 'categoria_servicios_base', 'categoria_insumos_base',
  'crm_cotizaciones', 'crm_clientes', 'crm_muebles_cotizados',
  'crm_empresas_clientes', 'crm_cotizaciones_notas', 'crm_cotizaciones_aperturas',
  'crm_cotizaciones_estado_historial',
  'cotizador_descripciones', 'contenido_landing', 'plantillas_documentos',
  'item_permisos_empresa', 'ia_memoria_visual',
]

const PAGINA = 1000   // el máximo por consulta de PostgREST
const resultado = {}
const problemas = []
let totalFilas = 0

for (const tabla of TABLAS) {
  let desde = 0
  const filas = []
  for (;;) {
    const { data, error } = await admin.from(tabla).select('*').range(desde, desde + PAGINA - 1)
    if (error) {
      // Una tabla que no existe no aborta el respaldo entero: se anota y se
      // sigue, porque perder las 39 tablas restantes por una sería peor.
      problemas.push(`${tabla}: ${error.message}`)
      break
    }
    filas.push(...data)
    if (data.length < PAGINA) break
    desde += PAGINA
  }
  if (!problemas.some(p => p.startsWith(tabla + ':'))) {
    resultado[tabla] = filas
    totalFilas += filas.length
    console.log(`  ${String(filas.length).padStart(6)} filas  ${tabla}`)
  }
}

const fecha = new Date().toISOString().slice(0, 10)
mkdirSync(destino, { recursive: true })
const ruta = join(destino, `reuso-datos-${fecha}.json`)
writeFileSync(ruta, JSON.stringify({
  generado_en: new Date().toISOString(),
  proyecto: URL,
  aviso: 'Solo datos. El esquema vive en sql/ dentro del repositorio.',
  tablas_con_problemas: problemas,
  datos: resultado,
}, null, 0), 'utf8')

console.log(`\nTablas respaldadas: ${Object.keys(resultado).length} de ${TABLAS.length}`)
console.log(`Filas totales: ${totalFilas}`)
if (problemas.length) {
  console.log(`\nTablas omitidas (${problemas.length}):`)
  problemas.forEach(p => console.log('  ·', p))
}
console.log(`\nArchivo: ${ruta}`)

// Sin filas no hay respaldo que valga: es preferible fallar ruidosamente.
if (totalFilas === 0) {
  console.error('\nERROR: no se respaldó ninguna fila. Revisar la llave de servicio.')
  process.exit(1)
}
