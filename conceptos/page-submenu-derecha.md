---
tags: [css, layout, navegacion, ux, submenu]
fecha: 2026-04-14
aliases: [submenu-lateral, aside-derecha, navegacion-interna]
---

# Submenú lateral a la derecha en páginas de configuración

## El patrón

Las páginas con múltiples secciones (como `/settings`) usan un submenú lateral para navegación interna. El diseño de Reúso lo ubica a la **derecha** del contenido, no a la izquierda.

Esto contrasta con el patrón habitual de docs/wikis (que ponen el índice a la izquierda). En la plataforma, la sidebar principal ya ocupa la izquierda — poner otro menú a la izquierda comprimiría el contenido y crearía confusión visual.

## Implementación en flex

El truco es simplemente el **orden de los elementos** en el contenedor flex:

```tsx
// ✅ Submenu a la DERECHA
<div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
  <div style={{ flex: 1, minWidth: 0 }}>   {/* contenido → izquierda */}
    {/* secciones de la página */}
  </div>
  <aside style={{ flexShrink: 0, width: 180, position: 'sticky', top: 32 }}>
    <PageSubmenu items={items} activeHash={activeHash} />
  </aside>
</div>

// ❌ Submenu a la IZQUIERDA (no usar en Reúso)
<div style={{ display: 'flex', gap: 40 }}>
  <aside>...</aside>   {/* submenu → izquierda */}
  <div>...</div>       {/* contenido */}
</div>
```

## Estilos del PageSubmenu cuando está a la derecha

El indicador activo (`border`) y el radio del item deben orientarse hacia la **derecha** para "apuntar" visualmente al contenido:

```tsx
// ✅ Para submenu a la derecha:
borderRight: active ? '3px solid var(--color-brand)' : '3px solid transparent',
borderRadius: '8px 0 0 8px',  // esquinas redondeadas a la izquierda

// ❌ Para submenu a la izquierda (patrón estándar):
borderLeft: active ? '3px solid var(--color-brand)' : '3px solid transparent',
borderRadius: '0 8px 8px 0',  // esquinas redondeadas a la derecha
```

## `position: sticky` en el aside

Con `position: sticky; top: 32`, el submenú permanece visible mientras el usuario hace scroll en el contenido. Requiere que el contenedor padre **no tenga** `overflow: hidden`.

## Dónde está aplicado

- `src/components/page-submenu.tsx` (V4.0)
- `src/app/settings/page.tsx` (V4.0)

## Ver también

- [[margin-auto-flex-vs-block]] — otro patrón de layout flex
- [[hydration-style-dangerouslysetinnerhtml]] — fix del `<style>` en el componente
