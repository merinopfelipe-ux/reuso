#!/usr/bin/env node
/**
 * Carga el esquema completo (las 95 migraciones de `sql/`) en el proyecto de
 * pruebas de Supabase, en orden y de una sola pasada.
 *
 * Existe para que montar staging no sea abrir 95 archivos a mano en el editor
 * web. Lee la cadena de conexión de `.env.staging` (ignorado por git), nunca
 * de un argumento en la línea de comandos, para que la contraseña no quede en
 * el historial de la terminal.
 *
 * Uso:  node scripts/cargar-esquema-staging.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// El ref del proyecto de PRODUCCIÓN, leído de la configuración real en vez de
// escrito a mano aquí: si algún día cambia, la guarda sigue siendo correcta.
function refDeProduccion() {
  const env = join(raiz, '.env.local')
  if (!existsSync(env)) return null
  const linea = readFileSync(env, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('NEXT_PUBLIC_SUPABASE_URL='))
  return linea ? (linea.split('=')[1].match(/https:\/\/([a-z0-9]+)\./) || [])[1] ?? null : null
}

function leerCadena() {
  const archivo = join(raiz, '.env.staging')
  if (!existsSync(archivo)) {
    console.error('\nFalta el archivo .env.staging.\n')
    console.error('Créalo en la raíz del proyecto con una sola línea:\n')
    console.error('STAGING_DB_URL=postgresql://postgres:LA_CONTRASEÑA@db.EL_REF.supabase.co:5432/postgres\n')
    process.exit(1)
  }
  const linea = readFileSync(archivo, 'utf8')
    .split('\n')
    .find((l) => l.trim().startsWith('STAGING_DB_URL='))
  if (!linea) {
    console.error('\n.env.staging existe pero no tiene la línea STAGING_DB_URL=...\n')
    process.exit(1)
  }
  return linea.slice(linea.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
}

const cadena = leerCadena()
const prod = refDeProduccion()

// Guarda principal: correr esto contra producción reescribiría el esquema de
// la base real de los clientes. Se comprueba ANTES de abrir la conexión.
if (prod && cadena.includes(prod)) {
  console.error(`\n⛔ ALTO. Esa cadena apunta a PRODUCCIÓN (${prod}).`)
  console.error('   Este script solo debe correr contra el proyecto de pruebas.')
  console.error('   No se ejecutó nada.\n')
  process.exit(1)
}

const archivos = readdirSync(join(raiz, 'sql'))
  .filter((f) => f.endsWith('.sql'))
  .sort()

console.log(`\nProyecto de pruebas detectado. Migraciones a aplicar: ${archivos.length}\n`)

const cliente = new pg.Client({
  connectionString: cadena,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120_000,
})

await cliente.connect()

let aplicadas = 0
const fallos = []

for (const archivo of archivos) {
  const sql = readFileSync(join(raiz, 'sql', archivo), 'utf8')
  try {
    // Cada migración va en su propia transacción: si una falla, las anteriores
    // quedan aplicadas y el reporte dice exactamente dónde se detuvo.
    await cliente.query('BEGIN')
    await cliente.query(sql)
    await cliente.query('COMMIT')
    aplicadas++
    process.stdout.write(`  ✓ ${archivo}\n`)
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => {})
    fallos.push({ archivo, mensaje: error.message })
    process.stdout.write(`  ✗ ${archivo} — ${error.message}\n`)
  }
}

await cliente.end()

console.log(`\nAplicadas ${aplicadas} de ${archivos.length}.`)

if (fallos.length) {
  console.log(`\n${fallos.length} migración(es) no entraron:\n`)
  for (const f of fallos) console.log(`  ${f.archivo}\n    ${f.mensaje}\n`)
  console.log('Pásale esta lista a Claude para que las revise.\n')
  process.exit(1)
}

console.log('El esquema quedó completo.\n')
