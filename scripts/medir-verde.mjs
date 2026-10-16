// Medición real del peso de primera carga de las páginas públicas (Green Coding).
// Uso: npm run verde:medir -- https://calculadoradereuso.com [--reportar]
//
// Mide BYTES TRANSFERIDOS POR LA RED (comprimidos, como los recibe el navegador)
// del HTML y de los recursos enlazados en el HTML (js, css, fuentes, imágenes).
// Es un PISO: no ve lo que el código carga después (chunks diferidos, peticiones
// de datos, scripts de terceros tras el consentimiento). Para el peso completo
// usa Lighthouse (widget de PageSpeed en /admin/qa).
//
// La energía y el CO2 son ESTIMACIONES con el modelo Sustainable Web Design v4
// (0,194 kWh/GB operacional, 0,300 kWh/GB con energía incorporada, 494 g CO2e/kWh
// promedio mundial, datos Ember 2022). No son una medición del servidor real.
//
// Presupuestos: scripts/presupuesto-verde.json. Solo se pueden BAJAR (trinquete).
// Con --reportar no falla, solo informa.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const base = (process.argv[2] ?? '').replace(/\/$/, '')
const soloReportar = process.argv.includes('--reportar')
if (!/^https?:\/\//.test(base)) {
  console.error('Falta la URL base. Ejemplo: npm run verde:medir -- https://calculadoradereuso.com')
  process.exit(2)
}

const KWH_POR_GB_OPERACIONAL = 0.194
const KWH_POR_GB_TOTAL = 0.300
const G_CO2_POR_KWH_MUNDIAL = 494

const presupuesto = JSON.parse(readFileSync(join(process.cwd(), 'scripts', 'presupuesto-verde.json'), 'utf8'))

function descargar(url) {
  // Sin --compressed: curl escribe los bytes tal como viajan por la red.
  const r = spawnSync('curl', ['-s', '-L', '--max-time', '60', '-H', 'accept-encoding: br, gzip', '-o', '/tmp/_verde.bin', '-w', '%{size_download}|%{http_code}', url], { encoding: 'utf8' })
  const [bytes, codigo] = (r.stdout || '0|0').split('|').map(Number)
  return { bytes, codigo }
}
function cuerpo(url) {
  const r = spawnSync('curl', ['-s', '-L', '--compressed', '--max-time', '60', url], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
  return r.stdout || ''
}

const filas = []
let falla = false
for (const [ruta, tope] of Object.entries(presupuesto.paginas)) {
  const html = cuerpo(base + ruta)
  const recursos = [...new Set([...html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:js|css|woff2|webp|avif|png|jpg|jpeg|svg|gif))(?:\?[^"]*)?"/g)].map((m) => m[1]))]
  const pagina = descargar(base + ruta)
  let total = pagina.bytes
  let js = 0
  for (const u of recursos) {
    const { bytes } = descargar(base + u)
    total += bytes
    if (u.endsWith('.js')) js += bytes
  }
  const kb = total / 1024
  const gb = total / 1024 ** 3
  const co2Oper = gb * KWH_POR_GB_OPERACIONAL * G_CO2_POR_KWH_MUNDIAL
  const co2Total = gb * KWH_POR_GB_TOTAL * G_CO2_POR_KWH_MUNDIAL
  const dentro = kb <= tope.maxKB
  if (!dentro) falla = true
  filas.push({ ruta, estado: pagina.codigo, recursos: recursos.length, js_kb: Math.round(js / 1024), total_kb: Math.round(kb), presupuesto_kb: tope.maxKB, co2_g_oper: co2Oper.toFixed(3), co2_g_total: co2Total.toFixed(3), ok: dentro ? 'sí' : 'EXCEDE' })
}
console.table(filas)
console.log('Piso de la primera visita sin caché. Energía y CO2 estimados con SWD v4 (0,194 kWh/GB operacional, 0,300 con energía incorporada, 494 g/kWh).')
if (falla && !soloReportar) {
  console.error('\nAlguna página excede su presupuesto. Reduce el peso o justifica y documenta antes de subir el tope.')
  process.exit(1)
}
