// Reporte 1 — Balance de Rentabilidad y Retorno Financiero. Dominio (A) Costos.
// Cero datos ambientales, ver skill `dominios-datos`.

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface MuebleCotizadoRentabilidad {
  id: string
  titulo: string
  cantidad: number
  precio_mercado_nuevo: number | null
  precio_mercado_estado: 'pendiente' | 'sugerido' | 'confirmado' | 'sin_resultado'
  total_servicios: number
  total_insumos: number
  asesor_nombre: string | null
  cliente_nombre: string | null
}

export interface ItemRentabilidad {
  id: string
  titulo: string
  cantidad: number
  precio_mercado_nuevo: number
  costo_restauracion: number
  ahorro_neto: number
  margen_costo_beneficio: number | null
  total_servicios: number
  total_insumos: number
  asesor_nombre: string | null
  cliente_nombre: string | null
}

export interface PorAsesor {
  asesor_nombre: string
  ahorro_neto: number
  cantidad_muebles: number
}

export interface ResultadoRentabilidad {
  items: ItemRentabilidad[]
  omitidos_sin_precio_mercado: number
  ahorro_neto_total: number
  costo_restauracion_total: number
  precio_mercado_total: number
  margen_costo_beneficio_promedio: number | null
  total_servicios: number
  total_insumos: number
  por_asesor: PorAsesor[]
}

/**
 * Solo se incluyen en los totales los muebles con `precio_mercado_nuevo`
 * confirmado (estado 'confirmado' o 'sugerido' con valor) — un mueble sin
 * precio de referencia no puede aportar al Ahorro Neto CAPEX, se cuenta
 * aparte en `omitidos_sin_precio_mercado` para que la UI lo señale.
 */
export function calcularRentabilidad(muebles: MuebleCotizadoRentabilidad[]): ResultadoRentabilidad {
  const conPrecio = muebles.filter(
    (m): m is MuebleCotizadoRentabilidad & { precio_mercado_nuevo: number } =>
      m.precio_mercado_nuevo !== null && m.precio_mercado_nuevo > 0
  )
  const omitidos_sin_precio_mercado = muebles.length - conPrecio.length

  const items: ItemRentabilidad[] = conPrecio.map((m) => {
    const costo_restauracion = r2(m.total_servicios + m.total_insumos)
    const precio_mercado_total_item = r2(m.precio_mercado_nuevo * m.cantidad)
    const ahorro_neto = r2(precio_mercado_total_item - costo_restauracion)
    const margen_costo_beneficio = costo_restauracion > 0
      ? r2(precio_mercado_total_item / costo_restauracion)
      : null

    return {
      id: m.id,
      titulo: m.titulo,
      cantidad: m.cantidad,
      precio_mercado_nuevo: precio_mercado_total_item,
      costo_restauracion,
      ahorro_neto,
      margen_costo_beneficio,
      total_servicios: r2(m.total_servicios),
      total_insumos: r2(m.total_insumos),
      asesor_nombre: m.asesor_nombre,
      cliente_nombre: m.cliente_nombre,
    }
  })

  const ahorro_neto_total = r2(items.reduce((s, i) => s + i.ahorro_neto, 0))
  const costo_restauracion_total = r2(items.reduce((s, i) => s + i.costo_restauracion, 0))
  const precio_mercado_total = r2(items.reduce((s, i) => s + i.precio_mercado_nuevo, 0))
  const total_servicios = r2(items.reduce((s, i) => s + i.total_servicios, 0))
  const total_insumos = r2(items.reduce((s, i) => s + i.total_insumos, 0))
  const margen_costo_beneficio_promedio = costo_restauracion_total > 0
    ? r2(precio_mercado_total / costo_restauracion_total)
    : null

  const asesorMap = new Map<string, { ahorro_neto: number; cantidad_muebles: number }>()
  for (const item of items) {
    const nombre = item.asesor_nombre ?? 'Sin asesor asignado'
    const prev = asesorMap.get(nombre) ?? { ahorro_neto: 0, cantidad_muebles: 0 }
    asesorMap.set(nombre, {
      ahorro_neto: r2(prev.ahorro_neto + item.ahorro_neto),
      cantidad_muebles: prev.cantidad_muebles + 1,
    })
  }
  const por_asesor: PorAsesor[] = Array.from(asesorMap.entries())
    .map(([asesor_nombre, v]) => ({ asesor_nombre, ...v }))
    .sort((a, b) => b.ahorro_neto - a.ahorro_neto)

  return {
    items,
    omitidos_sin_precio_mercado,
    ahorro_neto_total,
    costo_restauracion_total,
    precio_mercado_total,
    margen_costo_beneficio_promedio,
    total_servicios,
    total_insumos,
    por_asesor,
  }
}
