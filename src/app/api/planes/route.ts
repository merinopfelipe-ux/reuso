import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Sin esto, Next.js cachea las llamadas fetch() internas de Supabase (parchea
// el fetch global) y esta ruta puede devolver precios viejos aunque la base
// ya tenga el valor recién publicado — bug real encontrado el 2026-09-02.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET público (sin sesión): solo los precios y límites PUBLICADOS de los 4
// planes — la landing los usa para no depender de números fijos en el
// bundle de JavaScript. Nunca expone las columnas borrador_* (eso es
// interno del panel de super_admin).
export async function GET() {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('config_planes')
    .select('id, precio_cop, precio_usd, precio_eur, limite_empleados, limite_calculos_mes, limite_informes_mes')
    .order('precio_cop', { ascending: true })

  if (error || !data) {
    return NextResponse.json({ error: 'No se pudo cargar la información de planes' }, { status: 500 })
  }

  return NextResponse.json({ planes: data })
}
