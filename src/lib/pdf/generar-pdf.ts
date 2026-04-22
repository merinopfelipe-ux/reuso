import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/admin'

export interface DesgloseCategoría {
  categoria: string
  cantidad: number
  co2_kg: number
}

export interface DatosDocumento {
  tipo: 'certificado' | 'informe'
  beneficiario: string
  empresa_nombre: string | null
  empresa_logo_url: string | null
  fecha_inicio: string
  fecha_fin: string
  co2_total_kg: number
  agua_total_litros: number
  desglose: DesgloseCategoría[]
  codigo_verificacion: string
  hash_integridad: string // <--- NEW: Sello de seguridad digital inalterable
  fecha_emision: string
}

// Equivalencias ambientales
function calcularEquivalencias(co2_kg: number) {
  const arbolAnualKg = 8.0
  const co2DuchaKg = 2.0
  const litrosDucha = 90

  const arboles = Math.round(co2_kg / arbolAnualKg)
  const duchas = Math.round(co2_kg / co2DuchaKg)
  const litros = duchas * litrosDucha
  const coches = parseFloat((co2_kg / 4600).toFixed(2)) // 4600 kg CO₂/coche/año

  return { arboles, duchas, litros, coches }
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    const mime = res.headers.get('content-type') ?? 'image/png'
    return `data:${mime};base64,${b64}`
  } catch {
    return null
  }
}

// Colores base de marca (Certificado)
const BRAND_CERT = '#00827C'
const BG_LIGHT_CERT = '#EBF5F4'
const TEXT_DARK_CERT = '#1A3A38'
const TEXT_MED_CERT = '#4D7C79'
const TEXT_LIGHT_CERT = '#7FA8A5'

// Colores escala de grises (Informe)
const BRAND_INF = '#4A4A4A'
const BG_LIGHT_INF = '#F5F5F5'
const TEXT_DARK_INF = '#222222'
const TEXT_MED_INF = '#666666'
const TEXT_LIGHT_INF = '#999999'

const WHITE = '#FFFFFF'

type Plantilla = {
  firmante_nombre: string | null
  firmante_cargo: string | null
  firma_imagen_url: string | null
  pie_legal: string | null
}

async function fetchPlantillaActiva(tipo: 'certificado' | 'informe'): Promise<Plantilla | null> {
  try {
    const adminClient = await createAdminClient()
    const { data } = await adminClient
      .from('plantillas_documentos')
      .select('firmante_nombre, firmante_cargo, firma_imagen_url, pie_legal')
      .eq('tipo', tipo)
      .eq('activa', true)
      .single()
    return data
  } catch {
    return null
  }
}

export async function generarPDF(datos: DatosDocumento): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297

  // Cargar plantilla activa (firmante, firma, pie legal)
  const plantilla = await fetchPlantillaActiva(datos.tipo)

  // Determinar paleta según el tipo de documento
  const esInforme = datos.tipo === 'informe'
  const BRAND = esInforme ? BRAND_INF : BRAND_CERT
  const BG_LIGHT = esInforme ? BG_LIGHT_INF : BG_LIGHT_CERT
  const TEXT_DARK = esInforme ? TEXT_DARK_INF : TEXT_DARK_CERT
  const TEXT_MED = esInforme ? TEXT_MED_INF : TEXT_MED_CERT
  const TEXT_LIGHT = esInforme ? TEXT_LIGHT_INF : TEXT_LIGHT_CERT

  // ── FONDO BASE ──────────────────────────────────────────────
  doc.setFillColor(WHITE)
  doc.rect(0, 0, W, H, 'F')

  // Banda lateral izquierda decorativa
  doc.setFillColor(BRAND)
  doc.rect(0, 0, 6, H, 'F')

  // Banda superior
  doc.setFillColor(BG_LIGHT)
  doc.rect(6, 0, W - 6, 36, 'F')

  // ── LOGO Calculadora de Reúso ─────────────────────────────────
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(BRAND)
  doc.text('Calculadora de Reúso', 14, 17)

  // Tagline
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(TEXT_LIGHT)
  doc.text('reuso.lurdes.co · Certificación de Impacto Ambiental', 14, 23)

  // ── LOGO EMPRESA (derecha) ───────────────────────────────────
  if (datos.empresa_logo_url) {
    const logoB64 = await fetchImageAsBase64(datos.empresa_logo_url)
    if (logoB64) {
      try {
        doc.addImage(logoB64, 'PNG', W - 46, 6, 36, 22)
      } catch {
        // Si falla el logo, se omite sin error
      }
    }
  } else if (datos.empresa_nombre) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(TEXT_DARK)
    doc.text(datos.empresa_nombre, W - 14, 14, { align: 'right' })
  }

  // ── TÍTULO DEL DOCUMENTO ─────────────────────────────────────
  const titulo = datos.tipo === 'certificado'
    ? 'Certificado de Impacto Ambiental por Reúso'
    : `Informe de Impacto Ambiental por Reúso`

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(TEXT_DARK)
  doc.text(titulo, W / 2, 48, { align: 'center' })

  if (datos.tipo === 'informe' && datos.empresa_nombre) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(TEXT_MED)
    doc.text(`${datos.empresa_nombre}`, W / 2, 56, { align: 'center' })
  }

  // ── LÍNEA SEPARADORA ────────────────────────────────────────
  doc.setDrawColor(BRAND)
  doc.setLineWidth(0.5)
  doc.line(14, 62, W - 14, 62)

  // ── BENEFICIARIO Y PERÍODO ──────────────────────────────────
  let y = 72

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(TEXT_MED)
  doc.text('Otorgado a:', 14, y)

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(TEXT_DARK)
  doc.text(datos.beneficiario, 14, y + 8)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(TEXT_MED)
  const periodoLabel = datos.tipo === 'certificado' ? 'Período de impacto verificado:' : 'Período del informe:'
  doc.text(periodoLabel, W - 14, y, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(TEXT_DARK)
  doc.text(`${datos.fecha_inicio} — ${datos.fecha_fin}`, W - 14, y + 8, { align: 'right' })

  y += 22

  // ── MÉTRICAS PRINCIPALES ─────────────────────────────────────
  doc.setFillColor(BRAND)
  doc.roundedRect(14, y, W - 28, 30, 4, 4, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(WHITE)
  doc.text('CO₂ evitado total', 14 + (W - 28) / 4, y + 8, { align: 'center' })
  doc.text('Agua ahorrada', 14 + 3 * (W - 28) / 4, y + 8, { align: 'center' })

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(`${datos.co2_total_kg.toFixed(2)} kg`, 14 + (W - 28) / 4, y + 21, { align: 'center' })
  doc.text(`${datos.agua_total_litros.toLocaleString('es-CO')} L`, 14 + 3 * (W - 28) / 4, y + 21, { align: 'center' })

  // Línea divisoria central en el bloque verde
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.3)
  doc.line(W / 2, y + 4, W / 2, y + 26)

  y += 38

  // ── EQUIVALENCIAS (Solo para Certificados) ───────────────────
  if (datos.tipo === 'certificado') {
    const eq = calcularEquivalencias(datos.co2_total_kg)

    doc.setFillColor(BG_LIGHT)
    doc.roundedRect(14, y, W - 28, 24, 4, 4, 'F')

    const eqItems = [
      { label: 'árboles plantados', value: String(eq.arboles) },
      { label: 'vehículos sacados', value: String(eq.coches) },
      { label: 'duchas de 10 min', value: String(eq.duchas) },
      { label: 'litros de agua', value: eq.litros.toLocaleString('es-CO') },
    ]
    const colW = (W - 28) / 4
    eqItems.forEach((item, i) => {
      const cx = 14 + colW * i + colW / 2
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(BRAND)
      doc.text(item.value, cx, y + 11, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(TEXT_MED)
      doc.text(item.label, cx, y + 18, { align: 'center' })
    })

    y += 32
  } else {
    // Para informes, mostrar una nota de auditoría técnica en lugar de iconos
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(TEXT_MED)
    doc.text('Este informe resume los datos brutos de impacto para fines de control interno y auditoría ESG.', 14, y + 4)
    y += 12
  }

  // ── DESGLOSE POR CATEGORÍA ───────────────────────────────────
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(TEXT_DARK)
  doc.text('Desglose por categoría', 14, y)
  y += 6

  // Cabecera tabla
  doc.setFillColor(BRAND)
  doc.roundedRect(14, y, W - 28, 8, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(WHITE)
  doc.text('Categoría', 18, y + 5.5)
  doc.text('Objetos reusados', 110, y + 5.5, { align: 'center' })
  doc.text('CO₂ evitado (kg)', W - 18, y + 5.5, { align: 'right' })
  y += 10

  datos.desglose.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(BG_LIGHT)
      doc.rect(14, y - 1, W - 28, 8, 'F')
    }
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(TEXT_DARK)
    doc.text(row.categoria, 18, y + 5)
    doc.text(String(row.cantidad), 110, y + 5, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(BRAND)
    doc.text(row.co2_kg.toFixed(3), W - 18, y + 5, { align: 'right' })
    y += 8
  })

  // Totales
  doc.setDrawColor(BRAND)
  doc.setLineWidth(0.3)
  doc.line(14, y, W - 14, y)
  y += 4
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(TEXT_DARK)
  doc.text('Total', 18, y + 4)
  doc.setTextColor(BRAND)
  doc.text(`${datos.co2_total_kg.toFixed(3)} kg CO₂-eq`, W - 18, y + 4, { align: 'right' })
  y += 12

  // ── QR + CÓDIGO DE VERIFICACIÓN ─────────────────────────────
  const verifyUrl = `https://reuso.lurdes.co/verificar/${datos.codigo_verificacion}`
  const qrY = y

  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 200,
      margin: 1,
      color: { dark: BRAND, light: '#FFFFFF' },
    })
    doc.addImage(qrDataUrl, 'PNG', 14, qrY, 28, 28)
  } catch {
    // QR fallback: solo texto
    doc.setFontSize(7)
    doc.setTextColor(TEXT_LIGHT)
    doc.text('[QR]', 28, qrY + 14, { align: 'center' })
  }

  // Código e instrucción
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(TEXT_DARK)
  doc.text('Código de verificación', 48, qrY + 6)

  const codigoFormateado = `RCO2-${datos.codigo_verificacion.slice(0, 4).toUpperCase()}-${datos.codigo_verificacion.slice(4, 8).toUpperCase()}`
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(BRAND)
  doc.text(codigoFormateado, 48, qrY + 14)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(TEXT_MED)
  doc.text('Escanea el código QR o visita:', 48, qrY + 21)
  doc.setTextColor(BRAND)
  doc.text(verifyUrl, 48, qrY + 27)

  // Fecha de emisión (derecha)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(TEXT_LIGHT)
  doc.text(`Fecha de emisión: ${datos.fecha_emision}`, W - 14, qrY + 8, { align: 'right' })

  // Sello de Seguridad Inalterable
  doc.setFontSize(6)
  doc.setFont('courier', 'normal')
  doc.setTextColor(TEXT_LIGHT)
  doc.text(`Sello Digital: ${datos.hash_integridad}`, W - 14, qrY + 12, { align: 'right' })
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'italic')
  doc.text('Protegido por Notaría Digital Permanente', W - 14, qrY + 15, { align: 'right' })

  // ── FIRMA DEL FIRMANTE (si hay plantilla activa) ─────────────
  if (plantilla?.firmante_nombre) {
    const firmaY = y
    if (plantilla.firma_imagen_url) {
      const firmaB64 = await fetchImageAsBase64(plantilla.firma_imagen_url)
      if (firmaB64) {
        try { doc.addImage(firmaB64, 'PNG', 14, firmaY, 36, 18) } catch { /* omitir si falla */ }
      }
    }
    doc.setDrawColor(TEXT_LIGHT)
    doc.setLineWidth(0.3)
    doc.line(14, firmaY + 20, 90, firmaY + 20)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(TEXT_DARK)
    doc.text(plantilla.firmante_nombre, 14, firmaY + 25)
    if (plantilla.firmante_cargo) {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(TEXT_MED)
      doc.text(plantilla.firmante_cargo, 14, firmaY + 30)
    }
  }

  // ── PIE DE PÁGINA ────────────────────────────────────────────
  const footerY = H - 16
  doc.setFillColor(BG_LIGHT)
  doc.rect(6, footerY - 4, W - 6, 20, 'F')

  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(TEXT_LIGHT)

  const pieLegal = plantilla?.pie_legal
    ?? (esInforme
      ? 'Por favor, considera el medio ambiente antes de imprimir este informe. Mantenlo digital.'
      : 'Factores de emisión basados en ecoinvent, Humana PPP, DEFRA 2023, Comisión Europea · reuso.lurdes.co · Documento verificable')

  doc.text(pieLegal, W / 2, footerY + 2, { align: 'center', maxWidth: W - 30 })
  doc.setFontSize(6)
  doc.text('© Grupo MLP S.A.S. · reuso.lurdes.co', W / 2, footerY + 8, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}
