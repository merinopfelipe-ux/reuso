import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { NOTA_SANITIZE_CONFIG } from '@/lib/sanitize-notas'

const schema = z.object({
  nota: z.string().min(1, 'La nota no puede estar vacía.').max(4000),
})

type Params = { params: Promise<{ id: string; notaId: string }> }

export async function PATCH(request: NextRequest, props: Params) {
  const { id, notaId } = await props.params
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
  }
  const { user_id, empresa_id, adminClient } = auth

  const { data: cliente } = await adminClient.from('crm_clientes').select('id').eq('id', id).eq('empresa_id', empresa_id).maybeSingle()
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })

  const { data: notaExistente } = await adminClient
    .from('crm_clientes_notas')
    .select('id, user_id')
    .eq('id', notaId)
    .eq('cliente_id', id)
    .maybeSingle()

  if (!notaExistente) return NextResponse.json({ error: 'Nota no encontrada.' }, { status: 404 })
  if (notaExistente.user_id !== user_id) return NextResponse.json({ error: 'Solo el autor puede editar esta nota.' }, { status: 403 })

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Nota inválida.' }, { status: 400 })
  }

  const { data: nota, error } = await adminClient
    .from('crm_clientes_notas')
    .update({
      nota: DOMPurify.sanitize(parsed.data.nota, NOTA_SANITIZE_CONFIG),
      editado_at: new Date().toISOString(),
    })
    .eq('id', notaId)
    .select('id, nota, created_at, editado_at, user_id')
    .single()

  if (error || !nota) {
    console.error('[PATCH /api/crm/clientes/[id]/notas/[notaId]]', error)
    return NextResponse.json({ error: 'Error al guardar.' }, { status: 500 })
  }

  const { data: perfil } = await adminClient.from('profiles').select('nombre, apellido, apodo').eq('user_id', nota.user_id).maybeSingle()
  return NextResponse.json({
    data: {
      id: nota.id,
      nota: nota.nota,
      created_at: nota.created_at,
      editado_at: nota.editado_at,
      profiles: perfil ?? { nombre: 'Usuario', apellido: null, apodo: null },
    },
  })
}

export async function DELETE(request: NextRequest, props: Params) {
  const { id, notaId } = await props.params
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
  }
  const { user_id, empresa_id, adminClient } = auth

  const { data: cliente } = await adminClient.from('crm_clientes').select('id').eq('id', id).eq('empresa_id', empresa_id).maybeSingle()
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })

  const { data: notaExistente } = await adminClient
    .from('crm_clientes_notas')
    .select('id, user_id')
    .eq('id', notaId)
    .eq('cliente_id', id)
    .maybeSingle()

  if (!notaExistente) return NextResponse.json({ error: 'Nota no encontrada.' }, { status: 404 })
  if (notaExistente.user_id !== user_id) return NextResponse.json({ error: 'Solo el autor puede eliminar esta nota.' }, { status: 403 })

  const { error } = await adminClient.from('crm_clientes_notas').delete().eq('id', notaId)
  if (error) return NextResponse.json({ error: 'Error al eliminar.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
