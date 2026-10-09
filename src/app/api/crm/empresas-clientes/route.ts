import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

const schema = z.object({
  nit: z.string().min(1).max(50),
  razon_social: z.string().min(1).max(200),
  nombre_comercial: z.string().max(200).optional(),
  sector: z.string().max(200).optional(),
  // Si se pasa, el contacto persona existente queda vinculado a la nueva empresa.
  cliente_id_vincular: z.string().uuid().optional(),
})

// Crea una empresa cliente (crm_empresas_clientes) y opcionalmente vincula
// un contacto persona existente a ella — caso de uso: "Convertir persona en empresa".
export async function POST(request: NextRequest) {
  try {
    const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
        { status: auth.status === 400 ? 401 : auth.status }
      )
    }
    const { empresa_id, adminClient } = auth

    const raw = await request.json().catch(() => null)
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
    }
    const { nit, razon_social, nombre_comercial, sector, cliente_id_vincular } = parsed.data

    // Verificar NIT único dentro de la empresa usuaria
    const { data: existente } = await adminClient
      .from('crm_empresas_clientes')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('nit', nit)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ error: 'Ya existe una empresa con ese NIT.' }, { status: 409 })
    }

    // Crear la empresa cliente
    const { data: nueva, error: errEmpresa } = await adminClient
      .from('crm_empresas_clientes')
      .insert({ empresa_id, nit, razon_social, nombre_comercial: nombre_comercial || null, sector: sector || null })
      .select('id')
      .single()

    if (errEmpresa || !nueva) {
      console.error('[POST /api/crm/empresas-clientes]', errEmpresa)
      return NextResponse.json({ error: 'Error al crear la empresa.' }, { status: 500 })
    }

    // Vincular contacto persona si se indicó
    if (cliente_id_vincular) {
      const { data: contacto } = await adminClient
        .from('crm_clientes')
        .select('id, tipo')
        .eq('id', cliente_id_vincular)
        .eq('empresa_id', empresa_id)
        .eq('tipo', 'persona')
        .maybeSingle()

      if (contacto) {
        await adminClient
          .from('crm_clientes')
          .update({ empresa_cliente_id: nueva.id })
          .eq('id', cliente_id_vincular)
      }
    }

    return NextResponse.json({ empresa_cliente_id: nueva.id }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/crm/empresas-clientes]', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
