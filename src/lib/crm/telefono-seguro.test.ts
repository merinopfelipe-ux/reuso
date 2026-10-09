import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('server-only', () => ({}))

const CLAVE_CIFRADO = 'a'.repeat(40)
const CLAVE_HUELLA = 'b'.repeat(40)

beforeAll(() => {
  process.env.APP_DATA_ENCRYPTION_KEY = CLAVE_CIFRADO
  process.env.TELEFONO_HASH_KEY = CLAVE_HUELLA
})

describe('huellaTelefono', () => {
  it('da la misma huella para el mismo número con distinto formato', async () => {
    const { huellaTelefono } = await import('./telefono-seguro')
    expect(huellaTelefono('+57', '300 123 4567')).toBe(huellaTelefono('+57', '3001234567'))
  })

  it('distingue indicativos distintos', async () => {
    const { huellaTelefono } = await import('./telefono-seguro')
    expect(huellaTelefono('+57', '3001234567')).not.toBe(huellaTelefono('+1', '3001234567'))
  })

  it('devuelve null sin dígitos', async () => {
    const { huellaTelefono } = await import('./telefono-seguro')
    expect(huellaTelefono('+57', '')).toBeNull()
  })

  it('falla si la clave falta', async () => {
    const { huellaTelefono } = await import('./telefono-seguro')
    const previa = process.env.TELEFONO_HASH_KEY
    delete process.env.TELEFONO_HASH_KEY
    expect(() => huellaTelefono('+57', '3001234567')).toThrow('TELEFONO_HASH_KEY')
    process.env.TELEFONO_HASH_KEY = previa
  })
})

describe('guardarTelefono y leerTelefono', () => {
  it('cifra el número y lo recupera igual', async () => {
    const { guardarTelefono, leerTelefono } = await import('./telefono-seguro')
    const { telefono, telefono_hash } = await guardarTelefono('+57', '3001234567')
    expect(telefono).not.toContain('3001234567')
    expect(telefono_hash).toHaveLength(64)
    expect(await leerTelefono(telefono)).toBe('3001234567')
  })

  it('lee un número antiguo en texto plano sin cambiarlo', async () => {
    const { leerTelefono } = await import('./telefono-seguro')
    expect(await leerTelefono('3001234567')).toBe('3001234567')
  })

  it('no guarda nada si no hay número', async () => {
    const { guardarTelefono } = await import('./telefono-seguro')
    expect(await guardarTelefono('+57', null)).toEqual({ telefono: null, telefono_hash: null })
  })
})

describe('telefonos_extra', () => {
  it('cifra la lista y la recupera igual', async () => {
    const { guardarTelefonosExtra, leerTelefonosExtra } = await import('./telefono-seguro')
    const lista = [{ indicativo: '+57', numero: '3111234567' }]
    const guardado = await guardarTelefonosExtra(lista)
    expect(JSON.stringify(guardado)).not.toContain('3111234567')
    expect(await leerTelefonosExtra(guardado)).toEqual(lista)
  })

  it('acepta una lista antigua en claro', async () => {
    const { leerTelefonosExtra } = await import('./telefono-seguro')
    const lista = [{ indicativo: '+57', numero: '3111234567' }]
    expect(await leerTelefonosExtra(lista)).toEqual(lista)
  })

  it('guarda una lista vacía como lista vacía', async () => {
    const { guardarTelefonosExtra } = await import('./telefono-seguro')
    expect(await guardarTelefonosExtra([])).toEqual([])
  })
})
