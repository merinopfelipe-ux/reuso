import { jsPDF } from 'jspdf'
import { calcularDesglose, transportePorItem, type DatosPrecio } from '@/lib/cotizador/precio'
import { formatCodigoCotizacion } from '@/lib/cotizador/format-codigo'
import { formatEnteroMillones } from '@/lib/format'
import { fetchImageAsBase64 } from './pdf-shared'

export { fetchImageAsBase64 }

export interface MuebleDoc {
  titulo: string
  cantidad: number
  precio_mueble: number
}

export interface DatosCotizacionPDF extends DatosPrecio {
  codigo_cotizacion: string
  fecha: string
  cliente_nombre: string
  cliente_apellido: string | null
  cliente_identificacion: string | null
  cliente_telefono: string | null
  cliente_email?: string | null
  cliente_direccion: string | null
  cliente_tipo?: 'persona' | 'empresa' | null
  cliente_es_contacto_real?: boolean
  empresa_cliente_razon_social?: string | null
  empresa_cliente_nit?: string | null
  empresa_cliente_direccion?: string | null
  empresa_nombre: string
  empresa_logo_base64: string | null
  observaciones: string | null
  validez_activa: boolean
  fecha_validez: string
  muebles: MuebleDoc[]
}

// El PDF es texto plano (jsPDF no soporta HTML) — las notas públicas vienen
// del RichTextEditor con etiquetas de formato simples, se descartan aquí.
function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
}

function formatCOP(n: number): string {
  return '$' + formatEnteroMillones(Math.round(n))
}

const NEGRO = '#474747'
const GRIS = '#999999'
const BORDE = '#E0E0E0'

/**
 * Descarga básica de una cotización: logo de la empresa arriba, tabla de
 * ítems y totales. Es un resumen de referencia, no un documento legal ni
 * de facturación (por eso no incluye impuestos discriminados por línea).
 */
export function generarPDFCotizacion(datos: DatosCotizacionPDF): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  let y = 18

  // El logo REEMPLAZA el nombre — nunca se muestran los dos juntos.
  let logoDibujado = false
  if (datos.empresa_logo_base64) {
    try {
      doc.addImage(datos.empresa_logo_base64, 'PNG', 15, y - 8, 28, 28)
      logoDibujado = true
    } catch {
      // Formato de imagen no soportado por jsPDF (ej. SVG) — cae al nombre.
    }
  }
  if (!logoDibujado) {
    doc.setTextColor(NEGRO)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(datos.empresa_nombre, 15, y)
  }
  y += 14

  doc.setDrawColor(BORDE)
  doc.line(15, y, W - 15, y)
  y += 10

  const esEmpresa = datos.cliente_tipo === 'empresa' || !!datos.empresa_cliente_razon_social
  const nombrePrincipal = esEmpresa
    ? (datos.empresa_cliente_razon_social ?? `${datos.cliente_nombre} ${datos.cliente_apellido ?? ''}`.trim())
    : `${datos.cliente_nombre} ${datos.cliente_apellido ?? ''}`.trim()

  const identificacionText = esEmpresa
    ? (datos.empresa_cliente_nit ? `NIT ${datos.empresa_cliente_nit}` : (datos.cliente_identificacion ? `NIT ${datos.cliente_identificacion}` : null))
    : (datos.cliente_identificacion ? `CC ${datos.cliente_identificacion}` : null)

  const nombreContacto = esEmpresa && (datos.cliente_es_contacto_real ?? true) && datos.cliente_nombre ? `${datos.cliente_nombre} ${datos.cliente_apellido ?? ''}`.trim() : null
  const direccionMostrar = datos.empresa_cliente_direccion || datos.cliente_direccion

  doc.setFontSize(9)
  doc.setTextColor(GRIS)
  doc.text('Cotizado para', 15, y)
  doc.text('N.° de cotización', W - 15, y, { align: 'right' })
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(NEGRO)
  doc.text(nombrePrincipal, 15, y, { maxWidth: 120 })
  doc.text(formatCodigoCotizacion(datos.codigo_cotizacion), W - 15, y, { align: 'right' })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRIS)
  doc.text(datos.fecha, W - 15, y, { align: 'right' })

  if (identificacionText) { doc.text(identificacionText, 15, y); y += 4.5 }
  if (nombreContacto) { doc.text(nombreContacto, 15, y); y += 4.5 }
  if (datos.cliente_telefono) { doc.text(datos.cliente_telefono, 15, y); y += 4.5 }
  if (datos.cliente_email) { doc.text(datos.cliente_email, 15, y); y += 4.5 }
  if (direccionMostrar) { doc.text(direccionMostrar, 15, y); y += 4.5 }
  y += 4

  doc.setFontSize(8)
  doc.setTextColor(GRIS)
  doc.text('Ítem', 15, y)
  doc.text('Cant.', 130, y, { align: 'right' })
  doc.text('Total', W - 15, y, { align: 'right' })
  y += 2
  doc.setDrawColor(BORDE)
  doc.line(15, y, W - 15, y)
  y += 6

  const transportePorLinea = transportePorItem(datos, datos.muebles.length || 1)
  doc.setFontSize(10)
  doc.setTextColor(NEGRO)
  datos.muebles.forEach((m) => {
    if (y > 265) { doc.addPage(); y = 20 }
    const totalLinea = Number(m.precio_mueble) + transportePorLinea
    doc.text(m.titulo, 15, y, { maxWidth: 105 })
    doc.text(String(m.cantidad), 130, y, { align: 'right' })
    doc.text(formatCOP(totalLinea), W - 15, y, { align: 'right' })
    y += 8
  })

  y += 4
  doc.setDrawColor(BORDE)
  doc.line(120, y, W - 15, y)
  y += 7

  const desglose = calcularDesglose(datos)
  doc.setFontSize(9)
  doc.setTextColor(GRIS)
  doc.text('Subtotal', 120, y)
  doc.setTextColor(NEGRO)
  doc.text(formatCOP(desglose.subtotal + desglose.transporte), W - 15, y, { align: 'right' })
  y += 6

  if (desglose.descuentoMonto > 0) {
    doc.setTextColor(GRIS)
    doc.text(`Descuento${datos.descuento_tipo === 'porcentaje' ? ` (${datos.descuento} %)` : ''}`, 120, y)
    doc.setTextColor(NEGRO)
    doc.text(`- ${formatCOP(desglose.descuentoMonto)}`, W - 15, y, { align: 'right' })
    y += 6
  }
  if (datos.iva_activo) {
    doc.setTextColor(GRIS)
    doc.text(`IVA (${datos.iva_porcentaje} %)`, 120, y)
    doc.setTextColor(NEGRO)
    doc.text(formatCOP(desglose.ivaMonto), W - 15, y, { align: 'right' })
    y += 6
  }

  y += 2
  doc.setDrawColor(NEGRO)
  doc.line(120, y, W - 15, y)
  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total', 120, y)
  doc.text(formatCOP(desglose.total), W - 15, y, { align: 'right' })

  if (datos.validez_activa) {
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(GRIS)
    doc.text(`Válida hasta el ${datos.fecha_validez}`, W - 15, y, { align: 'right' })
  }

  if (datos.observaciones) {
    y += 14
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(GRIS)
    doc.text(`"${stripHtml(datos.observaciones)}"`, 15, y, { maxWidth: W - 30 })
  }

  const H = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(GRIS)
  doc.text(datos.empresa_nombre, 15, H - 12)
  if (datos.cliente_telefono) doc.text(datos.cliente_telefono, W - 15, H - 12, { align: 'right' })

  return Buffer.from(doc.output('arraybuffer'))
}
