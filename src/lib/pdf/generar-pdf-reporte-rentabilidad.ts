import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ResultadoRentabilidad } from '@/lib/reportes/rentabilidad'
import { dibujarMarcaEmpresa } from './pdf-shared'

const BRAND: [number, number, number] = [0, 130, 124]
const NEGRO: [number, number, number] = [71, 71, 71]
const GRIS: [number, number, number] = [153, 153, 153]

function formatCOP(n: number): string {
  return '$ ' + Math.round(n).toLocaleString('es-CO')
}

export interface DatosPdfRentabilidad {
  empresa_nombre: string
  /** Logo en modo día ya convertido a base64 — null usa el wordmark de Calculadora de Reúso. */
  empresa_logo_base64: string | null
  desde: string | null
  hasta: string | null
  resultado: ResultadoRentabilidad
}

export function generarPDFRentabilidad({ empresa_nombre, empresa_logo_base64, desde, hasta, resultado }: DatosPdfRentabilidad): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  dibujarMarcaEmpresa(doc, empresa_logo_base64, empresa_nombre, 14, 6, 18)

  doc.setFontSize(14)
  doc.setTextColor(...BRAND)
  doc.text('Reporte 1 · Balance de Rentabilidad y Retorno Financiero', 38, 16)
  doc.setFontSize(9)
  doc.setTextColor(...GRIS)
  doc.text(`${empresa_nombre} · ${desde ?? 'Histórico'} a ${hasta ?? 'hoy'} · Generado ${new Date().toLocaleDateString('es-CO')}`, 38, 22)

  doc.setFontSize(10)
  doc.setTextColor(...NEGRO)
  doc.text(`Ahorro Neto CAPEX: ${formatCOP(resultado.ahorro_neto_total)}`, 14, 32)
  doc.text(`Margen costo-beneficio promedio: ${resultado.margen_costo_beneficio_promedio ? resultado.margen_costo_beneficio_promedio.toFixed(2) + 'x' : 'Sin datos'}`, 120, 32)
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text(`${resultado.omitidos_sin_precio_mercado} mueble(s) sin precio de mercado confirmado, excluidos del total.`, 14, 38)

  autoTable(doc, {
    head: [['Mueble', 'Cantidad', 'Precio mercado nuevo', 'Costo restauración', 'Ahorro neto', 'Margen', 'Asesor']],
    body: resultado.items.map((i) => [
      i.titulo,
      String(i.cantidad),
      formatCOP(i.precio_mercado_nuevo),
      formatCOP(i.costo_restauracion),
      formatCOP(i.ahorro_neto),
      i.margen_costo_beneficio ? `${i.margen_costo_beneficio.toFixed(2)}x` : '—',
      i.asesor_nombre ?? 'Sin asesor',
    ]),
    startY: 44,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 249] },
  })

  return Buffer.from(doc.output('arraybuffer'))
}
