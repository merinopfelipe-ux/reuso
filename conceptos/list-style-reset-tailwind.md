---
tags: [css, tailwind, nextjs, legales, estilos]
fecha: 2026-04-10
aliases: [viñetas, list-style, ul disc]
---

# list-style-reset-tailwind

## ¿Qué es?

Problema de CSS: las viñetas de `<ul>` desaparecen en proyectos con Tailwind CSS / Next.js porque el reset global de Tailwind elimina `list-style`.

## El problema

Tailwind incluye `preflight` (basado en `modern-normalize`) que hace:
```css
ul, ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
```

Resultado: un `<ul><li>• texto</li></ul>` normal no muestra viñetas.

## Solución

Declarar explícitamente el tipo de viñeta en el estilo inline o en la clase CSS:

```tsx
// Estilo inline (patrón usado en páginas legales)
const ul = { paddingLeft: 20, marginBottom: 16, listStyleType: 'disc' } as const

<ul style={ul}>
  <li style={{ marginBottom: 8 }}>Primer ítem</li>
</ul>
```

**No basta** con `paddingLeft` — sin `listStyleType: 'disc'`, las viñetas siguen invisibles aunque haya espacio para ellas.

## Alternativas

- Clase Tailwind: `list-disc pl-5` (si se usan clases Tailwind, no inline styles)
- CSS global en `globals.css`: agregar `.legal-list { list-style: disc; padding-left: 20px; }`

## Ejemplo práctico (Calculadora de Reúso)

En los 3 documentos legales (`reglamento`, `privacidad`, `medicion`):
```tsx
const ul = { paddingLeft: 20, marginBottom: 16, listStyleType: 'disc' } as const
const li = { marginBottom: 8 } as const

<ul style={ul}>
  <li style={li}>Los factores son promedios sectoriales.</li>
  <li style={li}>El cálculo excluye transporte.</li>
</ul>
```

## Wikilinks

- [[ia-disclosure-legal]] — páginas legales donde se aplica este patrón
- [[page-submenu-anchor]] — submenú de las páginas legales
