---
tags: [reglas, arquitectura, diseño, ui, frugalidad, seguridad]
fecha: 2026-08-23
---

# Reglas de Oro del Ecosistema Reúso

Este documento consolida las directrices inquebrantables de desarrollo, diseño y arquitectura para la plataforma Reúso. Estas reglas rigen tanto para desarrolladores humanos como para agentes de Inteligencia Artificial.

---

## Pilar 1: Frugalidad y Ahorro Extremo 💡
La supervivencia de un modelo B2B SaaS en etapa temprana depende de la eficiencia máxima en costos.
- **Costo Cero por Defecto:** Siempre se deben buscar y proponer soluciones tecnológicas de $0 o de muy bajo costo utilizando las cuotas gratuitas (*free tiers*) de plataformas fiables (Cloudflare, GitHub, Supabase).
- **Ahorro de Tokens de IA:** Toda solución de código, base de datos o lógica debe pensarse para consumir la menor cantidad de tokens de IA posible (prompts cortos, retornos precisos y almacenamiento ligero).
- **Eficiencia General:** Ahorro en espacio de disco, ancho de banda y uso de librerías. No instalar paquetes gigantes si una función nativa lo resuelve. La mentalidad es la frugalidad absoluta.

---

## Pilar 2: Arquitectura y Rendimiento 🏗️
Reglas estructurales para garantizar la integridad y velocidad de la plataforma.
- **Independencia de los 5 Dominios:** Toda tabla pertenece a uno de los 5 dominios: Costos, Cálculo Ambiental, DPP, Metadatos Genéricos, o Taxonomía. Queda prohibido cruzar dominios en cálculos directos (SQL Joins ad-hoc) sin un punto de unión explícito.
- **Rendimiento App Router:** Para evitar el congelamiento de interfaz, todo directorio de ruta (`page.tsx`) que consulte datos debe tener su propio `loading.tsx` con un contenedor centrado y el ícono `<Loader2>` rotando.
- **Contenedor Maestro y Grillas:** 
  - Todo layout principal está restringido a `max-w-[1440px]`.
  - Prohibido el uso de `min-h-screen` anidado que esconda el footer.
  - Existen solo 5 esquemas de Grid permitidos (100%, 50/50, 66/33, 4x25% y Dashboard [2.5/1.5/2]).

---

## Pilar 3: Formatos y Datos (Data UX) 🔢
Estandarización de la información mostrada al usuario.
- **Formato Numérico y Moneda:** Uso estricto de apóstrofe para separar millones en COP (ej. `$ 1'500.000`) y puntos para miles. Alineación derecha para números en tablas.
- **Código de Cotización:** Siempre debe iniciar con el formato inquebrantable `COT XXXX`.
- **Teléfonos y Textos:** Formato telefónico estricto (`+57 (300) 300 3030`). Prohibido el uso de ALL CAPS (mayúsculas sostenidas), uso obligatorio de Title Case.
- **Objetividad y Cero Promesas:** Prohibido usar adjetivos absolutos ("exacto", "perfecto"). Usar siempre lenguaje estimativo ("estimado", "promediado").

---

## Pilar 4: UI, Componentes y Estética Visual 🎨
La identidad visual de sostenibilidad y las reglas de interacción de componentes.
- **Modales y Popups:** Todo modal debe montarse en Portal al 100% de pantalla (`fixed inset-0 z-[9999]`), usar el componente unificado `Modal` con botón de cierre ("X") arriba a la derecha y 2 botones de acción sólidos abajo.
- **Selectores:** Prohibición estricta de `<select>` nativos del SO. Deben usarse menús personalizados con capa transparente y el ícono `<ChevronDown />`.
- **Acciones Destructivas:** Prohibido el uso de la "X" para eliminar. Uso obligatorio del ícono rojo `<Trash />` sin fondo.
- **Controles Activos:** Todo botón (incluso secundarios) debe tener fondo relleno (`bg-white` o `bg-card`). Reutilización obligatoria del `RichTextEditor` en lugar de crear textareas básicos.
- **El Color Sostenible:** Todo elemento de cálculo ambiental y branding principal debe usar `var(--color-brand)` (verde Reúso).
- **Estándar de Tablas:** 
  - Cabecera siempre verde translúcida sin hover.
  - Alternancia de filas (Zebra Striping) a partir de la segunda fila (`bg-[var(--bg-zebra)]`).
  - Paginación totalmente desacoplada del contenedor de scroll lateral de la tabla.
- **Tarjetas y Sombras:** Cero sombras estructurales en tarjetas estáticas (solo bordes). Las sombras (`shadow-lg`) se reservan exclusivamente para elementos flotantes (dropdowns, modales). Cero scroll interno en tarjetas.
- **Líneas Divisorias:** Prohibidas en paneles generales. Solo permitidas sobre totales financieros y en pies de tarjeta.
- **Jerarquía en Feeds:** Texto principal a `13px`, metadatos a `10px`.

---

## Pilar 5: Seguridad Nativa y Prevención 🛡️
Esta regla asegura que el sistema sea invulnerable a fugas y ataques utilizando exclusivamente herramientas gratuitas, manteniendo la Frugalidad (Pilar 1) como directriz suprema.
- **Identidad y Acceso (Auth):** Prohibido proponer servicios de terceros de pago. Toda autenticación debe hacerse exclusivamente con Supabase Auth y Row Level Security (RLS).
- **Escaneo de Vulnerabilidades:** Uso exclusivo de GitHub Dependabot y `npm audit` para detectar brechas en paquetes.
- **Prevención de Fugas en Código:** Uso obligatorio de `gitleaks` mediante Husky (pre-commit hook) para evitar que se suban credenciales por error.
- **Gestión de Secretos:** Las variables sensibles vivirán exclusivamente en el gestor nativo de Entorno de Vercel.
