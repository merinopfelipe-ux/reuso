import { describe, it, expect } from 'vitest'
import { parseE164 } from './e164'

describe('parseE164', () => {
  it('separa un número colombiano', () => {
    expect(parseE164('+573001234567')).toEqual({ e164: '+573001234567', indicativo: '+57', numero: '3001234567' })
  })

  it('usa el prefijo más largo cuando aplica', () => {
    expect(parseE164('+5916123456')?.indicativo).toBe('+591')
  })

  it('acepta números de +1', () => {
    expect(parseE164('+13055551234')?.indicativo).toBe('+1')
  })

  it('rechaza números enmascarados o incompletos', () => {
    expect(parseE164('+57300***4567')).toBeNull()
    expect(parseE164('3001234567')).toBeNull()
    expect(parseE164('+57300')).toBeNull()
    expect(parseE164('')).toBeNull()
    expect(parseE164(null)).toBeNull()
  })
})
