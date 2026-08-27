export function formatearNIT(value: string): string {
  // Solo permitir dígitos
  const digitos = value.replace(/\D/g, '')
  if (!digitos) return ''
  
  // Agregar puntos cada 3 cifras desde la derecha (como un número normal, pero siempre punto)
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatearTelefono(value: string, indicativo: string = '+57'): string {
  // Solo extraer dígitos de lo que escribe el usuario
  const digitsOnly = value.replace(/\D/g, '')
  if (!digitsOnly) return ''
  
  if (indicativo === '+57') {
    if (digitsOnly.length <= 3) return `(${digitsOnly}`
    if (digitsOnly.length <= 6) return `(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3)}`
    return `(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3, 6)} ${digitsOnly.substring(6, 10)}`
  }
  
  // Resto del mundo: agrupar por espacios cada 3-4 números para legibilidad o simplemente espaciado básico
  if (digitsOnly.length <= 3) return digitsOnly
  if (digitsOnly.length <= 6) return `${digitsOnly.substring(0, 3)} ${digitsOnly.substring(3)}`
  if (digitsOnly.length <= 10) return `${digitsOnly.substring(0, 3)} ${digitsOnly.substring(3, 6)} ${digitsOnly.substring(6)}`
  
  // Si es muy largo
  return `${digitsOnly.substring(0, 3)} ${digitsOnly.substring(3, 6)} ${digitsOnly.substring(6, 10)} ${digitsOnly.substring(10, 15)}`.trim()
}
