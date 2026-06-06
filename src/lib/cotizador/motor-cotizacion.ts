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

export interface AjustesHumanos {
  danos_ocultos: boolean  // aplica +20% al precio total
}

export interface InputCotizacion {
  oficios: Oficios
  ajustes_humanos: AjustesHumanos
  config: ConfigCostosMueble
}

export interface ResultadoCotizacion {
  precio_mueble: number
  co2_evitado_kg: number
  agua_evitada_l: number
  desglose: { oficio: string; precio: number }[]
  equivalencias: { arboles: number; litros: number }
}

export function calcularCotizacion(input: InputCotizacion): ResultadoCotizacion {
  const { oficios, ajustes_humanos, config } = input

  const desglose: { oficio: string; precio: number }[] = []

  if (oficios.tapiceria && config.precio_tapiceria > 0)
    desglose.push({ oficio: 'Tapicería', precio: config.precio_tapiceria })

  if (oficios.pintura && config.precio_pintura > 0)
    desglose.push({ oficio: 'Pintura', precio: config.precio_pintura })

  if (oficios.carpinteria_superficial && config.precio_carpinteria > 0)
    desglose.push({ oficio: 'Carpintería superficial', precio: config.precio_carpinteria })

  const subtotal_oficios = desglose.reduce((s, d) => s + d.precio, 0)
  const precio_mueble = ajustes_humanos.danos_ocultos
    ? parseFloat((subtotal_oficios * 1.2).toFixed(2))
    : subtotal_oficios

  const co2_evitado_kg = parseFloat((config.peso_estandar_kg * config.factor_co2_kg).toFixed(4))
  const agua_evitada_l = parseFloat((config.peso_estandar_kg * config.factor_agua_l).toFixed(2))

  const arboles = Math.round(co2_evitado_kg / PARAM_EQUIV.CO2_arbol_anual_kg)
  const litros = Math.round(agua_evitada_l)

  return { precio_mueble, co2_evitado_kg, agua_evitada_l, desglose, equivalencias: { arboles, litros } }
}
