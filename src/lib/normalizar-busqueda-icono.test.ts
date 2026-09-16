import { describe, it, expect } from 'vitest'
import { normalizar } from './normalizar-busqueda-icono'

describe('normalizar (búsqueda de íconos)', () => {
  it('quita tildes', () => {
    expect(normalizar('sofá')).toBe('sofa')
  })

  it('quita guiones y espacios para que un nombre kebab-case coincida con el PascalCase real del ícono', () => {
    // Bug real: buscar "shelving-unit" (como lo muestra el sitio de Lucide)
    // no encontraba el ícono ShelvingUnit porque el guion nunca se quitaba.
    expect(normalizar('shelving-unit')).toBe(normalizar('ShelvingUnit'))
    expect(normalizar('arrow up right')).toBe(normalizar('ArrowUpRight'))
    expect(normalizar('circle-check')).toBe(normalizar('CircleCheck'))
  })

  it('sigue siendo insensible a mayúsculas', () => {
    expect(normalizar('ShelvingUnit')).toBe('shelvingunit')
  })
})
