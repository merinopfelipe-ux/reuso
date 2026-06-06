export function displayName(perfil: {
  nombre?: string | null
  apellido?: string | null
  apodo?: string | null
}): string {
  const nombre = perfil?.nombre?.trim() || ''
  const apellido = perfil?.apellido?.trim() || ''
  const apodo = perfil?.apodo?.trim() || ''
  const primerNombre = nombre.split(' ')[0] || 'Usuario'

  // Apodo personalizado: solo si es diferente al nombre completo y al primer nombre compuesto
  const esDefault =
    !apodo ||
    apodo === nombre ||
    apodo === `${nombre} ${apellido}`.trim() ||
    apodo === primerNombre

  if (!esDefault) return apodo
  return primerNombre
}
