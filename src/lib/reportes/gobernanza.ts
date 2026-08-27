// Reporte 4 — Cumplimiento y Gobernanza Corporativa. Dominio (D) Metadatos
// del Negocio, autocontenido. Ver skill `dominios-datos`. La métrica de tasa
// de formalización legal por cotización se descartó (no hay vínculo
// firmas_solicitudes↔crm_cotizaciones, decisión confirmada con el usuario).

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface MensajeTicket {
  es_admin: boolean
  created_at: string
}

export interface TicketConMensajes {
  id: string
  estado: string
  created_at: string
  mensajes: MensajeTicket[]
}

export interface ResultadoGobernanza {
  total_tickets: number
  por_estado: Record<string, number>
  tickets_sin_respuesta: number
  tiempo_primera_respuesta_promedio_horas: number | null
}

export function calcularGobernanza(tickets: TicketConMensajes[]): ResultadoGobernanza {
  const por_estado: Record<string, number> = {}
  let tickets_sin_respuesta = 0
  const tiemposRespuestaHoras: number[] = []

  for (const t of tickets) {
    por_estado[t.estado] = (por_estado[t.estado] ?? 0) + 1

    const primeraRespuesta = t.mensajes
      .filter((m) => m.es_admin)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]

    if (!primeraRespuesta) {
      tickets_sin_respuesta += 1
      continue
    }

    const horas = (new Date(primeraRespuesta.created_at).getTime() - new Date(t.created_at).getTime()) / 3_600_000
    if (horas >= 0) tiemposRespuestaHoras.push(horas)
  }

  const tiempo_primera_respuesta_promedio_horas = tiemposRespuestaHoras.length > 0
    ? r2(tiemposRespuestaHoras.reduce((s, h) => s + h, 0) / tiemposRespuestaHoras.length)
    : null

  return {
    total_tickets: tickets.length,
    por_estado,
    tickets_sin_respuesta,
    tiempo_primera_respuesta_promedio_horas,
  }
}
