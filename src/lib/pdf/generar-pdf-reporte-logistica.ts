import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ResultadoLogistica } from '@/lib/reportes/logistica'
import { dibujarMarcaEmpresa } from './pdf-shared'

const BRAND: [number, number, number] = [0, 130, 124]
const NEGRO: [number, number, number] = [71, 71, 71]
const GRIS: [number, number, number] = [153, 153, 153]

const ETIQUETA_VEHICULO: Record<string, string> = {
  liviano_diesel: 'Furgoneta / van ligera diésel',
  mediano_diesel: 'Camión mediano rígido diésel',
  pesado_diesel: 'Camión pesado diésel',
}

export interface DatosPdfLogistica {
  empresa_nombre: string
  empresa_logo_base64: string | null
  desde: string | null
  hasta: string | null
  resultado: ResultadoLogistica
}

export function generarPDFLogistica({ empresa_nombre, empresa_logo_base64, desde, hasta, resultado }: DatosPdfLogistica): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  dibujarMarcaEmpresa(doc, empresa_logo_base64, empresa_nombre, 14, 6, 18)

  doc.setFontSize(14)
  doc.setTextColor(...BRAND)
  doc.text('Reporte 3 · Bitácora de Logística y Residuo Cero', 38, 16)
  doc.setFontSize(9)
  doc.setTextColor(...GRIS)
  doc.text(`${empresa_nombre} · ${desde ?? 'Histórico'} a ${hasta ?? 'hoy'} · Generado ${new Date().toLocaleDateString('es-CO')}`, 38, 22)

  doc.setFontSize(10)
  doc.setTextColor(...NEGRO)
  doc.text(`CO₂ eq de logística: ${resultado.co2_logistica_total_kg.toFixed(2)} kg`, 14, 32)
  doc.text(`Tasa de desvío de vertedero: ${resultado.tasa_desvio_vertedero_pct !== null ? resultado.tasa_desvio_vertedero_pct.toFixed(1) + '%' : 'Sin residuo registrado'}`, 120, 32)
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS)
  doc.text('Factores de emisión: DEFRA UK Greenhouse Gas Conversion Factors, nivel de confianza media (estimación provisional).', 14, 38)

  autoTable(doc, {
    head: [['Vehículo', 'Distancia (km)', 'CO₂ eq logística (kg)', 'Residuo taller (kg)', 'Residuo reciclado (kg)', 'Destino']],
    body: resultado.ciclos.map((c) => [
      c.tipo_vehiculo_transporte ? (ETIQUETA_VEHICULO[c.tipo_vehiculo_transporte] ?? c.tipo_vehiculo_transporte) : 'Sin transporte',
      c.distancia_transporte_km.toFixed(1),
      c.co2_logistica_kg.toFixed(2),
      c.peso_residuo_taller_kg.toFixed(1),
      c.peso_residuo_reciclado_kg.toFixed(1),
      c.destino_residuo ?? '—',
    ]),
    startY: 44,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 249] },
  })

  return Buffer.from(doc.output('arraybuffer'))
}
