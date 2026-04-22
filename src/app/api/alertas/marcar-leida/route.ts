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

  // Idempotente: ignorar duplicados por la constraint UNIQUE(alerta_id, user_id)
  const { error } = await supabase
    .from('alertas_leidas')
    .upsert(
      { alerta_id: alertaId, user_id: user.id },
      { onConflict: 'alerta_id,user_id', ignoreDuplicates: true }
    )

  if (error) {
    return NextResponse.json({ error: 'Error al marcar alerta.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
