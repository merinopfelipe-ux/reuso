import { NextResponse } from 'next/server'
import { dppAuthCheck } from '@/lib/dpp/auth-check'

// Lista de empresas para el selector del Cotizador cuando lo usa un super_admin.
// Solo super_admin puede ver el Cotizador de cualquier empresa.

export async function GET() {
  const auth = await dppAuthCheck(['super_admin'])
  if (!auth.ok) {
    return NextResponse.json({ error: 'Sin permiso.' }, { status: auth.status })
  }

  const { data: empresas, error } = await auth.adminClient
    .from('empresas')
    .select('id, nombre')
    .order('nombre')

  if (error) {
    return NextResponse.json({ error: 'Error al cargar empresas.' }, { status: 500 })
  }

  return NextResponse.json({ empresas: empresas ?? [] })
}
