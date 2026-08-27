import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

// Lista de categorías hoja (sin hijos) para el selector del formulario de
// "Agregar ítem" del Cotizador — un Ítem Maestro siempre cuelga de una hoja.
export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: 'Sin permiso.' }, { status: auth.status === 400 ? 400 : 401 })
  }

  const { data: categorias, error } = await auth.adminClient
    .from('categorias')
    .select('id, nombre, parent_id')
    .eq('activa', true)
    .order('nombre')

  if (error) {
    return NextResponse.json({ error: 'Error al cargar categorías.' }, { status: 500 })
  }

  const todas = categorias ?? []
  const idsConHijos = new Set(todas.map(c => c.parent_id).filter(Boolean))
  const hojas = todas.filter(c => !idsConHijos.has(c.id))

  return NextResponse.json({ categorias: hojas })
}
