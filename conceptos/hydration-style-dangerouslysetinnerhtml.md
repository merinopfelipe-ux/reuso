---
tags: [nextjs, react, hidratacion, ssr, css]
fecha: 2026-04-13
aliases: [hydration-style, dangerouslySetInnerHTML-style]
---

# Hidratación: `<style>` con children string falla en SSR

## El problema

```tsx
// ❌ Causa error de hidratación
<style>{`
  .mi-clase { color: red; }
`}</style>
```

React SSR codifica las comillas simples como `&#x27;` al renderizar en el servidor. El cliente recibe HTML con `&#x27;` pero React intenta renderizar `'`. El DOM no coincide → error de hidratación en consola: *"Hydration failed because the server rendered HTML didn't match the client."*

## La solución

```tsx
// ✅ Correcto: dangerouslySetInnerHTML no pasa por el proceso de escape de React
<style dangerouslySetInnerHTML={{ __html: `
  .mi-clase { color: red; }
` }} />
```

`dangerouslySetInnerHTML` inyecta el string directamente en el DOM sin que React lo procese o escape, lo que garantiza que servidor y cliente produzcan el mismo HTML.

## Cuándo ocurre

- Animaciones CSS inline (`@keyframes`)
- Overrides de componentes de terceros
- CSS variables dinámicas
- Cualquier `<style>` con contenido string en un Server o Client Component

## Archivos corregidos en Reúso (V3.8)

- `src/app/page.tsx` — Google Fonts import + estilos landing
- `src/components/header.tsx` — estilos dropdown
- `src/components/sidebar.tsx` — hover sidebar items
- `src/components/certificados/panel-certificados.tsx` — @keyframes spin

## Alternativas

1. **CSS Modules** (`mi-componente.module.css`) — preferible para estilos estáticos
2. **Tailwind** — para utilidades estándar
3. **`dangerouslySetInnerHTML`** — solo cuando CSS necesita ser inline por razones específicas (herencia de variables, animaciones dinámicas)

## Ver también

- [[webpack-cache-nextjs]] — otro tipo de error en el pipeline SSR/dev
