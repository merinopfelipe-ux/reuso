import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomInt } from 'crypto'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { checkLimiteCotizaciones } from '@/lib/plan-limits'
import type { Plan } from '@/types'

interface CotizacionItem {
  id: string
  cliente_id: string | null
  codigo_cotizacion: string
  estado: string
  total: number | null
  subtotal: number | null
  iva_activo: boolean | null
  iva_porcentaje: number | null
  co2_evitado_total_kg: number | null
  created_at: string
  updated_at: string
  fecha_enviada: string | null
  fecha_apertura_cliente: string | null
  fecha_ultima_apertura_cliente: string | null
  veces_abierta: number
  enlace_publico_token: string | null
  crm_clientes: ClienteItem | ClienteItem[] | null
  crm_muebles_cotizados: { cantidad: number | null }[] | null
  fecha_cierre?: string | null
}

interface ClienteItem {
  nombre: string
  apellido: string | null
  telefono: string
  telefono_indicativo: string | null
  email: string | null
  tipo: string | null
  ciudad: string | null
  crm_empresas_clientes: { razon_social: string; nombre_comercial: string | null } | { razon_social: string; nombre_comercial: string | null }[] | null
}

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
  const { searchParams } = new URL(request.url)
  const estado = searchParams.get('estado')
  const q = searchParams.get('q')

  let query = adminClient
    .from('crm_cotizaciones')
    .select(`
      id, cliente_id, codigo_cotizacion, estado, total, subtotal, iva_activo, iva_porcentaje,
      co2_evitado_total_kg, created_at, updated_at,
      fecha_enviada, fecha_apertura_cliente, fecha_ultima_apertura_cliente, veces_abierta,
      enlace_publico_token,
      crm_clientes ( nombre, apellido, telefono, telefono_indicativo, email, tipo, ciudad, crm_empresas_clientes ( razon_social, nombre_comercial ) ),
      crm_muebles_cotizados ( cantidad )
    `)
    .eq('empresa_id', empresa_id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) {
    console.error('[GET /api/cotizador/cotizaciones]', error)
    return NextResponse.json({ error: 'Error al cargar cotizaciones.' }, { status: 500 })
  }

  // Una cotización sin ningún ítem es un intento abandonado a medio armar
  // (el registro se crea apenas se identifica el cliente, antes de subir
  // fotos) — nunca es una cotización real, así que nunca se muestra en la
  // lista, sin importar el estado o cuánto tiempo lleve así. El cron
  // cotizador-purga-vacias-8h la borra de la base pasadas 8h.
  const cotizacionesRaw = ((data as unknown as CotizacionItem[]) ?? []).filter(
    (c) => (c.crm_muebles_cotizados?.length ?? 0) > 0
  )
  let cotizaciones = cotizacionesRaw

  // Búsqueda por código de cotización, nombre/apellido, celular o empresa
  // del cliente — SIEMPRE desde el principio (startsWith), no en cualquier
  // parte del texto (supabase ilike en columnas relacionadas es complejo,
  // se filtra en memoria sobre lo ya traído).
  if (q) {
    const lq = q.trim().toLowerCase()
    const lqDigitos = lq.replace(/\D/g, '')
    cotizaciones = cotizacionesRaw.filter((c) => {
      const cliente = Array.isArray(c.crm_clientes) ? c.crm_clientes[0] : c.crm_clientes
      const emp = Array.isArray(cliente?.crm_empresas_clientes) ? cliente?.crm_empresas_clientes[0] : cliente?.crm_empresas_clientes
      const nombre = ((cliente?.nombre as string) ?? '').toLowerCase()
      const apellido = ((cliente?.apellido as string) ?? '').toLowerCase()
      const razonSocial = (emp?.razon_social ?? '').toLowerCase()
      const nombreComercial = (emp?.nombre_comercial ?? '').toLowerCase()
      const telefonoDigitos = ((cliente?.telefono as string) ?? '').replace(/\D/g, '')
      return (
        c.codigo_cotizacion.toLowerCase().startsWith(lq) ||
        nombre.startsWith(lq) ||
        apellido.startsWith(lq) ||
        razonSocial.startsWith(lq) ||
        nombreComercial.startsWith(lq) ||
        (lqDigitos.length > 0 && telefonoDigitos.startsWith(lqDigitos))
      )
    })
  }

  // Fecha real de cierre — cuándo pasó a un estado cerrado_* por última vez
  // (crm_cotizaciones_estado_historial, migración 043). No es lo mismo que
  // `updated_at` (esa cambia con cualquier edición, no solo un cambio de
  // estado) — para "días para el cierre" hace falta el momento exacto en
  // que entró a un estado cerrado_*, tomando el más reciente si osciló.
  const idsCerrados = cotizaciones.filter((c) => c.estado.startsWith('cerrado')).map((c) => c.id)
  const fechaCierrePorId = new Map<string, string>()
  if (idsCerrados.length > 0) {
    const { data: historial } = await adminClient
      .from('crm_cotizaciones_estado_historial')
      .select('cotizacion_id, estado_nuevo, created_at')
      .in('cotizacion_id', idsCerrados)
      .like('estado_nuevo', 'cerrado%')
      .order('created_at', { ascending: false })
    for (const h of (historial ?? []) as { cotizacion_id: string; created_at: string }[]) {
      if (!fechaCierrePorId.has(h.cotizacion_id)) fechaCierrePorId.set(h.cotizacion_id, h.created_at)
    }
  }

  // Volumen físico real de la cotización — suma de "cantidad" de cada mueble
  // (no cuenta de filas: un mueble puede tener cantidad > 1). Se calcula acá
  // y se manda como un solo número, en vez de mandar el arreglo completo de
  // muebles a un endpoint que es solo un resumen de lista.
  const cotizacionesConMuebles = cotizaciones.map((c) => ({
    ...c,
    total_muebles: (c.crm_muebles_cotizados ?? []).reduce((sum, m) => sum + (m.cantidad ?? 0), 0),
    fecha_cierre: fechaCierrePorId.get(c.id) ?? null,
    crm_muebles_cotizados: undefined,
  }))

  return NextResponse.json({ cotizaciones: cotizacionesConMuebles })
}

const schema = z.object({
  cliente_id: z.uuid('Selecciona o crea un cliente antes de continuar.'),
})

// Mismo alfabeto y longitud que el token del enlace público (ver
// [id]/enviar/route.ts) — es el mismo identificador para las dos cosas: el
// código que ve el vendedor y el que termina en la URL al enviar la
// propuesta, en vez de tener dos códigos distintos para una sola cotización.
const ALFABETO_CODIGO = 'abcdefghjkmnpqrstuvwxyz23456789'

function generarCodigoCot(): string {
  let codigo = ''
  for (let i = 0; i < 8; i++) {
    codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]
  }
  return codigo
}

export async function POST(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.status === 401
          ? 'Inicia sesión para continuar.'
          : auth.status === 400
            ? 'Selecciona una empresa para continuar.'
            : 'No tienes permiso para crear cotizaciones.',
      },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, adminClient } = auth
  const ip = getIp(request)

  const raw = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }

  // El cliente debe pertenecer a esta empresa (adminClient usa service role
  // y no aplica RLS: sin este chequeo, cualquier UUID de cliente de OTRA
  // empresa se podría vincular a esta cotización).
  const { data: clienteDueño } = await adminClient
    .from('crm_clientes')
    .select('id, tipo')
    .eq('id', parsed.data.cliente_id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()
  if (!clienteDueño) {
    return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })
  }

  // Límite de cotizaciones/mes por plan (sql/118) — mismo patrón que
  // checkLimiteCalculos/checkLimiteInformes.
  const { data: empresaPlan } = await adminClient
    .from('empresas')
    .select('plan')
    .eq('id', empresa_id)
    .single()
  const errorLimite = await checkLimiteCotizaciones(empresa_id, (empresaPlan?.plan ?? 'free') as Plan)
  if (errorLimite) {
    return NextResponse.json({ error: errorLimite }, { status: 429 })
  }

  // Generar código único COT-YYYY-XXXX (máx 3 intentos)
  let codigo_cotizacion = ''
  for (let i = 0; i < 3; i++) {
    const candidato = generarCodigoCot()
    const { data: existente } = await adminClient
      .from('crm_cotizaciones')
      .select('id')
      .eq('codigo_cotizacion', candidato)
      .maybeSingle()
    if (!existente) { codigo_cotizacion = candidato; break }
  }
  if (!codigo_cotizacion) {
    return NextResponse.json({ error: 'Error al generar el código. Intenta de nuevo.' }, { status: 500 })
  }

  const { data: cotizacion, error } = await adminClient
    .from('crm_cotizaciones')
    .insert({
      empresa_id,
      asesor_id: user_id,
      codigo_cotizacion,
      estado: 'por_cotizar',
      cliente_id: parsed.data.cliente_id ?? null,
      // IVA activo por defecto para clientes empresa (B2B) — el vendedor lo
      // puede desactivar igual, esto es solo el punto de partida.
      iva_activo: clienteDueño.tipo === 'empresa',
    })
    .select('id, codigo_cotizacion, estado, created_at')
    .single()

  if (error || !cotizacion) {
    console.error('[POST /api/cotizador/cotizaciones]', error)
    return NextResponse.json({ error: 'Error al crear la cotización. Intenta de nuevo.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'cotizacion_creada',
    detalle: { cotizacion_id: cotizacion.id, codigo: codigo_cotizacion },
    ip,
  })

  return NextResponse.json(cotizacion, { status: 201 })
}
