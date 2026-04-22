import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { z } from 'zod'

const patchSchema = z.object({
  clave: z.string().min(1).max(80),
  valor_json: z.record(z.string(), z.unknown()),
})

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const clave = searchParams.get('clave')

  let q = guard.adminClient.from('contenido_landing').select('clave, valor_json, updated_at')
  if (clave) q = q.eq('clave', clave)

  const { data, error } = await q.order('clave')
  if (error) return NextResponse.json({ error: 'Error al leer contenido.' }, { status: 500 })

  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { clave, valor_json } = parsed.data

  const { data, error } = await guard.adminClient
    .from('contenido_landing')
    .upsert({ clave, valor_json, updated_at: new Date().toISOString(), updated_by: guard.user.id }, { onConflict: 'clave' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Error al guardar contenido.' }, { status: 500 })
  return NextResponse.json({ data })
}
