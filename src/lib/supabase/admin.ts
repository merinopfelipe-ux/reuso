import { createClient, SupabaseClient } from '@supabase/supabase-js'
import '@/lib/env'

/**
 * Cliente Supabase con service_role key.
 * Bypasea RLS - usar ÚNICAMENTE en API routes de servidor.
 * NUNCA importar en Client Components ni exponer al navegador.
 */
let adminClient: SupabaseClient | null = null

export async function createAdminClient() {
  if (!adminClient) {
    adminClient = createClient(
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
  return adminClient
}
