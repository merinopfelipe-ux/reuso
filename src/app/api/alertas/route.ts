import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const ahora = new Date().toISOString()

  // Alertas activas y no expiradas — RLS filtra por destinatario automáticamente
  const { data: alertas, error: alertasError } = await supabase
    .from('alertas')
    .select('id, titulo, mensaje, tipo, destinatario_tipo, destinatario_id, activa, created_at, expires_at')
    .eq('activa', true)
    .or(`expires_at.is.null,expires_at.gt.${ahora}`)
    .order('created_at', { ascending: false })

  if (alertasError) {
    return NextResponse.json({ error: 'Error al obtener alertas.' }, { status: 500 })
  }

  // IDs de alertas ya leídas por este usuario
  const { data: leidas } = await supabase
    .from('alertas_leidas')
    .select('alerta_id')
    .eq('user_id', user.id)

  const ids_leidas = (leidas ?? []).map((r) => r.alerta_id as string)

  return NextResponse.json({ alertas: alertas ?? [], ids_leidas })
}
