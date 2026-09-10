import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function normalizarCodigo(raw: string): { exact: string; prefix: string | null } {
  const limpio = raw.trim()
  if (limpio.toUpperCase() === 'RCO2-DEMO-0001' || limpio.toUpperCase() === 'DEMO-0001') {
    return { exact: '00010001-0000-0000-0000-000000000001', prefix: '00010001' }
  }
  const m = limpio.match(/^RCO2-([0-9A-Fa-f]{4})-([0-9A-Fa-f]{4})$/i)
  if (m) {
    return { exact: limpio, prefix: `${m[1]}${m[2]}`.toLowerCase() }
  }
  return { exact: limpio, prefix: null }
}

export async function GET(
  _request: Request,
  { params }: { params: { codigo: string } }
) {
  const adminClient = await createAdminClient()
  const { exact, prefix } = normalizarCodigo(params.codigo)

  const query = adminClient
    .from('informes')
    .select('id, codigo_verificacion, co2_total, revocado')

  const { data: cert, error } = prefix
    ? await query
        .gte('codigo_verificacion', `${prefix}-0000-0000-0000-000000000000`)
        .lte('codigo_verificacion', `${prefix}-ffff-ffff-ffff-ffffffffffff`)
        .limit(1)
        .single()
    : await query.eq('codigo_verificacion', exact).single()

  if (error || !cert) {
    return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, cert })
}
