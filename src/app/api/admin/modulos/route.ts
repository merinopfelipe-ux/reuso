import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { crearModuloSchema } from '@/lib/schemas/modulo.schema'

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data, error } = await guard.adminClient
    .from('modulos')
    .select(`
      id, nombre, icono_lucide, descripcion, activo, orden, created_at, updated_at,
      categorias(id, nombre),
      modulos_empresas(id)
    `)
    .order('orden', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al obtener módulos.' }, { status: 500 })
  }

  const modulos = (data ?? []).map((m) => ({
    ...m,
    total_empresas: (m.modulos_empresas as { id: string }[]).filter(Boolean).length,
    modulos_empresas: undefined,
  }))

  return NextResponse.json(modulos)
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = crearModuloSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { data, error } = await guard.adminClient
    .from('modulos')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al crear el módulo.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'crear_modulo',
    detalle: { id: data.id, nombre: data.nombre },
    ip: getIp(request),
  })

  return NextResponse.json(data, { status: 201 })
}
