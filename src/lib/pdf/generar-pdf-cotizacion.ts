import { jsPDF } from 'jspdf'
import { calcularDesglose, transportePorItem, type DatosPrecio } from '@/lib/cotizador/precio'
import { formatCodigoCotizacion } from '@/lib/cotizador/format-codigo'
import { formatEnteroMillones } from '@/lib/format'
import { fetchImageAsBase64 } from './pdf-shared'

export { fetchImageAsBase64 }

export interface MuebleDoc {
  titulo: string
  descripcion?: string | null
  cantidad: number
  precio_mueble: number
  imagen_base64?: string | null
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
  validez_mostrar_lista: boolean
  anticipo_activo: boolean
  anticipo_porcentaje: number
  forma_pago_activo: boolean
  forma_pago_tipo: 'anticipo' | 'dias'
  forma_pago_dias: number
  forma_pago_mostrar_lista: boolean
  tiempo_entrega_activo: boolean
  tiempo_entrega: string | null
  tiempo_entrega_mostrar_lista: boolean
  garantia_activo: boolean
  garantia: string | null
  garantia_mostrar_lista: boolean
  envio_gratis_activo: boolean
  envio_gratis_texto: string | null
  envio_gratis_mostrar_lista: boolean
  nota_mostrar_lista: boolean
  destacados_json: { icono: string; texto: string; mostrar_lista?: boolean }[]
  legales_json: string[]
  muebles: MuebleDoc[]
}

// El PDF es texto plano (jsPDF no soporta HTML) — las notas públicas vienen
// del RichTextEditor con etiquetas de formato simples, se descartan aquí.
function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
}

function formatCOP(n: number): string {
  return '$' + formatEnteroMillones(Math.round(n))
}

const NEGRO = '#1a1a1a'
const GRIS_TEXTO = '#666666'
const BORDE = '#e5e5e5'

/**
 * Genera el PDF de la cotización usando jsPDF, con un diseño "Lista" en blanco
 * y negro, paginación, e imágenes de muebles a ancho completo.
 */
export function generarPDFCotizacion(datos: DatosCotizacionPDF): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const MARGIN_X = 15
  const CONTENT_W = W - MARGIN_X * 2
  let y = 18
  let pageNum = 1

  function addPageIfNeeded(requiredSpace: number) {
    if (y + requiredSpace > H - 15) {
      // Footer actual
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(GRIS_TEXTO)
      doc.text(datos.empresa_nombre, MARGIN_X, H - 8)
      doc.text(`Página ${pageNum}`, W - MARGIN_X, H - 8, { align: 'right' })
      
      doc.addPage()
      pageNum++
      y = 18
    }
  }

  // --- ENCABEZADO ---
  let logoDibujado = false
  if (datos.empresa_logo_base64) {
    try {
      // Pasamos el Data URL tal cual; jsPDF soporta data URLs
      doc.addImage(datos.empresa_logo_base64, 'PNG', MARGIN_X, y - 8, 28, 28)
      logoDibujado = true
    } catch {
      // Fallback
    }
  }
  if (!logoDibujado) {
    doc.setTextColor(NEGRO)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(datos.empresa_nombre, MARGIN_X, y)
  }
  y += 18

  doc.setDrawColor(BORDE)
  doc.line(MARGIN_X, y, W - MARGIN_X, y)
  y += 8

  // --- DATOS DEL CLIENTE ---
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
  doc.setTextColor(GRIS_TEXTO)
  doc.setFont('helvetica', 'bold')
  doc.text('Cotizado para', MARGIN_X, y)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(NEGRO)
  const codText = formatCodigoCotizacion(datos.codigo_cotizacion).toUpperCase()
  doc.text(codText, W - MARGIN_X, y + 2, { align: 'right' })

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(NEGRO)
  doc.text(nombrePrincipal, MARGIN_X, y, { maxWidth: 100 })
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRIS_TEXTO)
  doc.text(datos.fecha, W - MARGIN_X, y, { align: 'right' })
  
  y += 6
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRIS_TEXTO)
  if (identificacionText) { doc.text(identificacionText, MARGIN_X, y); y += 5 }
  if (nombreContacto) { doc.text(nombreContacto, MARGIN_X, y); y += 5 }
  if (datos.cliente_telefono) { doc.text(datos.cliente_telefono, MARGIN_X, y); y += 5 }
  if (datos.cliente_email) { doc.text(datos.cliente_email, MARGIN_X, y); y += 5 }
  if (direccionMostrar) { doc.text(direccionMostrar, MARGIN_X, y); y += 5 }
  
  y += 3
  doc.setDrawColor(BORDE)
  doc.line(MARGIN_X, y, W - MARGIN_X, y)
  y += 8

  // --- MUEBLES ---
  const transportePorLinea = transportePorItem(datos, datos.muebles.length || 1)
  
  datos.muebles.forEach((m) => {
    // Calcular altura requerida aprox
    let reqHeight = 25
    if (m.imagen_base64) reqHeight += 125 // margen extra para que no quede la foto pegada
    if (m.descripcion) {
      const splitDesc = doc.splitTextToSize(m.descripcion, CONTENT_W)
      reqHeight += splitDesc.length * 4
    }
    addPageIfNeeded(reqHeight)

    const totalLinea = Number(m.precio_mueble) + transportePorLinea

    // Título, Cantidad y Precio
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(NEGRO)
    doc.text(m.titulo, MARGIN_X, y, { maxWidth: 100 })
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(GRIS_TEXTO)
    doc.text(`Cant: ${m.cantidad}`, 140, y)
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(NEGRO)
    doc.text(formatCOP(totalLinea), W - MARGIN_X, y, { align: 'right' })
    
    y += 6

    // Descripción
    if (m.descripcion) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(GRIS_TEXTO)
      const splitDesc = doc.splitTextToSize(m.descripcion, CONTENT_W)
      doc.text(splitDesc, MARGIN_X, y)
      y += splitDesc.length * 4 + 4
    } else {
      y += 2
    }

    // Imagen (Ancho casi total, encuadrada)
    if (m.imagen_base64) {
      try {
        // En una hoja A4 (210mm), CONTENT_W es 180mm. 
        // Asumiendo que las imágenes se ven bien cuadradas para no desbordar mucho el height
        const targetW = CONTENT_W - 20
        const targetH = targetW
        const offsetX = MARGIN_X + 10
        
        let imgFormat = 'PNG'
        if (m.imagen_base64.startsWith('data:image/jpeg')) imgFormat = 'JPEG'
        else if (m.imagen_base64.startsWith('data:image/webp')) imgFormat = 'WEBP'
        
        doc.addImage(m.imagen_base64, imgFormat, offsetX, y, targetW, targetH)
        y += targetH + 8
      } catch {
        // Una imagen ilegible no debe tumbar el PDF entero: se omite y sigue.
      }
    }

    y += 2
    doc.setDrawColor(BORDE)
    doc.line(MARGIN_X, y, W - MARGIN_X, y)
    y += 8
  })

  // --- DESGLOSE DE PRECIOS ---
  addPageIfNeeded(60)
  
  const desglose = calcularDesglose(datos)
  const colX = 140

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRIS_TEXTO)
  doc.text('Subtotal', colX, y)
  doc.setTextColor(NEGRO)
  doc.text(formatCOP(desglose.subtotal + desglose.transporte), W - MARGIN_X, y, { align: 'right' })
  y += 6

  if (desglose.descuentoMonto > 0) {
    doc.setTextColor(GRIS_TEXTO)
    doc.text(`Descuento${datos.descuento_tipo === 'porcentaje' ? ` (${datos.descuento} %)` : ''}`, colX, y)
    doc.setTextColor(NEGRO)
    doc.text(`- ${formatCOP(desglose.descuentoMonto)}`, W - MARGIN_X, y, { align: 'right' })
    y += 6
  }
  if (datos.iva_activo) {
    doc.setTextColor(GRIS_TEXTO)
    doc.text(`IVA (${datos.iva_porcentaje} %)`, colX, y)
    doc.setTextColor(NEGRO)
    doc.text(formatCOP(desglose.ivaMonto), W - MARGIN_X, y, { align: 'right' })
    y += 6
  }

  y += 2
  doc.setDrawColor(NEGRO)
  doc.line(colX, y, W - MARGIN_X, y)
  y += 8
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Total', colX, y)
  doc.text(formatCOP(desglose.total), W - MARGIN_X, y, { align: 'right' })
  y += 12

  // --- MÓDULOS COMERCIALES ---
  doc.setDrawColor(BORDE)
  doc.line(MARGIN_X, y, W - MARGIN_X, y)
  y += 8

  function printLine(label: string, value: string) {
    // Calcular altura requerida basada en si el value se parte en líneas
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const labelW = doc.getTextWidth(label + ':')
    const valLines = doc.splitTextToSize(value, CONTENT_W - labelW - 4)
    
    addPageIfNeeded(valLines.length * 4 + 6)
    
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(NEGRO)
    doc.text(label + ':', MARGIN_X, y)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(GRIS_TEXTO)
    doc.text(valLines, MARGIN_X + labelW + 2, y)
    y += valLines.length * 4 + 4
  }

  if (datos.forma_pago_activo && datos.forma_pago_mostrar_lista) {
    if (datos.forma_pago_tipo === 'dias') {
      printLine('Forma de pago', `A ${datos.forma_pago_dias ?? 30} días`)
    } else {
      const p = datos.anticipo_porcentaje ?? 60
      printLine('Forma de pago', `Anticipo ${p}% y restante ${100 - p}% a la entrega`)
    }
  }

  if (datos.observaciones && datos.nota_mostrar_lista) {
    printLine('Nota', stripHtml(datos.observaciones))
  }

  if (datos.validez_activa && datos.validez_mostrar_lista) {
    printLine('Validez de la oferta', `Válida hasta el ${datos.fecha_validez}`)
  }

  if (datos.tiempo_entrega_activo && datos.tiempo_entrega_mostrar_lista && datos.tiempo_entrega) {
    printLine('Tiempo de entrega', datos.tiempo_entrega.endsWith('.') ? datos.tiempo_entrega : datos.tiempo_entrega + '.')
  }

  if (datos.garantia_activo && datos.garantia_mostrar_lista && datos.garantia) {
    printLine('Garantía', datos.garantia)
  }

  const destacadosVisuales = datos.destacados_json?.filter(d => d.mostrar_lista !== false) ?? []
  if (destacadosVisuales.length > 0) {
    y += 2
    destacadosVisuales.forEach(d => {
      const clean = stripHtml(d.texto)
      const lines = doc.splitTextToSize(clean, CONTENT_W - 5)
      addPageIfNeeded(lines.length * 4 + 6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(GRIS_TEXTO)
      doc.text('• ' + lines[0], MARGIN_X, y)
      if (lines.length > 1) {
        doc.text(lines.slice(1), MARGIN_X + 5, y + 4)
      }
      y += lines.length * 4 + 2
    })
  }
  
  y += 4

  // --- TEXTOS LEGALES ---
  if (datos.legales_json && datos.legales_json.length > 0) {
    addPageIfNeeded(30)
    doc.setDrawColor(BORDE)
    doc.line(MARGIN_X, y, W - MARGIN_X, y)
    y += 8
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(GRIS_TEXTO)
    
    datos.legales_json.forEach(leg => {
      const clean = stripHtml(leg)
      const lines = doc.splitTextToSize(clean, CONTENT_W)
      addPageIfNeeded(lines.length * 3.5 + 4)
      doc.text(lines, MARGIN_X, y)
      y += lines.length * 3.5 + 4
    })
  }

  // Footer on last page
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(GRIS_TEXTO)
  doc.text(datos.empresa_nombre, MARGIN_X, H - 8)
  doc.text(`Página ${pageNum}`, W - MARGIN_X, H - 8, { align: 'right' })

  return Buffer.from(doc.output('arraybuffer'))
}
