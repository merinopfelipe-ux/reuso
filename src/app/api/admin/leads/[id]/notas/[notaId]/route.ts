import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { parsearNotasLead } from '@/lib/notas-lead'
import { NOTA_SANITIZE_CONFIG } from '@/lib/sanitize-notas'

const schemaNota = z.object({
  nota: z.string().min(1, 'La nota no puede estar vacía.').max(4000),
})

type Params = { params: Promise<{ id: string; notaId: string }> }

export async function PATCH(request: NextRequest, props: Params) {
  const { id, notaId } = await props.params
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const raw = await request.json().catch(() => null)
  const parsed = schemaNota.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Nota inválida.' }, { status: 400 })
  }

  const { data: lead } = await guard.adminClient.from('leads').select('notas').eq('id', id).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'Contacto no encontrado.' }, { status: 404 })

  const notas = parsearNotasLead(lead.notas)
  const idx = notas.findIndex(n => n.id === notaId)
  if (idx === -1) return NextResponse.json({ error: 'Nota no encontrada.' }, { status: 404 })

  const editadoEl = new Date().toISOString()
  notas[idx] = {
    ...notas[idx],
    texto: DOMPurify.sanitize(parsed.data.nota, NOTA_SANITIZE_CONFIG),
    editadoEl,
  }

  const { error } = await guard.adminClient
    .from('leads')
    .update({ notas: JSON.stringify(notas) })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Error al guardar.' }, { status: 500 })

  const n = notas[idx]
  return NextResponse.json({
    data: {
      id: n.id,
      nota: n.texto,
      created_at: n.fecha,
      editado_at: n.editadoEl ?? null,
      profiles: n.autor ? { nombre: n.autor, apellido: null, apodo: null } : null,
    },
  })
}

export async function DELETE(request: NextRequest, props: Params) {
  const { id, notaId } = await props.params
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data: lead } = await guard.adminClient.from('leads').select('notas').eq('id', id).maybeSingle()
  if (!lead) return NextResponse.json({ error: 'Contacto no encontrado.' }, { status: 404 })

  const notas = parsearNotasLead(lead.notas)
  if (!notas.some(n => n.id === notaId)) {
    return NextResponse.json({ error: 'Nota no encontrada.' }, { status: 404 })
  }

  const { error } = await guard.adminClient
    .from('leads')
    .update({ notas: JSON.stringify(notas.filter(n => n.id !== notaId)) })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Error al eliminar.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
