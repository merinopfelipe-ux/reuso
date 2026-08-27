import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ResultadoMitigacion } from '@/lib/reportes/mitigacion'
import { dibujarMarcaEmpresa } from './pdf-shared'

const BRAND: [number, number, number] = [0, 130, 124]
const NEGRO: [number, number, number] = [71, 71, 71]
const GRIS: [number, number, number] = [153, 153, 153]

const ETIQUETA_CATEGORIA: Record<string, string> = {
  madera: 'Madera', metal: 'Metal', textil: 'Textil', cuero: 'Cuero', plastico: 'Plástico',
  vidrio: 'Vidrio', espuma_relleno: 'Espuma / relleno', carton_papel: 'Cartón / papel', otros: 'Otros',
}

export interface DatosPdfMitigacion {
  empresa_nombre: string
  empresa_logo_base64: string | null
  desde: string | null
  hasta: string | null
  resultado: ResultadoMitigacion
}

export function generarPDFMitigacion({ empresa_nombre, empresa_logo_base64, desde, hasta, resultado }: DatosPdfMitigacion): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  dibujarMarcaEmpresa(doc, empresa_logo_base64, empresa_nombre, 14, 6, 18)

  doc.setFontSize(14)
  doc.setTextColor(...BRAND)
  doc.text('Reporte 2 · Declaración de Mitigación Ecológica GRI/ESG', 38, 16)
  doc.setFontSize(9)
  doc.setTextColor(...GRIS)
  doc.text(`${empresa_nombre} · ${desde ?? 'Histórico'} a ${hasta ?? 'hoy'} · Generado ${new Date().toLocaleDateString('es-CO')}`, 38, 22)

  doc.setFontSize(10)
  doc.setTextColor(...NEGRO)
  doc.text(`CO₂ eq evitado: ${resultado.co2_total_kg.toFixed(2)} kg`, 14, 32)
  doc.text(`Agua ahorrada: ${resultado.agua_total_l.toLocaleString('es-CO')} L`, 100, 32)
  doc.text(`Índice de Certeza Metodológica (ICD): ${resultado.icd_porcentaje.toFixed(1)} %`, 180, 32)
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS)
  doc.text('ICD: alta=100 (dato primario/EPD), media=85 (DEFRA/Ecoinvent/IPCC), baja=50 (estimación por analogía), ponderado por peso.', 14, 38)

  autoTable(doc, {
    head: [['Tipo de material', 'Peso total (kg)', 'CO₂ eq evitado (kg)', 'Agua evitada (L)']],
    body: resultado.desglose_por_material.map((d) => [
      ETIQUETA_CATEGORIA[d.categoria_material] ?? d.categoria_material,
      d.peso_kg_total.toFixed(2),
      d.co2_evitado_kg.toFixed(2),
      d.agua_evitada_l.toFixed(2),
    ]),
    startY: 44,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 249] },
  })

  return Buffer.from(doc.output('arraybuffer'))
}
