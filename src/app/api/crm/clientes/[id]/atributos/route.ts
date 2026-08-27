import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

// Atributos personalizados key-value por cliente — permite guardar datos
// imprevistos (ej. "Horario de entrega preferido") sin alterar el esquema
// central de crm_clientes.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
  }
  const { empresa_id, adminClient } = auth

  const { data: cliente } = await adminClient.from('crm_clientes').select('id').eq('id', params.id).eq('empresa_id', empresa_id).single()
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })

  const { data, error } = await adminClient
    .from('crm_clientes_atributos')
    .select('id, clave, valor, updated_at')
    .eq('cliente_id', params.id)
    .order('clave')

  if (error) return NextResponse.json({ error: 'Error al cargar los atributos.' }, { status: 500 })
  return NextResponse.json({ data })
}

const schema = z.object({
  clave: z.string().min(1, 'La clave es obligatoria.').max(100),
  valor: z.string().max(2000).optional(),
})

// Crea o actualiza (upsert por cliente_id+clave) un atributo.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
  }
  const { empresa_id, adminClient } = auth

  const { data: cliente } = await adminClient.from('crm_clientes').select('id').eq('id', params.id).eq('empresa_id', empresa_id).single()
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('crm_clientes_atributos')
    .upsert({ cliente_id: params.id, clave: parsed.data.clave, valor: parsed.data.valor ?? null }, { onConflict: 'cliente_id,clave' })
    .select('id, clave, valor, updated_at')
    .single()

  if (error || !data) {
    console.error('[POST /api/crm/clientes/[id]/atributos]', error)
    return NextResponse.json({ error: 'Error al guardar el atributo.' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
