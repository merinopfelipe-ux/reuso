import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { utils, write } from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const formatoSchema = z.enum(['csv', 'xlsx', 'pdf'])
type Formato = 'csv' | 'xlsx' | 'pdf'

const CABECERAS = ['Nombre', 'Email', 'Teléfono', 'Empresa', 'Interés', 'Evento', 'Estado', 'Fecha']
const CABECERAS_KEY = ['nombre', 'email', 'telefono', 'empresa', 'interes', 'evento', 'estado', 'fecha']

interface FilaExport {
  nombre: string
  email: string
  telefono: string
  empresa: string
  interes: string
  evento: string
  estado: string
  fecha: string
}

function generarCSV(filas: FilaExport[]): Buffer {
  const csv = [
    CABECERAS.join(','),
    ...filas.map((f) =>
      CABECERAS_KEY.map((k) => {
        const val = String(f[k as keyof FilaExport] ?? '').trim()
        return `"${val.replace(/"/g, '""')}"`
      }).join(',')
    ),
  ].join('\n')
  return Buffer.from('\uFEFF' + csv, 'utf-8')
}

function generarXLSX(filas: FilaExport[]): Buffer {
  const wb = utils.book_new()
  const ws = utils.json_to_sheet(
    filas.map((f) => ({
      Nombre: f.nombre,
      Email: f.email,
      Teléfono: f.telefono ? String(f.telefono).trim() : '',
      Empresa: f.empresa,
      Interés: f.interes,
      Evento: f.evento,
      Estado: f.estado,
      Fecha: f.fecha,
    }))
  )

  // Configurar anchos de columna óptimos
  ws['!cols'] = [
    { wch: 25 }, // Nombre
    { wch: 30 }, // Email
    { wch: 20 }, // Teléfono
    { wch: 25 }, // Empresa
    { wch: 32 }, // Interés
    { wch: 26 }, // Evento
    { wch: 15 }, // Estado
    { wch: 14 }, // Fecha
  ]

  // Forzar tipo texto explícito en la columna C (Teléfono) para evitar notación científica y errores de formato
  for (let r = 2; r <= filas.length + 1; r++) {
    const ref = `C${r}`
    if (ws[ref]) {
      ws[ref].t = 's' // tipo string nativo
      ws[ref].z = '@' // formato texto en Excel
    }
  }

  utils.book_append_sheet(wb, ws, 'Prospectos')
  return write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
}

function generarPDF(filas: FilaExport[]): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.setTextColor(0, 130, 124)
  doc.text('calculadoradereuso.com - Prospectos Comerciales', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} © Grupo MLP S.A.S.`, 14, 22)
  autoTable(doc, {
    head: [CABECERAS],
    body: filas.map((f) => CABECERAS_KEY.map((k) => String(f[k as keyof FilaExport] ?? ''))),
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 130, 124], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 249] },
    columnStyles: {
      0: { cellWidth: 32 }, // Nombre
      1: { cellWidth: 42 }, // Email
      2: { cellWidth: 26 }, // Teléfono
      3: { cellWidth: 32 }, // Empresa
      4: { cellWidth: 42 }, // Interés
      5: { cellWidth: 35 }, // Evento
      6: { cellWidth: 20 }, // Estado
      7: { cellWidth: 20 }, // Fecha
    },
  })
  return Buffer.from(doc.output('arraybuffer'))
}

const CONTENT_TYPES: Record<Formato, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
}

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const formatoParsed = formatoSchema.safeParse(request.nextUrl.searchParams.get('formato') ?? 'xlsx')
  if (!formatoParsed.success) {
    return NextResponse.json({ error: 'Formato no válido.' }, { status: 400 })
  }
  const formato = formatoParsed.data as Formato

  const { searchParams } = new URL(request.url)
  const estado = searchParams.get('estado')
  const evento = searchParams.get('evento')
  const search = searchParams.get('search') || searchParams.get('busqueda')

  let query = guard.adminClient
    .from('leads')
    .select('nombre, email, telefono, empresa, interes, evento_nombre, estado, created_at')
    .order('created_at', { ascending: false })

  if (estado) query = query.eq('estado', estado)
  if (evento) query = query.eq('evento_nombre', evento)
  if (search && search.trim()) {
    const term = search.trim()
    query = query.or(`nombre.ilike.%${term}%,email.ilike.%${term}%,empresa.ilike.%${term}%`)
  }

  const { data: leads, error } = await query

  if (error) return NextResponse.json({ error: 'Error al obtener los leads.' }, { status: 500 })

  const filas: FilaExport[] = (leads ?? []).map((l) => ({
    nombre: l.nombre ?? '',
    email: l.email ?? '',
    telefono: l.telefono ?? '',
    empresa: l.empresa ?? '',
    interes: l.interes ?? '',
    evento: l.evento_nombre ?? '',
    estado: l.estado ?? '',
    fecha: l.created_at ? new Date(l.created_at).toLocaleDateString('es-CO') : '',
  }))

  const fecha = new Date().toISOString().slice(0, 10)
  const nombre = `leads-reuso-${fecha}`

  let buffer: Buffer
  if (formato === 'csv') buffer = generarCSV(filas)
  else if (formato === 'xlsx') buffer = generarXLSX(filas)
  else buffer = generarPDF(filas)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': CONTENT_TYPES[formato] ?? CONTENT_TYPES.xlsx,
      'Content-Disposition': `attachment; filename="${nombre}.${formato}"`,
    },
  })
}
