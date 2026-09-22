import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'

const crearSchema = z.object({
  nombre: z.string().trim().min(2, 'Escribe el nombre del evento.').max(120),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige la fecha de inicio del evento.'),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error
  const { data, error } = await guard.adminClient.from('eventos').select('id, nombre, fecha_inicio, fecha_fin').order('fecha_inicio', { ascending: false })
  if (error) return NextResponse.json({ error: 'No pudimos cargar los eventos.' }, { status: 500 })
  return NextResponse.json({ eventos: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error
  const body = await request.json().catch(() => null)
  const parsed = crearSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }
  const { data, error } = await guard.adminClient.from('eventos').insert(parsed.data).select('id, nombre, fecha_inicio, fecha_fin').single()
  if (error || !data) return NextResponse.json({ error: 'No pudimos guardar el evento.' }, { status: 500 })
  return NextResponse.json({ evento: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error
  const id = request.nextUrl.searchParams.get('id') ?? ''
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
  const { error } = await guard.adminClient.from('eventos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'No pudimos borrar el evento.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
