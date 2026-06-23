import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { calcularImpacto, PARAM_EQUIV } from '@/lib/calculos/co2'
import { createHash } from 'crypto'
import { getIp } from '@/lib/admin-guard'
import { checkLimiteCalculos } from '@/lib/plan-limits'
import type { Plan } from '@/types'

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.uuid(),
        peso_kg: z.number().positive('El peso debe ser mayor a 0.').max(100000, 'Peso máximo 100.000 kg.'),
      })
    )
    .min(1, 'Debes agregar al menos un objeto.'),
  descripcion_html: z.string().max(50000).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }

  const { items: itemsInput, descripcion_html } = parsed.data
  const adminClient = await createAdminClient()
  const ip = getIp(request)

  // Cargar perfil para obtener empresa_id
  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('user_id', user.id)
    .single()

  const empresa_id = perfil?.empresa_id ?? null

  // Verificar límites de plan si pertenece a empresa
  if (empresa_id) {
    const { data: empresaData } = await adminClient
      .from('empresas')
      .select('plan')
      .eq('id', empresa_id)
      .single()
    const errorLimite = await checkLimiteCalculos(empresa_id, (empresaData?.plan ?? 'free') as Plan)
    if (errorLimite) {
      return NextResponse.json({ error: errorLimite }, { status: 429 })
    }
  }

  // Cargar los items de la BD para obtener factores actuales
  const itemIds = itemsInput.map((i) => i.id)
  const { data: itemsDB, error: itemsError } = await adminClient
    .from('items')
    .select('id, nombre, co2_por_unidad, peso_kg, nivel_confianza, origen_fuente, categoria_id')
    .in('id', itemIds)
    .eq('activo', true)

  if (itemsError || !itemsDB || itemsDB.length !== itemsInput.length) {
    return NextResponse.json({ error: 'Algunos de los objetos seleccionados no están disponibles o no se encontraron.' }, { status: 400 })
  }

  // Cargar nombres de categorías
  const categoriaIds = Array.from(new Set(itemsDB.map((i) => i.categoria_id)))
  const { data: categoriasDB } = await adminClient
    .from('categorias')
    .select('id, nombre')
    .in('id', categoriaIds)

  const categoriaMap = new Map<string, string>(
    (categoriasDB ?? []).map((c) => [c.id, c.nombre])
  )

  // Construir ItemCalculo para la función pura
  const itemsParaCalculo = itemsInput.map((inp) => {
    const db = itemsDB.find((d) => d.id === inp.id)!
    return {
      id: inp.id,
      nombre: db.nombre,
      categoria: categoriaMap.get(db.categoria_id) ?? 'Sin categoría',
      peso_kg_input: inp.peso_kg,
      co2_por_unidad: db.co2_por_unidad,
      peso_kg_unidad: db.peso_kg,
    }
  })

  const resultado = calcularImpacto(itemsParaCalculo)

  // Construir detalle_json (compatible con /api/certificados/generar)
  const detalle_json: Record<string, { categoria: string; nombre: string; peso_kg: number; co2: number }> & { _descripcion_html?: string } = {}
  for (const item of itemsParaCalculo) {
    detalle_json[item.id] = {
      categoria: item.categoria,
      nombre: item.nombre,
      peso_kg: item.peso_kg_input,
      co2: resultado.co2_por_item[item.id] ?? 0,
    }
  }
  if (descripcion_html) {
    detalle_json._descripcion_html = descripcion_html
  }

  // Construir factor_snapshot_json (inmutabilidad histórica)
  const factor_snapshot_json = {
    items: Object.fromEntries(
      itemsDB.map((db) => [
        db.id,
        {
          nombre: db.nombre,
          co2_por_unidad: db.co2_por_unidad,
          peso_kg_unidad: db.peso_kg,
          co2_por_kg: db.peso_kg > 0 ? parseFloat((db.co2_por_unidad / db.peso_kg).toFixed(6)) : 0,
          nivel_confianza: db.nivel_confianza,
          origen_fuente: db.origen_fuente ?? null,
        },
      ])
    ),
    param_equiv: PARAM_EQUIV,
    version_factores: new Date().toISOString().slice(0, 10),
    metodologia: 'ACV simplificado, factores europeos ecoinvent/ELCD con entrada en kg',
  }

  // ── CADENA DE BLOQUES (HASH CHAIN) ───────────────────────────
  let hash_previo: string | null = null
  if (empresa_id) {
    const { data: lastCalculo } = await adminClient
      .from('calculos')
      .select('hash_interno')
      .eq('empresa_id', empresa_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    hash_previo = lastCalculo?.hash_interno ?? 'GENESIS_BLOCK'
  }

  const payloadToHash = JSON.stringify({
    user_id: user.id,
    empresa_id,
    total_co2: resultado.co2_total,
    total_agua: resultado.agua_total,
    items: itemsParaCalculo,
    hash_previo,
    timestamp: new Date().toISOString()
  })
  const hash_interno = createHash('sha256').update(payloadToHash).digest('hex')

  // Insertar - primero con hash chain, luego sin él si la columna no existe en la BD
  let calculo: { id: string } | null = null
  let insertError: { message?: string } | null = null

  const baseInsert = {
    user_id: user.id,
    empresa_id,
    total_co2: resultado.co2_total,
    total_agua: resultado.agua_total,
    detalle_json,
    factor_snapshot_json,
  }

  const resConHash = await adminClient
    .from('calculos')
    .insert({ ...baseInsert, hash_previo, hash_interno })
    .select('id')
    .single()

  if (resConHash.error?.message?.includes('hash_interno') || resConHash.error?.message?.includes('hash_previo')) {
    // Migración 005 no aplicada - insertar sin hash chain
    const resSinHash = await adminClient
      .from('calculos')
      .insert(baseInsert)
      .select('id')
      .single()
    calculo = resSinHash.data
    insertError = resSinHash.error
  } else {
    calculo = resConHash.data
    insertError = resConHash.error
  }

  if (insertError || !calculo) {
    return NextResponse.json(
      { error: 'Error al guardar el cálculo. Intenta de nuevo.' },
      { status: 500 }
    )
  }

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'calculo_registrado',
    detalle: { calculo_id: calculo.id, co2_total: resultado.co2_total, items_count: itemsInput.length },
    ip,
  })

  return NextResponse.json({
    id: calculo.id,
    co2_total: resultado.co2_total,
    agua_total: resultado.agua_total,
    equivalencias: resultado.equivalencias,
  })
}
