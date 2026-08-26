#!/usr/bin/env node
/**
 * Fase 0, paso 2 del Plan de Acción: Escalabilidad de Reúso.
 *
 * Reasigna las variables de Supabase del entorno PREVIEW de Vercel para que
 * apunten a un proyecto de Staging, en vez de a la base de producción.
 *
 * El problema que resuelve: hoy `NEXT_PUBLIC_SUPABASE_URL`,
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` tienen el
 * MISMO valor en Preview y en Production, así que cualquier despliegue de
 * vista previa de una Pull Request lee y escribe sobre los datos reales.
 *
 * Uso (tras crear el proyecto de Staging en Supabase):
 *   node scripts/configurar-staging.mjs \
 *     --url https://xxxx.supabase.co \
 *     --anon  <anon key del staging> \
 *     --service <service role key del staging>
 *
 * No toca Production ni Development: solo el entorno Preview.
 */

import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
function arg(nombre) {
  const i = args.indexOf(`--${nombre}`)
  return i !== -1 ? args[i + 1] : undefined
}

const url = arg('url')
const anon = arg('anon')
const service = arg('service')

if (!url || !anon || !service) {
  console.error(`
Faltan datos. Uso:

  node scripts/configurar-staging.mjs --url <URL> --anon <ANON_KEY> --service <SERVICE_KEY>

Los tres valores salen del proyecto de STAGING en Supabase:
  Settings -> API -> Project URL, anon public, service_role
`)
  process.exit(1)
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim())) {
  console.error(`✗ La URL no parece de Supabase: ${url}`)
  process.exit(1)
}

// Guarda real: si la URL del staging coincide con la de producción, se
// estaría "aislando" el preview contra la misma base. Sería peor que no
// hacer nada, porque daría una falsa sensación de seguridad.
const urlProduccion = process.env.NEXT_PUBLIC_SUPABASE_URL
if (urlProduccion && url.trim().replace(/\/$/, '') === urlProduccion.trim().replace(/\/$/, '')) {
  console.error('✗ Esa URL es la MISMA de producción. El staging tiene que ser un proyecto distinto.')
  process.exit(1)
}

const variables = [
  ['NEXT_PUBLIC_SUPABASE_URL', url.trim().replace(/\/$/, '')],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anon.trim()],
  ['SUPABASE_SERVICE_ROLE_KEY', service.trim()],
]

function vercel(argumentos, entrada) {
  return execFileSync('vercel', argumentos, {
    encoding: 'utf8',
    input: entrada,
    stdio: entrada !== undefined ? ['pipe', 'pipe', 'pipe'] : 'pipe',
  })
}

console.log('Reasignando las variables del entorno Preview...\n')

for (const [nombre, valor] of variables) {
  try {
    // Quitar la que existe para Preview (si no existe, no pasa nada).
    try {
      vercel(['env', 'rm', nombre, 'preview', '--yes'])
      console.log(`  · ${nombre}: valor anterior de Preview eliminado`)
    } catch {
      console.log(`  · ${nombre}: no tenía valor propio en Preview`)
    }
    vercel(['env', 'add', nombre, 'preview'], valor + '\n')
    console.log(`  ✓ ${nombre}: ahora apunta al staging en Preview\n`)
  } catch (e) {
    console.error(`  ✗ ${nombre}: ${e.message}`)
    process.exit(1)
  }
}

console.log('Listo. Verifica con:  vercel env ls')
console.log('Las vistas previas de Pull Requests ya no tocarán la base real.')
console.log('\nRecuerda correr las migraciones de sql/ en el proyecto de staging,')
console.log('y luego `npm run db:seed` para poblarlo con datos simulados.')
