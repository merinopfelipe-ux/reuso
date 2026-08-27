# Pilar 2: Arquitectura y Rendimiento

- **Regla de Independencia de Dominios (MANDATORIO Y PERMANENTE)**
  - **5 dominios obligatorios:** Toda tabla, columna o cálculo se clasifica en uno de los 5 dominios de datos: (A) Costos, (B) Cálculo Ambiental, (C) DPP, (D) Metadatos del Negocio, (E) Genérico.
  - **Prohibido cruzar dominios en un cálculo directo:** Ninguna función, endpoint o query mezcla datos de más de un dominio salvo a través de un punto de unión ya definido explícitamente (un snapshot, un rollup, o un FK de trazabilidad).

- **Regla de Rendimiento y Transiciones (MANDATORIO Y PERMANENTE)**
  - **Loading Boundaries en App Router:** TODO directorio de ruta que cargue o consulte datos (`page.tsx`) DEBE contar con su propio archivo `loading.tsx` en el mismo nivel.
  - **Diseño del Spinner Unificado:** Debe retornar un contenedor centrado (`w-full h-[60vh] flex flex-col items-center justify-center`) que incluya el ícono `<Loader2>` con `animate-spin text-[var(--color-brand)]` y un texto descriptivo.

- **Regla de Layouts de Contenedor Maestro y Grillas (MANDATORIO Y PERMANENTE)**
  - **Contenedor Único y Absoluto:** TODA PÁGINA DEBE estar envuelta por `w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8`.
  - **Espaciado Inferior Unificado:** Toda página del sistema DEBE usar estrictamente `pb-6` en su contenedor raíz. Se prohíbe usar `min-h-screen` en contenedores raíz anidados.
  - **Sistema de Grillas Interno (5 Variables Únicas):** La distribución interior usará EXCLUSIVAMENTE 100%, 50/50, 66/33, 4x25% o el Dashboard (2.5fr / 1.5fr / 2fr).
