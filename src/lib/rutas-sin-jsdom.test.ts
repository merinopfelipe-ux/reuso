// Guardia: ningún archivo del servidor puede importar `isomorphic-dompurify` o
// `jsdom` de forma estática. En Vercel `jsdom` falla al cargarse
// (ERR_REQUIRE_ESM) y, si se importa arriba de una ruta, toda la ruta devuelve
// 500 incluso en un GET sin sesión (así cayeron las cotizaciones, los tickets,
// las notas y el formulario de dudas). Usa `sanitizarHtml` de
// `src/lib/sanitizar-html.ts`, que lo carga solo al limpiar.
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = join(__dirname, '..')
const IMPORT_ESTATICO = /^\s*import\s+(?!type\b)[^\n]*from\s+['"](isomorphic-dompurify|jsdom)['"]/m

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.(ts|tsx)$/.test(nombre) ? [ruta] : []
  })
}

describe('carga de jsdom en el servidor', () => {
  it('ningún archivo del servidor importa isomorphic-dompurify o jsdom de forma estática', () => {
    const infractores = archivos(RAIZ).filter((ruta) => {
      const texto = readFileSync(ruta, 'utf8')
      const esCliente = /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(texto)
      return !esCliente && IMPORT_ESTATICO.test(texto)
    })
    expect(
      infractores.map((r) => r.replace(RAIZ, 'src')),
      'Estos archivos de servidor importan jsdom y tumban su ruta en Vercel. Usa sanitizarHtml de @/lib/sanitizar-html'
    ).toEqual([])
  })
})
