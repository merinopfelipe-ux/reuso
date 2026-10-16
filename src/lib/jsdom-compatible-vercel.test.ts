// Guardia de dependencias: jsdom 30 arrastra `@exodus/bytes` (solo ESM) y en
// Vercel falla con ERR_REQUIRE_ESM, lo que tumbó 14 rutas en octubre 2026.
// Si Dependabot o un `npm update` vuelve a subir jsdom, esta prueba falla en el CI
// antes de llegar a producción. Antes de relajarla, prueba la subida en una vista
// previa de Vercel con `npm run smoke:api` y la ruta `/api/salud/sanitizador`.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const lock = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package-lock.json'), 'utf8'))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'))

describe('jsdom compatible con Vercel', () => {
  it('jsdom está fijado con overrides en una versión que carga en Vercel', () => {
    expect(pkg.overrides?.jsdom).toBe('26.1.0')
  })

  it('el lock no resuelve jsdom por encima de la 26', () => {
    const versiones = Object.entries(lock.packages as Record<string, { version?: string }>)
      .filter(([ruta]) => ruta === 'node_modules/jsdom' || ruta.endsWith('/node_modules/jsdom'))
      .map(([, p]) => p.version ?? '')
    expect(versiones.length).toBeGreaterThan(0)
    for (const v of versiones) expect(Number(v.split('.')[0]), `jsdom ${v}`).toBeLessThanOrEqual(26)
  })

  it('el lock no incluye @exodus/bytes (solo ESM, rompe jsdom en Vercel)', () => {
    const rutas = Object.keys(lock.packages).filter((r) => r.endsWith('node_modules/@exodus/bytes'))
    expect(rutas).toEqual([])
  })
})
