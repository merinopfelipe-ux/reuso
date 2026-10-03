# Rendimiento y Accesibilidad 100/100 (Mobile-First)

Este documento establece las reglas y patrones obligatorios para mantener permanentemente un puntaje de **100/100** en Lighthouse (Performance, Accessibility, Best Practices y SEO), con enfoque **Mobile-First**.

---

## 1. Principios de Rendimiento (Performance 100)

### 1.1 LCP (Largest Contentful Paint) < 2.5s en Móvil 4G simulado
- **Cero animaciones en el LCP:** El contenedor o texto del LCP (habitualmente el `<h1>` o elemento visual superior del Hero) **NUNCA** debe tener animaciones de entrada (`animate-float-hero`, `whileInView`, `opacity: 0`, transformaciones lentas). Debe estar disponible y pintarse en el primer frame.
- **Fuentes y síntesis de peso:**
  - Si se usa una fuente variable (e.g. Open Sans), asegurar en `@font-face` el rango de pesos completo (`font-weight: 100 900;`) y `font-display: swap;`.
  - Evitar pesos sintéticos pesados (e.g., solicitar `font-black` si la fuente solo precargó hasta 700). Usar `font-bold` (700) en el `<h1>` para coincidir con la variante pre-renderizada.
- **Preload de fuentes con cautela:**
  - Un `<link rel="preload">` de una fuente pesada en redes lentas puede bloquear el renderizado del texto si el navegador decide esperar el recurso precargado antes de activar el fallback de `swap`.
- **Scripts externos bloqueantes:**
  - Tipografías externas como Typekit o Google Fonts deben diferirse al tiempo libre del navegador (`requestIdleCallback` o después de la hidratación inicial) con encabezados correctos para evitar rechazos 403 y jamás bloquear el primer pintado.
- **Sin `if (!mounted) return null` en componentes de página:**
  - Toda la página debe renderizarse en el HTML inicial del servidor para que el motor del navegador pinte el DOM inmediatamente sin esperar a que React descargue y ejecute JavaScript.

---

## 2. Accesibilidad (Accessibility 100) y Contraste WCAG

### 2.1 Trampa del fondo translúcido sobre elementos flotantes
- **El error común:** Usar `rgba(255, 255, 255, 0.5)` o `bg-white/30` en elementos fijos (como la barra de navegación inferior móvil `<nav aria-label="Navegación móvil inferior">`) o en tarjetas sobre "blobs" de colores decorativos (`bg-[#8AD0B2]/30`).
- **Consecuencia:** Los algoritmos de contraste (Axe / Lighthouse) mezclan el 50% de blanco con el color del blob inferior (`#8AD0B2` verdoso), haciendo que el texto gris (`#474747` o `/80`) repruebe el ratio de 4.5:1 exigido para textos normales (< 18pt o < 14pt bold).
- **La solución obligatoria (solo tokens del sistema, ver CLAUDE.md):**
  - Fondos de navegación móvil flotante y tarjetas de métricas: **opacos o casi opacos** (`#FFFFFF` o `bg-white/95` en día; `#525252`, Nivel 1, en noche). El problema es la transparencia sobre los blobs, no el color del texto.
  - Texto principal: **Negro Lurdes `#474747`** (contraste 9.7:1 sobre blanco) en día y `#FFFFFF` en noche. PROHIBIDO `#111827`, `#1F2937`, `#374151` o grises de Tailwind: `#474747` es el único negro del sistema.
  - Texto secundario: `#474747/90` en día y `text-white/90` en noche. Nunca bajar de `/80` en textos menores de 12 px.
  - Verde de marca para texto pequeño: `#006B66` (brand-hover, 6.4:1), no tonos inventados.
- Detalle completo y errores comunes: skill `seo-rendimiento` (`.claude/skills/seo-rendimiento/SKILL.md`).

---

## 3. Jerarquía Tipográfica Mobile-First

### 3.1 Proporciones de Encabezados (H2 y H3) en Móvil
- **El problema:** En móvil (`< sm`), los títulos H2 con `text-xl` (20px) o H3 con `text-sm` (14px) se confunden con los párrafos normales (15-16px) e incluso se veían más pequeños que frases destacadas del footer (21px).
- **Regla de tamaños móviles:**
  - **H1:** Mantener su escala definida para Hero sin alterar LCP.
  - **H2:** En móvil comenzar en `text-2xl` (24px, clase: `text-2xl sm:text-2xl md:text-3xl lg:text-4xl`). Siempre superior a los 21px del footer y claramente identificable como título de sección.
  - **H3:** En móvil comenzar mínimo en `text-base` (16px) o `text-lg` (18px) con peso marcado (`font-extrabold` o `font-black`).
- **Restricción estricta de tags:** **NUNCA** usar etiquetas `<h4>`, `<h5>` o `<h6>` en el proyecto. Solo `<h1>`, `<h2>` y `<h3>` estructurados semánticamente.

---

## 4. Animaciones de Scroll ("Entrando y Saliendo")

### 4.1 Comportamiento Dinámico sin Bloquear la Carga Inicial
- Las secciones debajo del Hero deben animar su entrada y salida de forma reactiva al scroll usando `LazyMotion` de Framer Motion con `m.div`:
```tsx
<m.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: false, margin: '-30px' }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>
```
- **Por qué `once: false`:** Permite que los elementos cobren vida reanimándose suavemente cuando el usuario navega arriba y abajo ("entrando y saliendo").
- **Por qué `margin: '-30px'`:** Activa la animación en cuanto una pequeña porción entra en el viewport móvil, evitando retrasos perceptuales.
- **GPU-accelerated:** Usar únicamente `opacity` y `y` (transform), sin alterar `height`, `width` ni `top` para evitar recalcular el layout del hilo principal.

---

## 5. Checklist Rápido de Verificación Antes de Deploy

1. `npm run check-backgrounds`: Pasa sin fondos hardcodeados prohibidos ni mayúsculas sostenidas.
2. `npm run build`: Compilación exitosa en Next.js.
3. Servidor en producción `next start -p 3001` activo y respondiendo HTTP 200.
4. Auditoría Lighthouse Mobile:
   - Rendimiento = 100
   - Accesibilidad = 100
   - Prácticas recomendadas = 100
   - SEO = 100
