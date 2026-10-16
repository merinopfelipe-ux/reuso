// Guardia del panel Zero Waste digital: las cifras salen de src/data y deben ser coherentes.
// Regla 3 de la skill green-coding: ningún número sin fuente.
import { describe, expect, it } from 'vitest'
import { MEDICION, METAS, resumenVerde } from './verde'

describe('medición real', () => {
  it('tiene fecha ISO, método y Lighthouse válido en cada página', () => {
    expect(MEDICION.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(MEDICION.metodo.transferencia.length).toBeGreaterThan(20)
    expect(MEDICION.paginas.length).toBeGreaterThan(0)
    for (const p of MEDICION.paginas) {
      expect(p.lighthouse, `${p.ruta} sin Lighthouse`).not.toBeNull()
      expect(p.lighthouse!.rendimiento, `${p.ruta} sin puntaje`).not.toBeNull()
      expect(p.transferidoKB, `${p.ruta} sin bytes`).toBeGreaterThan(50)
      expect(p.recursos, `${p.ruta} sin recursos`).toBeGreaterThan(0)
    }
  })

  it('todas las páginas de la línea base están medidas', () => {
    const medidas = MEDICION.paginas.map((p) => p.ruta)
    for (const ruta of METAS.paginasLineaBase) expect(medidas, `falta ${ruta}`).toContain(ruta)
  })
})

describe('metas cada dos años', () => {
  it('bajan en línea recta desde la base medida hasta 0 en 2035', () => {
    const { base, hitos } = METAS
    for (const h of hitos) {
      const esperado = base.evitableKBPorPagina * (1 - (h.anio - base.anio) / (2035 - base.anio))
      expect(h.evitableKBPorPagina, `hito ${h.anio}`).toBeCloseTo(esperado, 1)
    }
    expect(hitos[hitos.length - 1]).toEqual({ anio: 2035, evitableKBPorPagina: 0 })
  })

  it('hay un hito cada dos años y cada uno baja respecto al anterior', () => {
    const anios = METAS.hitos.map((h) => h.anio)
    for (let i = 1; i < anios.length; i++) expect(anios[i] - anios[i - 1]).toBe(2)
    const kb = METAS.hitos.map((h) => h.evitableKBPorPagina)
    for (let i = 1; i < kb.length; i++) expect(kb[i]).toBeLessThan(kb[i - 1])
  })
})

describe('resumen que lee la landing', () => {
  it('el promedio sale de la medición y la próxima meta es posterior a la base', () => {
    const r = resumenVerde()
    const pags = MEDICION.paginas.filter((p) => METAS.paginasLineaBase.includes(p.ruta))
    const promedio = pags.reduce((s, p) => s + p.lighthouse!.evitableKB, 0) / pags.length
    expect(r.promedioKB).toBeCloseTo(promedio, 5)
    expect(r.proxima.anio).toBeGreaterThan(METAS.base.anio)
    expect(r.cierre).toEqual({ anio: 2035, kb: 0 })
  })
})
