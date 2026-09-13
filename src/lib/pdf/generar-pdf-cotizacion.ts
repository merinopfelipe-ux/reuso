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
  valor_nuevo_total?: number | null
  valor_reparacion_total?: number | null
  porcentaje_ahorro?: number | null
  co2_evitado_kg?: number | null
  agua_evitada_l?: number | null
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

function formatCOPOpcional(n: number, conDecimales: boolean): string {
  if (conDecimales && n % 1 !== 0) {
    const val = n.toFixed(2)
    const [enteroStr, decStr] = val.split('.')
    return '$' + formatEnteroMillones(parseInt(enteroStr, 10)) + ',' + decStr
  }
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
      const isJpg = datos.empresa_logo_base64.startsWith('data:image/jpeg') || datos.empresa_logo_base64.startsWith('data:image/jpg')
      const format = isJpg ? 'JPEG' : 'PNG'
      doc.addImage(datos.empresa_logo_base64, format, MARGIN_X, y - 8, 28, 28)
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

  const cleanNitPdf = (val: string | null | undefined) => {
    if (!val) return null
    const cleaned = val.replace(/^(NIT\s*:?\s*)+/i, '').trim()
    return cleaned ? `NIT ${cleaned}` : null
  }

  const cleanCCPdf = (val: string | null | undefined) => {
    if (!val) return null
    const cleaned = val.replace(/^(CC\s*:?\s*)+/i, '').trim()
    return cleaned ? `CC ${cleaned}` : null
  }

  const identificacionText = esEmpresa
    ? (cleanNitPdf(datos.empresa_cliente_nit) || cleanNitPdf(datos.cliente_identificacion))
    : cleanCCPdf(datos.cliente_identificacion)

  const contactoStr = `${datos.cliente_nombre || ''} ${datos.cliente_apellido || ''}`.trim()
  const esMismoNombre = contactoStr.toLowerCase() === nombrePrincipal.toLowerCase()
  const nombreContacto = esEmpresa && (datos.cliente_es_contacto_real ?? true) && datos.cliente_nombre && !esMismoNombre ? contactoStr : null
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
    const tituloMueble = m.titulo.replace(/\s*\(x\d+\)\s*$/i, '')
    doc.text(tituloMueble, MARGIN_X, y, { maxWidth: 100 })
    
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
  const tieneDecimalesIva = Boolean(datos.iva_activo && (desglose.ivaMonto % 1 !== 0))
  const colX = 140

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRIS_TEXTO)
  doc.text('Subtotal', colX, y)
  doc.setTextColor(NEGRO)
  doc.text(formatCOPOpcional(desglose.subtotal + desglose.transporte, tieneDecimalesIva), W - MARGIN_X, y, { align: 'right' })
  y += 6

  if (desglose.descuentoMonto > 0) {
    doc.setTextColor(GRIS_TEXTO)
    doc.text(`Descuento${datos.descuento_tipo === 'porcentaje' ? ` (${datos.descuento} %)` : ''}`, colX, y)
    doc.setTextColor(NEGRO)
    doc.text(`- ${formatCOPOpcional(desglose.descuentoMonto, tieneDecimalesIva)}`, W - MARGIN_X, y, { align: 'right' })
    y += 6
  }
  if (datos.iva_activo) {
    doc.setTextColor(GRIS_TEXTO)
    doc.text(`IVA (${datos.iva_porcentaje} %)`, colX, y)
    doc.setTextColor(NEGRO)
    doc.text(formatCOPOpcional(desglose.ivaMonto, tieneDecimalesIva), W - MARGIN_X, y, { align: 'right' })
    y += 6
  }

  y += 2
  doc.setDrawColor(NEGRO)
  doc.line(colX, y, W - MARGIN_X, y)
  y += 8
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Total', colX, y)
  doc.text(formatCOPOpcional(desglose.total, tieneDecimalesIva), W - MARGIN_X, y, { align: 'right' })
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

  // --- TU AHORRO FRENTE A COMPRAR NUEVO (PDF) ---
  if (datos.valor_nuevo_total && datos.valor_reparacion_total && datos.valor_nuevo_total > datos.valor_reparacion_total) {
    const cardH = 34
    addPageIfNeeded(cardH + 8)
    y += 4

    // Tarjeta con fondo tenue y borde sobrio
    doc.setFillColor(249, 250, 251)
    doc.setDrawColor(225, 228, 232)
    doc.roundedRect(MARGIN_X, y, CONTENT_W, cardH, 2, 2, 'FD')

    // Título de la tarjeta
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(NEGRO)
    doc.text('Tu ahorro frente a comprar nuevo', MARGIN_X + 6, y + 8)

    const pct = datos.porcentaje_ahorro ?? Math.round(((datos.valor_nuevo_total - datos.valor_reparacion_total) / datos.valor_nuevo_total) * 100)
    const diff = datos.valor_nuevo_total - datos.valor_reparacion_total

    // Badge porcentual
    const badgeText = `${pct}% de ahorro`
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    const badgeW = doc.getTextWidth(badgeText) + 8
    const badgeX = W - MARGIN_X - 6 - badgeW
    doc.setFillColor(26, 26, 26)
    doc.roundedRect(badgeX, y + 4, badgeW, 6, 1.2, 1.2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.text(badgeText, badgeX + 4, y + 8.2)

    // Línea divisoria interior
    doc.setDrawColor(235, 238, 242)
    doc.line(MARGIN_X + 6, y + 13, W - MARGIN_X - 6, y + 13)

    // 3 columnas: Nuevo en mercado | Renovación Reúso | Ahorro directo
    const colW = (CONTENT_W - 12) / 3

    // Columna 1
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(GRIS_TEXTO)
    doc.text('Nuevo según el mercado', MARGIN_X + 6, y + 19)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(NEGRO)
    doc.text(formatCOP(datos.valor_nuevo_total), MARGIN_X + 6, y + 25)

    // Columna 2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(GRIS_TEXTO)
    doc.text('Inversión en renovación', MARGIN_X + 6 + colW, y + 19)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(NEGRO)
    doc.text(formatCOP(datos.valor_reparacion_total), MARGIN_X + 6 + colW, y + 25)

    // Columna 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(GRIS_TEXTO)
    doc.text('Ahorro estimado', MARGIN_X + 6 + colW * 2, y + 19)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(NEGRO)
    doc.text(formatCOP(diff), MARGIN_X + 6 + colW * 2, y + 25)

    y += cardH + 6
  }

  // --- IMPACTO AMBIENTAL EVITADO (PDF) ---
  const tieneCo2 = datos.co2_evitado_kg && datos.co2_evitado_kg > 0
  const tieneAgua = datos.agua_evitada_l && datos.agua_evitada_l > 0

  if (tieneCo2 || tieneAgua) {
    const cardH = 34
    addPageIfNeeded(cardH + 8)
    y += 2

    // Tarjeta con fondo tenue y borde sobrio
    doc.setFillColor(249, 250, 251)
    doc.setDrawColor(225, 228, 232)
    doc.roundedRect(MARGIN_X, y, CONTENT_W, cardH, 2, 2, 'FD')

    // Título de la tarjeta
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(NEGRO)
    doc.text('Tu decisión le hace bien al planeta', MARGIN_X + 6, y + 8)

    // Badge impacto
    const badgeText = 'Impacto ambiental positivo'
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    const badgeW = doc.getTextWidth(badgeText) + 8
    const badgeX = W - MARGIN_X - 6 - badgeW
    doc.setFillColor(235, 238, 240)
    doc.roundedRect(badgeX, y + 4, badgeW, 6, 1.2, 1.2, 'F')
    doc.setTextColor(60, 60, 60)
    doc.text(badgeText, badgeX + 4, y + 8.2)

    // Línea divisoria interior
    doc.setDrawColor(235, 238, 242)
    doc.line(MARGIN_X + 6, y + 13, W - MARGIN_X - 6, y + 13)

    const colsCount = (tieneCo2 && tieneAgua) ? 2 : 1
    const colW = (CONTENT_W - 12) / colsCount
    let curCol = 0

    if (tieneCo2) {
      const colX = MARGIN_X + 6 + curCol * colW
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(NEGRO)
      doc.text(`${Math.round(datos.co2_evitado_kg!)} kg CO2 eq evitados`, colX, y + 20)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(GRIS_TEXTO)
      doc.text('Emisiones de gases de efecto invernadero evitadas', colX, y + 25)
      curCol++
    }

    if (tieneAgua) {
      const colX = MARGIN_X + 6 + curCol * colW
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(NEGRO)
      doc.text(`${formatEnteroMillones(Math.round(datos.agua_evitada_l!))} L de agua ahorrados`, colX, y + 20)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(GRIS_TEXTO)
      doc.text('Huella hídrica de manufactura virgen prevenida', colX, y + 25)
    }

    y += cardH + 6
  }

  // Nota ecológica antes de los legales o footer
  addPageIfNeeded(14)
  y += 2
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(GRIS_TEXTO)
  doc.text('Piensa en el planeta antes de imprimir este documento. No lo imprimas si no es necesario.', W / 2, y, { align: 'center' })
  y += 5

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
