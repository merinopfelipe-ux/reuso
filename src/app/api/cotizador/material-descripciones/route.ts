import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { BASE_MATERIALES } from '@/lib/cotizador/plantillas-base'

// Mapa { nombre: descripcion } de los 8 materiales base — un solo texto
// compartido por toda la plataforma (sin empresa_id, ver spec). GET abierto
// a cualquier rol con acceso al Cotizador; PATCH solo empresa_admin o
// super_admin (cotizadorAuthCheck ya incluye el bypass automático de
// super_admin), y solo permite tocar uno de los 8 nombres conocidos —
// nunca crea una entrada arbitraria nueva.

export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { adminClient } = auth

  const { data, error } = await adminClient
    .from('cotizador_material_descripciones')
    .select('nombre, descripcion')

  if (error) {
    console.error('[GET /api/cotizador/material-descripciones]', error)
    return NextResponse.json({ error: 'Error al cargar las descripciones.' }, { status: 500 })
  }

  const mapa: Record<string, string> = {}
  for (const fila of (data ?? []) as { nombre: string; descripcion: string }[]) {
    mapa[fila.nombre] = fila.descripcion
  }

  return NextResponse.json({ descripciones: mapa })
}

const patchSchema = z.object({
  nombre: z.enum(BASE_MATERIALES as [string, ...string[]]),
  descripcion: z.string().max(500),
})

export async function PATCH(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { adminClient } = auth

  const raw = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('cotizador_material_descripciones')
    .upsert({ nombre: parsed.data.nombre, descripcion: parsed.data.descripcion.trim() }, { onConflict: 'nombre' })

  if (error) {
    console.error('[PATCH /api/cotizador/material-descripciones]', error)
    return NextResponse.json({ error: 'Error al guardar la descripción.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
