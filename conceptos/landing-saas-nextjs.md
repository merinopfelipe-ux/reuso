---
tags: [nextjs, routing, landing, saas]
fecha: 2026-04-10
aliases: [landing pública, landing en raíz]
---

# landing-saas-nextjs

## ¿Qué es?

Patrón para tener una landing pública en `/` en un proyecto Next.js App Router que también tiene login y rutas protegidas.

## El problema

Si el login está en `(auth)/page.tsx`, Next.js lo mapea a `/` porque el route group `(auth)` no afecta la URL. Para agregar una landing en `/` hay que mover el login primero.

## Solución

1. Crear `(auth)/login/page.tsx` con el contenido del login → nueva URL: `/login`
2. Eliminar `(auth)/page.tsx`
3. Crear `src/app/page.tsx` (fuera de todo route group) → captura `/`
4. Actualizar el middleware:
   ```typescript
   const PUBLIC_ROUTES = ['/', '/login', '/registro', ...]
   // redirect no-autenticados:
   return NextResponse.redirect(new URL('/login', request.url))
   ```

## Regla clave

Un archivo `app/page.tsx` fuera de route groups siempre gana la ruta `/`, sin importar qué haya dentro de `(auth)/` o `(public)/`.

## Ejemplo práctico (Calculadora de Reúso)

- `src/app/page.tsx` → landing pública de ventas (`'use client'`, toggle moneda, planes, FAQ)
- `src/app/(auth)/login/page.tsx` → login
- Middleware: `/` y `/login` en `PUBLIC_ROUTES`, redirect a `/login` para no-autenticados

## Notas de implementación

- La landing usa `'use client'` porque tiene estado (currency toggle, billing toggle, FAQ accordion)
- `userSelect: 'none'` en el div raíz (CLAUDE.md: prohibición copy-paste)
- Íconos Lucide, nunca emojis
- CTA "Iniciar sesión" → `href="/login"`
- Precios en COP (placeholder), toggle a USD/EUR con tasas fijas de referencia

## Wikilinks

- [[webpack-cache-nextjs]] — limpiar caché al crear muchos archivos
- [[useSearchParams-suspense-nextjs]] — si la landing usa query params
