import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const adminClient = await createAdminClient()
    const { data: incidentes, error } = await adminClient
      .from('dpp_incidencias')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ incidentes })
  } catch (err) {
    console.error('Error al obtener incidencias públicas:', err)
    return NextResponse.json({ error: 'Error al obtener incidencias.' }, { status: 500 })
  }
}
