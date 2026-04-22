---
tags: [concepto, navegacion, nextjs, react]
aliases: [submenú hash, hash active state]
fecha: 2026-04-06
---

# Submenú lateral con hash-based active state

## Explicación

Patrón para resaltar el ítem activo en un submenú lateral cuando la navegación se basa en anclas (`#section`) dentro de una misma página.

El problema: `usePathname()` solo devuelve el path sin el hash. Para saber qué sección está activa hay que escuchar el evento `hashchange` del navegador y guardar el hash en estado local.

## Implementación

```tsx
'use client'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export function PageSubmenu({ items }) {
  const pathname = usePathname()
  const [activeHash, setActiveHash] = useState('')

  useEffect(() => {
    setActiveHash(window.location.hash)
    const handler = () => setActiveHash(window.location.hash)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  function isActive(href) {
    if (href.includes('#')) {
      const [path, hash] = href.split('#')
      return pathname === path && activeHash === `#${hash}`
    }
    return pathname === href
  }
  // ...
}
```

## Estilo del ítem activo

```tsx
borderLeft: isActive(item.href) ? '3px solid var(--color-brand)' : '3px solid transparent',
color: isActive(item.href) ? 'var(--color-brand)' : 'var(--text-secondary)',
fontWeight: isActive(item.href) ? 700 : 400,
background: isActive(item.href) ? 'rgba(0,130,124,0.07)' : 'transparent',
```

## Ejemplo práctico

En `/settings`:
- `#datos` → "Mis datos"
- `#preferencias` → "Preferencias"

En `/legal/*`:
- Cada página legal es una ruta distinta, el submenú usa solo `pathname` para detectar el activo.

## Wikilinks

- [[useSearchParams-suspense-nextjs]] — otro patrón de URL sync en Next.js
