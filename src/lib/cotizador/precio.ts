// Motor de precios del Cotizador — misma fórmula que la función SQL
// `recalcular_totales_cotizacion` (ver sql/044_cotizador_transporte_iva.sql).
// Esta copia en JS es solo para mostrar el desglose en pantalla (subtotal,
// transporte, IVA, descuento) antes/sin guardar — el `total` que se GUARDA
// siempre lo calcula la función SQL, nunca este archivo.
//
// Transporte e IVA nunca reciben descuento. El descuento se calcula sobre
// el subtotal de ítems, y el IVA se calcula sobre (subtotal + transporte -
// descuento).

export interface DatosPrecio {
  subtotal: number
  transporte_activo: boolean
  transporte_valor: number
  descuento_activo: boolean
  descuento: number
  descuento_tipo: 'valor' | 'porcentaje'
  iva_activo: boolean
  iva_porcentaje: number
}

export interface DesglosePrecio {
  subtotal: number
  transporte: number
  descuentoMonto: number
  baseIva: number
  ivaMonto: number
  total: number
}

export function calcularDesglose(d: DatosPrecio): DesglosePrecio {
  const subtotal = Number(d.subtotal) || 0
  const transporte = d.transporte_activo ? Number(d.transporte_valor) || 0 : 0
  const descuentoMonto = d.descuento_activo
    ? (d.descuento_tipo === 'porcentaje'
      ? subtotal * ((Number(d.descuento) || 0) / 100)
      : Number(d.descuento) || 0)
    : 0
  const baseIva = subtotal + transporte - descuentoMonto
  const ivaMonto = d.iva_activo ? baseIva * ((Number(d.iva_porcentaje) || 0) / 100) : 0
  const total = Math.max(0, baseIva + ivaMonto)
  return { subtotal, transporte, descuentoMonto, baseIva, ivaMonto, total }
}

/**
 * Transporte repartido entre los ítems, SOLO para mostrarlo (nunca se
 * guarda en precio_mueble) — da la apariencia de que el transporte va
 * incluido en cada ítem en vez de ser un cobro aparte.
 */
export function transportePorItem(d: Pick<DatosPrecio, 'transporte_activo' | 'transporte_valor'>, cantidadItems: number): number {
  if (!d.transporte_activo || cantidadItems <= 0) return 0
  return (Number(d.transporte_valor) || 0) / cantidadItems
}

// Valor por defecto del anticipo al activar el switch por primera vez en el
// editor — desde ahí es configurable por cotización (ver migración 052).
export const ANTICIPO_PORCENTAJE_DEFECTO = 60

export function calcularAnticipo(total: number, porcentaje: number): { anticipo: number; restante: number } {
  const anticipo = Math.round(total * (porcentaje / 100))
  return { anticipo, restante: Math.round(total) - anticipo }
}
