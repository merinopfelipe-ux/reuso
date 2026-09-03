import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-guard'

// Paso D (adm-09 en /admin/qa): el QA manual pedía este botón, no existía
// (respondía 404). Mismo patrón de exportación ya usado en
// /api/admin/usuarios/exportar, aquí solo CSV porque es lo único que pide
// la tarea real del QA.
const CABECERAS = ['Nombre', 'Email', 'Empresa', 'Interés', 'Estado', 'Fecha']

function generarCSV(filas: { nombre: string; email: string; empresa: string; interes: string; estado: string; fecha: string }[]): Buffer {
  const csv = [
    CABECERAS.join(','),
    ...filas.map((f) =>
      [f.nombre, f.email, f.empresa, f.interes, f.estado, f.fecha]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n')
  return Buffer.from('﻿' + csv, 'utf-8')
}

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data: leads, error } = await guard.adminClient
    .from('leads')
    .select('nombre, email, empresa, interes, estado, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Error al obtener los leads.' }, { status: 500 })

  const filas = (leads ?? []).map((l) => ({
    nombre: l.nombre ?? '',
    email: l.email ?? '',
    empresa: l.empresa ?? '',
    interes: l.interes ?? '',
    estado: l.estado ?? '',
    fecha: l.created_at ? new Date(l.created_at).toLocaleDateString('es-CO') : '',
  }))

  const fecha = new Date().toISOString().slice(0, 10)
  const buffer = generarCSV(filas)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-reuso-${fecha}.csv"`,
    },
  })
}
