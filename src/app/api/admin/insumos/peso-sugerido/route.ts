import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { buscarPesoInsumo } from '@/lib/ia/peso-insumo'
import { buscarEnCache, guardarEnCache } from '@/lib/ia/peso-insumo-cache'

const bodySchema = z.object({
  nombre: z.string().min(1),
  unidad: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { nombre, unidad } = parsed.data

  const cacheado = await buscarEnCache(guard.adminClient, nombre, unidad)
  if (cacheado) {
    return NextResponse.json({ ok: true, peso_kg: cacheado.peso_kg, fuente_url: cacheado.fuente_url, confianza: cacheado.confianza, origen: 'cache' })
  }

  const resultado = await buscarPesoInsumo(nombre, unidad)
  if (!resultado.ok) {
    return NextResponse.json({ ok: false })
  }

  await guardarEnCache(guard.adminClient, nombre, unidad, resultado.peso_kg_estimado, resultado.fuente_url, resultado.confianza)

  return NextResponse.json({
    ok: true,
    peso_kg: resultado.peso_kg_estimado,
    fuente_url: resultado.fuente_url,
    fuente_titulo: resultado.fuente_titulo,
    confianza: resultado.confianza,
    origen: 'ia',
  })
}
