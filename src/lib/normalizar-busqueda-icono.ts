// Normaliza texto para comparar una búsqueda de ícono (en español o inglés,
// con o sin guiones/espacios) contra el nombre PascalCase real que exporta
// lucide-react (ej. "ShelvingUnit"). Sin quitar guiones/espacios, una
// búsqueda como "shelving-unit" (como Lucide lo muestra en su propio sitio)
// nunca coincide con el nombre real del componente, que no lleva guion —
// bug real confirmado contra el paquete instalado, no solo con este ícono
// (arrow-up-right, circle-check, message-square fallaban igual).
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}
