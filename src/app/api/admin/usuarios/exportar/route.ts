import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'

const formatoSchema = z.enum(['csv', 'xlsx', 'pdf'])
import { utils, write } from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Formato = 'csv' | 'xlsx' | 'pdf'

const CABECERAS = ['Nombre', 'Email', 'Rol', 'Empresa', 'Registrado']
const CABECERAS_KEY = ['nombre', 'email', 'rol', 'empresa', 'registrado']

interface FilaExport {
  nombre: string
  email: string
  rol: string
  empresa: string
  registrado: string
}

function generarCSV(filas: FilaExport[]): Buffer {
  const csv = [
    CABECERAS.join(','),
    ...filas.map((f) =>
      CABECERAS_KEY.map((k) => `"${String(f[k as keyof FilaExport] ?? '').replace(/"/g, '""')}"`).join(',')
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
      Rol: f.rol,
      Empresa: f.empresa,
      Registrado: f.registrado,
    }))
  )
  utils.book_append_sheet(wb, ws, 'Usuarios')
  return write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
}

function generarPDF(filas: FilaExport[]): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.setTextColor(0, 130, 124)
  doc.text('reuso.lurdes.co - Usuarios', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} © Grupo MLP S.A.S.`, 14, 22)
  autoTable(doc, {
    head: [CABECERAS],
    body: filas.map((f) => CABECERAS_KEY.map((k) => String(f[k as keyof FilaExport] ?? ''))),
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 130, 124], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 249] },
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

  const { data: perfiles } = await guard.adminClient
    .from('profiles')
    .select('nombre, email, rol, empresa_id, created_at, empresas(nombre)')
    .order('created_at', { ascending: false })

  const filas: FilaExport[] = (perfiles ?? []).map((p) => {
    const empresa = (Array.isArray(p.empresas) ? p.empresas[0] : p.empresas) as { nombre: string } | null
    return {
      nombre: p.nombre ?? '',
      email: p.email ?? '',
      rol: p.rol ?? '',
      empresa: empresa?.nombre ?? '',
      registrado: p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '',
    }
  })

  const fecha = new Date().toISOString().slice(0, 10)
  const nombre = `usuarios-reuso-${fecha}`

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
