import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { rateLimit } from '@/lib/rate-limit'
import { planIncluyeIA } from '@/lib/plan-limits'
import { buscarPesoInsumo } from '@/lib/ia/peso-insumo'
import { buscarEnCache, guardarEnCache } from '@/lib/ia/peso-insumo-cache'
import type { Plan } from '@/types'

const bodySchema = z.object({
  nombre: z.string().min(1),
  unidad: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'No autenticado.' : auth.status === 400 ? 'Selecciona una empresa para continuar.' : 'Sin permiso para usar el Cotizador.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }
  const { nombre, unidad } = parsed.data

  // El caché no cuesta tokens — se consulta ANTES del gate de plan, para que
  // un dato ya conocido (de cualquier empresa) esté disponible siempre.
  const cacheado = await buscarEnCache(adminClient, nombre, unidad)
  if (cacheado) {
    return NextResponse.json({ ok: true, peso_kg: cacheado.peso_kg, fuente_url: cacheado.fuente_url, confianza: cacheado.confianza, origen: 'cache' })
  }

  const { data: empIA } = await adminClient.from('empresas').select('plan').eq('id', empresa_id).single()
  if (!(await planIncluyeIA(empresa_id, (empIA?.plan ?? 'free') as Plan))) {
    return NextResponse.json(
      { error: 'La sugerencia de peso con IA está disponible desde el plan Impulso Sostenible.' },
      { status: 403 }
    )
  }

  const allowed = await rateLimit(`peso_insumo:${empresa_id}`, 20, 60 * 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas búsquedas de peso. Espera unos minutos.' }, { status: 429 })
  }

  const resultado = await buscarPesoInsumo(nombre, unidad)
  if (!resultado.ok) {
    return NextResponse.json({ ok: false })
  }

  await guardarEnCache(adminClient, nombre, unidad, resultado.peso_kg_estimado, resultado.fuente_url, resultado.confianza)

  return NextResponse.json({
    ok: true,
    peso_kg: resultado.peso_kg_estimado,
    fuente_url: resultado.fuente_url,
    fuente_titulo: resultado.fuente_titulo,
    confianza: resultado.confianza,
    origen: 'ia',
  })
}
