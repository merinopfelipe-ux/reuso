export function displayName(perfil: {
  nombre?: string | null
  apellido?: string | null
  apodo?: string | null
}): string {
  if (perfil?.apodo?.trim()) return perfil.apodo.trim()
  const nombre = perfil?.nombre?.trim()
  const apellido = perfil?.apellido?.trim()
  if (nombre && apellido) return `${nombre} ${apellido}`
  return nombre || 'Usuario'
}
