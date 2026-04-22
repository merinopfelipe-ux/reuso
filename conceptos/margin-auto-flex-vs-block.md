---
tags: [css, layout, flexbox, centrado]
fecha: 2026-04-13
aliases: [margin-auto-flex, centrado-flex-column]
---

# margin: auto falla en flex items de columna

## El problema

Cuando un contenedor usa `display: flex` y `flexDirection: 'column'`, sus hijos directos son **flex items**. La propiedad `align-items` (que por default es `stretch`) controla el eje transversal (horizontal en columna).

`margin: 0 auto` en un flex item **no funciona** porque `align-items: stretch` gana sobre el margen automático en el eje horizontal. El elemento se estira al ancho del contenedor sin importar `maxWidth`.

```tsx
// ❌ NO FUNCIONA: main es flex item, margin: 0 auto ignorado
<main style={{ flex: 1, maxWidth: 1200, margin: '0 auto' }}>
  {children}
</main>
```

## La solución

Añadir un `<div>` **block-level** DENTRO del flex item. Los elementos block (no-flex) sí respetan `maxWidth + margin: 0 auto` normalmente.

```tsx
// ✅ FUNCIONA: div interno es block-level, no flex item
<main style={{ flex: 1, background: 'var(--bg-primary)' }}>
  <div style={{
    maxWidth: 1200,
    margin: '0 auto',
    padding: '32px 28px',
    boxSizing: 'border-box' as const,
  }}>
    {children}
  </div>
</main>
```

## Por qué funciona

El `<div>` interno hereda el ancho del `<main>` (que puede ser el 100% del viewport gracias a `stretch`), pero como **no es flex item**, sus márgenes automáticos funcionan correctamente para centrar su propio contenido dentro del espacio disponible.

## Dónde está aplicado

- `src/components/layout-shell.tsx` — panel autenticado de Reúso (V3.8)

## Ver también

- [[role-routing-nextjs]] — layout guards relacionados
- [[landing-saas-nextjs]] — layout de la landing pública
