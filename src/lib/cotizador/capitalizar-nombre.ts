// Capitaliza CADA palabra de un nombre (ciudad o grupo de ciudades) — a
// diferencia de solo capitalizar la primera letra global, esto conserva
// mayúsculas correctas en nombres compuestos como "Costa Caribe" o "Eje
// Cafetero" en vez de degradarlos a "Costa caribe"/"Eje cafetero".
export function capitalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
    .join(' ')
}
