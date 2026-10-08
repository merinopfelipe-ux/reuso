import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { parsearNotasLead } from '@/lib/notas-lead'
import { NOTA_SANITIZE_CONFIG } from '@/lib/sanitize-notas'

// Endpoint dedicado al hilo de notas de un contacto (lead).
// Almacena las notas en la columna JSON `leads.notas` — compatible con el
// PATCH de nota_nueva que ya existía. El GET invierte el orden (el array
// guarda más reciente primero) para que HiloNotas muestre cronológico.

const schemaNota = z.object({
  nota: z.string().min(1, 'La nota no puede estar vacía.').max(4000),
})

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data: lead } = await guard.adminClient
    .from('leads')
    .select('notas')
    .eq('id', params.id)
    .maybeSingle()

  if (!lead) return NextResponse.json({ error: 'Contacto no encontrado.' }, { status: 404 })

  const notas = parsearNotasLead(lead.notas)
  // el array guarda más reciente al inicio — invertimos para HiloNotas (antiguo → nuevo)
  const data = [...notas].reverse().map(n => ({
    id: n.id,
    nota: n.texto,
    created_at: n.fecha,
    profiles: n.autor ? { nombre: n.autor, apellido: null, apodo: null } : null,
  }))

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const raw = await request.json().catch(() => null)
  const parsed = schemaNota.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Nota inválida.' }, { status: 400 })
  }

  const [{ data: lead }, { data: perfil }] = await Promise.all([
    guard.adminClient.from('leads').select('notas').eq('id', params.id).maybeSingle(),
    guard.adminClient.from('profiles').select('nombre, apellido').eq('user_id', guard.user.id).maybeSingle(),
  ])

  if (!lead) return NextResponse.json({ error: 'Contacto no encontrado.' }, { status: 404 })

  const autor = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ').trim() || 'Administración'
  const nueva = {
    id: crypto.randomUUID(),
    texto: DOMPurify.sanitize(parsed.data.nota, NOTA_SANITIZE_CONFIG),
    fecha: new Date().toISOString(),
    autor,
  }

  const { error } = await guard.adminClient
    .from('leads')
    .update({ notas: JSON.stringify([nueva, ...parsearNotasLead(lead.notas)]) })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Error al guardar la nota.' }, { status: 500 })

  return NextResponse.json({
    data: {
      id: nueva.id,
      nota: nueva.texto,
      created_at: nueva.fecha,
      profiles: { nombre: nueva.autor, apellido: null, apodo: null },
    },
  }, { status: 201 })
}
