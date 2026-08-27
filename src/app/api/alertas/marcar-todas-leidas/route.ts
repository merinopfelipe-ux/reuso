import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// "Limpiar" el dropdown de notificaciones: marca como leídas TODAS las
// alertas activas del usuario de una sola vez (no solo la que se clickeó).
export async function POST(): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const ahora = new Date().toISOString()

  // RLS filtra automáticamente por destinatario — solo trae las que este
  // usuario puede ver, igual que GET /api/alertas.
  const { data: alertas, error: alertasError } = await supabase
    .from('alertas')
    .select('id')
    .eq('activa', true)
    .or(`expires_at.is.null,expires_at.gt.${ahora}`)

  if (alertasError) {
    return NextResponse.json({ error: 'Error al obtener alertas.' }, { status: 500 })
  }

  const filas = (alertas ?? []).map((a) => ({ alerta_id: a.id as string, user_id: user.id }))
  if (filas.length === 0) return NextResponse.json({ ok: true })

  const { error } = await supabase
    .from('alertas_leidas')
    .upsert(filas, { onConflict: 'alerta_id,user_id', ignoreDuplicates: true })

  if (error) {
    console.error('Error Supabase marcar-todas-leidas:', error)
    return NextResponse.json({ error: 'Error al marcar alertas.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
