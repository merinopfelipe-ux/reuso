import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

const EMPRESA_SELECT = `
  id, nit, razon_social, nombres_comerciales, nombre_comercial,
  direccion, pais, ciudad, direccion_notas, sedes, sector
`

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ empresa_cliente_id: string }> }
) {
  try {
    const params = await props.params
    const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
        { status: auth.status === 400 ? 401 : auth.status }
      )
    }
    const { empresa_id, adminClient } = auth

    const { data, error } = await adminClient
      .from('crm_empresas_clientes')
      .select(EMPRESA_SELECT)
      .eq('id', params.empresa_cliente_id)
      .eq('empresa_id', empresa_id)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: 'Empresa cliente no encontrada.' }, { status: 404 })
    }

    // Cargar contactos de esta empresa para obtener sus cotizaciones
    const { data: contactos } = await adminClient
      .from('crm_clientes')
      .select('id')
      .eq('empresa_cliente_id', params.empresa_cliente_id)
      .eq('empresa_id', empresa_id)

    const contactIds = (contactos ?? []).map((c: { id: string }) => c.id)

    let cotizaciones: Array<{ id: string; codigo_cotizacion: string; estado: string; total: number; created_at: string }> = []
    if (contactIds.length > 0) {
      const { data: cots } = await adminClient
        .from('crm_cotizaciones')
        .select('id, codigo_cotizacion, estado, total, created_at')
        .in('cliente_id', contactIds)
        .eq('empresa_id', empresa_id)
        .order('created_at', { ascending: false })
        .limit(30)
      cotizaciones = cots ?? []
    }

    return NextResponse.json({ empresa: data, cotizaciones })
  } catch (err) {
    console.error('[GET /api/crm/empresas-clientes/[empresa_cliente_id]]', err)
    return NextResponse.json({ error: 'Error al cargar la empresa.' }, { status: 500 })
  }
}
