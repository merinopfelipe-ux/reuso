// Metadatos de documentos firmables — seguro para importar en Client
// Components (sin jsPDF ni Buffer). El generador de PDF real (server-only)
// vive en documentos.ts y reutiliza este mismo mapa de tipos/labels.
export const DOCUMENTOS_META: Record<string, { tipo: string; label: string; hrefTextoCompleto: string }> = {
  confidencialidad: { tipo: 'confidencialidad', label: 'Acuerdo de Confidencialidad', hrefTextoCompleto: '/legal/confidencialidad' },
}

export function documentoLabel(tipo: string): string {
  return DOCUMENTOS_META[tipo]?.label ?? tipo
}
