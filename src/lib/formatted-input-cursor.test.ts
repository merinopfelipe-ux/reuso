import { describe, it, expect } from 'vitest'
import { contarDigitosAntes, posicionParaNDigitos } from './formatted-input-cursor'

describe('contarDigitosAntes', () => {
  it('cuenta solo dígitos antes de la posición, ignorando separadores', () => {
    expect(contarDigitosAntes('80.000', 2)).toBe(2)
    expect(contarDigitosAntes('80.000', 3)).toBe(2)
    expect(contarDigitosAntes('80.000', 6)).toBe(5)
  })

  it('funciona con texto vacío', () => {
    expect(contarDigitosAntes('', 0)).toBe(0)
  })
})

describe('posicionParaNDigitos', () => {
  it('encuentra la posición justo después de N dígitos, saltando separadores', () => {
    expect(posicionParaNDigitos('40.000', 1)).toBe(1)
    expect(posicionParaNDigitos('40.000', 2)).toBe(2)
    expect(posicionParaNDigitos('40.000', 5)).toBe(6)
  })

  it('si N es 0, va al inicio', () => {
    expect(posicionParaNDigitos('40.000', 0)).toBe(0)
  })

  it('si N supera los dígitos disponibles, va al final', () => {
    expect(posicionParaNDigitos('40.000', 99)).toBe(6)
  })

  it('caso real del bug: cambiar el primer dígito de 80.000 a 40.000 deja el cursor después del nuevo dígito', () => {
    // El usuario tenía el cursor tras el "8" en "80.000" (posición 1, 1 dígito antes).
    // Al reemplazarlo por "4", el texto reformateado sigue siendo "40.000" con 6 caracteres.
    const digitosAntes = contarDigitosAntes('80.000', 1)
    expect(digitosAntes).toBe(1)
    expect(posicionParaNDigitos('40.000', digitosAntes)).toBe(1)
  })
})
