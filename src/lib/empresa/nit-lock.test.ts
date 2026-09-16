import { describe, it, expect } from 'vitest'
import { puedeEditarNit } from './nit-lock'

describe('puedeEditarNit', () => {
  it('permite escribirlo la primera vez, sin importar el rol', () => {
    expect(puedeEditarNit(null, 'empleado')).toBe(true)
    expect(puedeEditarNit('', 'empresa_admin')).toBe(true)
  })

  it('bloquea a cualquiera que no sea super_admin una vez ya tiene valor', () => {
    expect(puedeEditarNit('900123456', 'empresa_admin')).toBe(false)
    expect(puedeEditarNit('900123456', 'empleado')).toBe(false)
  })

  it('siempre permite al super_admin, tenga valor o no', () => {
    expect(puedeEditarNit('900123456', 'super_admin')).toBe(true)
    expect(puedeEditarNit(null, 'super_admin')).toBe(true)
  })
})
