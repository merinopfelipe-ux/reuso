import type { jsPDF } from 'jspdf'

/** Descarga una imagen remota y la convierte a data URL base64 para incrustarla en un PDF con jsPDF. */
export async function fetchImageAsBase64(url: string): Promise<string | null> {
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

/**
 * Dibuja el logo de la empresa en modo día (obligatorio en todo descargable
 * con marca). Si no hay logo (o no se pudo incrustar — jsPDF no soporta SVG
 * en tiempo real), se muestra solo el nombre de la empresa en texto, sin
 * ícono ni ningún otro elemento — directriz explícita del usuario
 * (2026-08-06): "si no hay logo, se pone el nombre de la empresa, sin
 * íconos ni nada más".
 */
export function dibujarMarcaEmpresa(doc: jsPDF, logoBase64: string | null, empresaNombre: string, x: number, y: number, size = 16): void {
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', x, y, size, size)
      return
    } catch {
      // Formato no soportado por jsPDF (ej. llegó un SVG) — cae al nombre.
    }
  }
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 130, 124)
  doc.text(empresaNombre, x, y + size / 2 + 2)
}
