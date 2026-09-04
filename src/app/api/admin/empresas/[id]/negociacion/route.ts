import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

// Ver nota en src/app/api/planes/route.ts — evita que Next.js cachee las
// llamadas fetch() internas de Supabase y devuelva datos viejos.
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function guardSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase.from('profiles').select('rol').eq('user_id', user.id).single()
  if (perfil?.rol !== 'super_admin') return null
  return user
}

// GET: la negociación propia de esta empresa, si existe (null si no tiene,
// lo que significa que usa el plan global normal).
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await guardSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const adminClient = await createAdminClient()
  const { data } = await adminClient
    .from('empresas_negociaciones')
    .select('*')
    .eq('empresa_id', params.id)
    .maybeSingle()

  return NextResponse.json({ negociacion: data })
}

// PUT: crea o reemplaza por completo la negociación de esta empresa. Un
// límite en null = ilimitado, igual que en config_planes.
const putSchema = z.object({
  precio_cop: z.number().nonnegative(),
  precio_usd: z.number().nonnegative(),
  precio_eur: z.number().nonnegative(),
  limite_empleados: z.number().int().positive().nullable(),
  limite_calculos_mes: z.number().int().nonnegative().nullable(),
  limite_informes_mes: z.number().int().nonnegative().nullable(),
  // Límite de cotizaciones/mes (sql/118) — mismo patrón que calculos/informes.
  limite_cotizaciones_mes: z.number().int().nonnegative().nullable(),
  notas: z.string().max(500).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await guardSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { data: empresa } = await adminClient.from('empresas').select('id, nombre').eq('id', params.id).single()
  if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

  const { error } = await adminClient
    .from('empresas_negociaciones')
    .upsert({
      empresa_id: params.id,
      ...parsed.data,
      notas: parsed.data.notas ?? null,
      creado_por: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'empresa_id' })

  if (error) return NextResponse.json({ error: 'No se pudo guardar la negociación' }, { status: 500 })

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'negociacion_empresa_guardada',
    detalle: { empresa_id: params.id, empresa_nombre: empresa.nombre, valores: parsed.data },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}

// DELETE: quita la negociación propia, la empresa vuelve a usar el plan global.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await guardSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const adminClient = await createAdminClient()
  const { error } = await adminClient.from('empresas_negociaciones').delete().eq('empresa_id', params.id)
  if (error) return NextResponse.json({ error: 'No se pudo quitar la negociación' }, { status: 500 })

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'negociacion_empresa_eliminada',
    detalle: { empresa_id: params.id },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
