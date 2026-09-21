export function extraerCiudadDeNombre(nombre: string): string | null {
  if (!nombre) return null
  const ciudades = [
    'Medellín', 'Medellin', 'Bogotá', 'Bogota', 'Cali', 'Barranquilla', 'Cartagena',
    'Bucaramanga', 'Pereira', 'Manizales', 'Santa Marta', 'Cúcuta', 'Cucuta', 'Ibagué', 'Ibague',
    'Villavicencio', 'Pasto', 'Neiva', 'Armenia', 'Valledupar', 'Montería', 'Monteria',
    'Sincelejo', 'Popayán', 'Popayan', 'Tunja', 'Riohacha', 'Florencia', 'Yopal', 'Quibdó',
    'Quibdo', 'Inírida', 'Inirida', 'Mocoa', 'Leticia', 'Nacional', 'Local'
  ]
  for (const c of ciudades) {
    const regex = new RegExp(`(?<!\\p{L})${c}(?!\\p{L})`, 'iu')
    if (regex.test(nombre)) {
      return c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()
    }
  }
  return null
}

export function generarNombreDuplicadoCiudad(nombreActual: string, nuevaCiudad: string): string {
  const ciudadLimpia = nuevaCiudad.trim()
  if (!ciudadLimpia) return nombreActual.trim()

  const ciudadActual = extraerCiudadDeNombre(nombreActual)
  if (ciudadActual) {
    const regex = new RegExp(`(?<!\\p{L})${ciudadActual}(?!\\p{L})`, 'iu')
    if (regex.test(nombreActual)) {
      return nombreActual.replace(regex, ciudadLimpia).trim()
    }
  }

  if (/[-–—]\s*$/.test(nombreActual)) {
    return `${nombreActual.trim()} ${ciudadLimpia}`
  }
  return `${nombreActual.trim()} - ${ciudadLimpia}`
}
