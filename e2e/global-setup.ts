// Seguro de la base de datos: las pruebas crean y borran datos reales, así que
// nunca pueden correr contra la base de producción. El 2026-10-07 se
// encontraron 36 alertas de prueba en la base real porque los secretos del CI
// apuntaban ahí: sin este seguro, el error pasa desapercibido.
//
// Para permitir otra base (por ejemplo una nueva de pruebas), se agrega su
// identificador a BASES_PERMITIDAS o se pasa PERMITIR_BASE con ese valor.
const BASE_PRODUCCION = 'nxnjjncjpqckewwacgoj'

export default function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const base = url.replace(/^https?:\/\//, '').split('.')[0]

  if (!base) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL: las pruebas no saben contra qué base correrían.')
  }
  if (base === BASE_PRODUCCION && process.env.PERMITIR_BASE !== BASE_PRODUCCION) {
    throw new Error(
      `Las pruebas apuntan a la base de PRODUCCIÓN (${base}) y se detuvieron antes de tocar datos reales.\n` +
      'Corrige NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para que usen la base de pruebas ' +
      '(en GitHub: Settings → Secrets and variables → Actions).'
    )
  }
  console.log(`[e2e] base de datos: ${base}`)
}
