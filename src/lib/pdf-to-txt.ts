// Convierte buffer PDF → texto estructurado (formato Benchmark).
// Objetivo: reducir tokens de IA al procesar documentos DPP en lugar de
// enviar el binario PDF como dato de visión (costoso) a Gemini / OpenRouter.

const LINE80 = '='.repeat(80)
const DIV80  = '─'.repeat(80)

function fechaDePdf(raw: string | undefined): string {
  if (!raw) return new Date().toISOString().slice(0, 10)
  const m = raw.match(/D:(\d{4})(\d{2})(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return new Date().toISOString().slice(0, 10)
}

function tituloDeNombre(nombre: string): string {
  return nombre
    .replace(/\.pdf$/i, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function procesarTexto(rawText: string): string {
  const lineas = rawText.split('\n').map(l => l.trimEnd())
  const partes: string[] = []
  let bloque: string[] = []
  let citeN = 1

  function flushBloque() {
    const txt = bloque.join(' ').replace(/\s+/g, ' ').trim()
    if (txt) {
      partes.push(`[cite: ${citeN++}] ${txt}`)
    }
    bloque = []
  }

  for (const linea of lineas) {
    const trimmed = linea.trim()

    if (!trimmed) {
      flushBloque()
      continue
    }

    // Detectar línea tipo tabla: ≥3 columnas separadas por 3+ espacios
    const cols = trimmed.split(/\s{3,}/).map(c => c.trim()).filter(Boolean)
    if (cols.length >= 3) {
      flushBloque()
      // Primera línea de tabla: encabezado implícito
      if (partes.length > 0 && !partes[partes.length - 1].startsWith('[cite:')) {
        // ya hay separador
      }
      partes.push(cols.join(' | '))
      // Separador de tabla
      partes.push(cols.map(c => '-'.repeat(Math.max(c.length, 6))).join('-|-'))
      continue
    }

    bloque.push(trimmed)
    // Cerrar bloque si supera ~500 caracteres para evitar cites gigantes
    if (bloque.join(' ').length > 500) flushBloque()
  }
  flushBloque()

  return partes.join('\n\n')
}

export async function pdfATexto(buffer: Buffer, nombreArchivo: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (
    buffer: Buffer,
    options?: { max?: number }
  ) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>

  const data = await pdfParse(buffer, { max: 10 })

  const titulo = ((data.info?.Title as string | undefined)?.trim()) || tituloDeNombre(nombreArchivo)
  const fecha  = fechaDePdf(data.info?.CreationDate as string | undefined)
  const paginas = data.numpages

  const encabezado = [
    LINE80,
    titulo,
    LINE80,
    `Fecha: ${fecha}`,
    paginas > 1 ? `Páginas procesadas: ${Math.min(paginas, 10)} de ${paginas}` : `Páginas: 1`,
    LINE80,
  ].join('\n')

  const cuerpo = [
    DIV80,
    'CONTENIDO DEL DOCUMENTO',
    DIV80,
    '',
    procesarTexto(data.text),
  ].join('\n')

  return `${encabezado}\n\n${cuerpo}`.trim()
}
