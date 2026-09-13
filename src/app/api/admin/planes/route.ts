import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ver nota en src/app/api/planes/route.ts — evita que Next.js cachee las
// llamadas fetch() internas de Supabase y devuelva datos viejos.
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function guardSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()
  if (perfil?.rol !== 'super_admin') return null
  return user
}

// GET: los 4 planes completos (publicado + borrador), para el panel de edición.
export async function GET() {
  const user = await guardSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from('config_planes')
    .select('*')
    .order('precio_cop', { ascending: true })

  if (error) return NextResponse.json({ error: 'No se pudo cargar la configuración de planes' }, { status: 500 })
  return NextResponse.json({ planes: data })
}

// PATCH: guarda el borrador de un plan (no lo publica todavía).
const patchSchema = z.object({
  id: z.enum(['free', 'lab', 'impulso', 'ilimitado']),
  borrador_precio_cop: z.number().nonnegative(),
  borrador_precio_usd: z.number().nonnegative(),
  borrador_precio_eur: z.number().nonnegative(),
  // Precio anual (sql/117) — antes era un descuento fijo calculado en el
  // código (mensual x 10, "2 meses gratis"), ahora es su propio valor
  // editable, con ese mismo cálculo como sugerencia por defecto en la UI.
  borrador_precio_anual_cop: z.number().nonnegative(),
  borrador_precio_anual_usd: z.number().nonnegative(),
  borrador_precio_anual_eur: z.number().nonnegative(),
  borrador_limite_empleados: z.number().int().positive().nullable(),
  borrador_limite_calculos_mes: z.number().int().nonnegative().nullable(),
  borrador_limite_informes_mes: z.number().int().nonnegative().nullable(),
  // Límite de cotizaciones/mes (sql/118) — mismo patrón que calculos/informes.
  borrador_limite_cotizaciones_mes: z.number().int().nonnegative().nullable(),
  // Modelo de planes 2026-09 (sql/126): asistente de IA sí/no y límite de DPP
  // (0 = no incluye, null = ilimitado). La tarifa de implementación NO va aquí
  // ni en la landing: es interna, se cotiza por cliente según lo que migra.
  borrador_incluye_ia: z.boolean(),
  // Indicador de Circularidad de Materiales e Informes Excel/CSV (sql/131)
  borrador_incluye_mci: z.boolean().optional(),
  borrador_incluye_excel_csv: z.boolean().optional(),
  borrador_limite_dpp_mes: z.number().int().nonnegative().nullable(),
  // Beneficios (bullets) de la tarjeta de plan en la landing, editables.
  borrador_features_json: z.array(z.string().trim().min(1).max(140)).max(15),
  // Equivalente mensual del plan anual, editable a mano (null = automático).
  borrador_equivalente_mensual_anual_cop: z.number().nonnegative().nullable(),
  borrador_equivalente_mensual_anual_usd: z.number().nonnegative().nullable(),
  borrador_equivalente_mensual_anual_eur: z.number().nonnegative().nullable(),
})

export async function PATCH(request: NextRequest) {
  const user = await guardSuperAdmin()
  if (!user) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { id, ...borrador } = parsed.data
  const { error } = await adminClient
    .from('config_planes')
    .update({ ...borrador, tiene_borrador_sin_publicar: true, actualizado_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[API /admin/planes PATCH] Error en primer intento de guardado de borrador:', error)
    // Manejo de columnas de migraciones que pueden no haber corrido todavía (sql/128 o sql/131).
    // Si falla por eso, no debe tumbar el guardado del resto del borrador — reintenta sin esos campos.
    if (error.message?.includes('equivalente_mensual_anual') || error.message?.includes('incluye_mci') || error.message?.includes('incluye_excel_csv')) {
      const camposAEliminar = new Set([
        'borrador_equivalente_mensual_anual_cop',
        'borrador_equivalente_mensual_anual_usd',
        'borrador_equivalente_mensual_anual_eur',
        'equivalente_mensual_anual_cop',
        'equivalente_mensual_anual_usd',
        'equivalente_mensual_anual_eur',
        'borrador_incluye_mci',
        'incluye_mci',
        'borrador_incluye_excel_csv',
        'incluye_excel_csv',
      ])
      const borradorSinNuevos = Object.fromEntries(
        Object.entries(borrador).filter(([clave]) => !camposAEliminar.has(clave))
      )
      const { error: errorReintento } = await adminClient
        .from('config_planes')
        .update({ ...borradorSinNuevos, tiene_borrador_sin_publicar: true, actualizado_at: new Date().toISOString() })
        .eq('id', id)
      if (errorReintento) {
        console.error('[API /admin/planes PATCH] Error en reintento:', errorReintento)
        return NextResponse.json({ error: errorReintento.message || 'No se pudo guardar el borrador' }, { status: 500 })
      }
      return NextResponse.json({ ok: true, aviso: 'Falta correr migraciones pendientes en Supabase (sql/128 o sql/131) — el resto se guardó bien.' })
    }
    return NextResponse.json({ error: error.message || 'No se pudo guardar el borrador' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
