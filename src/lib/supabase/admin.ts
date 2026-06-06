import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service_role key.
 * Bypasea RLS — usar ÚNICAMENTE en API routes de servidor.
 * NUNCA importar en Client Components ni exponer al navegador.
 */
export async function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
