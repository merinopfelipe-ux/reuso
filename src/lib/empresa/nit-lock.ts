export function puedeEditarNit(nitActual: string | null | undefined, rolQueEdita: string): boolean {
  const yaTieneNit = typeof nitActual === 'string' && nitActual.trim() !== ''
  if (!yaTieneNit) return true
  return rolQueEdita === 'super_admin'
}
