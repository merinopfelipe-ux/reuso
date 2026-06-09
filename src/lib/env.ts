/**
 * Validación de variables de entorno críticas en el servidor.
 * Falla rápido en arranque si faltan variables requeridas,
 * en lugar de producir errores crípticos en tiempo de ejecución.
 */

const REQUIRED_SERVER = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const OPTIONAL_FEATURES: Record<string, string> = {
  GEMINI_KEY: 'Diagnóstico IA de muebles (cotizador)',
  GROQ_KEY: 'IA fallback (Groq)',
  OR_KEY: 'IA fallback (OpenRouter)',
  RESEND_API_KEY: 'Envío de emails (invitaciones, tickets)',
  CRON_SECRET: 'Cron jobs (cotizaciones frías)',
}

if (typeof window === 'undefined') {
  for (const key of REQUIRED_SERVER) {
    if (!process.env[key]) {
      throw new Error(`[env] Variable de entorno requerida no configurada: ${key}`)
    }
  }

  const missing = Object.keys(OPTIONAL_FEATURES).filter(k => !process.env[k])
  if (missing.length > 0) {
    for (const key of missing) {
      console.warn(`[env] Función desactivada (falta ${key}): ${OPTIONAL_FEATURES[key]}`)
    }
  }
}
