import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

// Config del dashboard de ventas del Cotizador: meta (crm_metas_ventas) y la
// personalización visual del embudo (empresas.embudo_config, jsonb) — ver
// sql/088_metas_ventas_y_embudo_config.sql. Ambos requieren esa migración
// corrida; si falta, Supabase devuelve un error real que aquí SÍ se revisa
// (antes se ignoraba y el frontend creía que había guardado).

export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { empresa_id, adminClient } = auth

  const [{ data: metas, error: errMetas }, { data: empresa, error: errEmpresa }, { data: empresaToggle, error: errToggle }] = await Promise.all([
    adminClient
      .from('crm_metas_ventas')
      .select('*')
      .eq('empresa_id', empresa_id)
      .order('created_at', { ascending: false })
      .limit(1),
    adminClient
      .from('empresas')
      .select('embudo_config, ciudades_agrupadas_config')
      .eq('id', empresa_id)
      .single(),
    // Consulta separada de la de arriba a propósito: ciudades_agrupar_activo
    // es de una migración más nueva (sql/100_ciudades_agrupar_activo.sql).
    // Si esa migración específica no ha corrido, esta consulta falla sola
    // sin tumbar embudo/kpis/ciudades_agrupadas, que ya funcionan hoy.
    adminClient
      .from('empresas')
      .select('ciudades_agrupar_activo')
      .eq('id', empresa_id)
      .single(),
  ])

  if (errMetas) {
    console.error('[GET /api/cotizador/dashboard-config] Error cargando metas:', errMetas)
  }
  if (errEmpresa) {
    // Si la migración de nuevas columnas aún no se ha corrido, Supabase arrojará error aquí.
    // Ignoramos el error para no "tumbar" las metas ni el embudo, usando los defaults del frontend.
    console.error('[GET /api/cotizador/dashboard-config] Error cargando empresa (posible migración pendiente):', errEmpresa)
  }
  if (errToggle) {
    console.error('[GET /api/cotizador/dashboard-config] Error cargando ciudades_agrupar_activo (posible migración 100 pendiente):', errToggle)
  }

  return NextResponse.json({
    meta: metas?.[0] ?? null,
    embudo: empresa?.embudo_config ?? null,
    ciudades_agrupadas: empresa?.ciudades_agrupadas_config ?? null,
    ciudades_agrupar_activo: empresaToggle?.ciudades_agrupar_activo ?? false,
  })
}

// Sin `id`: la etapa ya no es una fila suelta que se crea/borra, es siempre
// uno de los 6 estados reales que aplican a este dashboard (estado_key es la
// identidad estable). "por_cotizar" (borrador, ni enviado al cliente) queda
// fuera a propósito, no existe para este embudo.
const etapaSchema = z.object({
  nombre: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido.'),
  estado_key: z.enum(['enviada', 'en_negociacion', 'esperando_anticipo', 'cerrado_ganado', 'cerrado_perdido', 'cerrado_inviable']),
  visible: z.boolean(),
})

const bodySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('meta'),
    data: z.object({
      valor: z.number().nonnegative(),
      tipo: z.enum(['mensual', 'anual']),
      vigencia_anio: z.number().int().min(2020).max(2100),
    }),
  }),
  z.object({
    type: z.literal('embudo'),
    data: z.object({
      // Entre 1 y los 6 estados reales — el usuario puede quitar etapas por
      // completo del embudo, no solo ocultarlas, así que ya no exige los 6.
      etapas: z.array(etapaSchema).min(1, 'El embudo necesita al menos una etapa.').max(6)
        .refine(
          (etapas) => new Set(etapas.map(e => e.estado_key)).size === etapas.length,
          'No puede haber una etapa repetida.'
        ),
    }),
  }),
  z.object({
    type: z.literal('ciudades_agrupadas'),
    data: z.object({
      grupos: z.record(z.string(), z.array(z.string())),
      activo: z.boolean(),
    }),
  }),
])

export async function POST(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { empresa_id, adminClient } = auth

  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  if (parsed.data.type === 'meta') {
    const { valor, tipo, vigencia_anio } = parsed.data.data

    const { data: existing, error: errBuscar } = await adminClient
      .from('crm_metas_ventas')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('vigencia_anio', vigencia_anio)
      .is('vigencia_mes', null)

    if (errBuscar) {
      console.error('[POST /api/cotizador/dashboard-config] buscar meta', errBuscar)
      return NextResponse.json({ error: 'Error al guardar la meta.' }, { status: 500 })
    }

    const { error: errGuardar } = existing && existing.length > 0
      ? await adminClient.from('crm_metas_ventas').update({ valor, tipo }).eq('id', existing[0].id)
      : await adminClient.from('crm_metas_ventas').insert({ empresa_id, valor, tipo, vigencia_anio, vigencia_mes: null })

    if (errGuardar) {
      console.error('[POST /api/cotizador/dashboard-config] guardar meta', errGuardar)
      return NextResponse.json({ error: 'Error al guardar la meta.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  if (parsed.data.type === 'ciudades_agrupadas') {
    const { error: errCiudades } = await adminClient
      .from('empresas')
      .update({
        ciudades_agrupadas_config: parsed.data.data.grupos,
        ciudades_agrupar_activo: parsed.data.data.activo,
      })
      .eq('id', empresa_id)
    if (errCiudades) {
      console.error('[POST /api/cotizador/dashboard-config] guardar ciudades_agrupadas', errCiudades)
      return NextResponse.json({ error: 'Error al guardar la agrupación de ciudades.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  const { error: errEmbudo } = await adminClient
    .from('empresas')
    .update({ embudo_config: parsed.data.data.etapas })
    .eq('id', empresa_id)

  if (errEmbudo) {
    console.error('[POST /api/cotizador/dashboard-config] guardar embudo', errEmbudo)
    return NextResponse.json({ error: 'Error al guardar las etapas del embudo.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
