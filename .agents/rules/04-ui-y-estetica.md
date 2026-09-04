# Pilar 4: UI, Componentes y Estética Visual

Este pilar unifica la experiencia interactiva, los componentes y la identidad visual de la plataforma.

## A. Componentes e Interacción
- **Regla de Popups y Modales Unificados (MANDATORIO Y PERMANENTE)**
  - **Portal 100%:** Todo modal debe montarse mediante Portal en `document.body` (`fixed inset-0 z-[9999]`).
  - **Estructura `Modal`:** Botón "X" arriba derecha, ícono descriptivo, 2 botones de acción sólidos abajo.
  - El fondo detrás del ícono del modal debe heredar el color del ícono con opacidad tenue. Para eliminar, DEBE ser rojo (`var(--color-error)`).

- **Regla de Dropdowns y Selectores (MANDATORIO Y PERMANENTE)**
  - Prohibido usar `<select>` nativo. Todos los dropdowns deben usar componentes React personalizados con capa transparente de fondo (`fixed inset-0 z-40`) y flecha `<ChevronDown />`.

- **Regla de Íconos de Eliminación (MANDATORIO Y PERMANENTE)**
  - Prohibido usar "X". Debe usarse `<Trash />` rojo (`text-[var(--color-error)]`) sin bordes ni fondo. Al hover, `opacity-50`.

- **Regla de Relleno Obligatorio de Botones (MANDATORIO Y PERMANENTE)**
  - Todos los botones (incluso de contorno) DEBEN tener fondo sólido relleno (`bg-white` o `bg-card`).

- **Regla de Componentes Reutilizables (MANDATORIO Y PERMANENTE)**
  - Uso obligatorio del `@/components/ui/rich-text-editor` para WYSIWYG, integrando el botón de Guardar en su prop `footer`.
  - Uso obligatorio de `@/components/ui/button`.

## B. Diseño Visual y Layout
- **Regla de Tarjetas y Componentes de Diseño (MANDATORIO Y PERMANENTE)**
  - **Sin sombras:** Prohibido usar sombras en tarjetas de layout. Usar `rounded-[12px] border border-[var(--border)] p-4 bg-[var(--bg-card)]`.
  - **Cero Scroll Interno:** Prohibido usar scroll interno (`overflow-y-auto`) dentro de las tarjetas estáticas.
  - Sombras exclusivas para elementos flotantes (Modales, Dropdowns).

- **Regla de Estándar de Tablas (MANDATORIO Y PERMANENTE)**
  - Paginación totalmente desacoplada del contenedor `overflow-x-auto` de la tabla.
  - Cabecera: Siempre fondo verde translúcido (`bg-[var(--bg-table-header)]`) con letra verde (`text-[var(--color-brand)]`), sin efecto hover.
  - Zebra Striping: Primera fila de datos con `bg-[var(--bg-card)]`, segunda con `bg-[var(--bg-zebra)]`.
  - Hover: `hover:bg-[var(--bg-table-hover)]`.

- **Regla de Color Sostenible (MANDATORIO Y PERMANENTE)**
  - Uso estricto de `var(--color-brand)` (verde Reúso) para branding, cálculo ambiental y totales de CO2. Quedan prohibidos verdes genéricos de Tailwind.

- **Regla de Líneas Divisorias (MANDATORIO Y PERMANENTE)**
  - Prohibidas líneas divisorias innecesarias en secciones intermedias. Solo permitidas sobre totales financieros y en pies de tarjeta o cabeceras de tabla.

- **Regla de Jerarquía Tipográfica en Feeds (MANDATORIO Y PERMANENTE)**
  - Texto principal (acción) a `13px` y peso regular. Metadatos (fecha, autor) a `10px`.

- **Regla Intocable de Liquid Glass (MANDATORIO Y PERMANENTE)**
  - El diseño de las tarjetas (cards) de los '18 cálculos' y otras secciones de la Landing utiliza el **Rediseño Liquid Glass Premium**. Esto incluye clases avanzadas como `backdrop-blur-xl` y máscaras complejas en los estilos inline (`WebkitMask`, `maskComposite`, `Reborde Liquid Glass Disímil`).
  - **BAJO NINGUNA CIRCUNSTANCIA** se debe simplificar, modificar o eliminar este diseño de Liquid Glass. Es el estándar estético aprobado en Obsidian y debe permanecer intacto.
