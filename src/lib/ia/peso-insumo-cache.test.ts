import { describe, it, expect } from 'vitest'
import { normalizarNombreInsumo } from './peso-insumo-cache'

describe('normalizarNombreInsumo', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(normalizarNombreInsumo('Barniz Poliuretánico')).toBe('barniz poliuretanico')
  })

  it('recorta espacios extra', () => {
    expect(normalizarNombreInsumo('  Tela   de lino  ')).toBe('tela de lino')
  })

  it('nombres equivalentes normalizan igual', () => {
    expect(normalizarNombreInsumo('Tela')).toBe(normalizarNombreInsumo('  tela  '))
  })
})
