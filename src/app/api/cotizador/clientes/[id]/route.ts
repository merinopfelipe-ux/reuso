import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

const CLIENTE_SELECT = `
  id, tipo, nombre, apellido, identificacion, telefono, telefono_indicativo,
  email, pais, ciudad, direccion, direccion_notas, notas, empresa_cliente_id, created_at,
  es_contacto_real, duplicado_de_id,
  crm_empresas_clientes ( id, nit, razon_social, nombre_comercial, direccion )
`

// Detalle de un contacto del CRM + sus cotizaciones (historial) + sus
// Pasaportes DPP (si algún ítem suyo ya tiene uno), para la página
// /empresa/clientes/[id]. El DPP es siempre opcional — un cliente puede
// no tener ninguno.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
  }
  const { empresa_id, adminClient } = auth

  const { data: cliente, error } = await adminClient
    .from('crm_clientes')
    .select(CLIENTE_SELECT)
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .single()

  if (error || !cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })
  }

  const [{ data: cotizaciones }, { data: dppActivos }] = await Promise.all([
    adminClient
      .from('crm_cotizaciones')
      .select('id, codigo_cotizacion, estado, total, created_at')
      .eq('cliente_id', params.id)
      .order('created_at', { ascending: false }),
    adminClient
      .from('dpp_activos')
      .select('id, codigo_dpp, nombre, estado, created_at')
      .eq('cliente_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({ cliente, cotizaciones: cotizaciones ?? [], dpp_activos: dppActivos ?? [] })
}

const schema = z.object({
  nombre: z.union([z.string().min(1).max(200), z.literal('')]).optional(),
  apellido: z.string().max(200).nullable().optional(),
  identificacion: z.string().max(50).nullable().optional(),
  telefono: z.string().max(30).nullable().optional(),
  telefono_indicativo: z.string().max(10).nullable().optional(),
  email: z.string().email('Correo inválido.').nullable().optional().or(z.literal('')),
  pais: z.string().max(100).nullable().optional(),
  ciudad: z.string().max(200).nullable().optional(),
  direccion: z.string().max(300).nullable().optional(),
  direccion_notas: z.string().max(300).nullable().optional(),
  // Solo aplica si el contacto está vinculado a una crm_empresas_clientes (B2B)
  razon_social: z.string().max(200).optional(),
  nombre_comercial: z.string().max(200).nullable().optional(),
  empresa_direccion: z.string().max(300).nullable().optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'Envía al menos un campo para actualizar.' })

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
  }
  const { empresa_id, adminClient } = auth

  const { data: actual } = await adminClient
    .from('crm_clientes')
    .select('id, empresa_cliente_id')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()
  if (!actual) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }
  // El nombre vacío solo tiene sentido en un contacto B2B (vuelve a ser el
  // ancla autocompletada de la empresa). Un contacto B2C no tiene ancla a
  // la cual volver, así que un nombre vacío se rechaza igual que antes.
  if (parsed.data.nombre === '' && !actual.empresa_cliente_id) {
    return NextResponse.json({ error: 'El nombre no puede quedar vacío.' }, { status: 400 })
  }
  const { razon_social, nombre_comercial, empresa_direccion, ...contactoFields } = parsed.data

  if (Object.keys(contactoFields).length > 0) {
    const limpio: Record<string, unknown> = { ...contactoFields, email: contactoFields.email || null }
    // Si mandan nombre vacío en un contacto de empresa, vuelve a ser el
    // ancla autocompletada; si mandan un nombre real, se vuelve contacto
    // real. En B2C (sin empresa_cliente_id) el nombre vacío ya se rechazó
    // arriba, así que siempre es contacto real.
    if ('nombre' in contactoFields) {
      if (!actual.empresa_cliente_id) {
        limpio.es_contacto_real = true
      } else if (!contactoFields.nombre) {
        // Si el mismo PATCH ya trae el nombre_comercial/razon_social nuevo,
        // usarlo directamente en vez de re-consultar la base (evita anclar
        // con el nombre VIEJO cuando ambos cambian en la misma petición).
        let nombreComercialAncla = nombre_comercial
        let razonSocialAncla = razon_social
        if (nombre_comercial === undefined && razon_social === undefined) {
          const { data: empActual, error: empError } = await adminClient
            .from('crm_empresas_clientes')
            .select('razon_social, nombre_comercial')
            .eq('id', actual.empresa_cliente_id)
            .single()
          if (empError) {
            console.error('[PATCH /api/cotizador/clientes/[id]] crm_empresas_clientes', empError)
          }
          nombreComercialAncla = empActual?.nombre_comercial ?? undefined
          razonSocialAncla = empActual?.razon_social
        }
        limpio.nombre = nombreComercialAncla || razonSocialAncla || 'Empresa'
        limpio.es_contacto_real = false
      } else {
        limpio.es_contacto_real = true
      }
    }
    const { error } = await adminClient.from('crm_clientes').update(limpio).eq('id', params.id)
    if (error) {
      console.error('[PATCH /api/cotizador/clientes/[id]]', error)
      return NextResponse.json({ error: 'Error al actualizar el cliente.' }, { status: 500 })
    }
  }

  if ((razon_social || nombre_comercial !== undefined || empresa_direccion !== undefined) && actual.empresa_cliente_id) {
    const empresaFields: Record<string, unknown> = {}
    if (razon_social) empresaFields.razon_social = razon_social
    if (nombre_comercial !== undefined) empresaFields.nombre_comercial = nombre_comercial
    if (empresa_direccion !== undefined) empresaFields.direccion = empresa_direccion
    const { error } = await adminClient.from('crm_empresas_clientes').update(empresaFields).eq('id', actual.empresa_cliente_id)
    if (error) {
      console.error('[PATCH /api/cotizador/clientes/[id]] empresa cliente', error)
      return NextResponse.json({ error: 'Error al actualizar la empresa cliente.' }, { status: 500 })
    }
  }

  const { data: cliente, error: fetchError } = await adminClient
    .from('crm_clientes')
    .select(CLIENTE_SELECT)
    .eq('id', params.id)
    .single()
  if (fetchError || !cliente) {
    return NextResponse.json({ error: 'Error al recargar el cliente.' }, { status: 500 })
  }

  return NextResponse.json({ cliente })
}
