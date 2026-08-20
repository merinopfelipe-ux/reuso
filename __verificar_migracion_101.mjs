import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Verifica si sql/101_empresa_cliente_contactos_opcionales.sql ya corrió en
// Supabase (columnas es_contacto_real / duplicado_de_id en crm_clientes).
//
// NOTA: information_schema NO está expuesto vía PostgREST en este proyecto
// (confirmado en vivo: "Only the following schemas are exposed: public,
// graphql_public", código PGRST106). Por eso se verifica intentando un
// SELECT real de cada columna y leyendo el código de error de Postgres
// (42703 = undefined_column) en vez de consultar information_schema.columns
// directamente, que no es alcanzable con supabase-js contra este proyecto.
//
// Correr: node __verificar_migracion_101.mjs

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const columnas = ['es_contacto_real', 'duplicado_de_id']
let todasExisten = true

for (const columna of columnas) {
  const { error } = await supabase.from('crm_clientes').select(columna).limit(1)
  if (!error) {
    console.log(`[OK] ${columna} existe en crm_clientes`)
  } else if (error.code === '42703') {
    console.log(`[FALTA] ${columna} NO existe todavia (falta correr sql/101_empresa_cliente_contactos_opcionales.sql)`)
    todasExisten = false
  } else {
    console.log(`[ERROR INESPERADO] ${columna}: ${error.code} ${error.message}`)
    todasExisten = false
  }
}

console.log(todasExisten ? '\nMigracion 101 ya aplicada.' : '\nMigracion 101 pendiente de correr en el SQL Editor de Supabase.')
