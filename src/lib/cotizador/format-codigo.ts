/**
 * Formatea el código de una cotización para asegurar el estándar del sistema:
 * "COT " seguido de números y letras en mayúsculas (ej. "COT ABC12345").
 *
 * Cumple con la Regla de Formato del Código de Cotización (AGENTS.md).
 */
export function formatCodigoCotizacion(codigo?: string | null): string {
  if (!codigo) return ''
  const str = codigo.trim()
  if (!str) return ''
  // Remover prefijos existentes como "COT", "COT-", "COT " para normalizar sin duplicados
  const limpio = str.replace(/^COT[-_\s]*/i, '')
  return `COT ${limpio.toUpperCase()}`
}
