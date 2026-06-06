import { NextResponse } from 'next/server'
import { dppAuthCheck } from '@/lib/dpp/auth-check'

export async function GET() {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  const { data: configs, error } = await adminClient
    .from('crm_config_costos')
    .select('*')
    .eq('empresa_id', empresa_id)
    .eq('activo', true)
    .order('tipo_mueble')

  if (error) {
    return NextResponse.json({ error: 'Error al cargar la configuración de precios.' }, { status: 500 })
  }

  return NextResponse.json({ configs: configs ?? [] })
}
