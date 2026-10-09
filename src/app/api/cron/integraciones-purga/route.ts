import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron diariamente. Borra registros de eventos de la
// integración de mensajería: los pendientes sin decisión a los 30 días y los
// ya resueltos a los 100 días.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const admin = await createAdminClient()
  const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

  const { error: errPendientes } = await admin
    .from('integraciones_eventos')
    .delete()
    .eq('estado', 'pendiente')
    .lt('created_at', dias(30))

  const { error: errDecididos } = await admin
    .from('integraciones_eventos')
    .delete()
    .eq('estado', 'decidido')
    .lt('created_at', dias(100))

  if (errPendientes || errDecididos) {
    console.error('[cron/integraciones-purga]', errPendientes?.message ?? errDecididos?.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}
