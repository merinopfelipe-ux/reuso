// Genera el CSS de las páginas públicas como un módulo TS (estilos-publicos.generated.ts).
// Por qué: con `import './publica.css'` Next lo sirve como hoja externa (bloquea el
// primer pintado) o, con inlineCss, lo repite tres veces en el HTML. Como texto dentro
// de un componente de cliente va UNA vez en el HTML y la otra copia viaja en el
// JavaScript, que no bloquea el pintado. Ver skill `seo-rendimiento`.
// Corre solo antes de `next dev` y `next build` (package.json).
import { compile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const entrada = path.resolve('src/app/publica.css')
const salida = path.resolve('src/app/estilos-publicos.generated.ts')
async function generar() {
  const compilador = await compile(readFileSync(entrada, 'utf8'), { base: path.dirname(entrada), onDependency() {} })
  const scanner = new Scanner({ sources: compilador.sources.map((s) => ({ base: s.base, pattern: s.pattern, negated: s.negated })) })
  let css = optimize(compilador.build(scanner.scan()), { minify: true }).code
  // Open Sans va DENTRO del CSS público (recortada a Latin-1 y pesos 400-800,
  // public/fonts/open-sans-publica.woff2): sin descarga aparte no hay cambio de
  // fuente al cargar, así el título no salta en equipos sin Arial (CLS 0.191 en
  // PageSpeed, 2026-10-05). La app sigue usando el archivo normal.
  const fuente = readFileSync(path.resolve('public/fonts/open-sans-publica.woff2')).toString('base64')
  const antes = css.length
  css = css.replace(/url\(["']?\/fonts\/open-sans-latin\.woff2["']?\)/g, `url(data:font/woff2;base64,${fuente})`)
  if (css.length === antes) throw new Error('No se encontró la @font-face de open-sans-latin.woff2 para incrustar')
  // La copia incrustada va con font-display: block: ya está en la página, así
  // que el navegador espera los milisegundos que tarda en decodificarla y pinta
  // directo en Open Sans. Con swap alcanzaba a pintar un cuadro con el respaldo y
  // el título saltaba (PageSpeed, 2026-10-05).
  css = css.replace(/@font-face\{([^}]*?)font-display:swap([^}]*?url\(data:font\/woff2)/g, '@font-face{$1font-display:block$2')
  if (!/font-display:block[^}]*url\(data:font\/woff2/.test(css)) throw new Error('No se pudo poner font-display:block en la fuente incrustada')
  const anterior = (() => { try { return readFileSync(salida, 'utf8') } catch { return '' } })()
  const nuevo = `// ARCHIVO GENERADO por scripts/generar-css-publico.mjs a partir de src/app/publica.css. No editar a mano.\nexport const ESTILOS_PUBLICOS = ${JSON.stringify(css)}\n`
  if (anterior !== nuevo) writeFileSync(salida, nuevo)
  console.log(`CSS público: ${scanner.files.length} archivos, ${Math.round(css.length / 1024)} KB${anterior === nuevo ? ' (sin cambios)' : ''}`)
}

await generar()

// En desarrollo (`npm run dev`) queda vigilando src/: si cambia una clase en un
// archivo, regenera el CSS público para que el servidor de desarrollo lo tome.
if (process.argv.includes('--vigilar')) {
  const { watch } = await import('node:fs')
  let espera = null
  watch(path.resolve('src'), { recursive: true }, (_evento, archivo) => {
    if (!archivo || archivo.endsWith('.generated.ts') || !/\.(tsx?|css)$/.test(archivo)) return
    clearTimeout(espera)
    espera = setTimeout(() => generar().catch((e) => console.error('CSS público:', e.message)), 300)
  })
  console.log('CSS público: vigilando cambios en src/')
}
