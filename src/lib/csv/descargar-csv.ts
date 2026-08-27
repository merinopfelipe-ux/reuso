/** Genera un CSV a partir de un array de objetos planos y dispara su descarga en el navegador. */
export function descargarCSV(data: unknown[], nombre: string) {
  if (!data.length) return
  const keys = Object.keys(data[0] as object)
  const rows = [
    keys.join(','),
    ...data.map((r) =>
      keys
        .map((k) => {
          const v = (r as Record<string, unknown>)[k]
          if (v === null || v === undefined) return ''
          const s = String(v)
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(',')
    ),
  ].join('\n')
  const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
