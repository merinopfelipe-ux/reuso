// Humo post-despliegue: pide cada ruta de src/app/api SIN sesión y falla si
// alguna responde 5xx o no responde. Una ruta sana contesta 401, 400, 404 o 405.
// Un 500 sin sesión casi siempre es un módulo que no carga (ejemplo real: jsdom
// en Vercel, octubre 2026, tumbó cotizaciones, tickets, notas y dudas).
//
// Uso: npm run smoke:api -- https://calculadoradereuso.com
//      (la URL base es obligatoria, no hay valor por defecto a propósito)
import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const base = (process.argv[2] ?? '').replace(/\/$/, '')
if (!/^https?:\/\//.test(base)) {
  console.error('Falta la URL base. Ejemplo: npm run smoke:api -- https://calculadoradereuso.com')
  process.exit(2)
}

const RAIZ = join(process.cwd(), 'src', 'app', 'api')
const ID = '00000000-0000-4000-8000-000000000000'

function rutas(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return rutas(ruta)
    return nombre === 'route.ts' ? [ruta] : []
  })
}

const urls = rutas(RAIZ).map((archivo) => {
  const partes = relative(RAIZ, archivo).split(sep).slice(0, -1)
    .filter((p) => !/^\(.*\)$/.test(p))
    .map((p) => (p.startsWith('[') ? ID : p))
  return `${base}/api/${partes.join('/')}`.replace(/\/$/, '')
})

const fallos = []
let i = 0
async function trabajador() {
  while (i < urls.length) {
    const url = urls[i++]
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(45_000), redirect: 'manual' })
      if (r.status >= 500) fallos.push(`${r.status}  ${url}`)
    } catch (e) {
      fallos.push(`SIN RESPUESTA  ${url}  (${e instanceof Error ? e.message : e})`)
    }
  }
}
await Promise.all(Array.from({ length: 6 }, trabajador))

console.log(`Rutas revisadas: ${urls.length}`)
if (fallos.length) {
  console.error(`\nFALLAN ${fallos.length}:\n` + fallos.sort().join('\n'))
  process.exit(1)
}
console.log('Todas responden sin error de servidor.')
