import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'

const formatoSchema = z.enum(['csv', 'xlsx', 'pdf'])
import { utils, write } from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Formato = 'csv' | 'xlsx' | 'pdf'

const CABECERAS = ['Empresa', 'Plan', 'Sector', 'Empleados', 'CO₂ (kg)', 'Activa', 'Creada']
const CABECERAS_KEY = ['nombre', 'plan', 'sector', 'empleados', 'co2', 'activa', 'creada']

interface FilaExport {
  nombre: string
  plan: string
  sector: string
  empleados: number
  co2: string
  activa: string
  creada: string
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
      Empresa: f.nombre,
      Plan: f.plan,
      Sector: f.sector,
      Empleados: f.empleados,
      'CO₂ (kg)': f.co2,
      Activa: f.activa,
      Creada: f.creada,
    }))
  )
  utils.book_append_sheet(wb, ws, 'Empresas')
  return write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
}

function generarPDF(filas: FilaExport[]): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.setTextColor(0, 130, 124)
  doc.text('reuso.lurdes.co - Empresas', 14, 16)
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

  const { data: empresas } = await guard.adminClient
    .from('empresas')
    .select('*')
    .order('created_at', { ascending: false })

  const empresasConStats = await Promise.all(
    (empresas ?? []).map(async (emp) => {
      const [{ count: totalEmpleados }, { data: co2Rows }] = await Promise.all([
        guard.adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('empresa_id', emp.id),
        guard.adminClient.from('calculos').select('total_co2').eq('empresa_id', emp.id),
      ])
      const totalCo2 = (co2Rows ?? []).reduce((s, r) => s + (r.total_co2 ?? 0), 0)
      return { ...emp, totalEmpleados: totalEmpleados ?? 0, totalCo2 }
    })
  )

  const filas: FilaExport[] = empresasConStats.map((e) => ({
    nombre: e.nombre ?? '',
    plan: e.plan ?? '',
    sector: e.sector ?? '',
    empleados: e.totalEmpleados,
    co2: e.totalCo2.toFixed(2),
    activa: e.activa ? 'Sí' : 'No',
    creada: e.created_at ? new Date(e.created_at).toLocaleDateString('es-CO') : '',
  }))

  const fecha = new Date().toISOString().slice(0, 10)
  const nombre = `empresas-reuso-${fecha}`

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
