import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { z } from 'zod'

const revocarSchema = z.object({
  id: z.string().uuid(),
  motivo_revocacion: z.string().min(10, 'El motivo debe tener al menos 10 caracteres.').max(500),
})

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const codigo = searchParams.get('codigo')
  const empresa_id = searchParams.get('empresa_id')
  const tipo = searchParams.get('tipo')
  const revocado = searchParams.get('revocado')
  const page = parseInt(searchParams.get('page') ?? '0', 10)

  let q = guard.adminClient
    .from('certificados')
    .select(`
      id, codigo_verificacion, tipo, beneficiario, co2_total,
      created_at, revocado, motivo_revocacion, revocado_en, pdf_url,
      empresa_id,
      empresas!certificados_empresa_id_fkey(nombre)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * 30, page * 30 + 29)

  if (codigo) q = q.ilike('codigo_verificacion', `%${codigo}%`)
  if (empresa_id) q = q.eq('empresa_id', empresa_id)
  if (tipo) q = q.eq('tipo', tipo)
  if (revocado !== null) q = q.eq('revocado', revocado === 'true')

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: 'Error al leer certificados.' }, { status: 500 })

  return NextResponse.json({ data, total: count ?? 0 })
}

export async function PATCH(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }) }

  const parsed = revocarSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { id, motivo_revocacion } = parsed.data

  const { data, error } = await guard.adminClient
    .from('certificados')
    .update({
      revocado: true,
      motivo_revocacion,
      revocado_por: guard.user.id,
      revocado_en: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, codigo_verificacion')
    .single()

  if (error) return NextResponse.json({ error: 'Error al revocar certificado.' }, { status: 500 })

  await logAuditoria(guard.adminClient, {
    accion: 'REVOCAR_CERTIFICADO',
    user_id: guard.user.id,
    ip: getIp(request),
    detalle: { id, motivo_revocacion },
  })

  return NextResponse.json({ data })
}
