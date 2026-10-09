import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { verificarFirmaChatwoot } from './chatwoot-firma'

const secreto = 's'.repeat(40)
const cuerpo = '{"event":"message_created"}'
const ts = '1700000000'
const firmaValida = `sha256=${crypto.createHmac('sha256', secreto).update(`${ts}.${cuerpo}`).digest('hex')}`

describe('verificarFirmaChatwoot', () => {
  it('acepta una firma correcta dentro de la ventana', () => {
    expect(verificarFirmaChatwoot({ cuerpo, timestamp: ts, firma: firmaValida, secreto, ahoraSeg: 1700000100 })).toBe(true)
  })

  it('rechaza si el cuerpo cambió', () => {
    expect(verificarFirmaChatwoot({ cuerpo: cuerpo + ' ', timestamp: ts, firma: firmaValida, secreto, ahoraSeg: 1700000100 })).toBe(false)
  })

  it('rechaza una firma con otro secreto', () => {
    expect(verificarFirmaChatwoot({ cuerpo, timestamp: ts, firma: firmaValida, secreto: 'x'.repeat(40), ahoraSeg: 1700000100 })).toBe(false)
  })

  it('rechaza un timestamp fuera de la ventana de 5 minutos', () => {
    expect(verificarFirmaChatwoot({ cuerpo, timestamp: ts, firma: firmaValida, secreto, ahoraSeg: 1700000400 })).toBe(false)
  })

  it('rechaza si faltan encabezados', () => {
    expect(verificarFirmaChatwoot({ cuerpo, timestamp: '', firma: firmaValida, secreto })).toBe(false)
    expect(verificarFirmaChatwoot({ cuerpo, timestamp: ts, firma: '', secreto })).toBe(false)
  })
})
