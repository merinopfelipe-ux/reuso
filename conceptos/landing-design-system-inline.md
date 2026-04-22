---
tags: [design-system, landing, nextjs, css]
fecha: 2026-04-17
---

# Landing con inline styles para consistencia con design system

## Contexto
El proyecto autenticado (dashboard, empresa, admin) usa inline styles con variables de color brand (`#00827C`, `#1A3A38`, `#4D7C79`, etc.) en vez de clases Tailwind. La landing usaba Tailwind `slate-*` y `teal-*` que violan el design system (grises prohibidos).

## Decisión
Reescribir `page.tsx` completamente con inline styles, usando un objeto de constantes de color:

```typescript
const C = {
  brand: '#00827C',
  brandHover: '#006B66',
  dark: '#1A3A38',
  mid: '#4D7C79',
  light: 'rgba(0,130,124,0.06)',
  border: 'rgba(0,130,124,0.10)',
  borderMid: 'rgba(0,130,124,0.20)',
  shadow: '0 4px 24px rgba(0,130,124,0.10)',
}
```

## Ventajas
- Una sola fuente de verdad para colores; fácil de actualizar
- Sin riesgo de introducir grises o colores prohibidos vía Tailwind utility classes
- Consistencia visual con el área autenticada

## Breakpoints responsive con className + `<style dangerouslySetInnerHTML>`
Para media queries no es posible usar inline styles directamente. Patrón usado:
```tsx
<style dangerouslySetInnerHTML={{ __html: `
  @media (max-width:768px) {
    .hero-grid { grid-template-columns:1fr !important; }
  }
` }} />
<div className="hero-grid" style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr' }}>
```
El `!important` garantiza que el media query sobreescriba el inline style.

## Relacionado
- [[hydration-style-dangerouslysetinnerhtml]]
- [[landing-saas-nextjs]]
