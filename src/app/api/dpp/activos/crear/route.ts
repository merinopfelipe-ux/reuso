import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash, randomBytes } from 'crypto'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { checkLimiteDpp } from '@/lib/plan-limits'
import { calcularHuellaManufactura } from '@/lib/calculos/lca'
import type { Plan } from '@/types'

const schema = z.object({
  nombre: z.string().min(1, 'Completa el nombre del activo.').max(200),
  descripcion: z.string().max(2000).optional(),
  categoria_id: z.uuid('Selecciona una categoría válida.').optional(),
  peso_total_kg: z.number().positive('El peso debe ser mayor a 0.').max(100000).optional(),
  composicion_json: z.array(z.object({
    material: z.string(),
    peso_kg: z.number().positive(),
    factor_co2_kg: z.number().min(0),
    factor_agua_l_kg: z.number().min(0).optional(),
    origen_fuente: z.string().optional(),
    nivel_confianza: z.enum(['alta', 'media', 'baja']).optional(),
  })).optional(),
  // El item nunca es de la empresa que cotiza, es del cliente dueño del
  // mueble — vínculo siempre opcional (el DPP puede crearse de cero, sin
  // cliente todavía, o al ganar una cotización ya con cliente conocido).
  cliente_id: z.uuid('Cliente inválido.').optional(),
  imagen_url: z.string().max(500).optional(),
  empresa_id: z.uuid('ID de empresa inválido.').optional(),
})

function generarCodigoDpp(empresaId: string): string {
  const año = new Date().getFullYear()
  const prefijo = empresaId.replace(/-/g, '').slice(0, 4).toUpperCase()
  const sufijo = randomBytes(3).toString('hex').toUpperCase()
  return `DPP-${año}-${prefijo}-${sufijo}`
}

export async function POST(request: NextRequest) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso para crear activos.' },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, rol, adminClient } = auth
  const ip = getIp(request)

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisa los datos e intenta de nuevo.' },
      { status: 400 }
    )
  }
  const { nombre, descripcion, categoria_id, peso_total_kg, composicion_json, cliente_id, imagen_url, empresa_id: bodyEmpresaId } = parsed.data

  let targetEmpresaId = empresa_id
  if (rol === 'super_admin') {
    if (!bodyEmpresaId) {
      return NextResponse.json({ error: 'Especifica la empresa para registrar el activo.' }, { status: 400 })
    }
    // Verificar que la empresa existe antes de continuar
    const { data: empExiste } = await adminClient.from('empresas').select('id').eq('id', bodyEmpresaId).single()
    if (!empExiste) {
      return NextResponse.json({ error: 'Empresa no encontrada.' }, { status: 404 })
    }
    targetEmpresaId = bodyEmpresaId
  }

  // Límite de DPP del plan (Explora no incluye DPP; el resto lo tiene
  // ilimitado salvo que el super_admin ponga un tope en /admin/planes).
  const { data: empPlan } = await adminClient
    .from('empresas')
    .select('plan')
    .eq('id', targetEmpresaId)
    .single()
  const errorLimiteDpp = await checkLimiteDpp(targetEmpresaId, (empPlan?.plan ?? 'free') as Plan)
  if (errorLimiteDpp) {
    // 429: tope de plan, mismo código que el resto de límites.
    return NextResponse.json({ error: errorLimiteDpp }, { status: 429 })
  }

  // El cliente, si llega, debe pertenecer a la misma empresa (nunca confiar
  // en un ID del body sin verificar contra la empresa real del usuario).
  if (cliente_id) {
    const { data: clienteExiste } = await adminClient
      .from('crm_clientes')
      .select('id')
      .eq('id', cliente_id)
      .eq('empresa_id', targetEmpresaId)
      .maybeSingle()
    if (!clienteExiste) {
      return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })
    }
  }

  // Generar código único (máx 3 intentos)
  let codigo_dpp = ''
  for (let i = 0; i < 3; i++) {
    const candidato = generarCodigoDpp(targetEmpresaId)
    const { data: existente } = await adminClient
      .from('dpp_activos')
      .select('id')
      .eq('codigo_dpp', candidato)
      .single()
    if (!existente) { codigo_dpp = candidato; break }
  }
  if (!codigo_dpp) {
    return NextResponse.json({ error: 'Error interno al generar el código. Intenta de nuevo.' }, { status: 500 })
  }

  // Hash chain: buscar DPP anterior de la empresa
  const { data: ultimo } = await adminClient
    .from('dpp_activos')
    .select('hash_integridad')
    .eq('empresa_id', targetEmpresaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  const hash_previo = (ultimo as { hash_integridad?: string } | null)?.hash_integridad ?? 'GENESIS_DPP'

  const now = new Date().toISOString()
  const payloadHash = JSON.stringify({ codigo_dpp, empresa_id: targetEmpresaId, nombre, composicion_json: composicion_json ?? null, hash_previo, timestamp: now })
  const hash_integridad = createHash('sha256').update(payloadHash).digest('hex')

  const profileResult = await adminClient.from('profiles').select('id').eq('user_id', user_id).single()

  const co2_manufactura_kg = calcularHuellaManufactura(composicion_json ?? [])

  const nuevoActivo = {
    empresa_id: targetEmpresaId,
    user_id: profileResult.data?.id,
    codigo_dpp,
    nombre,
    descripcion: descripcion ?? null,
    categoria_id: categoria_id ?? null,
    peso_total_kg: peso_total_kg ?? null,
    composicion_json: composicion_json ?? null,
    co2_manufactura_kg,
    cliente_id: cliente_id ?? null,
    imagen_url: imagen_url ?? null,
    hash_integridad,
    hash_previo,
  }

  let { data: activo, error: insertError } = await adminClient
    .from('dpp_activos')
    .insert(nuevoActivo)
    .select()
    .single()

  // sql/130 (columna co2_manufactura_kg) puede no estar corrida todavía —
  // si no existe, Supabase rechaza el INSERT completo, no solo esa
  // columna. Reintentar sin ella para no tumbar la creación del activo por
  // una migración pendiente (mismo patrón ya usado en /api/admin/planes).
  if (insertError) {
    console.error('[POST /api/dpp/activos/crear] Error en insert inicial:', insertError)
    const { co2_manufactura_kg: _omitido, ...sinManufactura } = nuevoActivo
    void _omitido
    const reintento = await adminClient
      .from('dpp_activos')
      .insert(sinManufactura)
      .select()
      .single()
    activo = reintento.data
    insertError = reintento.error
  }

  if (insertError || !activo) {
    return NextResponse.json({ error: 'Error al guardar el activo. Intenta de nuevo.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'dpp_activo_creado',
    detalle: { codigo_dpp, nombre, empresa_id: targetEmpresaId },
    ip,
  })

  return NextResponse.json({ data: activo }, { status: 201 })
}
