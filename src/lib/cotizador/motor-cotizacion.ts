import { PARAM_EQUIV } from '../calculos/co2'

export interface ConfigCostosMueble {
  tipo_mueble: string
  peso_estandar_kg: number
  precio_tapiceria: number
  precio_pintura: number
  precio_carpinteria: number
  factor_co2_kg: number  // kg CO2 evitado por kg de mueble
  factor_agua_l: number  // litros de agua evitados por kg de mueble
}

export interface Oficios {
  tapiceria: boolean
  pintura: boolean
  carpinteria_superficial: boolean
}

export interface InputCotizacion {
  oficios: Oficios
  config: ConfigCostosMueble
}

export interface ResultadoCotizacion {
  precio_mueble: number
  co2_evitado_kg: number
  agua_evitada_l: number
  desglose: { oficio: string; precio: number }[]
  equivalencias: { arboles: number; litros: number }
}

// ── Cotización por ítem de catálogo (dimensión financiera aislada) ──────────
// Reemplaza el modelo de toggles (calcularCotizacion) cuando el mueble viene
// de un ítem del catálogo universal: el precio/CO2/agua ya vienen resueltos
// POR UNIDAD desde el snapshot del ítem (servicios+insumos, co2_por_unidad),
// y aquí solo se multiplican por la cantidad detectada/ajustada. Nunca lee
// ni escribe la dimensión ambiental fuera de los dos factores de entrada.

export interface ServicioSnapshot { nombre: string; precio: number }
export interface InsumoSnapshot { nombre: string; cantidad: number; unidad: string; precio_unitario: number }

export interface InputCotizacionPorItem {
  servicios: ServicioSnapshot[]
  insumos: InsumoSnapshot[]
  cantidad: number
  // Multiplicador de margen sobre el costo de servicios+insumos — hereda el
  // valor del ítem de catálogo (items.factor_rentabilidad) pero es propio de
  // esta línea, editable sin tocar el catálogo compartido (mismo criterio que
  // servicios_json/insumos_json). Antes de esto el precio cotizado era el
  // costo puro, sin margen.
  factor_rentabilidad: number
  co2_evitado_kg_unidad: number
  agua_evitada_l_unidad: number
}

export function calcularCotizacionPorItem(input: InputCotizacionPorItem): ResultadoCotizacion {
  const { servicios, insumos, cantidad, factor_rentabilidad, co2_evitado_kg_unidad, agua_evitada_l_unidad } = input

  const desglose: { oficio: string; precio: number }[] = [
    ...servicios.map(s => ({ oficio: s.nombre, precio: s.precio })),
    ...insumos.map(i => ({ oficio: i.nombre, precio: parseFloat((i.cantidad * i.precio_unitario).toFixed(2)) })),
  ]

  const costoUnidad = desglose.reduce((s, d) => s + d.precio, 0)
  const precio_mueble = parseFloat((costoUnidad * factor_rentabilidad * cantidad).toFixed(2))
  const co2_evitado_kg = parseFloat((co2_evitado_kg_unidad * cantidad).toFixed(4))
  const agua_evitada_l = parseFloat((agua_evitada_l_unidad * cantidad).toFixed(2))

  const arboles = Math.round(co2_evitado_kg / PARAM_EQUIV.CO2_arbol_anual_kg)
  const litros = Math.round(agua_evitada_l)

  return { precio_mueble, co2_evitado_kg, agua_evitada_l, desglose, equivalencias: { arboles, litros } }
}

export function calcularCotizacion(input: InputCotizacion): ResultadoCotizacion {
  const { oficios, config } = input

  const desglose: { oficio: string; precio: number }[] = []

  if (oficios.tapiceria && config.precio_tapiceria > 0)
    desglose.push({ oficio: 'Tapicería', precio: config.precio_tapiceria })

  if (oficios.pintura && config.precio_pintura > 0)
    desglose.push({ oficio: 'Pintura', precio: config.precio_pintura })

  if (oficios.carpinteria_superficial && config.precio_carpinteria > 0)
    desglose.push({ oficio: 'Carpintería superficial', precio: config.precio_carpinteria })

  const precio_mueble = desglose.reduce((s, d) => s + d.precio, 0)

  const co2_evitado_kg = parseFloat((config.peso_estandar_kg * config.factor_co2_kg).toFixed(4))
  const agua_evitada_l = parseFloat((config.peso_estandar_kg * config.factor_agua_l).toFixed(2))

  const arboles = Math.round(co2_evitado_kg / PARAM_EQUIV.CO2_arbol_anual_kg)
  const litros = Math.round(agua_evitada_l)

  return { precio_mueble, co2_evitado_kg, agua_evitada_l, desglose, equivalencias: { arboles, litros } }
}
