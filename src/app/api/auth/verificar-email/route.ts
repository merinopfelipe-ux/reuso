import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({ email: z.string().email() })

export async function POST(request: NextRequest) {
  // Sin límite, este endpoint permitiría enumerar qué correos están
  // registrados probando una lista masiva (ej. de una filtración externa).
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await rateLimit(`verificar-email:${ip}`, 10, 60_000)
  if (!allowed) {
    return NextResponse.json({ existe: false })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ existe: false })
  }

  try {
    const admin = await createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('email', parsed.data.email.toLowerCase())
      .maybeSingle()
    const existe = !!data
    return NextResponse.json({ existe })
  } catch {
    // Fail open - no bloqueamos el registro por error de verificación
    return NextResponse.json({ existe: false })
  }
}
