import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { calcularGobernanza, type TicketConMensajes } from '@/lib/reportes/gobernanza'

// Reporte 4 — Cumplimiento y Gobernanza Corporativa. Dominio (D),
// autocontenido. La auditoría de tarifas/factores solo cubre ítems propios de
// esta empresa (creado_por_empresa_id) — el catálogo global lo edita
// super_admin y no es un dato de gobernanza de un tenant específico.

interface TicketRow {
  id: string
  estado: string
  created_at: string
  tickets_mensajes: { es_admin: boolean; created_at: string }[] | null
}

interface LogAuditoriaRow {
  id: string
  user_id: string | null
  accion: string
  detalle_json: { id?: string; antes?: unknown; despues?: unknown } | null
  created_at: string
}

export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'No autenticado.' : auth.status === 400 ? 'Selecciona una empresa para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth
  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  let qTickets = adminClient
    .from('tickets')
    .select('id, estado, created_at, tickets_mensajes(es_admin, created_at)')
    .eq('empresa_id', empresa_id)
  if (desde) qTickets = qTickets.gte('created_at', desde)
  if (hasta) qTickets = qTickets.lte('created_at', hasta)
  const { data: ticketsRows, error: errorTickets } = await qTickets

  if (errorTickets) {
    return NextResponse.json({ error: 'Error al cargar los datos de gobernanza.' }, { status: 500 })
  }

  const tickets: TicketConMensajes[] = ((ticketsRows ?? []) as unknown as TicketRow[]).map((t) => ({
    id: t.id,
    estado: t.estado,
    created_at: t.created_at,
    mensajes: t.tickets_mensajes ?? [],
  }))

  const { data: itemsEmpresa } = await adminClient
    .from('items')
    .select('id')
    .eq('creado_por_empresa_id', empresa_id)
  const idsEmpresa = new Set((itemsEmpresa ?? []).map((i) => i.id as string))

  let qLogs = adminClient
    .from('logs_auditoria')
    .select('id, user_id, accion, detalle_json, created_at')
    .eq('accion', 'actualizar_item')
    .order('created_at', { ascending: false })
    .limit(200)
  if (desde) qLogs = qLogs.gte('created_at', desde)
  if (hasta) qLogs = qLogs.lte('created_at', hasta)
  const { data: logsRaw } = await qLogs

  const auditoriaTarifas = ((logsRaw ?? []) as unknown as LogAuditoriaRow[]).filter(
    (l) => l.detalle_json?.id && idsEmpresa.has(l.detalle_json.id)
  )

  const resultado = calcularGobernanza(tickets)
  return NextResponse.json({ data: { ...resultado, auditoria_tarifas: auditoriaTarifas } })
}
