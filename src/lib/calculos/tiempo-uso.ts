// Técnica C (ver calculos/00-indice.md del Vault): 0% de error, es solo
// sumar fechas ya guardadas en dpp_ciclos — nunca es una estimación ni
// necesita IA. Cubre SOLO el tiempo de uso dentro de esta plataforma; el
// tiempo anterior a que el activo entrara (Técnica D, estimado por
// desgaste/estilo en la foto) es un dato aparte, más incierto, que se
// suma a este en una capa distinta, no se mezclan en esta función.

export interface CicloConFechas {
  fecha_inicio: string
  fecha_fin: string | null
}

const MS_POR_DIA = 1000 * 60 * 60 * 24

export function calcularTiempoUsoEnPlataformaDias(
  ciclos: CicloConFechas[],
  ahora: Date = new Date()
): number {
  return ciclos.reduce((totalDias, ciclo) => {
    const inicio = new Date(ciclo.fecha_inicio)
    const fin = ciclo.fecha_fin ? new Date(ciclo.fecha_fin) : ahora
    const dias = Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / MS_POR_DIA))
    return totalDias + dias
  }, 0)
}
