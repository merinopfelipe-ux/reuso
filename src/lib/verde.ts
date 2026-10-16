// Cifras del panel Zero Waste digital. TODO sale de dos archivos:
//   src/data/verde-medicion.json  lo escribe `npm run verde:medir -- <URL> --lighthouse --guardar`
//   src/data/verde-metas.json     las metas que fijó Grupo MLP S.A.S.
// Aquí no se escribe ningún número a mano (regla 3 de la skill green-coding).
import medicion from '@/data/verde-medicion.json'
import metas from '@/data/verde-metas.json'

export function fmt(n: number, decimales = 1): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

export function fechaLarga(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const MEDICION = medicion
export const METAS = metas

export function resumenVerde() {
  const enBase = medicion.paginas.filter((p) => metas.paginasLineaBase.includes(p.ruta) && p.lighthouse)
  const promedioKB = enBase.reduce((s, p) => s + (p.lighthouse?.evitableKB ?? 0), 0) / enBase.length
  const anioMedicion = Number(medicion.fecha.slice(0, 4))
  const proxima = metas.hitos.find((h) => h.anio >= anioMedicion && h.anio > metas.base.anio) ?? metas.hitos[metas.hitos.length - 1]
  const cierre = metas.hitos[metas.hitos.length - 1]
  return {
    fecha: medicion.fecha,
    paginas: enBase.length,
    promedioKB,
    baseKB: metas.base.evitableKBPorPagina,
    proxima: { anio: proxima.anio, kb: proxima.evitableKBPorPagina },
    cierre: { anio: cierre.anio, kb: cierre.evitableKBPorPagina },
  }
}

export type ResumenVerde = ReturnType<typeof resumenVerde>
