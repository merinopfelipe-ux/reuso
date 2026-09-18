import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { buscarFactoresMaterial, type MaterialFactorEstimado } from '@/lib/ia/factor-material-categoria'
import { buscarEnCacheBatch, guardarEnCacheBatch, normalizarNombreMaterial } from '@/lib/ia/factor-material-cache'

const bodySchema = z.object({
  materiales: z.array(z.object({
    nombre: z.string().min(1),
    factor_co2_kg_actual: z.number().nullable(),
    factor_agua_l_kg_actual: z.number().nullable(),
  })).min(1),
  categoria_nombre: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  // 1. Resolver del caché lo que ya se conoce (constante física, no varía
  //    por categoría ni empresa) en un solo viaje a Supabase — solo lo que
  //    falte dispara Perplexity.
  const resultados: MaterialFactorEstimado[] = []
  const cacheado = await buscarEnCacheBatch(guard.adminClient, parsed.data.materiales.map(m => m.nombre))
  const faltantes: typeof parsed.data.materiales = []
  for (const m of parsed.data.materiales) {
    const hit = cacheado.get(normalizarNombreMaterial(m.nombre))
    if (hit) {
      resultados.push({
        nombre: m.nombre,
        factor_co2_kg: hit.factor_co2_kg,
        factor_agua_l_kg: hit.factor_agua_l_kg,
        confianza: hit.confianza as MaterialFactorEstimado['confianza'],
        fuente_titulo: hit.fuente_titulo,
        fuente_url: hit.fuente_url,
      })
    } else {
      faltantes.push(m)
    }
  }

  // 2. Solo los que faltan van a Perplexity, y se guardan en caché en un
  //    solo upsert por lote después.
  if (faltantes.length > 0) {
    const resultado = await buscarFactoresMaterial(faltantes, parsed.data.categoria_nombre)
    if (resultado.ok) {
      resultados.push(...resultado.materiales)
      const paraGuardar = resultado.materiales
        .filter(m => m.factor_co2_kg !== null)
        .map(m => ({
          nombre: m.nombre,
          valores: {
            factor_co2_kg: m.factor_co2_kg as number,
            factor_agua_l_kg: m.factor_agua_l_kg,
            fuente_url: m.fuente_url ?? null,
            fuente_titulo: m.fuente_titulo,
            confianza: m.confianza,
          },
        }))
      await guardarEnCacheBatch(guard.adminClient, paraGuardar)
    }
  }

  if (resultados.length === 0) return NextResponse.json({ ok: false })
  return NextResponse.json({ ok: true, materiales: resultados })
}
