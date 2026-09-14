import { describe, it, expect } from 'vitest'
import { calcularTiempoUsoEnPlataformaDias } from './tiempo-uso'

describe('calcularTiempoUsoEnPlataformaDias', () => {
  it('suma la duración de ciclos ya cerrados', () => {
    const ciclos = [
      { fecha_inicio: '2026-01-01', fecha_fin: '2026-01-11' }, // 10 días
      { fecha_inicio: '2026-02-01', fecha_fin: '2026-02-21' }, // 20 días
    ]
    expect(calcularTiempoUsoEnPlataformaDias(ciclos, new Date('2026-03-01'))).toBe(30)
  })

  it('un ciclo sin fecha_fin cuenta hasta la fecha de referencia', () => {
    const ciclos = [{ fecha_inicio: '2026-01-01', fecha_fin: null }]
    expect(calcularTiempoUsoEnPlataformaDias(ciclos, new Date('2026-01-11'))).toBe(10)
  })

  it('devuelve 0 sin ciclos', () => {
    expect(calcularTiempoUsoEnPlataformaDias([], new Date('2026-01-01'))).toBe(0)
  })
})
