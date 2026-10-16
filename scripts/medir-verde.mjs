// Medición real del peso de primera carga de las páginas públicas (Green Coding).
// Uso: npm run verde:medir -- https://calculadoradereuso.com [--reportar] [--lighthouse] [--guardar]
//   --lighthouse  además corre Lighthouse (móvil, red simulada) por página y suma los ahorros evitables
//   --guardar     escribe src/data/verde-medicion.json (lo lee la página /legal/digital-zero-waste)
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
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const base = (process.argv[2] ?? '').replace(/\/$/, '')
const soloReportar = process.argv.includes('--reportar')
const conLighthouse = process.argv.includes('--lighthouse')
const guardar = process.argv.includes('--guardar')
if (!/^https?:\/\//.test(base)) {
  console.error('Falta la URL base. Ejemplo: npm run verde:medir -- https://calculadoradereuso.com')
  process.exit(2)
}

const KWH_POR_GB_OPERACIONAL = 0.194
const KWH_POR_GB_TOTAL = 0.300
const G_CO2_POR_KWH_MUNDIAL = 494

const presupuesto = JSON.parse(readFileSync(join(process.cwd(), 'scripts', 'presupuesto-verde.json'), 'utf8'))

function esperar(ms) { spawnSync('sleep', [String(ms / 1000)]) }
function descargar(url) {
  // Sin --compressed: curl escribe los bytes tal como viajan por la red.
  // Reintenta si el estado no es 200: un fallo intermitente no es una medición.
  let ultimo = { bytes: 0, codigo: 0 }
  for (let i = 0; i < 4; i++) {
    const r = spawnSync('curl', ['-s', '-L', '--max-time', '60', '-H', 'accept-encoding: br, gzip', '-o', '/tmp/_verde.bin', '-w', '%{size_download}|%{http_code}', url], { encoding: 'utf8' })
    const [bytes, codigo] = (r.stdout || '0|0').split('|').map(Number)
    ultimo = { bytes, codigo }
    if (codigo === 200 && bytes > 0) return ultimo
    esperar(4000)
  }
  return ultimo
}
function cuerpo(url) {
  // Reintenta: una respuesta vacía no es una medición, es un fallo de red o un límite de peticiones.
  for (let i = 0; i < 4; i++) {
    const r = spawnSync('curl', ['-s', '-L', '--compressed', '--max-time', '60', url], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
    if ((r.stdout || '').length > 2000) return r.stdout
    esperar(3000)
  }
  return ''
}

const AUDITORIAS_EVITABLES = ['unused-javascript', 'legacy-javascript', 'unused-css-rules', 'modern-image-formats', 'uses-optimized-images', 'uses-responsive-images', 'offscreen-images', 'duplicated-javascript', 'unminified-javascript', 'unminified-css', 'uses-text-compression']
let versionLighthouse = null
function lighthouseUnaVez(url) {
  const dir = mkdtempSync(join(tmpdir(), 'lh-'))
  const salida = join(dir, 'r.json')
  spawnSync('npx', ['-y', 'lighthouse@12', url, '--only-categories=performance', '--form-factor=mobile', '--output=json', `--output-path=${salida}`, '--quiet', '--chrome-flags=--headless=new --no-sandbox'], { encoding: 'utf8', timeout: 240000 })
  try {
    const j = JSON.parse(readFileSync(salida, 'utf8'))
    versionLighthouse = j.lighthouseVersion
    const a = j.audits
    const detalle = {}
    let evitable = 0
    for (const id of AUDITORIAS_EVITABLES) {
      const b = a[id]?.details?.overallSavingsBytes ?? 0
      if (b > 0) detalle[id] = Math.round((b / 1024) * 10) / 10
      evitable += b
    }
    return { pesoKB: Math.round((a['total-byte-weight']?.numericValue ?? 0) / 1024 * 10) / 10, evitableKB: Math.round((evitable / 1024) * 10) / 10, detalle, rendimiento: j.categories.performance.score }
  } catch {
    return null
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function lighthouse(url) {
  // Un resultado sin puntaje de rendimiento significa que la navegación falló: se descarta y se reintenta.
  for (let i = 0; i < 3; i++) {
    const r = lighthouseUnaVez(url)
    if (r && r.rendimiento != null && r.pesoKB > 0) return r
    esperar(5000)
  }
  return null
}

const filas = []
const registro = []
const incompletas = []
let falla = false
for (const [ruta, tope] of Object.entries(presupuesto.paginas)) {
  esperar(2000)
  const html = cuerpo(base + ruta)
  const recursos = [...new Set([...html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:js|css|woff2|webp|avif|png|jpg|jpeg|svg|gif))(?:\?[^"]*)?"/g)].map((m) => m[1]))]
  const pagina = descargar(base + ruta)
  let total = pagina.bytes
  let js = 0
  for (const u of recursos) {
    const { bytes, codigo } = descargar(base + u)
    if (codigo !== 200) incompletas.push(`${ruta}: el recurso ${u} respondió ${codigo}`)
    total += bytes
    if (u.endsWith('.js')) js += bytes
  }
  const kb = total / 1024
  const gb = total / 1024 ** 3
  const co2Oper = gb * KWH_POR_GB_OPERACIONAL * G_CO2_POR_KWH_MUNDIAL
  const co2Total = gb * KWH_POR_GB_TOTAL * G_CO2_POR_KWH_MUNDIAL
  const dentro = kb <= tope.maxKB
  if (!dentro) falla = true
  let lh = null
  if (conLighthouse) lh = lighthouse(base + ruta)
  if (recursos.length === 0 || pagina.codigo !== 200) incompletas.push(`${ruta}: sin recursos enlazados o estado ${pagina.codigo}`)
  if (conLighthouse && !lh) incompletas.push(`${ruta}: Lighthouse no devolvió un resultado válido`)
  registro.push({ ruta, transferidoKB: Math.round(kb * 10) / 10, jsKB: Math.round(js / 1024), recursos: recursos.length, co2gOperacional: Number(co2Oper.toFixed(3)), co2gConEnergiaIncorporada: Number(co2Total.toFixed(3)), lighthouse: lh })
  filas.push({ ruta, estado: pagina.codigo, recursos: recursos.length, js_kb: Math.round(js / 1024), total_kb: Math.round(kb), presupuesto_kb: tope.maxKB, co2_g_oper: co2Oper.toFixed(3), co2_g_total: co2Total.toFixed(3), ok: dentro ? 'sí' : 'EXCEDE' })
}
console.table(filas)
if (incompletas.length) {
  console.error('\nMEDICIÓN INCOMPLETA, no se guarda ni se da por buena:\n' + incompletas.join('\n'))
  process.exit(3)
}
if (guardar) {
  const hoy = new Date().toISOString().slice(0, 10)
  const datos = {
    fecha: hoy,
    url: base,
    metodo: {
      transferencia: 'Bytes transferidos por la red, comprimidos (curl sin --compressed). Piso: HTML y recursos enlazados en el HTML. Una carga por página.',
      lighthouse: conLighthouse ? `Lighthouse ${versionLighthouse}, móvil, red simulada, una corrida por página. Peso total y suma de los ahorros potenciales que Lighthouse calcula por separado (puede contar dos veces un mismo byte).` : 'No se corrió Lighthouse en esta medición.',
      energia: 'Estimación con Sustainable Web Design v4: 0,194 kWh/GB operacional, 0,300 kWh/GB con energía incorporada, 494 g CO2e/kWh promedio mundial (Ember 2022). No es una medición del servidor.',
    },
    paginas: registro,
  }
  mkdirSync(join(process.cwd(), 'src', 'data'), { recursive: true })
  writeFileSync(join(process.cwd(), 'src', 'data', 'verde-medicion.json'), JSON.stringify(datos, null, 2) + '\n')
  console.log('Guardado src/data/verde-medicion.json (' + hoy + ')')
}
console.log('Piso de la primera visita sin caché. Energía y CO2 estimados con SWD v4 (0,194 kWh/GB operacional, 0,300 con energía incorporada, 494 g/kWh).')
if (falla && !soloReportar) {
  console.error('\nAlguna página excede su presupuesto. Reduce el peso o justifica y documenta antes de subir el tope.')
  process.exit(1)
}
