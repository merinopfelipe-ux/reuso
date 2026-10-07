/**
 * Formato numérico estándar de la plataforma (Regla permanente):
 * - Alineación a la derecha en interfaces.
 * - Miles agrupados de 3 en 3 con punto (.) y apóstrofo (') para millones (ej. 1'500.000).
 * - Coma (,) para máximo 1 decimal con redondeo constante hacia arriba (ceil), omitida si es entero (ej. 3,45 -> 3,5).
 * - Moneda: '$ ' a la izquierda (ej. $ 1.500).
 * - Unidades no monetarias: ' unidad' a la derecha (ej. 34 kg).
 */

export function formatEnteroMillones(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const str = abs.toString()

  if (str.length <= 6) {
    return sign + str.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const millonesStr = str.slice(0, str.length - 6)
  const restoStr = str.slice(str.length - 6)

  const millonesFormateado = millonesStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const milesFormateado = restoStr.slice(0, 3) + '.' + restoStr.slice(3)

  return `${sign}${millonesFormateado}'${milesFormateado}`
}

export function formatEnteroPuntos(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  return sign + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Convierte cualquier número o string (incluyendo formato colombiano con
 * apóstrofo ', punto . para miles y coma , para decimales) a number de JS.
 */
export function parseNumero(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  const str = String(val).trim()
  if (!str) return 0

  // Limpiar $, apóstrofo ' y espacios
  let clean = str.replace(/[$'\s]/g, '')

  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes('.')) {
    const parts = clean.split('.')
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      clean = clean.replace(/\./g, '')
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }

  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

export function formatNumero(
  val: number | string | null | undefined,
  opciones?: { moneda?: boolean; unidad?: string }
): string {
  const num = typeof val === 'string' ? parseNumero(val) : val
  if (num === null || num === undefined || isNaN(num)) {
    if (opciones?.moneda) return '$\u00A00'
    if (opciones?.unidad) return `0\u00A0${opciones.unidad}`
    return '0'
  }

  if (num === 0) {
    if (opciones?.moneda) return '$\u00A00'
    if (opciones?.unidad) return `0\u00A0${opciones.unidad}`
    return '0'
  }

  // Redondeo constante hacia arriba para 1 decimal
  const negativo = num < 0
  const rounded = Math.ceil(Math.abs(num) * 10) / 10
  const tieneDecimal = rounded % 1 !== 0
  const intPart = Math.floor(rounded)
  const decDigit = Math.round((rounded - intPart) * 10)

  // El signo se antepone aparte:
  let baseStr = opciones?.moneda ? formatEnteroMillones(intPart) : formatEnteroPuntos(intPart)
  if (tieneDecimal) {
    baseStr += ',' + decDigit
  }

  if (opciones?.moneda) {
    // Espacio no rompible (\u00A0) para que el signo de pesos NUNCA quede
    // solo en un renglón superior ni se separe del número al ajustar ancho.
    return `${negativo ? '-' : ''}$\u00A0${baseStr}`
  }
  if (negativo) {
    baseStr = '-' + baseStr
  }
  if (opciones?.unidad) {
    return `${baseStr}\u00A0${opciones.unidad}`
  }
  return baseStr
}

export function formatCOP(val: number | string | null | undefined): string {
  return formatNumero(val, { moneda: true })
}

/**
 * Formato de fecha estándar de la plataforma (Regla permanente):
 * - "D de mes. de AAAA" — la abreviatura del mes SIEMPRE lleva punto (Intl
 *   con locale es-CO da "ago" sin punto, un error de ortografía real).
 * - Con hora (`conHora: true`): agrega "H:MM a.m./p.m." sin coma antes ni
 *   espacio dentro de "a.m."/"p.m." (Intl usa un espacio angosto ahí).
 * No uses `toLocaleDateString('es-CO', { month: 'short' })` directo en
 * ningún componente nuevo — siempre esta función, para que el punto del mes
 * nunca vuelva a faltar en una pantalla nueva.
 */
/**
 * Zona horaria oficial de todo el sistema: GMT-5 (Colombia / America/Bogota).
 * Regla permanente: toda fecha y hora en la plataforma se renderiza en GMT-5,
 * evitando discrepancias entre la zona horaria del servidor (UTC) y la del cliente.
 */
export const TIMEZONE_DEFAULT = 'America/Bogota'

const MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function formatFecha(
  iso: string | null | undefined,
  opciones?: { conHora?: boolean; timeZone?: string }
): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const tz = opciones?.timeZone ?? TIMEZONE_DEFAULT

  const partes = new Intl.DateTimeFormat('es-CO', {
    timeZone: tz,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(d)

  let dia = ''
  let mesNum = 1
  let anio = ''
  for (const p of partes) {
    if (p.type === 'day') dia = p.value
    if (p.type === 'month') mesNum = parseInt(p.value, 10)
    if (p.type === 'year') anio = p.value
  }

  const mes = MESES_ABREV[mesNum - 1] ?? 'ene'
  let resultado = `${dia} de ${mes}. de ${anio}`
  if (opciones?.conHora) {
    resultado += ` ${formatHora(iso, { timeZone: tz })}`
  }
  return resultado
}

/** Solo la hora en GMT-5 por defecto, mismo formato "H:MM a.m./p.m." */
export function formatHora(
  iso: string | null | undefined,
  opciones?: { timeZone?: string }
): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const tz = opciones?.timeZone ?? TIMEZONE_DEFAULT

  const partes = new Intl.DateTimeFormat('es-CO', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d)

  let hora = ''
  let minuto = ''
  let periodo = ''
  for (const p of partes) {
    if (p.type === 'hour') hora = p.value
    if (p.type === 'minute') minuto = p.value
    if (p.type === 'dayPeriod') {
      const val = p.value.toLowerCase().replace(/[\.\s]/g, '')
      periodo = val === 'pm' ? 'p.m.' : 'a.m.'
    }
  }

  if (!periodo) {
    const hNum = parseInt(hora, 10)
    periodo = hNum >= 12 ? 'p.m.' : 'a.m.'
  }

  return `${hora}:${minuto} ${periodo}`
}

/**
 * Fecha actual en formato ISO 'YYYY-MM-DD' en GMT-5 (America/Bogota),
 * independiente de la zona horaria del servidor o del navegador.
 */
export function hoyGMT5(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE_DEFAULT }).format(new Date())
}
