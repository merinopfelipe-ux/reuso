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

    // Vincular contacto al crear la empresa
    if (cliente_id_vincular) {
      const { data: contacto } = await adminClient
        .from('crm_clientes')
        .select('id')
        .eq('id', cliente_id_vincular)
        .eq('empresa_id', empresa_id)
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

// Elimina una empresa cliente y todos sus contactos (con sus cotizaciones).
// Query param: ?id=<uuid de crm_empresas_clientes>
export async function DELETE(request: NextRequest) {
  try {
    const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
        { status: auth.status === 400 ? 401 : auth.status }
      )
    }
    const { empresa_id, adminClient } = auth
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta el id de la empresa.' }, { status: 400 })

    // Verificar que pertenece a esta empresa usuaria
    const { data: existe } = await adminClient
      .from('crm_empresas_clientes')
      .select('id')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .maybeSingle()
    if (!existe) return NextResponse.json({ error: 'Empresa no encontrada.' }, { status: 404 })

    // Obtener todos los contactos vinculados
    const { data: contactos } = await adminClient
      .from('crm_clientes')
      .select('id')
      .eq('empresa_cliente_id', id)
      .eq('empresa_id', empresa_id)
    const contactoIds = (contactos ?? []).map(c => c.id)

    // Borrar cotizaciones de todos los contactos primero (sin ON DELETE CASCADE)
    if (contactoIds.length > 0) {
      const { error: errCot } = await adminClient
        .from('crm_cotizaciones')
        .delete()
        .in('cliente_id', contactoIds)
      if (errCot) {
        console.error('[DELETE /api/crm/empresas-clientes] cotizaciones', errCot)
        return NextResponse.json({ error: 'Error al eliminar cotizaciones.' }, { status: 500 })
      }
      const { error: errContactos } = await adminClient
        .from('crm_clientes')
        .delete()
        .in('id', contactoIds)
      if (errContactos) {
        console.error('[DELETE /api/crm/empresas-clientes] contactos', errContactos)
        return NextResponse.json({ error: 'Error al eliminar contactos.' }, { status: 500 })
      }
    }

    const { error } = await adminClient.from('crm_empresas_clientes').delete().eq('id', id)
    if (error) {
      console.error('[DELETE /api/crm/empresas-clientes]', error)
      return NextResponse.json({ error: 'Error al eliminar la empresa.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/crm/empresas-clientes]', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
