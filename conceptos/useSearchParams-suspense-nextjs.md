---
tags: [nextjs, react, suspense, hooks, ssr]
aliases: [useSearchParams, Suspense boundary, searchParams client]
fecha: 2026-04-05
---

# useSearchParams + Suspense en Next.js 14

## Explicación

`useSearchParams()` es un hook de Next.js App Router que lee los query params de la URL desde un Client Component (`'use client'`). El problema: durante SSR (Server-Side Rendering), los query params no están disponibles todavía — solo existen en el browser.

Next.js resuelve esto con un contrato: **cualquier Client Component que use `useSearchParams()` debe estar envuelto en un `<Suspense>` en su página padre**. El Suspense actúa como "barrera de hidratación" — permite que el servidor renderice el fallback y que el cliente hidrate con los parámetros reales.

Sin Suspense:
- **En development**: Next.js lanza un error visible (`"useSearchParams was called from outside a Suspense boundary"`) que puede mostrar el error overlay o una sección en blanco.
- **En producción**: degradación silenciosa; el componente puede renderizarse sin los params iniciales y luego parpadear al hidratar.

## Ejemplo práctico

**MAL (rompe en dev, silencioso en prod):**
```tsx
// page.tsx (Server Component)
export default function MiPagina() {
  return <MiComponente />  // ← sin Suspense
}

// mi-componente.tsx
'use client'
export function MiComponente() {
  const params = useSearchParams()  // ← falla si no hay Suspense arriba
  const pagina = params.get('page') ?? '1'
  // ...
}
```

**BIEN:**
```tsx
// page.tsx (Server Component)
import { Suspense } from 'react'

export default function MiPagina() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <MiComponente />
    </Suspense>
  )
}
```

## En reuso.lurdes.co

`HistorialCalculos` usa `useSearchParams()` para inicializar filtros desde la URL. Se corrigió envolviendo el componente en `<Suspense>` en dos páginas:
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(empresa)/empresa/objetos/page.tsx`

El fallback es un div con altura fija (300px) para evitar layout shift mientras carga.

## Regla práctica

> **Si un componente tiene `'use client'` y `useSearchParams()`, su página padre necesita `<Suspense>`.**

Identificar el problema: error en consola de dev con "Suspense boundary" o sección que aparece vacía/blanca solo en algunas páginas.

## Wikilinks relacionados
- [[n-plus-one-supabase]] — otro patrón de performance en el mismo proyecto
- [[webpack-cache-nextjs]] — cómo la caché afectó el diagnóstico de este bug
- [[STATE]] — estado actual del proyecto
