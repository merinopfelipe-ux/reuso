import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ejecutado por Vercel Cron dos veces por semana (lunes y jueves, 8:00 AM Colombia → 13:00 UTC)
// Configurado en vercel.json: { "crons": [{ "path": "/api/cron/keep-alive-supabase", "schedule": "0 13 * * 1,4" }] }
// Objetivo: generar actividad real en la base de datos para que Supabase Free tier
// no pause el proyecto por inactividad (se pausa a los 7 días sin uso).

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const adminClient = await createAdminClient()

  const { error } = await adminClient
    .from('config_sistema')
    .select('id')
    .limit(1)

  if (error) {
    console.error('[cron/keep-alive-supabase]', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  console.log('[cron/keep-alive-supabase] Ping exitoso, proyecto Supabase activo.')
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}
