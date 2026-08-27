import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ResultadoGobernanza } from '@/lib/reportes/gobernanza'
import { dibujarMarcaEmpresa } from './pdf-shared'

const BRAND: [number, number, number] = [0, 130, 124]
const NEGRO: [number, number, number] = [71, 71, 71]
const GRIS: [number, number, number] = [153, 153, 153]

export interface AuditoriaTarifaRow {
  id: string
  accion: string
  detalle_json: { id?: string; antes?: unknown; despues?: unknown } | null
  created_at: string
}

export interface DatosPdfGobernanza {
  empresa_nombre: string
  empresa_logo_base64: string | null
  desde: string | null
  hasta: string | null
  resultado: ResultadoGobernanza
  auditoria_tarifas: AuditoriaTarifaRow[]
}

export function generarPDFGobernanza({ empresa_nombre, empresa_logo_base64, desde, hasta, resultado, auditoria_tarifas }: DatosPdfGobernanza): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  dibujarMarcaEmpresa(doc, empresa_logo_base64, empresa_nombre, 14, 6, 18)

  doc.setFontSize(14)
  doc.setTextColor(...BRAND)
  doc.text('Reporte 4 · Cumplimiento y Gobernanza Corporativa', 38, 16)
  doc.setFontSize(9)
  doc.setTextColor(...GRIS)
  doc.text(`${empresa_nombre} · ${desde ?? 'Histórico'} a ${hasta ?? 'hoy'} · Generado ${new Date().toLocaleDateString('es-CO')}`, 38, 22)

  doc.setFontSize(10)
  doc.setTextColor(...NEGRO)
  doc.text(`Tickets totales: ${resultado.total_tickets}`, 14, 32)
  doc.text(`Sin responder: ${resultado.tickets_sin_respuesta}`, 90, 32)
  doc.text(`Tiempo promedio de primera respuesta: ${resultado.tiempo_primera_respuesta_promedio_horas !== null ? resultado.tiempo_primera_respuesta_promedio_horas.toFixed(1) + ' h' : 'Sin datos'}`, 160, 32)

  autoTable(doc, {
    head: [['Estado del ticket', 'Cantidad']],
    body: Object.entries(resultado.por_estado).map(([estado, cantidad]) => [estado, String(cantidad)]),
    startY: 40,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 249] },
    tableWidth: 90,
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  doc.setFontSize(10)
  doc.setTextColor(...NEGRO)
  doc.text('Auditoría de cambios de tarifas y factores (catálogo propio de la empresa)', 14, finalY + 10)

  autoTable(doc, {
    head: [['Fecha', 'Ítem', 'Campos modificados']],
    body: auditoria_tarifas.map((a) => [
      new Date(a.created_at).toLocaleString('es-CO'),
      a.detalle_json?.id ?? '—',
      a.detalle_json?.despues ? Object.keys(a.detalle_json.despues as object).join(', ') : '—',
    ]),
    startY: finalY + 14,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 249] },
  })

  return Buffer.from(doc.output('arraybuffer'))
}
