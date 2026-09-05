import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Marca la tarjeta de bienvenida como vista (terminada u omitida). Checklist
// de 19 fundamentales, 2026-09-05 — ver sql/123_onboarding_visto.sql.
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_visto: true })
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'No pudimos guardar tu progreso.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
