import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

// Mapa { nombre: descripcion } de los conceptos del Cotizador (materiales,
// servicios e insumos) — un solo texto compartido por toda la plataforma
// (sin empresa_id, ver spec 2026-08-25-tooltips-materiales-design.md).
//
// El nombre NO está restringido a las listas base: el super_admin puede
// crear materiales/servicios/insumos adicionales con nombre libre desde
// /admin/categorias, y cualquiera de ellos puede llevar su texto de ayuda.
// Una descripción vacía equivale a "sin tooltip" — el front no pinta nada.
//
// GET abierto a cualquier rol con acceso al Cotizador; PATCH solo
// empresa_admin o super_admin (cotizadorAuthCheck ya incluye el bypass
// automático de super_admin).

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
    .from('cotizador_descripciones')
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
  nombre: z.string().trim().min(1, 'Falta el nombre del concepto.').max(150),
  descripcion: z.string().max(500),
  // Si el super_admin renombró el concepto en el mismo guardado, su texto
  // de ayuda se muda al nombre nuevo en vez de quedar huérfano bajo el
  // nombre viejo (los nombres son editables, ver /admin/categorias).
  nombre_anterior: z.string().trim().max(150).optional(),
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

  const { nombre, nombre_anterior } = parsed.data
  const descripcion = parsed.data.descripcion.trim()

  // Una descripción vacía no deja una fila fantasma: se borra la entrada,
  // que es exactamente lo que significa "este concepto no tiene tooltip".
  if (!descripcion) {
    await adminClient.from('cotizador_descripciones').delete().eq('nombre', nombre)
    if (nombre_anterior && nombre_anterior !== nombre) {
      await adminClient.from('cotizador_descripciones').delete().eq('nombre', nombre_anterior)
    }
    return NextResponse.json({ ok: true })
  }

  const { error } = await adminClient
    .from('cotizador_descripciones')
    .upsert({ nombre, descripcion }, { onConflict: 'nombre' })

  if (error) {
    console.error('[PATCH /api/cotizador/material-descripciones]', error)
    return NextResponse.json({ error: 'Error al guardar la descripción.' }, { status: 500 })
  }

  if (nombre_anterior && nombre_anterior !== nombre) {
    await adminClient.from('cotizador_descripciones').delete().eq('nombre', nombre_anterior)
  }

  return NextResponse.json({ ok: true })
}
