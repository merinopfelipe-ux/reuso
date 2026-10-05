---
name: seo-rendimiento
description: Optimización SEO y de rendimiento (Lighthouse/PageSpeed 100 en móvil y escritorio) SOLO para páginas indexables (robots index + follow). Usar antes de tocar la landing (/), /faq o cualquier página pública que se marque index/follow, y antes de medir con Lighthouse. Mobile-first siempre.
metadata:
  version: 1.0
  actualizado: 2026-10-04
---

# SEO y rendimiento 100 — páginas index/follow

## Alcance: SOLO páginas index + follow
Estas reglas aplican únicamente a páginas cuya metadata declara `robots: { index: true, follow: true }`. El `layout.tsx` raíz pone `index: false` por defecto, así que una página solo entra si lo sobrescribe explícitamente.

Hoy son: **`/`** (`src/app/(public)/page.tsx`) y **`/faq`** (`src/app/(public)/faq/page.tsx`). Antes de aplicar esta skill a otra ruta, verifica con:
```
grep -rn "index: true" src/app
```
Si una página NO está marcada así (dashboard, empresa, admin, legales, verificar, pasaporte, cot, sistema-diseno), estas reglas NO aplican: ahí manda la funcionalidad, no la puntuación de Lighthouse. Las rutas privadas también deben seguir bloqueadas en `src/app/robots.ts`.

## Cómo medir (bien)
1. **Nunca medir contra `npm run dev`.** El modo desarrollo no minifica, compila al vuelo y carga scripts de depuración: da LCP de 29 s y "2 MB de JS sin usar" falsos. Un reporte de Lighthouse sobre `localhost:3000` en dev no sirve.
2. Medir **producción** (`https://calculadoradereuso.com`) o un build local (`npm run build && npx next start -p 3100`, con `.env.local` de staging, nunca `.env.production.local`) **detrás del proxy HTTP/2** (paso 4). `next start` responde en HTTP/1.1 y Lighthouse simula ahí solo 6 descargas simultáneas, así que el LCP local sale inflado (medido 2026-10-04: 3.6 s local contra 1.7 s en producción con JavaScript parecido). Producción en Vercel ya es HTTP/2.
3. Usar Chrome real, no el Chromium de Playwright (falla con `FAILED_DOCUMENT_REQUEST`):
   ```
   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx lighthouse@latest <url> --chrome-flags="--headless=new" --output=json --output-path=/tmp/lh.json
   ```
   Para escritorio agregar `--preset=desktop`. Móvil es la medición por defecto y la que manda.
4. Proxy HTTP/2 local: con el build en :3100, `node scripts/proxy-h2.mjs` abre `https://localhost:3443`. Medir ahí agregando `--ignore-certificate-errors` a `--chrome-flags`.
5. La API de PageSpeed (`PAGESPEED_API_KEY`) tiene cuota diaria: no gastarla en iteraciones, solo para la verificación final.
6. **Lighthouse local en Mac NO es confiable contra producción (2026-10-04).** El Chrome sin pantalla de Lighthouse en macOS a veces dibuja a ~1 cuadro por segundo: el primer pintado observado cae en saltos de ~1 s (0.8 / 1.47 / 2.5 s) y la nota de la MISMA página salta entre 85 y 100 de una corrida a otra. Con red real (latencia de Vercel) el problema aparece; en local sin latencia no, porque todo cabe en el primer cuadro. Ni `--disable-renderer-backgrounding` lo corrige. Si la nota de celular sale baja: mirar `observedFirstContentfulPaint` en el JSON; si está cerca de 1.5 o 2.5 s, es el medidor, no la página. La medición que manda es **PageSpeed de Google** (https://pagespeed.web.dev, desde el navegador, o el widget de `/admin/qa`), que corre en servidores de Google.
7. Lighthouse móvil varía ±2 puntos entre corridas: medir 3 veces y tomar la mediana antes de concluir.
8. Los reportes (`lighthouse-report*.json`, `temp_*.html`) nunca se comitean.

## Rendimiento 100 (móvil primero)
- **Nada de `loading.tsx` que envuelva una página index/follow estática.** Con React 19 un `loading.tsx` convierte la ruta en un límite de Suspense: el HTML trae primero el esqueleto y la página real oculta (`<div hidden>`) hasta que JavaScript la intercambia. Resultado real medido (2026-10-03): LCP 3.5 s y CLS 0.076 en la home. El culpable real era `src/app/loading.tsx` en la RAÍZ (un spinner de pantalla completa que envolvía todas las rutas, incluida la home): se quitó y se copió solo a las rutas dinámicas fuera de grupos (`ayuda/`, `cot/`, `empresa/`, `settings/`). Tampoco hay `loading.tsx` en `src/app/(public)/`; `legal/` y `status/` tienen el suyo propio. Nunca volver a crear un `loading.tsx` en la raíz de `src/app/` ni en `(public)/`. La Regla de Oro #4 (skeleton obligatorio) aplica a pantallas que consultan datos al abrirse, no a páginas estáticas generadas en el build.
- **LCP**: el elemento más grande del primer pantallazo (hoy el H1 del hero) se pinta en el HTML del servidor, sin animación de entrada (`opacity: 0`, `whileInView`, `animate-float-*`). Nada de `if (!mounted) return null` en páginas.
- **CLS = 0**:
  - Nunca mover un elemento fijo o en flujo cambiando `top`/`bottom`/`height` con JavaScript tras la carga. Para mover algo (ej. botones flotantes que se detienen antes del footer) usar `transform` directo sobre un `ref`: un cambio de transform no cuenta como desplazamiento y no re-renderiza.
  - Nada de estado de React que cambie el diseño después del primer pintado (`isMobileScreen`, `footerOverlap`, `mounted`). Si depende del tamaño de pantalla, resolverlo con clases responsivas (`md:`), no con `window.innerWidth`.
  - Imágenes siempre con dimensiones (`width`/`height` o `fill` + contenedor con tamaño).
- **Fuentes**:
  - Open Sans es propia (`public/fonts`, variable, `font-display: swap`, rango `100 900` para que el navegador no sintetice pesos).
  - Seravek: los estilos piden `seravek` (fuente del sistema en Mac/iPhone; en Android/Windows cae a Open Sans). **No hay Typekit** desde 2026-10-03: el kit entregaba `seravek-web`, un nombre que ningún estilo usaba, así que nunca se aplicó y solo sumaba dos conexiones externas, LCP tardío y CLS (medido: sin él, LCP 0.87 s y CLS 0). Si algún día se quiere Seravek en todos los dispositivos: pedir `seravek-web`, poner el kit en `font-display: optional` desde el panel de Adobe Fonts y volver a medir. Nunca descargar su CSS en el servidor ni quitarle el `@import` (contador de licencia de Adobe).
  - El H1 usa `font-bold` (700); pedir pesos que la fuente no tiene obliga al navegador a sintetizarlos.
- **JavaScript**: estilos de animación en `globals.css`, no en `<style jsx global>` dentro del componente (se recalculan en cada render). Analytics y Speed Insights solo con `process.env.VERCEL === '1'` (en local devuelven 404).
- **Cómo calcula Lighthouse móvil el LCP (la trampa real)**: en la simulación, TODO script pedido antes del LCP observado cuenta como si bloqueara el LCP (aunque sea `async`). Por eso un LCP observado de 0.1 s puede salir 3.5 s simulado. La palanca es **menos JavaScript en la carga inicial**, no adelantar el pintado. Para ver qué hay en cada archivo: `grep` de textos conocidos dentro de `.next/static/chunks/*.js`.
- **Lo que vive en un modal se carga al abrirlo**: formularios con Turnstile, selectores pesados, etc. van con `next/dynamic` (`ssr: false` + `loading` con `<SkeletonCard>`), nunca importados directo en la página index/follow.
- **Secciones bajo el pliegue**: `style={{ contentVisibility: 'auto' }}` en secciones largas que no se ven al cargar.
- **Banner de cookies**: aparece en la primera interacción o a los 12 s, nunca durante la ventana de medición del LCP.
- **Proxy** (`src/proxy.ts`): su `matcher` excluye estáticos (`_next/`, `_vercel/`, `.js`, `.css`, imágenes, fuentes). Un archivo estático que pase por el proxy termina redirigido a `/login`.

## Accesibilidad 100 (contraste) — solo tokens del sistema
- El error más común: texto sobre fondo **translúcido** (`bg-white/30`, `rgba(255,255,255,.5)`) encima de blobs de color. Lighthouse mezcla el fondo con el blob y el contraste cae. La solución es **opacar el fondo** (`#FFFFFF`/`bg-white/95` en día, `#525252` en noche), no cambiar el color del texto.
- Texto: **`#474747`** (9.7:1 sobre blanco) en día y blanco en noche. PROHIBIDOS `#111827`, `#1F2937`, `#374151`, `text-gray-*`: `#474747` es el único negro del sistema (CLAUDE.md).
- Texto secundario: `#474747/90` (día) y `text-white/90` (noche). Nunca menos de `/80` en textos menores de 12 px.
- Verde de marca en texto pequeño: `#006B66` (6.4:1). Botones con fondo de color claro (amarillo, pistacho) llevan texto `#474747`; con fondo de color medio (azul `#59A6E4`), oscurecer el fondo (`#1864A5`) para que el blanco cumpla 4.5:1.
- Solo `h1`, `h2`, `h3`, en orden, un único `h1` por página.

## Jerarquía de títulos (mobile-first)
- El H1 es el protagonista: `font-bold` (700), 30 px en celular y hasta 45 px en escritorio. No se toca.
- **En la landing NADA va en 700 o más salvo el H1** (directriz de Felipe, 2026-10-04): botones, cifras, precios, etiquetas y menú usan `font-semibold` (600) como máximo. Prohibidos `font-bold`, `font-extrabold`, `font-black` y `fontWeight` 700+ fuera del H1.
- H2 en `font-semibold` (600). H3 y H4 en `font-normal` (400). Nunca `bold`/`extrabold`/`black` fuera del H1, con escala contenida (pedida por Felipe el 2026-10-04: títulos más amables, el H1 manda):
  - H2: `text-[28px] md:text-[30px] lg:text-[32px] font-semibold leading-[30px] md:leading-[32px] lg:leading-[34px]` (28/30/32 px, interlineado 30/32/34 px, peso 600 pedido por Felipe).
  - H3: `text-lg font-normal leading-snug` (18 px, 400) por defecto. Excepciones pedidas por Felipe: títulos de tarjeta de Proceso y de ODS 12 en `text-xl font-semibold` (20 px, 600), y nombres de planes en `font-semibold`. Etiquetas de ODS 12 (El Propósito, La Herramienta, El Impacto) en `text-sm sm:text-base font-semibold`.
  - Sin `<br>` forzados en H2 largos: usar `text-balance` para que las líneas queden parejas.
  - H4: `text-base font-normal` (16 px).
- Párrafos 14 px en celular, máximo 18 px en escritorio. Un título nunca queda igual o más chico que el texto que lo rodea.
- Nombres en columnas angostas (tablas de comparación de planes): nunca `whitespace-nowrap`; usar `leading-tight text-balance break-words` para que pasen a dos líneas en vez de montarse sobre la columna vecina.

## SEO 100
- `title` con el nombre completo **"Calculadora de Reúso"** (nunca solo "Reúso") y de 60 caracteres o menos para que Google no lo corte. Usar `title: { absolute: '…' }` en la home.
- `description` de 150 a 160 caracteres, en voz activa, sin promesas absolutas (CLAUDE.md).
- `alternates.canonical`, Open Graph y Twitter con la misma idea del título. `og-image.png` presente.
- `sitemap.xml` y `robots.ts` coherentes: lo que es index/follow está en el sitemap; lo privado está en `disallow`.
- Enlaces con texto descriptivo (nunca "clic aquí") y botones de solo ícono con `aria-label`.

## Checklist antes de dar por terminada una página index/follow
1. Build de producción local o producción real, nunca dev.
2. Lighthouse móvil 3 veces: Rendimiento, Accesibilidad, Buenas prácticas y SEO en 100 (mediana).
3. Lighthouse escritorio: 100 en las cuatro.
4. Ningún color fuera de los tokens (`grep` de `#[0-9A-Fa-f]{6}` y `gray-` en el diff).
5. Revisión visual en 375 px y en noche: mobile-first siempre.
