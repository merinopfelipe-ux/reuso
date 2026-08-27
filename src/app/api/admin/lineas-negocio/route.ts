import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { crearLineaNegocioSchema } from '@/lib/schemas/linea-negocio.schema'

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data, error } = await guard.adminClient
    .from('lineas_negocio')
    .select(`
      id, clave, nombre, icono_lucide, descripcion, activa, orden, created_at, updated_at,
      lineas_negocio_empresas(id)
    `)
    .order('orden', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al obtener líneas de negocio.' }, { status: 500 })
  }

  const lineas = (data ?? []).map((m) => ({
    ...m,
    total_empresas: (m.lineas_negocio_empresas as { id: string }[]).filter(Boolean).length,
    lineas_negocio_empresas: undefined,
  }))

  return NextResponse.json(lineas)
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = crearLineaNegocioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { data, error } = await guard.adminClient
    .from('lineas_negocio')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    // Si la clave ya existe, el error code de postgres es 23505
    if (error.code === '23505') {
      return NextResponse.json({ error: 'La clave ya está en uso.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear la línea de negocio.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'crear_linea_negocio',
    detalle: { id: data.id, nombre: data.nombre },
    ip: getIp(request),
  })

  return NextResponse.json(data, { status: 201 })
}
