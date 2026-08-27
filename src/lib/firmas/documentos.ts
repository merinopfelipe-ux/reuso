import { generarPdfConfidencialidad, type DatosFirmante } from './generar-pdf-confidencialidad'
import { DOCUMENTOS_META } from './documentos-meta'

// Registro escalable de documentos firmables (SERVER-ONLY: incluye jsPDF).
// Agregar un documento nuevo es agregar su label en documentos-meta.ts y su
// función generarPDF aquí — el panel /admin/firmas, la validación de
// tipo_documento y el generador de PDF se resuelven automáticamente contra
// este mapa, sin tocar el resto del mecanismo de envío/firma/validación.
export interface DocumentoFirmable {
  tipo: string
  label: string
  generarPDF: (datos: DatosFirmante, fecha: string, ip: string, userAgent: string, verificationCode: string) => Buffer
}

const GENERADORES: Record<string, DocumentoFirmable['generarPDF']> = {
  confidencialidad: generarPdfConfidencialidad,
}

export const DOCUMENTOS_FIRMABLES: Record<string, DocumentoFirmable> = Object.fromEntries(
  Object.entries(DOCUMENTOS_META)
    .filter(([tipo]) => tipo in GENERADORES)
    .map(([tipo, meta]) => [tipo, { ...meta, generarPDF: GENERADORES[tipo] }])
)

export function documentoFirmable(tipo: string): DocumentoFirmable | null {
  return DOCUMENTOS_FIRMABLES[tipo] ?? null
}
