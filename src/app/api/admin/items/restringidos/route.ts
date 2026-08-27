import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-guard'

// Catálogo restringido (visibilidad='restringido', creado por vendedores) —
// gestión permanente de a qué otras empresas se les comparte cada ítem
// (decisión de negocio: "Visibilidad Selectiva por Permisos"). Distinto del
// panel /admin/catalogo-pendientes, que es la auditoría puntual del CO2.
export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data: items, error } = await guard.supabase
    .from('items')
    .select(`
      id, nombre, pendiente_revision_co2, creado_por_empresa_id, created_at,
      categoria_id, categoria:categoria_id ( nombre ),
      creador:creado_por_empresa_id ( nombre ),
      item_permisos_empresa ( id, empresa_id, empresas:empresa_id ( nombre ) )
    `)
    .eq('visibilidad', 'restringido')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/admin/items/restringidos]', error)
    return NextResponse.json({ error: 'Error al cargar el catálogo restringido.' }, { status: 500 })
  }

  return NextResponse.json({ items: items ?? [] })
}
