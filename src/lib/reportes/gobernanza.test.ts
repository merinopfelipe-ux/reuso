import { describe, it, expect } from 'vitest'
import { calcularGobernanza, type TicketConMensajes } from './gobernanza'

const TICKET_RESPONDIDO: TicketConMensajes = {
  id: 't1',
  estado: 'resuelto',
  created_at: '2026-08-01T10:00:00Z',
  mensajes: [
    { es_admin: false, created_at: '2026-08-01T10:05:00Z' },
    { es_admin: true, created_at: '2026-08-01T12:00:00Z' },
    { es_admin: true, created_at: '2026-08-01T14:00:00Z' },
  ],
}

const TICKET_SIN_RESPUESTA: TicketConMensajes = {
  id: 't2',
  estado: 'abierto',
  created_at: '2026-08-02T09:00:00Z',
  mensajes: [{ es_admin: false, created_at: '2026-08-02T09:01:00Z' }],
}

describe('calcularGobernanza - un ticket respondido, uno sin respuesta', () => {
  const res = calcularGobernanza([TICKET_RESPONDIDO, TICKET_SIN_RESPUESTA])

  it('cuenta el total de tickets', () => {
    expect(res.total_tickets).toBe(2)
  })

  it('agrupa por estado', () => {
    expect(res.por_estado).toEqual({ resuelto: 1, abierto: 1 })
  })

  it('cuenta tickets sin respuesta', () => {
    expect(res.tickets_sin_respuesta).toBe(1)
  })

  it('calcula el tiempo de primera respuesta en horas (usa la primera respuesta admin, 2h)', () => {
    expect(res.tiempo_primera_respuesta_promedio_horas).toBe(2)
  })
})

describe('calcularGobernanza - lista vacía', () => {
  it('no rompe con cero tickets', () => {
    const res = calcularGobernanza([])
    expect(res.total_tickets).toBe(0)
    expect(res.tiempo_primera_respuesta_promedio_horas).toBeNull()
  })
})
