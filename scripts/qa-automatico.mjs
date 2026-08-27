#!/usr/bin/env node
/**
 * Mitad automática de la ronda de QA. La otra mitad son las pruebas manuales
 * de /admin/qa, que sí necesitan ojo humano.
 *
 * Corre desde la terminal lo que el botón de /admin/qa no puede: revisar el
 * código fuente. Añade a las comprobaciones de base de datos un barrido de
 * TODAS las consultas escritas en `src/`, probándolas contra la base real —
 * así aparecen los embeds que PostgREST rechaza entera, que no dan error de
 * columna sino que dejan la pantalla vacía.
 *
 * Uso:  npm run qa:auto            (informe por pantalla)
 *       npm run qa:auto -- --txt   (además lo guarda en qa-diagnostico.txt)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
)
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const LLAVE = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !LLAVE) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

function archivosDe(dir) {
  const salida = []
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) salida.push(...archivosDe(ruta))
    else if (/\.tsx?$/.test(nombre)) salida.push(ruta)
  }
  return salida
}

// Los buckets de almacenamiento también se escriben `.from('x')`, pero van
// precedidos de `.storage`. Sin esa distinción se reportan como tablas que no
// existen, que fue el primer falso positivo de este barrido.
// Dos formas de escribir un .select() en el proyecto: comillas simples en una
// línea, o comillas invertidas multilínea para consultas largas con embeds.
// Cubrir solo la primera dejó 16 archivos completos fuera del barrido —
// entre ellos el que rompía /admin/calculos — y ninguno lo notó porque el
// barrido reportaba "0 rechazadas" con total confianza sobre una porción
// incompleta del código.
const PATRON_SELECT = /(\.storage)?\s*\.from\(\s*'([a-z_]+)'\s*\)\s*\.select\(\s*['`]([^'`]+)['`]/g

const consultas = new Set()
for (const f of archivosDe('src')) {
  const txt = readFileSync(f, 'utf8')
  for (const m of txt.matchAll(PATRON_SELECT)) {
    if (m[1]) continue
    // El cliente real de supabase-js elimina TODO el espacio en blanco del select
// antes de mandarlo (verificado leyendo `query.url` que arma la librería) —
// probarlo con espacios de más rompe consultas con 2+ niveles de anidamiento
// en el parser de PostgREST que, en la aplicación real, nunca ven ese espacio
// y funcionan bien. Se replica ese mismo comportamiento aquí.
consultas.add(JSON.stringify({ tabla: m[2], select: m[3].replace(/\s+/g, ''), archivo: f }))
  }
}

const lista = Array.from(consultas).map(s => JSON.parse(s))
console.log(`\nConsultas encontradas en el código: ${lista.length}\n`)

const fallas = []
for (const { tabla, select, archivo } of lista) {
  const url = `${URL_BASE}/rest/v1/${tabla}?select=${encodeURIComponent(select)}&limit=1`
  try {
    const r = await fetch(url, { headers: { apikey: LLAVE, Authorization: `Bearer ${LLAVE}` } })
    if (!r.ok) {
      let motivo = ''
      try { motivo = (await r.json()).message ?? '' } catch { /* cuerpo no JSON */ }
      fallas.push({ tabla, select, archivo, estado: r.status, motivo })
    }
  } catch (e) {
    fallas.push({ tabla, select, archivo, estado: 0, motivo: e.message })
  }
}

const lineas = []
lineas.push('QA AUTOMÁTICO — consultas del código contra la base real')
lineas.push('='.repeat(60))
lineas.push(`Fecha: ${new Date().toLocaleString('es-CO')}`)
lineas.push(`Base:  ${URL_BASE.replace('https://', '').replace('.supabase.co', '')}`)
lineas.push(`Consultas revisadas: ${lista.length}   Rechazadas: ${fallas.length}`)
lineas.push('')

if (fallas.length) {
  for (const f of fallas) {
    lineas.push(`FALLA  ${f.tabla}  (HTTP ${f.estado})`)
    lineas.push(`  archivo: ${f.archivo}`)
    lineas.push(`  select : ${f.select}`)
    if (f.motivo) lineas.push(`  motivo : ${f.motivo}`)
    lineas.push('')
  }
  lineas.push('Cada consulta rechazada deja vacía la pantalla que la usa.')
} else {
  lineas.push('Todas las consultas del código son válidas contra la base real.')
}

const informe = lineas.join('\n')
console.log(informe)

if (process.argv.includes('--txt')) {
  writeFileSync('qa-diagnostico.txt', informe + '\n')
  console.log('\nGuardado en qa-diagnostico.txt')
}

process.exit(fallas.length ? 1 : 0)
