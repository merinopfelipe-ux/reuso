---
name: seo-rendimiento
description: Optimización SEO y de rendimiento (Lighthouse/PageSpeed 100 en móvil y escritorio) SOLO para páginas indexables (robots index + follow). Usar antes de tocar la landing (/), /faq o cualquier página pública que se marque index/follow, y antes de medir con Lighthouse. Mobile-first siempre.
metadata:
  version: 1.0
  actualizado: 2026-10-02
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
2. Medir **producción** (`https://calculadoradereuso.com`) o un build local (`npm run build && npx next start -p 3100`, con `.env.local` de staging, nunca `.env.production.local`).
3. Usar Chrome real, no el Chromium de Playwright (falla con `FAILED_DOCUMENT_REQUEST`):
   ```
   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx lighthouse@latest <url> --chrome-flags="--headless=new" --output=json --output-path=/tmp/lh.json
   ```
   Para escritorio agregar `--preset=desktop`. Móvil es la medición por defecto y la que manda.
4. La API de PageSpeed (`PAGESPEED_API_KEY`) tiene cuota diaria: no gastarla en iteraciones, solo para la verificación final.
5. Lighthouse móvil varía ±2 puntos entre corridas: medir 3 veces y tomar la mediana antes de concluir.
6. Los reportes (`lighthouse-report*.json`, `temp_*.html`) nunca se comitean.

## Rendimiento 100 (móvil primero)
- **LCP**: el elemento más grande del primer pantallazo (hoy el H1 del hero) se pinta en el HTML del servidor, sin animación de entrada (`opacity: 0`, `whileInView`, `animate-float-*`). Nada de `if (!mounted) return null` en páginas.
- **CLS = 0**:
  - Nunca mover un elemento fijo o en flujo cambiando `top`/`bottom`/`height` con JavaScript tras la carga. Para mover algo (ej. botones flotantes que se detienen antes del footer) usar `transform` directo sobre un `ref`: un cambio de transform no cuenta como desplazamiento y no re-renderiza.
  - Nada de estado de React que cambie el diseño después del primer pintado (`isMobileScreen`, `footerOverlap`, `mounted`). Si depende del tamaño de pantalla, resolverlo con clases responsivas (`md:`), no con `window.innerWidth`.
  - Imágenes siempre con dimensiones (`width`/`height` o `fill` + contenedor con tamaño).
- **Fuentes**:
  - Open Sans es propia (`public/fonts`, variable, `font-display: swap`, rango `100 900` para que el navegador no sintetice pesos).
  - Seravek (Typekit) se carga en tiempo libre del navegador (`requestIdleCallback`) desde `layout.tsx`. **Nunca** descargar el CSS de Typekit en el servidor ni quitarle el `@import`: es el contador de licencia de Adobe Fonts, sus términos exigen conservarlo.
  - El H1 usa `font-bold` (700); pedir pesos que la fuente no tiene obliga al navegador a sintetizarlos.
- **JavaScript**: estilos de animación en `globals.css`, no en `<style jsx global>` dentro del componente (se recalculan en cada render). Analytics y Speed Insights solo con `process.env.VERCEL === '1'` (en local devuelven 404).
- **Secciones bajo el pliegue**: `style={{ contentVisibility: 'auto' }}` en secciones largas que no se ven al cargar.
- **Banner de cookies**: aparece en la primera interacción o a los 12 s, nunca durante la ventana de medición del LCP.
- **Proxy** (`src/proxy.ts`): su `matcher` excluye estáticos (`_next/`, `_vercel/`, `.js`, `.css`, imágenes, fuentes). Un archivo estático que pase por el proxy termina redirigido a `/login`.

## Accesibilidad 100 (contraste) — solo tokens del sistema
- El error más común: texto sobre fondo **translúcido** (`bg-white/30`, `rgba(255,255,255,.5)`) encima de blobs de color. Lighthouse mezcla el fondo con el blob y el contraste cae. La solución es **opacar el fondo** (`#FFFFFF`/`bg-white/95` en día, `#525252` en noche), no cambiar el color del texto.
- Texto: **`#474747`** (9.7:1 sobre blanco) en día y blanco en noche. PROHIBIDOS `#111827`, `#1F2937`, `#374151`, `text-gray-*`: `#474747` es el único negro del sistema (CLAUDE.md).
- Texto secundario: `#474747/90` (día) y `text-white/90` (noche). Nunca menos de `/80` en textos menores de 12 px.
- Verde de marca en texto pequeño: `#006B66` (6.4:1). Botones con fondo de color claro (amarillo, pistacho) llevan texto `#474747`; con fondo de color medio (azul `#59A6E4`), oscurecer el fondo (`#1864A5`) para que el blanco cumpla 4.5:1.
- Solo `h1`, `h2`, `h3`, en orden, un único `h1` por página.

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
