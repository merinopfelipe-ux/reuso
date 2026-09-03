// Corre UNA vez al arrancar el servidor (dev, `next start` local, y Vercel),
// antes de servir cualquier petición. Objetivo único: que sea IMPOSIBLE no
// notar a qué base de datos está conectado el servidor.
//
// Bug real evitado 2026-09-03: `.env.production.local` existe (correcto,
// está en .gitignore, nunca se comiteó) y apunta a PRODUCCIÓN REAL. Next.js,
// en modo producción (`next build`/`next start`, NODE_ENV=production),
// prioriza ese archivo sobre `.env.local` — que apunta a staging. Levantar
// el build de producción localmente para probar algo terminó conectado a
// producción real sin ningún aviso, y como las cuentas de prueba se crean
// en staging, el login fallaba de un modo que parecía un bug grave y no lo
// era. Este aviso hace ese cambio de base imposible de pasar por alto.
export function register() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(sin definir)'
  const esProduccionReal = url.includes('nxnjjncjpqckewwacgoj')
  const esStaging = url.includes('rjcfqcqgqxoblisuyapq')

  const etiqueta = esProduccionReal
    ? '🔴 PRODUCCIÓN REAL (datos de clientes de verdad)'
    : esStaging
      ? '🟢 staging (base de pruebas)'
      : `⚠️ desconocida (${url})`

  console.log(`\n[Calculadora de Reúso] Conectado a Supabase: ${etiqueta}`)
  console.log(`[Calculadora de Reúso] NODE_ENV=${process.env.NODE_ENV} · URL=${url}\n`)
}
