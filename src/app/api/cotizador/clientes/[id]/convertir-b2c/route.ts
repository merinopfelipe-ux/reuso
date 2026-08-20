import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { validarTelefono } from '@/lib/telefono'

const CLIENTE_SELECT = `
  id, tipo, nombre, apellido, identificacion, telefono, telefono_indicativo,
  email, pais, ciudad, direccion, direccion_notas, notas, empresa_cliente_id, created_at,
  es_contacto_real, duplicado_de_id,
  crm_empresas_clientes ( id, nit, razon_social, nombre_comercial, direccion )
`

const schema = z.object({
  telefono: z.string().min(5).max(20).optional(),
  telefono_indicativo: z.string().min(1).max(6).default('+57'),
})

// Crea un cliente B2C nuevo e independiente a partir de un contacto B2B,
// vinculado por duplicado_de_id — nunca automático, siempre lo dispara el
// vendedor desde la búsqueda (identificacion-cliente.tsx). No modifica ni
// borra el contacto original.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : auth.status === 400 ? 'Selecciona una empresa para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  const { data: original, error: fetchError } = await adminClient
    .from('crm_clientes')
    .select('id, empresa_cliente_id, nombre, apellido, telefono, telefono_indicativo, email, pais, ciudad, direccion, direccion_notas')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()

  if (fetchError) {
    console.error('[POST /api/cotizador/clientes/[id]/convertir-b2c]', fetchError)
    return NextResponse.json({ error: 'Error al verificar el contacto.' }, { status: 500 })
  }
  if (!original) return NextResponse.json({ error: 'Contacto no encontrado.' }, { status: 404 })
  if (!original.empresa_cliente_id) {
    return NextResponse.json({ error: 'Este cliente ya es B2C, no hace falta convertirlo.' }, { status: 400 })
  }

  // Idempotencia: el índice único de teléfono excluye filas con duplicado_de_id
  // no nulo (ver sql/101_empresa_cliente_contactos_opcionales.sql), así que sin
  // esta comprobación una doble llamada (doble clic, reintento de red) crearía
  // dos filas B2C distintas para el mismo original. Si ya existe una conversión
  // previa, la devolvemos tal cual en vez de crear otra.
  const { data: existente, error: existenteError } = await adminClient
    .from('crm_clientes')
    .select(CLIENTE_SELECT)
    .eq('empresa_id', empresa_id)
    .eq('duplicado_de_id', original.id)
    .maybeSingle()

  if (existenteError) {
    console.error('[POST /api/cotizador/clientes/[id]/convertir-b2c]', existenteError)
    return NextResponse.json({ error: 'Error al verificar el contacto.' }, { status: 500 })
  }
  if (existente) {
    return NextResponse.json({ cliente: existente }, { status: 200 })
  }

  const raw = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const telefono = original.telefono || parsed.data.telefono
  const telefono_indicativo = original.telefono ? (original.telefono_indicativo ?? '+57') : parsed.data.telefono_indicativo
  if (!telefono) {
    return NextResponse.json({ error: 'Este contacto no tiene celular — ingresa uno para crear el cliente B2C.' }, { status: 400 })
  }
  const errorTelefono = validarTelefono(telefono, telefono_indicativo)
  if (errorTelefono) return NextResponse.json({ error: errorTelefono }, { status: 400 })

  const { data: nuevo, error } = await adminClient
    .from('crm_clientes')
    .insert({
      empresa_id,
      tipo: 'persona',
      empresa_cliente_id: null,
      es_contacto_real: true,
      duplicado_de_id: original.id,
      nombre: original.nombre,
      apellido: original.apellido,
      telefono,
      telefono_indicativo,
      email: original.email,
      pais: original.pais,
      ciudad: original.ciudad,
      direccion: original.direccion,
      direccion_notas: original.direccion_notas,
    })
    .select(CLIENTE_SELECT)
    .single()

  if (error || !nuevo) {
    console.error('[POST /api/cotizador/clientes/[id]/convertir-b2c]', error)
    if (error?.code === '23505') {
      // Dos peticiones simultáneas pueden pasar ambas la comprobación "¿ya existe?"
      // de arriba antes de que cualquiera de los dos INSERT llegue a la base de
      // datos (condición de carrera real, no solo doble clic secuencial). El índice
      // único idx_crm_clientes_duplicado_de_id_unico (ver
      // sql/102_duplicado_de_id_unico.sql) hace que la segunda de las dos choque
      // con 23505 — pero también puede chocar por el índice de teléfono
      // (idx_crm_clientes_telefono). No distinguimos por el mensaje del error
      // porque Postgres/Supabase no garantiza un formato estable para eso: en vez
      // de eso, volvemos a buscar por duplicado_de_id. Si aparece una fila, es que
      // la otra petición ganó la carrera y devolvemos esa fila con 200 (mismo
      // resultado idempotente que el caso secuencial). Si no aparece, el choque
      // fue realmente por el teléfono duplicado y mantenemos el 409 de siempre.
      const { data: ganadora } = await adminClient
        .from('crm_clientes')
        .select(CLIENTE_SELECT)
        .eq('empresa_id', empresa_id)
        .eq('duplicado_de_id', original.id)
        .maybeSingle()
      if (ganadora) {
        return NextResponse.json({ cliente: ganadora }, { status: 200 })
      }
      return NextResponse.json({ error: 'Ya existe un cliente con ese celular.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear el cliente B2C.' }, { status: 500 })
  }

  return NextResponse.json({ cliente: nuevo }, { status: 201 })
}
