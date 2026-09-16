import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { planIncluyeIA } from '@/lib/plan-limits'
import type { Plan } from '@/types'

// Lectura liviana para que el cliente (page.tsx, un componente 'use client')
// sepa si mostrar el botón "Sugerir peso con IA" de los insumos — el mismo
// gate que ya aplica el backend en peso-sugerido/route.ts, aquí solo para
// decidir si el botón se pinta o no en la UI.
export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ incluyeIA: false })
  }
  const { empresa_id, adminClient } = auth

  const { data: empresa } = await adminClient.from('empresas').select('plan').eq('id', empresa_id).single()
  const incluyeIA = await planIncluyeIA(empresa_id, (empresa?.plan ?? 'free') as Plan)

  return NextResponse.json({ incluyeIA })
}
