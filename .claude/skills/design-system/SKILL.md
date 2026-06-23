---
name: design-system
description: Sistema de diseño de reuso.lurdes.co. REGLAS FUNDAMENTALES: (1) Mobile-first SIEMPRE — todo componente se diseña primero para móvil. (2) Todo color se deriva de #00827C. No existen grises puros en este proyecto. Usar cuando se construyan páginas, dashboards o componentes.
---

# Design System — reuso.lurdes.co

## REGLA OBLIGATORIA #1: MOBILE-FIRST SIEMPRE
TODO componente, página y layout se diseña primero para móvil y luego se escala hacia arriba con breakpoints. NUNCA al revés. Breakpoints: mobile < 768px, tablet 768–1024px, desktop > 1024px. Si un componente no funciona en móvil, está mal hecho.

## REGLA OBLIGATORIA #2: COLOR
Los colores dominantes absolutos son el brand (#00827C) y, en el tema claro, el blanco puro (#FFFFFF). Sigue estrictamente la regla de "sin grises" (#f5f5f5, #e8e8e8, #8c8c8c, #666, #474747, #333, etc. están PROHIBIDOS). En el **Tema Claro**, los fondos principales DEBEN ser blanco puro para dar una apariencia impecable y luminosa (el fondo en oscuro NUNCA será blanco puro, usará los verdes profundos definidos). Los estados como hover, bordes y separadores usarán el color brand diluido. Los textos se mantienen en verdes oscuros/apagados. Esta regla aplica a TODOS los componentes sin excepción.

## Cómo derivar colores de #00827C
- Fondos claros: #00827C con muy baja opacidad sobre blanco (opacity 0.02 a 0.06)
- Fondos hover: #00827C con opacity 0.05 a 0.10
- Bordes: #00827C con opacity 0.10 a 0.18
- Textos secundarios: #00827C mezclado con negro (desaturado, oscurecido)
- Sombras: rgba(0,130,124, 0.06) en claro, rgba(0,130,124, 0.20) en oscuro

## Tema claro
--bg-primary: #FFFFFF (blanco puro dominante)
--bg-secondary: #FFFFFF (blanco puro) o #F5FAFA (solo si se requiere distinción estricta de capas)
--bg-card: #FFFFFF
--bg-sidebar: #FFFFFF (blanco puro, sin grises)
--bg-hover: #EBF5F4 (verde suave al hover, NO #f5f5f5)
--bg-input: #FFFFFF
--bg-active: rgba(0,130,124, 0.08) (para items activos del menú)
--text-primary: #1A3A38 (verde muy oscuro, reemplaza #474747)
--text-secondary: #4D7C79 (verde medio apagado, reemplaza #8c8c8c)
--text-placeholder: #7FA8A5 (verde claro, reemplaza placeholders grises)
--border: rgba(0,130,124, 0.12) (verde sutil, reemplaza #e8e8e8)
--border-light: rgba(0,130,124, 0.06) (verde apenas visible, reemplaza #f0f0f0)
--shadow: 0 1px 3px rgba(0,130,124, 0.06)
--skeleton-base: #EBF5F4 (para loading skeletons)
--skeleton-shine: #F2F9F8 (animación pulse)
--divider: rgba(0,130,124, 0.08) (líneas separadoras)

## Tema oscuro
--bg-primary: #003D3A (verde profundo)
--bg-secondary: #00332F (verde más oscuro)
--bg-card: #004945 (verde medio, elevación)
--bg-sidebar: #00332F
--bg-hover: #005752
--bg-input: #004945
--bg-active: rgba(0,130,124, 0.25)
--text-primary: #E0F2F1 (blanco verdoso)
--text-secondary: #8AD0B2 (Aroma de menta)
--text-placeholder: #5A9E8F (verde medio)
--border: rgba(0,130,124, 0.30)
--border-light: rgba(0,130,124, 0.18)
--shadow: 0 1px 3px rgba(0,0,0, 0.25)
--skeleton-base: #004945
--skeleton-shine: #005752
--divider: rgba(0,130,124, 0.20)

## Colores de acento (no cambian entre temas)
--color-brand: #00827C
--color-brand-hover: #006B66
--color-brand-light: rgba(0,130,124, 0.08) en claro, rgba(0,130,124, 0.25) en oscuro
--color-success: #38B98E
--color-error: #FF5E4B
--color-warning: #F6BF3E
--color-info: #59A6E4
--color-pistacho: #D6F391
--color-menta: #8AD0B2

## REGLA DE CONTRASTE PISTACHO — CRÍTICA
Cuando el FONDO de un elemento es pistacho (`bg-[#D6F391]`, `background: '#D6F391'`), el TEXTO siempre debe ser Negro Lurdes `#474747`.
PROHIBIDO usar texto blanco (`#fff`, `#ffffff`, `text-white`) sobre fondo pistacho — el pistacho es un color claro y el blanco no se lee.
Patrón correcto: `isDark ? 'bg-[#D6F391] text-[#474747]' : 'bg-[#00827C] text-white'`
--color-nogal: #AD7C43
--color-rosa: #F3BBD3

## Estructura UI de reuso

## Sidebar (COMPORTAMIENTO CLAVE)
- Estado colapsado (default): ancho 60px, solo íconos centrados, fondo `var(--bg-sidebar)`
- Estado expandido (hover): ancho 220px, ícono + texto, transición suave 0.3s ease
- Trigger: al pasar el cursor (hover) sobre el sidebar, se expande completo
- En mobile: sidebar oculto, hamburguesa en header, abre como drawer overlay

Estructura del sidebar:
- Arriba: logo (colapsado: solo ícono R, expandido: logo completo)
- Centro: menú con íconos Phosphor + texto (según rol)
- Abajo: "Ayuda" + "Cerrar sesión" con íconos

Cada item del menú: padding 10px 14px, border-radius 8px
- Item activo: background `var(--bg-active)`, color `var(--color-brand)`, borde izquierdo 3px `var(--color-brand)`
- Item hover: background `var(--bg-hover)`

## Header
- Fondo `var(--bg-primary)`, borde inferior 1px `var(--border)`, padding 12px 24px
- Izquierda: "Hola, [nombre]" (h2, 700) + "¡Juntos recuperamos el planeta!" (color `var(--text-secondary)`)
- Derecha: ícono campana (notificaciones/alertas con badge `var(--color-error)` si hay nuevas) + ícono config + badge empresa (nombre empresa con dropdown)

## Dashboard (estructura de referencia)
1. 4 KPI cards en fila (2x2 mobile): número grande (700, `var(--text-primary)`) + label + ícono Phosphor weight="duotone" (color pastel de la paleta) + indicador semanal (↑ verde `var(--color-success)` o ↓ rojo `var(--color-error)` + porcentaje)
2. Gráfica de línea: Recharts, línea `var(--color-brand)`, área con fill suave, tooltip con fecha + CO₂eq, selector período
3. Donut chart de materiales: a la derecha en desktop, debajo en mobile. Un color por categoría de la paleta secundaria. Leyenda debajo.
4. Tabla de registros: columnas sortables, status con dot de color + texto, menú acciones (⋯), paginación, "Desde/Hasta" para filtrar por fecha como campos con ícono calendario

## Componentes reutilizables
- KPICard, DataTable (sort, paginación, filtros, export), StatusBadge (dot + texto)
- PageHeader (título + breadcrumb + acciones), EmptyState, LoadingSkeleton
- Modal, Toast (auto-dismiss 5s), AlertBanner (dismissable), DateRangePicker
- Tabs con underline activo (como Detalles/Movimientos del referente)

## Submenú de navegación por secciones (REGLA TRANSVERSAL)
**Componente único:** `src/components/page-submenu.tsx` — `<PageSubmenu items={...} activeHash={...} />`

**SIEMPRE** usar este componente para cualquier submenú lateral de navegación por secciones, tanto en páginas legales como en configuración o cualquier página futura con anclas. NUNCA crear un submenú alternativo.

**Comportamiento obligatorio:**
- Posición: columna derecha, `position: sticky`, `top: 88–148px` según la altura de los stickies de cada página.
- Ancho: 180px fijo.
- Ítem activo: borde derecho 3px `var(--color-brand)`, fondo `var(--color-brand-light)`, texto brand en bold.
- **Tracking por scroll:** usa `IntersectionObserver` interno con `rootMargin: '-160px 0px -55% 0px'` — la sección activa se actualiza automáticamente al hacer scroll, SIN necesidad de que el usuario haga clic. También escucha `hashchange` para actualizarse al hacer clic en un enlace.
- En mobile (< 768px): ocultar el aside, no mostrar pills horizontales como reemplazo (el contenido es suficiente).

## Reglas generales
- Mobile-first SIEMPRE
- Radios: 12px cards, 10px buttons, 8px inputs, 100px badges
- Transiciones: 0.2s hovers, 0.3s sidebar/modals, 0.3s theme change
- Theme transition: transition background-color 0.3s, color 0.3s, border-color 0.3s en body
- Focus: outline 2px solid var(--color-brand) offset 2px
- NUNCA emojis en producción (usar Phosphor Icons)
- Íconos: SIEMPRE `@phosphor-icons/react`. Estilo `weight="duotone"` para decorativos/KPIs, `weight="regular"` (default) para controles interactivos. NUNCA lucide-react.
- Tipografía: H1/H2/H3 usan **Adobe Seravek** (`font-family: seravek`). Cuerpo usa **Open Sans**. Fallback de Seravek → Open Sans. NUNCA otras fuentes.
- NUNCA gradientes en botones
- NUNCA grises puros en NINGÚN elemento (#f5f5f5, #e8e8e8, #ccc, #999, #666, #474747, #333 PROHIBIDOS)
- NUNCA rgba(0,0,0,...) para sombras en tema claro (usar rgba(0,130,124,...))
- NUNCA usar guiones largos (–) ni punto y coma (;) en textos de la UI. Reemplazar con punto o coma según el sentido de la frase.
- TODO neutro se deriva de #00827C
- Solicita microinteracciones y animaciones personalizadas: animaciones sutiles al hacer hover, efectos de scroll o transiciones creativas en CSS.
- Aléjate de las estructuras clásicas (héroe + 3 columnas): Implementa diseños asimétricos, cuadrículas rotas (broken grids) o disposiciones tipográficas poco convencionales que rompan el molde clásico de la web y convivan armónicamente con el sistema de diseño actual.

## Voz y Tono (Brand Voice)
- **Idioma exclusivo:** Escribe siempre en **español**.
- **Actitud:** Redacta y construye frases usando **voz activa** y un tono inherentemente **positivo**.
- **Lenguaje a evitar:** Excluye bloqueadores cognitivos y negativos como "no", "complejo", "imposible", "difícil". En su lugar, usa un lenguaje enfocado hacia lo que *sí* es posible hacer.
- **Manejo de Alertas:** **Todas las alertas deben comenzar por la solución, NUNCA por el error.** (Ejemplo: En lugar de decir "Error de contraseña", debes decir "Ingresa una contraseña válida para continuar").
- **Filosofía central (Integración "Bio"):** Debes hablar e integrarte estructuralmente con la filosofía ecológica. Enmarca la UI SIEMPRE desde el **cuidado del medioambiente**. Haz que el texto conecte emocionalmente y subraye que las acciones del usuario generan un impacto verde profundo y valioso.
