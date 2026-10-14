import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron diariamente. Borra los registros de límite de uso
// con más de un día. La ventana más larga que usa el código es de una hora, así
// que lo más viejo ya no cuenta para ningún límite.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const admin = await createAdminClient()
  const corte = new Date(Date.now() - 86_400_000).toISOString()

  const [{ error: errGeneral }, { error: errSensibles }] = await Promise.all([
    admin.from('rate_limits').delete().lt('creado_en', corte),
    admin.from('rate_limits_sensibles').delete().lt('creado_en', corte),
  ])

  if (errGeneral || errSensibles) {
    console.error('[cron/rate-limits-purga]', errGeneral?.message ?? errSensibles?.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}
