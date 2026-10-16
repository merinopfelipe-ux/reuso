// Limpieza de HTML en el SERVIDOR. Úsala siempre en vez de importar
// `isomorphic-dompurify` arriba de una ruta API.
//
// Por qué carga diferida: `isomorphic-dompurify` arrastra `jsdom`, y en el runtime
// de Vercel `jsdom` falla al cargarse (ERR_REQUIRE_ESM por `@exodus/bytes`).
// Con un `import` estático, ese fallo ocurre al cargar el módulo de la ruta y
// tumba TODAS sus peticiones (incluso un GET sin sesión devolvía 500). Con la
// carga diferida, el fallo solo puede ocurrir en el momento de limpiar, y las
// demás peticiones de la ruta siguen funcionando.
//
// `package.json` fija `jsdom` en 26.1.0 con `overrides`. jsdom 30 arrastra
// `@exodus/bytes` (solo ESM) y en Vercel falla con ERR_REQUIRE_ESM. No subas jsdom
// sin pasar antes `npm run smoke:api` contra una vista previa: la ruta
// `/api/salud/sanitizador` prueba este módulo en el runtime real.
//
// Lo vigila `src/lib/rutas-sin-jsdom.test.ts` y el humo post-despliegue
// `npm run smoke:api`.
import type DOMPurifyTipo from 'isomorphic-dompurify'

type ConfigSanitizar = NonNullable<Parameters<typeof DOMPurifyTipo.sanitize>[1]>

export async function sanitizarHtml(html: string, config?: ConfigSanitizar): Promise<string> {
  const { default: DOMPurify } = await import('isomorphic-dompurify')
  return String(config ? DOMPurify.sanitize(html, config) : DOMPurify.sanitize(html))
}
