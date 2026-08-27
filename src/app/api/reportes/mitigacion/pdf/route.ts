import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { calcularMitigacion, type MaterialUsado, type CategoriaMaterial, type NivelConfianza } from '@/lib/reportes/mitigacion'
import { generarPDFMitigacion } from '@/lib/pdf/generar-pdf-reporte-mitigacion'
import { fetchImageAsBase64 } from '@/lib/pdf/pdf-shared'

interface MaterialSnapshot {
  categoria_material?: CategoriaMaterial | null
  peso_kg: number
  factor_co2_kg: number
  factor_agua_l_kg?: number | null
  nivel_confianza?: NivelConfianza | null
}

interface CalculoRow {
  factor_snapshot_json: { items?: Record<string, { materiales?: MaterialSnapshot[] }> } | null
}

interface MuebleRow {
  cantidad: number
  materiales_json: MaterialSnapshot[] | null
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

  const { data: empresa } = await adminClient.from('empresas').select('nombre, logo_propuesta_url, logo_url').eq('id', empresa_id).single()

  let qCalculos = adminClient.from('calculos').select('factor_snapshot_json').eq('empresa_id', empresa_id)
  if (desde) qCalculos = qCalculos.gte('fecha', desde)
  if (hasta) qCalculos = qCalculos.lte('fecha', hasta)

  let qMuebles = adminClient
    .from('crm_muebles_cotizados')
    .select('cantidad, materiales_json, created_at, crm_cotizaciones!inner(estado)')
    .eq('empresa_id', empresa_id)
    .eq('crm_cotizaciones.estado', 'cerrado_ganado')
  if (desde) qMuebles = qMuebles.gte('created_at', desde)
  if (hasta) qMuebles = qMuebles.lte('created_at', hasta)

  const [{ data: calculosRows, error: errorCalculos }, { data: mueblesRows, error: errorMuebles }] = await Promise.all([qCalculos, qMuebles])

  if (errorCalculos || errorMuebles) {
    return NextResponse.json({ error: 'Error al generar el PDF.' }, { status: 500 })
  }

  const materiales: MaterialUsado[] = []
  for (const calc of (calculosRows ?? []) as unknown as CalculoRow[]) {
    const items = calc.factor_snapshot_json?.items ?? {}
    for (const item of Object.values(items)) {
      for (const m of item.materiales ?? []) {
        if (m.peso_kg <= 0) continue
        materiales.push({
          categoria_material: m.categoria_material ?? 'otros',
          peso_kg: m.peso_kg,
          factor_co2_kg: m.factor_co2_kg,
          factor_agua_l_kg: m.factor_agua_l_kg ?? 0,
          nivel_confianza: m.nivel_confianza ?? null,
        })
      }
    }
  }
  for (const mueble of (mueblesRows ?? []) as unknown as MuebleRow[]) {
    for (const m of mueble.materiales_json ?? []) {
      const pesoReal = m.peso_kg * (mueble.cantidad ?? 1)
      if (pesoReal <= 0) continue
      materiales.push({
        categoria_material: m.categoria_material ?? 'otros',
        peso_kg: pesoReal,
        factor_co2_kg: m.factor_co2_kg,
        factor_agua_l_kg: m.factor_agua_l_kg ?? 0,
        nivel_confianza: m.nivel_confianza ?? null,
      })
    }
  }

  const resultado = calcularMitigacion(materiales)
  const logoUrl = empresa?.logo_propuesta_url ?? empresa?.logo_url ?? null
  const empresa_logo_base64 = logoUrl ? await fetchImageAsBase64(logoUrl) : null
  const buffer = generarPDFMitigacion({ empresa_nombre: empresa?.nombre ?? 'Tu empresa', empresa_logo_base64, desde, hasta, resultado })

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-mitigacion-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}
