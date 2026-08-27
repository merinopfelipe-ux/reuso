// Embudo de venta del Cotizador — única fuente de verdad de los estados,
// compartida entre el backend y el frontend.
//
// 'por_cotizar' sigue siendo el valor por defecto en la base de datos al
// crear una cotización (ver sql/018_crm_cotizador.sql), pero ya no se
// muestra como pastilla seleccionable en el detalle: el vendedor mueve la
// cotización libremente entre los 6 estados de ESTADOS_EMBUDO, en cualquier
// dirección y desde cualquier estado actual, sin restricción de secuencia.
export const ESTADOS_COTIZACION = [
  { key: 'por_cotizar',        label: 'Por cotizar' },
  { key: 'enviada',            label: 'Enviada' },
  { key: 'en_negociacion',     label: 'En negociación' },
  { key: 'esperando_anticipo', label: 'Esperando anticipo' },
  { key: 'cerrado_ganado',     label: 'Cerrado ganado' },
  { key: 'cerrado_perdido',    label: 'Cerrado perdido' },
  { key: 'cerrado_inviable',   label: 'Inviable' },
] as const

export const ESTADOS_EMBUDO = ESTADOS_COTIZACION.filter(e => e.key !== 'por_cotizar')

export type EstadoCotizacion = typeof ESTADOS_COTIZACION[number]['key']
