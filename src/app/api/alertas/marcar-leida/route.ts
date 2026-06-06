import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const alertaId = (body as Record<string, unknown>)?.alertaId
  if (typeof alertaId !== 'string' || !alertaId) {
    return NextResponse.json({ error: 'alertaId requerido.' }, { status: 400 })
  }

  // 1. Verificar si ya existe
  const { data: existe } = await supabase
    .from('alertas_leidas')
    .select('alerta_id')
    .eq('alerta_id', alertaId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existe) {
    return NextResponse.json({ ok: true })
  }

  // 2. Insertar si no existe
  const { error } = await supabase
    .from('alertas_leidas')
    .insert({ alerta_id: alertaId, user_id: user.id })

  if (error) {
    console.error('Error Supabase marcar-leida:', error)
    return NextResponse.json({ error: 'Error al marcar alerta.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
