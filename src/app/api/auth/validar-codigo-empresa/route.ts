import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({ codigo: z.string().min(1).max(20) })

async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const admin = await createAdminClient()
    const cutoff = new Date(Date.now() - 60_000).toISOString()
    const { count } = await admin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('accion', 'validar_codigo_empresa')
      .gt('creado_en', cutoff)
    if (count !== null && count >= 5) return false
    await admin.from('rate_limits').insert({ ip, accion: 'validar_codigo_empresa' })
    return true
  } catch {
    return true
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (!(await checkRateLimit(ip))) {
    return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  try {
    const admin = await createAdminClient()
    const { data } = await admin.rpc('validar_codigo_empresa', { p_codigo: parsed.data.codigo })
    if (data && data.length > 0) {
      return NextResponse.json({ ok: true, nombre: data[0].nombre })
    }
    return NextResponse.json({ ok: false })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
