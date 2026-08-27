import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { calcularRentabilidad, type MuebleCotizadoRentabilidad } from '@/lib/reportes/rentabilidad'
import { generarPDFRentabilidad } from '@/lib/pdf/generar-pdf-reporte-rentabilidad'
import { fetchImageAsBase64 } from '@/lib/pdf/pdf-shared'
import { resolverAutores } from '@/lib/resolver-autores'

interface MuebleRaw {
  id: string
  titulo: string | null
  cantidad: number
  precio_mercado_nuevo: number | null
  precio_mercado_estado: 'pendiente' | 'sugerido' | 'confirmado' | 'sin_resultado'
  servicios_json: { nombre: string; precio: number }[] | null
  insumos_json: { nombre: string; cantidad: number; unidad: string; precio_unitario: number }[] | null
  crm_cotizaciones: {
    asesor_id: string | null
    crm_clientes: { nombre: string } | null
  } | null
}

export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin'])
  if (!auth.ok) {
    return NextResponse.json({ error: 'Sin permiso.' }, { status: auth.status })
  }
  const { empresa_id, adminClient } = auth
  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const [{ data: empresa }, queryResult] = await Promise.all([
    adminClient.from('empresas').select('nombre, logo_propuesta_url, logo_url').eq('id', empresa_id).single(),
    (async () => {
      let query = adminClient
        .from('crm_muebles_cotizados')
        .select(`
          id, titulo, cantidad, precio_mercado_nuevo, precio_mercado_estado, servicios_json, insumos_json, created_at,
          crm_cotizaciones(asesor_id, crm_clientes(nombre))
        `)
        .eq('empresa_id', empresa_id)
      if (desde) query = query.gte('created_at', desde)
      if (hasta) query = query.lte('created_at', hasta)
      return query
    })(),
  ])

  if (queryResult.error) {
    return NextResponse.json({ error: 'Error al generar el PDF.' }, { status: 500 })
  }

  // El asesor se resuelve aparte, nunca con el embed `profiles(...)` sobre
  // crm_cotizaciones: asesor_id referencia auth.users(id) a propósito desde
  // sql/033 (ver su comentario), no profiles(id) — el embed rechazaba la
  // consulta COMPLETA y este PDF fallaba siempre.
  const filasPdf = (queryResult.data ?? []) as unknown as MuebleRaw[]
  const autoresPdf = await resolverAutores(adminClient, filasPdf.map(r => r.crm_cotizaciones?.asesor_id))

  const muebles: MuebleCotizadoRentabilidad[] = filasPdf.map((r) => {
    const total_servicios = (r.servicios_json ?? []).reduce((s, x) => s + (x.precio ?? 0), 0)
    const total_insumos = (r.insumos_json ?? []).reduce((s, x) => s + (x.cantidad ?? 0) * (x.precio_unitario ?? 0), 0)
    const asesor = r.crm_cotizaciones?.asesor_id ? autoresPdf.get(r.crm_cotizaciones.asesor_id) : null
    return {
      id: r.id,
      titulo: r.titulo ?? 'Sin título',
      cantidad: r.cantidad ?? 1,
      precio_mercado_nuevo: r.precio_mercado_nuevo,
      precio_mercado_estado: r.precio_mercado_estado,
      total_servicios,
      total_insumos,
      asesor_nombre: asesor ? `${asesor.nombre} ${asesor.apellido}`.trim() : null,
      cliente_nombre: r.crm_cotizaciones?.crm_clientes?.nombre ?? null,
    }
  })

  const resultado = calcularRentabilidad(muebles)
  const logoUrl = empresa?.logo_propuesta_url ?? empresa?.logo_url ?? null
  const empresa_logo_base64 = logoUrl ? await fetchImageAsBase64(logoUrl) : null
  const buffer = generarPDFRentabilidad({ empresa_nombre: empresa?.nombre ?? 'Tu empresa', empresa_logo_base64, desde, hasta, resultado })

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-rentabilidad-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}
