import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { validarTelefono } from '@/lib/telefono'

const CLIENTE_SELECT = `
  id, tipo, nombre, apellido, identificacion, telefono, telefono_indicativo,
  email, pais, ciudad, direccion, direccion_notas, notas, empresa_cliente_id, created_at,
  es_contacto_real, duplicado_de_id,
  crm_empresas_clientes ( id, nit, razon_social, nombre_comercial, direccion, sector )
`

// Lista/busca los contactos del CRM de esta empresa — base de /empresa/clientes.
// Búsqueda local en texto (nombre, teléfono, NIT/razón social), mismo patrón
// que GET /api/cotizador/cotizaciones.
export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.status === 401
          ? 'Inicia sesión para continuar.'
          : auth.status === 400
            ? 'Selecciona una empresa para continuar.'
            : 'Sin permiso.',
      },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth
  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase()
  const tipoFiltro = request.nextUrl.searchParams.get('tipo')
  const empresaClienteId = request.nextUrl.searchParams.get('empresa_cliente_id')

  let query = adminClient
    .from('crm_clientes')
    .select(CLIENTE_SELECT)
    .eq('empresa_id', empresa_id)
  if (empresaClienteId) query = query.eq('empresa_cliente_id', empresaClienteId)
  const { data, error } = await query.order('created_at', { ascending: false }).limit(300)

  if (error) {
    console.error('[GET /api/cotizador/clientes]', error)
    return NextResponse.json({ error: 'Error al cargar los clientes.' }, { status: 500 })
  }

  interface ClienteRow {
    tipo: 'persona' | 'empresa'
    nombre: string
    apellido: string | null
    telefono: string | null
    crm_empresas_clientes: { nit: string; razon_social: string } | { nit: string; razon_social: string }[] | null
  }

  let clientes = (data ?? []) as unknown as ClienteRow[]
  if (tipoFiltro === 'persona' || tipoFiltro === 'empresa') {
    clientes = clientes.filter(c => c.tipo === tipoFiltro)
  }
  if (q) {
    clientes = clientes.filter((c) => {
      const emp = Array.isArray(c.crm_empresas_clientes) ? c.crm_empresas_clientes[0] : c.crm_empresas_clientes
      return (
        c.nombre.toLowerCase().includes(q) ||
        (c.apellido ?? '').toLowerCase().includes(q) ||
        (c.telefono ?? '').includes(q) ||
        (emp?.nit ?? '').toLowerCase().includes(q) ||
        (emp?.razon_social ?? '').toLowerCase().includes(q)
      )
    })
  }

  return NextResponse.json({ clientes })
}

const schema = z.object({
  tipo: z.enum(['persona', 'empresa']),
  telefono: z.string().max(20).optional(),
  telefono_indicativo: z.string().min(1).max(6).default('+57'),
  nombre: z.string().max(200).optional(),
  apellido: z.string().max(200).optional(),
  identificacion: z.string().max(50).optional(),
  email: z.string().email('Correo inválido.').optional().or(z.literal('')),
  pais: z.string().max(100).optional(),
  ciudad: z.string().max(200).optional(),
  direccion: z.string().max(300).optional(),
  direccion_notas: z.string().max(300).optional(),
  // Solo cuando tipo === 'empresa'
  nit: z.string().max(50).optional(),
  razon_social: z.string().max(200).optional(),
  nombre_comercial: z.string().max(200).optional(),
  sector: z.string().max(200).optional(),
}).refine(
  (d) => d.tipo !== 'empresa' || (!!d.nit && !!d.razon_social),
  { message: 'NIT y razón social son obligatorios para un cliente empresa.' }
).refine(
  (d) => d.tipo !== 'persona' || (!!d.telefono && d.telefono.length >= 5 && !!d.nombre),
  { message: 'Nombre y celular son obligatorios para un cliente persona.' }
)

export async function POST(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.status === 401
          ? 'Inicia sesión para continuar.'
          : auth.status === 400
            ? 'Selecciona una empresa para continuar.'
            : 'No tienes permiso para crear clientes.',
      },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }
  const d = parsed.data

  if (d.telefono) {
    const errorTelefono = validarTelefono(d.telefono, d.telefono_indicativo)
    if (errorTelefono) {
      return NextResponse.json({ error: errorTelefono }, { status: 400 })
    }
  }

  let empresa_cliente_id: string | null = null

  if (d.tipo === 'empresa') {
    // Buscar si ya existe una empresa cliente con ese NIT en esta empresa usuaria:
    // si existe, este contacto solo se vincula a ella (no se duplica la empresa cliente).
    const { data: existente } = await adminClient
      .from('crm_empresas_clientes')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('nit', d.nit!)
      .maybeSingle()

    if (existente) {
      empresa_cliente_id = existente.id
    } else {
      const { data: nuevaEmpresa, error: errEmpresa } = await adminClient
        .from('crm_empresas_clientes')
        .insert({
          empresa_id,
          nit: d.nit!,
          razon_social: d.razon_social!,
          nombre_comercial: d.nombre_comercial || null,
          direccion: d.direccion || null,
          sector: d.sector || null,
        })
        .select('id')
        .single()

      if (errEmpresa || !nuevaEmpresa) {
        console.error('[POST /api/cotizador/clientes] crear empresa cliente', errEmpresa)
        return NextResponse.json({ error: 'Error al crear la empresa cliente.' }, { status: 500 })
      }
      empresa_cliente_id = nuevaEmpresa.id
    }
  }

  // Ancla de empresa sin contacto real: nombre se autocompleta con el
  // nombre comercial/razón social para que la columna NOT NULL nunca quede
  // vacía, sin obligar al vendedor a inventar un nombre de persona.
  const esContactoReal = d.tipo === 'persona' || !!d.nombre?.trim()
  const nombreFinal = d.nombre?.trim() || (d.tipo === 'empresa' ? (d.nombre_comercial?.trim() || d.razon_social!.trim()) : d.nombre!)

  const { data: cliente, error } = await adminClient
    .from('crm_clientes')
    .insert({
      empresa_id,
      tipo: d.tipo,
      empresa_cliente_id,
      es_contacto_real: esContactoReal,
      nombre: nombreFinal,
      apellido: d.apellido || null,
      identificacion: d.identificacion || null,
      telefono: d.telefono || null,
      telefono_indicativo: d.telefono_indicativo,
      email: d.email || null,
      pais: d.pais || null,
      ciudad: d.ciudad || null,
      direccion: d.direccion || null,
      direccion_notas: d.direccion_notas || null,
    })
    .select(CLIENTE_SELECT)
    .single()

  if (error || !cliente) {
    console.error('[POST /api/cotizador/clientes]', error)
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un cliente con ese celular.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear el cliente. Intenta de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ cliente }, { status: 201 })
}
