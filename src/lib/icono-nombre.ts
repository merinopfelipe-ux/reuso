// El proyecto usa 2 librerías de íconos: Lucide (siempre, valor guardado sin
// prefijo, es el formato original y sigue siéndolo) y Phosphor (nuevo,
// prefijo "phosphor:"). 762 nombres de Phosphor coinciden EXACTAMENTE con un
// nombre de Lucide (ej. "Anchor" existe en ambos con diseño distinto) — sin
// este prefijo, guardar solo el nombre sería ambiguo sobre cuál mostrar.
export type LibreriaIcono = 'lucide' | 'phosphor'

export interface IconoParseado {
  libreria: LibreriaIcono
  nombre: string
}

export function parsearIcono(valor: string): IconoParseado {
  if (valor.startsWith('phosphor:')) {
    return { libreria: 'phosphor', nombre: valor.slice('phosphor:'.length) }
  }
  return { libreria: 'lucide', nombre: valor }
}

export function construirValorIcono(libreria: LibreriaIcono, nombre: string): string {
  return libreria === 'phosphor' ? `phosphor:${nombre}` : nombre
}
