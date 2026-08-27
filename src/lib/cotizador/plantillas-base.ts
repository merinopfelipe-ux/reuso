// Listas base de servicios/insumos/materiales que SIEMPRE se muestran en el
// editor de un ítem de cotización, aunque estén en cero — así el vendedor ve
// de un vistazo qué campos existen y solo llena los que aplican, en vez de
// tener que "+ Añadir" cada uno desde cero. Compartido entre el editor de
// una línea ya guardada (EditarMuebleModal) y el editor justo después de
// analizar fotos (GrupoItemCard) — antes esta lista y la lógica de merge
// vivían solo en EditarMuebleModal, duplicarla habría sido el mismo patrón
// por tercera vez.

export interface Servicio { nombre: string; precio: number }
export interface Insumo { nombre: string; cantidad: number; unidad: string; precio_unitario: number }
export interface Material {
  nombre: string
  peso_kg: number
  factor_co2_kg: number
  factor_agua_l_kg: number | null
  // No editables en esta pantalla, pero se conservan al guardar — el Reporte
  // 2 (Mitigación GRI/ESG) agrupa por categoria_material, ver skill dominios-datos.
  categoria_material?: string | null
  origen_fuente?: string | null
  detalle_fuente?: string | null
  nivel_confianza?: 'alta' | 'media' | 'baja'
}

export const BASE_SERVICIOS = ['Pintor', 'Tapicero', 'Teñido', 'Carpintero']
export const BASE_INSUMOS = [{ nombre: 'Tela', unidad: 'metros' }]
export const BASE_MATERIALES = ['Hierro', 'Acero', 'Polipropileno', 'Espumas rígidas', 'Espumas flexibles', 'Madera dura', 'Madera blanda', 'Cuero']

export function mergeServicios(existentes: Servicio[]): Servicio[] {
  const map = new Map(existentes.map(s => [s.nombre.trim().toLowerCase(), s]))
  const merged: Servicio[] = []
  for (const b of BASE_SERVICIOS) {
    const s = map.get(b.toLowerCase())
    if (s) { merged.push(s); map.delete(b.toLowerCase()) }
    else { merged.push({ nombre: b, precio: 0 }) }
  }
  Array.from(map.values()).forEach(s => merged.push(s))
  return merged
}

export function mergeInsumos(existentes: Insumo[]): Insumo[] {
  const map = new Map(existentes.map(s => [s.nombre.trim().toLowerCase(), s]))
  const merged: Insumo[] = []
  for (const b of BASE_INSUMOS) {
    const s = map.get(b.nombre.toLowerCase())
    if (s) { merged.push(s); map.delete(b.nombre.toLowerCase()) }
    else { merged.push({ nombre: b.nombre, cantidad: 0, unidad: b.unidad, precio_unitario: 0 }) }
  }
  Array.from(map.values()).forEach(s => merged.push(s))
  return merged
}

export function mergeMateriales(existentes: Material[]): Material[] {
  const map = new Map(existentes.map(s => [s.nombre.trim().toLowerCase(), s]))
  const merged: Material[] = []
  for (const b of BASE_MATERIALES) {
    const s = map.get(b.toLowerCase())
    if (s) { merged.push(s); map.delete(b.toLowerCase()) }
    else { merged.push({ nombre: b, peso_kg: 0, factor_co2_kg: 0, factor_agua_l_kg: null }) }
  }
  Array.from(map.values()).forEach(s => merged.push(s))
  return merged
}
