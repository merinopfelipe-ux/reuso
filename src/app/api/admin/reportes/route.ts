import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'

const TIPOS_VALIDOS = ['empresas_activas', 'top_co2', 'metricas_globales', 'empresas_inactivas', 'leads_periodo', 'tickets_periodo', 'co2_por_modulo'] as const
const tipoSchema = z.enum(TIPOS_VALIDOS)

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const tipoParsed = tipoSchema.safeParse(searchParams.get('tipo') ?? 'empresas_activas')
  if (!tipoParsed.success) {
    return NextResponse.json({ error: 'Tipo de reporte no válido.' }, { status: 400 })
  }
  const tipo = tipoParsed.data
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const c = guard.adminClient

  try {
    let data: unknown = null

    switch (tipo) {
      case 'empresas_activas': {
        const { data: rows } = await c.from('empresas')
          .select('id, nombre, plan, activa, created_at')
          .eq('activa', true)
          .order('created_at', { ascending: false })
        data = rows
        break
      }
      case 'top_co2': {
        const { data: rows } = await c.from('calculos')
          .select('empresa_id, total_co2, empresas!calculos_empresa_id_fkey(nombre)')
          .not('empresa_id', 'is', null)
        // Agrupar en memoria
        const map = new Map<string, { nombre: string; total: number }>()
        for (const r of (rows ?? []) as unknown as { empresa_id: string; total_co2: number; empresas: { nombre: string } | null }[]) {
          const prev = map.get(r.empresa_id) ?? { nombre: r.empresas?.nombre ?? r.empresa_id, total: 0 }
          map.set(r.empresa_id, { ...prev, total: prev.total + (r.total_co2 ?? 0) })
        }
        data = Array.from(map.entries())
          .map(([id, v]) => ({ empresa_id: id, nombre: v.nombre, total_co2: v.total }))
          .sort((a, b) => b.total_co2 - a.total_co2)
          .slice(0, 10)
        break
      }
      case 'metricas_globales': {
        const [empresas, calculos, certificados, usuarios] = await Promise.all([
          c.from('empresas').select('*', { count: 'exact', head: true }),
          c.from('calculos').select('total_co2, total_agua'),
          c.from('certificados').select('*', { count: 'exact', head: true }),
          c.from('profiles').select('*', { count: 'exact', head: true }),
        ])
        const allCalcData = calculos.data ?? []
        data = {
          total_empresas: empresas.count ?? 0,
          total_calculos: allCalcData.length,
          total_co2: allCalcData.reduce((s: number, r: { total_co2: number }) => s + (r.total_co2 ?? 0), 0),
          total_agua: allCalcData.reduce((s: number, r: { total_agua: number }) => s + (r.total_agua ?? 0), 0),
          total_certificados: certificados.count ?? 0,
          total_usuarios: usuarios.count ?? 0,
        }
        break
      }
      case 'empresas_inactivas': {
        const hace30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
        const { data: activas } = await c.from('calculos')
          .select('empresa_id')
          .gte('fecha', hace30)
          .not('empresa_id', 'is', null)
        const idsActivos = new Set((activas ?? []).map((r: { empresa_id: string }) => r.empresa_id))
        const { data: todas } = await c.from('empresas').select('id, nombre, plan, activa, created_at').eq('activa', true)
        data = (todas ?? []).filter((e: { id: string }) => !idsActivos.has(e.id))
        break
      }
      case 'leads_periodo': {
        let q = c.from('leads').select('id, nombre, email, empresa, interes, estado, created_at')
        if (desde) q = q.gte('created_at', desde)
        if (hasta) q = q.lte('created_at', hasta)
        const { data: rows } = await q.order('created_at', { ascending: false })
        const total = (rows ?? []).length
        const convertidos = (rows ?? []).filter((r: { estado: string }) => r.estado === 'convertido').length
        data = { leads: rows ?? [], total, convertidos, tasa: total > 0 ? ((convertidos / total) * 100).toFixed(1) : '0' }
        break
      }
      case 'tickets_periodo': {
        let q = c.from('tickets').select('id, titulo, tipo, prioridad, estado, created_at, updated_at')
        if (desde) q = q.gte('created_at', desde)
        if (hasta) q = q.lte('created_at', hasta)
        const { data: rows } = await q.order('created_at', { ascending: false })
        data = rows ?? []
        break
      }
      case 'co2_por_modulo': {
        const { data: cats } = await c.from('categorias')
          .select('nombre, modulos!categorias_modulo_id_fkey(nombre)')
        interface CatRow {
          nombre: string
          modulos: { nombre: string } | null
        }
        const catMap = new Map(((cats ?? []) as unknown as CatRow[]).map((cat) => [cat.nombre, cat.modulos?.nombre ?? 'Sin módulo']))

        const { data: calcData } = await c.from('calculos')
          .select('detalle_json')
        const moduloMap = new Map<string, { nombre: string; total_co2: number }>()
        for (const calc of (calcData ?? []) as { detalle_json: Record<string, unknown> | null }[]) {
          const detalles = calc.detalle_json
          if (!detalles) continue
          for (const item of Object.values(detalles)) {
            if (typeof item !== 'object' || item === null) continue
            const typedItem = item as Record<string, unknown>
            if (!('categoria' in typedItem)) continue
            const catName = typedItem.categoria as string
            const co2 = (typedItem.co2 as number) ?? 0
            if (!catName) continue

            const key = catMap.get(catName) ?? 'Sin módulo'
            const prev = moduloMap.get(key) ?? { nombre: key, total_co2: 0 }
            moduloMap.set(key, { ...prev, total_co2: prev.total_co2 + co2 })
          }
        }
        data = Array.from(moduloMap.values()).sort((a, b) => b.total_co2 - a.total_co2)
        break
      }
      default:
        return NextResponse.json({ error: 'Tipo de reporte desconocido.' }, { status: 400 })
    }

    return NextResponse.json({ tipo, data })
  } catch {
    return NextResponse.json({ error: 'Error al generar el reporte.' }, { status: 500 })
  }
}
