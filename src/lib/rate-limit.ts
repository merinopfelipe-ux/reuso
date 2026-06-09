import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Control de Rate Limiting persistente en la base de datos.
 * Apto para arquitecturas serverless Edge / Vercel sin pérdida de estado.
 * Usa la tabla 'rate_limits' de Postgres.
 * 
 * @param key Formato 'accion:identificador' (ej. 'firma_legal:192.168.1.1')
 * @param max Límite de peticiones permitidas en la ventana
 * @param windowMs Duración de la ventana de tiempo en milisegundos
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  if (process.env.SKIP_RATE_LIMIT === 'true') return true
  try {
    const adminSupabase = await createAdminClient()
    const cutoff = new Date(Date.now() - windowMs).toISOString()

    const parts = key.split(':')
    const action = parts.length > 1 ? parts[0] : key
    const ip = parts.length > 1 ? parts[1] : 'unknown'

    const { count, error: countError } = await adminSupabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('accion', action)
      .gt('creado_en', cutoff)

    if (countError) {
      console.error('Error counting rate limits:', countError)
      return true // Fallback: no bloquear ante fallos de conexión del limitador
    }

    if (count !== null && count >= max) {
      return false
    }

    // Insertar nuevo registro de petición
    const { error: insertError } = await adminSupabase
      .from('rate_limits')
      .insert({ ip, accion: action })

    if (insertError) {
      console.error('Error inserting rate limit hit:', insertError)
    }

    return true
  } catch (err) {
    console.error('Rate limit system exception:', err)
    return true // Fallback
  }
}
