import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PATCH_SCHEMA = z.object({
  titulo: z.string().min(3).max(100).optional(),
  descripcion: z.string().max(255).optional(),
  valor_objetivo: z.number().positive().optional(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activa: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('empresa_id, rol').eq('user_id', user.id).single()
  if (!profile?.empresa_id || profile.rol !== 'empresa_admin') {
    return NextResponse.json({ error: 'Solo administradores pueden editar metas.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = PATCH_SCHEMA.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const adminClient = await createAdminClient()
  const { data: meta, error } = await adminClient
    .from('metas')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('empresa_id', profile.empresa_id)
    .select()
    .single()

  if (error || !meta) return NextResponse.json({ error: 'Error actualizando meta.' }, { status: 500 })

  return NextResponse.json(meta)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('empresa_id, rol').eq('user_id', user.id).single()
  if (!profile?.empresa_id || profile.rol !== 'empresa_admin') {
    return NextResponse.json({ error: 'Solo administradores pueden borrar metas.' }, { status: 403 })
  }

  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('metas')
    .delete()
    .eq('id', params.id)
    .eq('empresa_id', profile.empresa_id)

  if (error) return NextResponse.json({ error: 'Error borrando meta.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
