import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const formatoSchema = z.enum(['csv', 'xlsx', 'pdf'])
import { utils, write } from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Rol } from '@/types'

type Formato = 'csv' | 'xlsx' | 'pdf'

const CABECERAS = ['Fecha', 'Usuario', 'Items', 'CO₂ (kg)', 'Agua (L)']
const CABECERAS_KEY = ['fecha', 'usuario', 'items', 'co2', 'agua']

interface FilaExport {
  fecha: string
  usuario: string
  items: number
  co2: string
  agua: string
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
      Fecha: f.fecha,
      Usuario: f.usuario,
      Items: f.items,
      'CO₂ (kg)': f.co2,
      'Agua (L)': f.agua,
    }))
  )
  utils.book_append_sheet(wb, ws, 'Cálculos')
  return write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
}

function generarPDF(filas: FilaExport[], titulo: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.setTextColor(0, 130, 124)
  doc.text(titulo, 14, 16)
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
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol
  const empresaId = perfil?.empresa_id ?? null

  const params = request.nextUrl.searchParams
  const formatoParsed = formatoSchema.safeParse(params.get('formato') ?? 'xlsx')
  if (!formatoParsed.success) {
    return NextResponse.json({ error: 'Formato no válido.' }, { status: 400 })
  }
  const formato = formatoParsed.data as Formato
  const desde = params.get('desde') ?? null
  const hasta = params.get('hasta') ?? null
  const categoria = params.get('categoria') ?? null
  const search = params.get('search') ?? null
  const empresaIdFiltro = params.get('empresa_id') ?? null

  const adminClient = await createAdminClient()

  let query = adminClient
    .from('calculos')
    .select('user_id, empresa_id, fecha, total_co2, total_agua, detalle_json')
    .order('fecha', { ascending: false })

  if (rol === 'super_admin') {
    if (empresaIdFiltro) query = query.eq('empresa_id', empresaIdFiltro)
  } else if (rol === 'empresa_admin') {
    if (empresaId) query = query.eq('empresa_id', empresaId)
    else query = query.eq('user_id', user.id)
  } else {
    query = query.eq('user_id', user.id)
  }

  if (desde) query = query.gte('fecha', `${desde}T00:00:00.000Z`)
  if (hasta) query = query.lte('fecha', `${hasta}T23:59:59.999Z`)
  if (categoria) query = query.filter('detalle_json::text', 'ilike', `%${categoria}%`)
  if (search) query = query.filter('detalle_json::text', 'ilike', `%${search}%`)

  const { data: calculos, error } = await query

  if (error) return NextResponse.json({ error: 'Error al cargar los datos.' }, { status: 500 })

  const lista = calculos ?? []

  // Resolver nombres de usuario (para admin y empresa_admin)
  let usuariosMap = new Map<string, string>()
  if (rol === 'super_admin' || rol === 'empresa_admin') {
    const userIds = Array.from(new Set(lista.map((c) => c.user_id).filter(Boolean)))
    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('user_id, nombre')
        .in('user_id', userIds)
      usuariosMap = new Map((profiles ?? []).map((p) => [p.user_id, p.nombre]))
    }
  }

  const filas: FilaExport[] = lista.map((c) => {
    const detalle = c.detalle_json as Record<string, unknown> | null
    return {
      fecha: c.fecha ? new Date(c.fecha).toLocaleDateString('es-CO') : '',
      usuario: usuariosMap.get(c.user_id) ?? '',
      items: detalle ? Object.keys(detalle).length : 0,
      co2: (c.total_co2 ?? 0).toFixed(4),
      agua: (c.total_agua ?? 0).toFixed(2),
    }
  })

  const fecha = new Date().toISOString().slice(0, 10)
  const nombre = `calculos-reuso-${fecha}`

  let buffer: Buffer
  if (formato === 'csv') buffer = generarCSV(filas)
  else if (formato === 'xlsx') buffer = generarXLSX(filas)
  else buffer = generarPDF(filas, 'reuso.lurdes.co — Historial de Cálculos')

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': CONTENT_TYPES[formato] ?? CONTENT_TYPES.xlsx,
      'Content-Disposition': `attachment; filename="${nombre}.${formato}"`,
    },
  })
}
