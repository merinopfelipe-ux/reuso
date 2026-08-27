import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/** Genera un PDF simple (encabezado de marca + tabla) a partir de un array de objetos planos, mismo patrón ya usado en admin/usuarios/exportar y calculos/exportar (jspdf-autotable), aquí client-side porque el dato ya está cargado en el navegador. */
export function descargarPDFTabla(data: unknown[], nombre: string, titulo: string) {
  if (!data.length) return
  const filas = data as Record<string, unknown>[]
  const columnas = Object.keys(filas[0])

  const doc = new jsPDF({ orientation: columnas.length > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.setTextColor(0, 130, 124)
  doc.text('Calculadora de Reúso', 14, 16)
  doc.setFontSize(11)
  doc.setTextColor(71, 71, 71)
  doc.text(titulo, 14, 23)
  doc.setFontSize(8)
  doc.setTextColor(140, 140, 140)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 28)

  autoTable(doc, {
    head: [columnas],
    body: filas.map(f => columnas.map(c => {
      const v = f[c]
      return v === null || v === undefined ? '' : String(v)
    })),
    startY: 33,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 130, 124], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 249] },
  })

  doc.save(`${nombre}.pdf`)
}
