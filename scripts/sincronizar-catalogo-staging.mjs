#!/usr/bin/env node
/**
 * Copia SOLO el catálogo (categorías, ítems, materiales, servicios, insumos
 * y sus categorías base) de Producción hacia reuso-staging — nunca al revés.
 *
 * Qué NO toca, nunca: profiles, empresas, calculos, crm_cotizaciones,
 * crm_clientes ni ninguna otra tabla con datos de clientes reales. Staging
 * se queda siempre en cero ahí, a propósito.
 *
 * No es automático: se corre a mano cuando el usuario actualiza precios
 * reales en producción y quiere que pruebas los refleje.
 *
 * Uso:  node scripts/sincronizar-catalogo-staging.mjs
 * Necesita: .env.production.local (fuente) y .env.local apuntando a
 * reuso-staging (destino) — ambos ya existen en este repo.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

function leerEnv(nombreArchivo) {
  const ruta = join(raiz, nombreArchivo)
  if (!existsSync(ruta)) {
    console.error(`\nFalta ${nombreArchivo} en la raíz del proyecto.\n`)
    process.exit(1)
  }
  const env = {}
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    const m = linea.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const prodEnv = leerEnv('.env.production.local')
const stagingEnv = leerEnv('.env.local')

if (stagingEnv.NEXT_PUBLIC_SUPABASE_URL === prodEnv.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('\n⚠️  .env.local apunta a la MISMA base que producción ahora mismo.')
  console.error('No voy a sincronizar nada para no sobrescribir producción por error.\n')
  process.exit(1)
}

const prod = createClient(prodEnv.NEXT_PUBLIC_SUPABASE_URL, prodEnv.SUPABASE_SERVICE_ROLE_KEY)
const staging = createClient(stagingEnv.NEXT_PUBLIC_SUPABASE_URL, stagingEnv.SUPABASE_SERVICE_ROLE_KEY)

console.log(`Origen (producción):  ${prodEnv.NEXT_PUBLIC_SUPABASE_URL}`)
console.log(`Destino (staging):    ${stagingEnv.NEXT_PUBLIC_SUPABASE_URL}\n`)

async function copiarTabla(tabla, { limpiarPrimero = true } = {}) {
  const { data, error } = await prod.from(tabla).select('*')
  if (error) throw new Error(`Leyendo ${tabla} de producción: ${error.message}`)

  if (limpiarPrimero) {
    // neq con un uuid imposible = "borra todas las filas", patrón estándar
    // de Supabase para vaciar una tabla completa sin DELETE sin WHERE.
    const { error: delError } = await staging.from(tabla).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (delError) throw new Error(`Limpiando ${tabla} en staging: ${delError.message}`)
  }

  if (data.length === 0) {
    console.log(`  ${tabla}: 0 filas en producción, nada que copiar`)
    return
  }

  const { error: insError } = await staging.from(tabla).insert(data)
  if (insError) throw new Error(`Insertando ${tabla} en staging: ${insError.message}`)
  console.log(`  ${tabla}: ${data.length} filas copiadas`)
}

// Orden por dependencias de FK. categorias va en dos pasadas (parent_id
// autoreferenciado) para no depender del orden en que vengan las filas.
async function copiarCategorias() {
  const { data, error } = await prod.from('categorias').select('*')
  if (error) throw new Error(`Leyendo categorias de producción: ${error.message}`)

  await staging.from('categorias').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (data.length === 0) { console.log('  categorias: 0 filas'); return }

  const sinPadres = data.map(({ parent_id, ...resto }) => resto)
  const { error: insError } = await staging.from('categorias').insert(sinPadres)
  if (insError) throw new Error(`Insertando categorias (sin parent_id) en staging: ${insError.message}`)

  const conPadre = data.filter(c => c.parent_id)
  for (const c of conPadre) {
    const { error: updError } = await staging.from('categorias').update({ parent_id: c.parent_id }).eq('id', c.id)
    if (updError) throw new Error(`Actualizando parent_id de categoria ${c.id}: ${updError.message}`)
  }
  console.log(`  categorias: ${data.length} filas copiadas (${conPadre.length} con parent_id restaurado)`)
}

try {
  await copiarCategorias()
  await copiarTabla('categoria_materiales_base')
  await copiarTabla('categoria_servicios_base')
  await copiarTabla('categoria_insumos_base')
  await copiarTabla('items')
  await copiarTabla('item_materiales')
  await copiarTabla('item_servicios')
  await copiarTabla('item_insumos')
  console.log('\n✅ Catálogo sincronizado en reuso-staging.')
} catch (e) {
  console.error('\n❌', e.message)
  process.exit(1)
}
