import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

function normalizeStr(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Ciudades ya usadas por los clientes de esta empresa — alimenta el
// SelectorCiudad (además de las 3 más habituales, que son fijas). Dedup por
// forma normalizada (sin tildes, minúsculas) para que "Bogota" y "Bogotá"
// nunca aparezcan como dos ciudades distintas.
export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: 'Sin permiso.' }, { status: auth.status })
  }
  const { empresa_id, adminClient } = auth

  const { data, error } = await adminClient
    .from('crm_clientes')
    .select('ciudad')
    .eq('empresa_id', empresa_id)
    .not('ciudad', 'is', null)

  if (error) {
    console.error('[GET /api/cotizador/clientes/ciudades]', error)
    return NextResponse.json({ error: 'Error al cargar las ciudades.' }, { status: 500 })
  }

  const vistas = new Map<string, string>()
  for (const row of data ?? []) {
    const ciudad = (row.ciudad as string | null)?.trim()
    if (!ciudad) continue
    const clave = normalizeStr(ciudad)
    if (!vistas.has(clave)) vistas.set(clave, ciudad)
  }

  const ciudades = Array.from(vistas.values()).sort((a, b) => a.localeCompare(b, 'es'))
  return NextResponse.json({ ciudades })
}
