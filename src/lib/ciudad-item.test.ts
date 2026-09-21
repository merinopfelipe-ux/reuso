import { describe, it, expect } from 'vitest'
import {
  extraerCiudadDeNombre,
  generarNombreDuplicadoCiudad,
} from './ciudad-item'

describe('extraerCiudadDeNombre', () => {
  it('detecta ciudades comunes al final con guion', () => {
    expect(extraerCiudadDeNombre('Escritorio grande para ajuste y pintura - Bogotá')).toBe('Bogotá')
    expect(extraerCiudadDeNombre('Cuero (Teñido de poltrona - Medellín)')).toBe('Medellín')
    expect(extraerCiudadDeNombre('Silla ejecutiva - Cali')).toBe('Cali')
  })

  it('detecta ciudades entre paréntesis', () => {
    expect(extraerCiudadDeNombre('Mesa de reuniones (Barranquilla)')).toBe('Barranquilla')
  })

  it('devuelve null si no hay ciudad en el nombre', () => {
    expect(extraerCiudadDeNombre('Escritorio grande para ajuste y pintura')).toBeNull()
    expect(extraerCiudadDeNombre('')).toBeNull()
  })
})

describe('generarNombreDuplicadoCiudad', () => {
  it('reemplaza la ciudad existente por la nueva ciudad', () => {
    expect(
      generarNombreDuplicadoCiudad('Escritorio grande para ajuste y pintura - Bogotá', 'Medellín')
    ).toBe('Escritorio grande para ajuste y pintura - Medellín')

    expect(
      generarNombreDuplicadoCiudad('Cuero (Teñido de poltrona - Medellín)', 'Bogotá')
    ).toBe('Cuero (Teñido de poltrona - Bogotá)')

    expect(
      generarNombreDuplicadoCiudad('Silla (Cali)', 'Barranquilla')
    ).toBe('Silla (Barranquilla)')
  })

  it('agrega la ciudad con guion si el nombre original no tenía ciudad', () => {
    expect(
      generarNombreDuplicadoCiudad('Escritorio grande para ajuste y pintura', 'Medellín')
    ).toBe('Escritorio grande para ajuste y pintura - Medellín')
  })

  it('mantiene el nombre limpio si la nueva ciudad está vacía', () => {
    expect(
      generarNombreDuplicadoCiudad('Escritorio grande para ajuste y pintura - Bogotá', '')
    ).toBe('Escritorio grande para ajuste y pintura - Bogotá')
  })
})
