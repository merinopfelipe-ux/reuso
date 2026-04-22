---
tags: [ux, modal, drawer, panel-lateral, css, position-fixed]
fecha: 2026-04-14
aliases: [drawer, panel-detalle, slide-panel]
---

# Modal tipo panel lateral (drawer)

## Por qué panel lateral en vez de modal centrado

Para detalles de filas de tabla, el panel lateral (drawer desde la derecha) permite:
- Ver el detalle sin perder el contexto de la tabla detrás
- Contenido largo sin sentirse encajonado
- UX estándar en herramientas de gestión (Linear, Notion, Supabase)

Un modal centrado corta el contexto — el usuario olvida en qué fila hizo click.

## Implementación

```tsx
// Overlay (cierra al hacer click)
<div
  onClick={onClose}
  style={{
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.35)',
    backdropFilter: 'blur(2px)',
  }}
/>

// Panel lateral
<div style={{
  position: 'fixed', top: 0, right: 0, bottom: 0,
  width: 'min(480px, 100vw)',  // responsive: 480px en desktop, 100% en móvil
  zIndex: 201,
  background: 'var(--bg-card)',
  boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
}}>
  {/* Encabezado fijo */}
  <div style={{ flexShrink: 0, ... }}>...</div>
  {/* Cuerpo scrolleable */}
  <div style={{ flex: 1, overflowY: 'auto', ... }}>...</div>
</div>
```

## Cerrar con Escape

```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [onClose])
```

## Bloquear scroll del body

Mientras el modal está abierto, prevenir scroll del fondo:
```tsx
<style dangerouslySetInnerHTML={{ __html: 'body { overflow: hidden; }' }} />
```
Al desmontar el componente, el `<style>` desaparece y el scroll vuelve automáticamente.

## z-index: overlay 200, panel 201

El overlay va debajo del panel para que los clicks al overlay cierren el modal sin interferir con el contenido del panel.

## Dónde está implementado

- `src/components/calculadora/historial-calculos.tsx` — `DetalleModal`

## Ver también

- [[historial-calculos-detalle]] — qué muestra el modal de detalle de cálculo
- [[hydration-style-dangerouslysetinnerhtml]] — por qué usar dangerouslySetInnerHTML en el style tag
