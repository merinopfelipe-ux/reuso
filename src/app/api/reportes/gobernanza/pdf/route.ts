import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { calcularGobernanza, type TicketConMensajes } from '@/lib/reportes/gobernanza'
import { generarPDFGobernanza, type AuditoriaTarifaRow } from '@/lib/pdf/generar-pdf-reporte-gobernanza'
import { fetchImageAsBase64 } from '@/lib/pdf/pdf-shared'

interface TicketRow {
  id: string
  estado: string
  created_at: string
  tickets_mensajes: { es_admin: boolean; created_at: string }[] | null
}

export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin'])
  if (!auth.ok) {
    return NextResponse.json({ error: 'Sin permiso.' }, { status: auth.status })
  }
  const { empresa_id, adminClient } = auth
  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const { data: empresa } = await adminClient.from('empresas').select('nombre, logo_propuesta_url, logo_url').eq('id', empresa_id).single()

  let qTickets = adminClient
    .from('tickets')
    .select('id, estado, created_at, tickets_mensajes(es_admin, created_at)')
    .eq('empresa_id', empresa_id)
  if (desde) qTickets = qTickets.gte('created_at', desde)
  if (hasta) qTickets = qTickets.lte('created_at', hasta)
  const { data: ticketsRows, error } = await qTickets

  if (error) {
    return NextResponse.json({ error: 'Error al generar el PDF.' }, { status: 500 })
  }

  const tickets: TicketConMensajes[] = ((ticketsRows ?? []) as unknown as TicketRow[]).map((t) => ({
    id: t.id,
    estado: t.estado,
    created_at: t.created_at,
    mensajes: t.tickets_mensajes ?? [],
  }))

  const { data: itemsEmpresa } = await adminClient.from('items').select('id').eq('creado_por_empresa_id', empresa_id)
  const idsEmpresa = new Set((itemsEmpresa ?? []).map((i) => i.id as string))

  let qLogs = adminClient
    .from('logs_auditoria')
    .select('id, accion, detalle_json, created_at')
    .eq('accion', 'actualizar_item')
    .order('created_at', { ascending: false })
    .limit(200)
  if (desde) qLogs = qLogs.gte('created_at', desde)
  if (hasta) qLogs = qLogs.lte('created_at', hasta)
  const { data: logsRaw } = await qLogs

  const auditoria_tarifas = ((logsRaw ?? []) as unknown as AuditoriaTarifaRow[]).filter(
    (l) => l.detalle_json?.id && idsEmpresa.has(l.detalle_json.id)
  )

  const resultado = calcularGobernanza(tickets)
  const logoUrl = empresa?.logo_propuesta_url ?? empresa?.logo_url ?? null
  const empresa_logo_base64 = logoUrl ? await fetchImageAsBase64(logoUrl) : null
  const buffer = generarPDFGobernanza({ empresa_nombre: empresa?.nombre ?? 'Tu empresa', empresa_logo_base64, desde, hasta, resultado, auditoria_tarifas })

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-gobernanza-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}
