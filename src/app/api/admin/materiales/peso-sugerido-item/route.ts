import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { buscarPesosMaterialesItem } from '@/lib/ia/peso-materiales-item'

const bodySchema = z.object({
  nombre_item: z.string().min(1),
  categoria_nombre: z.string().min(1),
  materiales: z.array(z.string().min(1)).min(1),
})

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const resultado = await buscarPesosMaterialesItem(
    parsed.data.nombre_item,
    parsed.data.categoria_nombre,
    parsed.data.materiales
  )
  if (!resultado.ok) {
    return NextResponse.json({ ok: false })
  }

  return NextResponse.json({ ok: true, materiales: resultado.materiales })
}
