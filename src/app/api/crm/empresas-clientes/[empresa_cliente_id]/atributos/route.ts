import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

export async function GET(request: NextRequest, props: { params: Promise<{ empresa_cliente_id: string }> }) {
  try {
    const params = await props.params;
    const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
    if (!auth.ok) {
      return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
    }
    const { empresa_id, adminClient } = auth

    const { data: empresa } = await adminClient
      .from('crm_empresas_clientes')
      .select('id')
      .eq('id', params.empresa_cliente_id)
      .eq('empresa_id', empresa_id)
      .maybeSingle()
    if (!empresa) return NextResponse.json({ error: 'Empresa cliente no encontrada.' }, { status: 404 })

    const { data, error } = await adminClient
      .from('crm_empresas_atributos')
      .select('id, clave, valor, updated_at')
      .eq('empresa_cliente_id', params.empresa_cliente_id)
      .order('clave')

    if (error) return NextResponse.json({ error: 'Error al cargar los atributos.' }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[GET /api/crm/empresas-clientes/[empresa_cliente_id]/atributos]', err)
    return NextResponse.json({ error: 'Error al cargar los atributos.' }, { status: 500 })
  }
}

const schema = z.object({
  clave: z.string().min(1, 'La clave es obligatoria.').max(100),
  valor: z.string().max(500).optional(),
})

export async function POST(request: NextRequest, props: { params: Promise<{ empresa_cliente_id: string }> }) {
  const params = await props.params;
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
  }
  const { empresa_id, adminClient } = auth

  const { data: empresa } = await adminClient
    .from('crm_empresas_clientes')
    .select('id')
    .eq('id', params.empresa_cliente_id)
    .eq('empresa_id', empresa_id)
    .single()
  if (!empresa) return NextResponse.json({ error: 'Empresa cliente no encontrada.' }, { status: 404 })

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('crm_empresas_atributos')
    .upsert(
      { empresa_cliente_id: params.empresa_cliente_id, empresa_id, clave: parsed.data.clave, valor: parsed.data.valor ?? null },
      { onConflict: 'empresa_cliente_id,clave' }
    )
    .select('id, clave, valor, updated_at')
    .single()

  if (error || !data) {
    console.error('[POST /api/crm/empresas-clientes/[empresa_cliente_id]/atributos]', error)
    return NextResponse.json({ error: 'Error al guardar el atributo.' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
