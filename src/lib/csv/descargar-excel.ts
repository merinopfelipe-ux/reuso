import { utils, write } from 'xlsx'

/** Genera un .xlsx a partir de un array de objetos planos y dispara su descarga — mismo criterio que descargar-csv.ts, quita la fricción de "importar el CSV" que antes se le pedía al usuario. */
export function descargarExcel(data: unknown[], nombre: string) {
  if (!data.length) return
  const wb = utils.book_new()
  const ws = utils.json_to_sheet(data as Record<string, unknown>[])
  utils.book_append_sheet(wb, ws, 'Reporte')
  const buffer = write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array
  const blob = new Blob([buffer as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
