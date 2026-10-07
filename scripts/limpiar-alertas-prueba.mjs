// Borra de la base las alertas creadas por las pruebas automáticas (título que
// empieza por "E2E "). Se usa una sola vez para limpiar lo que quedó antes de
// que el cierre de las pruebas las borrara solo (e2e/global-teardown.ts) y de
// que existiera el seguro de base (e2e/global-setup.ts).
//
// Uso:
//   node scripts/limpiar-alertas-prueba.mjs            → muestra qué borraría
//   node scripts/limpiar-alertas-prueba.mjs --borrar   → borra de verdad
//
// Por defecto usa .env.local (base de pruebas). Para la base real:
//   ARCHIVO_ENV=.env.production.local node scripts/limpiar-alertas-prueba.mjs --borrar
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const archivo = process.env.ARCHIVO_ENV ?? '.env.local'
const env = Object.fromEntries(
  readFileSync(archivo, 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })
)
const base = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host.split('.')[0]
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await sb.from('alertas').select('id, titulo, created_at').like('titulo', 'E2E %')
if (error) { console.error('No se pudieron leer las alertas:', error.message); process.exit(1) }

console.log(`Base: ${base} (${archivo})`)
console.log(`Alertas de prueba encontradas: ${data.length}`)
data.slice(0, 5).forEach((a) => console.log(`  ${a.created_at.slice(0, 16)}  ${a.titulo}`))
if (data.length > 5) console.log(`  … y ${data.length - 5} más`)

if (!process.argv.includes('--borrar')) {
  console.log('\nNada se borró. Agrega --borrar para eliminarlas.')
  process.exit(0)
}
const { error: errorBorrar } = await sb.from('alertas').delete().like('titulo', 'E2E %')
if (errorBorrar) { console.error('No se pudieron borrar:', errorBorrar.message); process.exit(1) }
console.log(`\nListo: ${data.length} alertas de prueba borradas de ${base}.`)
