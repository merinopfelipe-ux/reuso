import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dppAuthCheck } from '@/lib/dpp/auth-check'

const updateSchema = z.object({
  estado: z.enum(['investigando', 'identificado', 'monitoreando', 'resuelto']).optional(),
  severidad: z.enum(['menor', 'mayor', 'critico']).optional(),
  titulo: z.string().min(1).max(100).optional(),
  descripcion: z.string().max(1000).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['super_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No autorizado.' },
      { status: auth.status }
    )
  }
  const { adminClient } = auth
  const { id } = params

  try {
    const body = await request.json().catch(() => null)
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
        { status: 400 }
      )
    }

    const updates: Record<string, string | null | undefined> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }

    if (parsed.data.estado) {
      if (parsed.data.estado === 'resuelto') {
        updates.resolved_at = new Date().toISOString()
      } else {
        updates.resolved_at = null
      }
    }

    const { data: incidente, error } = await adminClient
      .from('dpp_incidencias')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ data: incidente })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al actualizar la incidencia.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['super_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No autorizado.' },
      { status: auth.status }
    )
  }
  const { adminClient } = auth
  const { id } = params

  try {
    const { error } = await adminClient
      .from('dpp_incidencias')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al eliminar la incidencia.' },
      { status: 500 }
    )
  }
}
