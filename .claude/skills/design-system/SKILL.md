---
name: design-system
description: >
  Sistema de diseño Reúso V8.7 — Ley Madre para toda UI. Paleta, modo noche (#474747 + menta),
  Liquid Glass, animaciones, blobs, tokens, navegación. Leer SIEMPRE antes de crear o modificar UI.
triggers:
  - /design-system
  - /sistema-diseno
---

# Sistema de Diseño Reúso — V8.7 (Ley Madre)

Toda nueva UI DEBE seguir estas reglas exactas. Sin desviaciones sin aprobación explícita.

---

## 1. CANVAS — Fondos obligatorios

| Modo   | Fondo base                 | Clase Tailwind      |
|--------|----------------------------|---------------------|
| Luz    | `#FFFFFF` blanco puro      | `bg-white`          |
| Noche  | `#474747` Negro Lurdes     | `bg-[#474747]`      |

**Elevación tonal en noche** (los elementos se aclaran, nunca se oscurecen):
- Nivel 1 (cards, paneles): `bg-[#525252]`
- Nivel 2 (hover, inputs): `bg-[#5A5A5A]`
- Menú móvil flotante: `bg-[#121212]` (excepción — overlay sobre todo)
- Dropdown búsqueda: `bg-[#1A1A1A]/95`

**PROHIBIDO** como fondo de página: `#003D3A`, `#004945`, `#0A0A0A`, negro puro `#000000`.

---

## 2. PALETA DE COLOR

| Token           | Valor     | Uso en luz               | Uso en noche             |
|-----------------|-----------|--------------------------|--------------------------|
| `brandVerde`    | `#00827C` | Primario, botones        | Solo en botones CTA      |
| `brandHover`    | `#006B66` | Hover del verde          | Hover del verde          |
| `menta`      | `#8AD0B2` | Acento secundario        | **Acento principal**     |
| `menta`         | `#8AD0B2` | Texto secundario / blobs | Texto secundario / blobs |
| `nogal`         | `#AD7C43` | Acento orgánico          | Acento orgánico          |
| `rosa`          | `#F3BBD3` | Acento suave / blobs     | Acento suave / blobs     |
| `azulInfo`      | `#59A6E4` | Info / blobs             | Info / blobs             |
| `success`       | `#38B98E` | Éxito                    | Éxito                    |
| `error`         | `#FF5E4B` | Error                    | Error                    |
| `warning`       | `#F6BF3E` | Alerta                   | Alerta                   |

**PROHIBIDO:** grises genéricos (`#f5f5f5`, `#e8e8e8`, `#ccc`, `#999`, `#666`, `#333`).
Todo neutro se deriva de `#00827C` (luz) o de `#474747` (noche).

---

## 3. TEXTO — Colores exactos por modo

| Elemento              | Luz                  | Noche             |
|-----------------------|----------------------|-------------------|
| Primario (títulos)    | `text-[#474747]`     | `text-white`      |
| Secundario (cuerpo)   | `text-[#474747]/70`  | `text-white/70`   |
| Acento / marca        | `text-[#00827C]`     | `text-[#8AD0B2]`  |
| Placeholder inputs    | `text-[#474747]/30`  | `text-white/20`   |

### Variables de ayuda en componentes:
```tsx
const tp = isDark ? 'text-white'    : 'text-[#474747]'    // primario
const ts = isDark ? 'text-white/70' : 'text-[#474747]/70' // secundario
```

---

## 4. LIQUID GLASS — Tokens exactos

### liquidGlassDay (Luz):
```
bg-white/35 backdrop-blur-[60px] saturate-[180%] border border-[#00827C]/10
shadow-[0_12px_40px_rgba(0,130,124,0.06),inset_0_2px_4px_rgba(255,255,255,0.4)]
```

### liquidGlassNight (Noche):
```
bg-[#000000]/35 backdrop-blur-[60px] saturate-[200%] border border-white/10 shadow-2xl
```

### En código (siempre condicional):
```tsx
const liquidGlass = isDark
  ? 'bg-[#000000]/35 backdrop-blur-[60px] saturate-[200%] border border-white/10 shadow-2xl'
  : 'bg-white/35 backdrop-blur-[60px] saturate-[180%] border border-[#00827C]/10 shadow-[0_12px_40px_rgba(0,130,124,0.06),inset_0_2px_4px_rgba(255,255,255,0.4)]'
```

### Blobs de color (dentro de paneles glass):
| Token         | Clase Tailwind                              |
|---------------|---------------------------------------------|
| `blobAzul`    | `bg-[#59A6E4]/40 blur-[100px] rounded-full` |
| `blobMenta`   | `bg-[#8AD0B2]/35 blur-[90px] rounded-full`  |
| `blobRosa`    | `bg-[#F3BBD3]/40 blur-[100px] rounded-full` |
| `blobPistacho`| `bg-[#8AD0B2]/30 blur-[80px] rounded-full`  |

Los blobs van `absolute` dentro del panel con `pointer-events-none`.
Se animan con mouse + scroll — ver sección 7.

---

## 5. NAVEGACIÓN — Header glass

### Wrapper página (sistema-diseno):
```tsx
<div className={`min-h-screen ... ${isDark ? 'bg-[#474747] text-white' : 'bg-white text-[#474747]'}`}>
```

### Header (sistema-diseno — flotante, tipo pill):
```tsx
// Usa liquidGlass condicional directamente
// Posición: fixed top-8, max-w-5xl, rounded-full
```

### Nav simple (landing2 — sticky top-0):
```tsx
className={`fixed top-0 ... backdrop-blur-[20px] border-b ${isDark ? 'bg-[#474747]/90 border-white/10' : 'bg-white/90 border-[#00827C]/10'}`}
```

### Botón modo noche (Moon/Sun):
```tsx
// Noche activo:  bg-[#8AD0B2] text-[#474747] border-transparent
// Luz inactivo:  bg-white/40 border-white/50 hover:bg-[#00827C]/10
```

### Botón búsqueda (MagnifyingGlass/X):
```tsx
// Abierto en noche: bg-[#8AD0B2] text-[#474747] border-transparent
// Abierto en luz:   bg-[#00827C] text-white border-transparent
// Cerrado en noche: bg-white/10 border-white/10 text-white
// Cerrado en luz:   bg-white/40 border-white/50 text-[#474747] hover:bg-[#00827C]/10
```

### Dropdown de búsqueda:
```tsx
// Noche: bg-[#1A1A1A]/95 border-white/10 backdrop-blur-2xl
// Luz:   bg-white/95   border-[#00827C]/10 backdrop-blur-2xl
// Dot resultados noche: bg-[#8AD0B2]
// Dot resultados luz:   bg-[#00827C]
```

### Menú móvil:
```tsx
// Noche: bg-[#121212] border-white/10
// Luz:   bg-white    border-[#00827C]/10
```

---

## 6. TARJETAS Y PANELES

```tsx
// Card básica
isDark ? 'bg-[#525252] border-white/10' : 'bg-white border-[#00827C]/10'

// Card elevada / popular
isDark ? 'bg-[#5A5A5A] border-white/15' : 'bg-white shadow-[0_20px_50px_rgba(0,130,124,0.10)]'

// Sección fondo alternado
isDark ? 'bg-[#525252]/50 border-white/8' : 'bg-[#00827C]/[0.02] border-[#00827C]/8'

// Chip / badge
isDark ? 'bg-[#8AD0B2]/10 border-[#8AD0B2]/20 text-[#8AD0B2]'
       : 'bg-[#00827C]/8  border-[#00827C]/15  text-[#00827C]'

// Borde sutil estándar
isDark ? 'border-white/10' : 'border-[#00827C]/10'
```

---

## 7. BLOBS — Animación mouse + scroll (patrón aprobado)

**Usar refs + rAF + lerp para cero re-renders:**

```tsx
const mouseXRef = useRef(0)
const mouseYRef = useRef(0)
const scrollYRef = useRef(0)

useEffect(() => {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  let smoothX = 0, smoothY = 0, rafId: number

  const tick = () => {
    smoothX = lerp(smoothX, mouseXRef.current, 0.1)
    smoothY = lerp(smoothY, mouseYRef.current, 0.1)
    const sy = scrollYRef.current
    document.querySelectorAll<HTMLElement>('[data-blob]').forEach(el => {
      const mx = parseFloat(el.dataset.mx ?? '0')
      const my = parseFloat(el.dataset.my ?? '0')
      const ms = parseFloat(el.dataset.ms ?? '0')
      el.style.transform = `translate(${smoothX * mx}px, ${smoothY * my + sy * ms}px)`
    })
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)

  const onScroll = () => { scrollYRef.current = window.scrollY }
  const onMouse  = (e: MouseEvent) => {
    mouseXRef.current = e.clientX - window.innerWidth / 2
    mouseYRef.current = e.clientY - window.innerHeight / 2
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('mousemove', onMouse, { passive: true })
  return () => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('mousemove', onMouse)
  }
}, [])
```

**JSX de cada blob:**
```tsx
<div data-blob data-mx="0.08" data-my="0.07" data-ms="0.02"
  className="absolute -top-16 -right-16 w-64 h-64 bg-[#59A6E4]/35 blur-[80px] rounded-full pointer-events-none"
  style={{ willChange: 'transform' }} />
```
- Sin CSS `transition` en blobs (el lerp provee suavizado)
- `will-change: transform` siempre
- Valores negativos = movimiento opuesto al mouse

---

## 8. ANIMACIONES — Keyframes aprobados

```css
@keyframes glassStatIn  { from { opacity:0; transform:translateY(18px); filter:blur(8px); } to { opacity:1; transform:translateY(0); filter:blur(0); } }
@keyframes glassGlow    { 0%,100%{text-shadow:0 0 0px transparent;} 50%{text-shadow:0 0 24px rgba(138,208,178,0.5),0 0 48px rgba(89,166,228,0.2);} }
@keyframes glassShimmer { 0%{background-position:-200% center;} 100%{background-position:200% center;} }
@keyframes glassPulse   { 0%,100%{opacity:0.6;} 50%{opacity:1;} }
@keyframes revealUp     { from{opacity:0;transform:translateY(30px);filter:blur(8px);} to{opacity:1;transform:translateY(0);filter:blur(0);} }
@keyframes mobileMenuIn { from{opacity:0;transform:translateY(-12px) scale(0.97);} to{opacity:1;transform:translateY(0) scale(1);} }
```

| Clase               | Animación              |
|---------------------|------------------------|
| `.glass-stat`       | glassStatIn 0.7s       |
| `.glass-number`     | glassGlow 3s ∞         |
| `.glass-subtitle`   | glassPulse 3s ∞        |
| `.glass-shimmer-text` | glassShimmer 4s ∞    |

**Reveal al scroll:**
```css
section[id] { opacity:0; transform:translateY(30px); filter:blur(8px);
  transition: opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1), filter 0.6s cubic-bezier(0.22,1,0.36,1); }
section[id].revealed { opacity:1; transform:translateY(0); filter:blur(0); }
```
Observer: `{ rootMargin: '-60px 0px', threshold: 0.05 }`
Easing de marca: `cubic-bezier(0.22, 1, 0.36, 1)`

---

## 9. RADIOS

| Token            | Valor  | Uso                                    |
|------------------|--------|----------------------------------------|
| `radiusMicro`    | 2px    | Micro validaciones                     |
| `radiusDropdown` | 8px    | Desplegables                           |
| `radiusInner`    | 16px   | Interior de tablas                     |
| `radiusWidget`   | 24px   | Widgets                                |
| `radiusCard`     | 40px   | Tarjetas / paneles (`rounded-[2.5rem]`)|
| `radiusFull`     | 999px  | Botones / etiquetas (`rounded-full`)   |

---

## 10. ICONOGRAFÍA Y TIPOGRAFÍA

- **Iconos**: solo **Phosphor Icons** — `duotone` para visualización, `bold` para interacción crítica.
- **Fuente**: Open Sans (única fuente en producción).
- **NUNCA emojis en la interfaz frontend** (idioma, botones, formularios, menús, etc.).
- **Banderas de países**: usar banderas estilo lipis/flag-icons (cargadas por ejemplo desde jsDelivr en formato SVG: `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/`) con bordes levemente redondeados (`borderRadius: '3px'`) para que no sean rectángulos perfectos.
- **NUNCA** fuentes diferentes a Open Sans.

---

## 10b. CHECKBOXES — Patrón oficial (OBLIGATORIO en toda la plataforma)

**Prohibido** usar `<input type="checkbox">` en la UI de Reúso. Todo checkbox usa iconos Phosphor:

| Estado     | Icono Phosphor           | Color                    |
|------------|--------------------------|--------------------------|
| Desmarcado | `<Square weight="regular">` | `text-secondary`      |
| Marcado    | `<CheckSquare weight="duotone">` | `text-brand`    |

**Tamaño estándar:** `size={18}` en formularios inline, `size={20}` en listas.

**Patrón JSX:**
```tsx
import { Square, CheckSquare } from '@phosphor-icons/react'

<label
  className="flex items-center gap-2 cursor-pointer group select-none"
  onClick={() => setValor(!valor)}
>
  {valor
    ? <CheckSquare size={18} weight="duotone" className="text-brand flex-shrink-0" />
    : <Square size={18} weight="regular" className="text-secondary flex-shrink-0" />
  }
  <span className="text-sm font-medium text-secondary group-hover:text-primary transition-colors">
    Etiqueta del checkbox
  </span>
</label>
```

**Notas:**
- El `onClick` va en el `<label>`, no en un `<input>` oculto.
- Si el label contiene un `<Link>`, añadir `onClick={(e) => e.stopPropagation()}` al link para evitar doble toggle.
- `select-none` siempre en el label para evitar selección accidental de texto.

---

## 11. REGLAS DE VOZ

- Idioma: español siempre.
- Voz activa, positiva, ecológica.
- Alertas: empiezan por la solución, nunca por el error.
- NUNCA guiones largos (–) ni punto y coma (;) en textos de UI.

---

## 12. CHECKLIST ANTES DE IMPLEMENTAR DARK MODE

1. ¿El fondo de página es `bg-[#474747]`? (NO verde oscuro, NO negro puro)
2. ¿El texto primario es `text-white`?
3. ¿El acento usa `#8AD0B2` menta (no verde `#00827C`)?
4. ¿Las tarjetas elevadas usan `bg-[#525252]` o `bg-[#5A5A5A]`?
5. ¿El liquidGlass noche usa `bg-[#000000]/35`?
6. ¿Los botones de toggle (noche/búsqueda) activos usan `bg-[#8AD0B2] text-[#474747]`?
7. ¿Los dropdowns usan `bg-[#1A1A1A]/95`?
8. ¿El menú móvil usa `bg-[#121212]`?

---

*Regla Maestro: Si no está en el Sistema de Diseño, no existe en la Plataforma.*
