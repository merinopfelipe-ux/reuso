import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { buscarFactoresMaterial, type MaterialFactorEstimado } from '@/lib/ia/factor-material-categoria'
import { buscarEnCache, guardarEnCache } from '@/lib/ia/factor-material-cache'

const bodySchema = z.object({
  materiales: z.array(z.object({
    nombre: z.string().min(1),
    factor_co2_kg_actual: z.number().nullable(),
    factor_agua_l_kg_actual: z.number().nullable(),
  })).min(1),
})

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  // 1. Resolver del caché lo que ya se conoce (constante física, no varía
  //    por categoría ni empresa) — solo lo que falte dispara Perplexity.
  const resultados: MaterialFactorEstimado[] = []
  const faltantes: typeof parsed.data.materiales = []
  for (const m of parsed.data.materiales) {
    const cacheado = await buscarEnCache(guard.adminClient, m.nombre)
    if (cacheado) {
      resultados.push({
        nombre: m.nombre,
        factor_co2_kg: cacheado.factor_co2_kg,
        factor_agua_l_kg: cacheado.factor_agua_l_kg,
        confianza: cacheado.confianza as MaterialFactorEstimado['confianza'],
        fuente_titulo: cacheado.fuente_titulo,
        fuente_url: cacheado.fuente_url,
      })
    } else {
      faltantes.push(m)
    }
  }

  // 2. Solo los que faltan van a Perplexity, y se guardan en caché después.
  if (faltantes.length > 0) {
    const resultado = await buscarFactoresMaterial(faltantes)
    if (resultado.ok) {
      for (const m of resultado.materiales) {
        resultados.push(m)
        if (m.factor_co2_kg !== null) {
          await guardarEnCache(guard.adminClient, m.nombre, {
            factor_co2_kg: m.factor_co2_kg,
            factor_agua_l_kg: m.factor_agua_l_kg,
            fuente_url: m.fuente_url ?? null,
            fuente_titulo: m.fuente_titulo,
            confianza: m.confianza,
          })
        }
      }
    }
  }

  if (resultados.length === 0) return NextResponse.json({ ok: false })
  return NextResponse.json({ ok: true, materiales: resultados })
}
