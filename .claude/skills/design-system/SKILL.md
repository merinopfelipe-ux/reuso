---
name: design-system
description: Sistema de diseño de la Calculadora de Reúso (reuso.lurdes.co). REGLAS FUNDAMENTALES — (1) Mobile-first SIEMPRE. (2) Dos tokens sagrados de color — Negro Lurdes #474747 y Sueños de Pistacho #D6F391 — nunca variar. (3) Componentes canónicos únicos (Button, Modal): nunca crear variantes ad-hoc. Usar cuando se construyan páginas, dashboards o componentes.
metadata:
  version: V9.0
  actualizado: 2026-07-26
---

# Design System — Calculadora de Reúso (V9.0)

Esta es la ÚNICA fuente de verdad del sistema de diseño para Claude. Debe reflejar exactamente `src/app/globals.css` (las variables CSS reales que corren en producción) y las reglas irrenunciables de `CLAUDE.md`. Si algo aquí alguna vez difiere del CSS real, el CSS real gana y este archivo se corrige.

## REGLA OBLIGATORIA #1: MOBILE-FIRST SIEMPRE
TODO componente, página y layout se diseña primero para 375px y luego se escala hacia arriba con breakpoints (`sm:` 640px, `md:` 768px, `lg:` 1024px). NUNCA al revés. Si un componente no funciona en 375px, está mal hecho.

## REGLA OBLIGATORIA #2: DOS TOKENS SAGRADOS DE COLOR
- **Negro Lurdes `#474747`** — el único negro permitido en toda la UI. PROHIBIDO `#000000` sin excepción, incluso en overlays semitransparentes (usar `bg-[#474747]/35`, nunca `bg-black/35`).
- **Sueños de Pistacho `#D6F391`** — el único pistacho permitido. PROHIBIDA cualquier variante (`#8AD0B2` es Aroma de Menta, un acento distinto, no un sustituto).
- Ningún archivo debe redefinir estos dos valores por su cuenta. Si necesitas el negro o el pistacho, usa las variables CSS (`var(--text-primary)` en noche, `var(--color-brand)` en noche) o el hex exacto, nunca un tono aproximado.

## REGLA DE CONTRASTE — CRÍTICA E IRRENUNCIABLE
**Cuando el fondo de un elemento es pistacho (`#D6F391`, opaco, no con opacidad reducida), el texto SIEMPRE es Negro Lurdes `#474747`. PROHIBIDO texto blanco sobre pistacho** — el pistacho es un color claro, el blanco no se lee sobre él.

Esta regla no es exclusiva del pistacho: **ningún texto va en blanco sobre un fondo claro**, y ningún texto va en `#474747`/negro sobre un fondo oscuro. Antes de fijar un color de texto, pregúntate qué tan claro es el fondo debajo, no solo si "estamos en modo noche".

Patrón correcto (ya así en `--color-brand`/`--text-on-brand` de `globals.css`, úsalo siempre que puedas en vez de hardcodear):
```
// vía variables (preferido, ya cambia solo con el tema):
bg-[var(--color-brand)] text-[var(--text-on-brand)]

// si hace falta un condicional explícito:
isDark ? 'bg-[#D6F391] text-[#474747]' : 'bg-[#00827C] text-white'
```

## REGLA OBLIGATORIA #3: NUNCA HARDCODEAR COLORES QUE DEBERÍAN SER VARIABLES
El bug de modo noche más común en este proyecto es un componente que declara sus propios colores (`const BRAND = '#00827C'`, `background: '#FFF'`, `color: '#474747'`) en vez de usar las variables CSS. Eso hace que el componente se vea idéntico en día y noche, o directamente ilegible en noche (texto oscuro sobre fondo oscuro, tarjetas blancas sobre fondo `#474747`).

**Antes de escribir un color a mano, busca si ya existe una variable para ese propósito** (ver tabla completa más abajo). Solo usa un hex directo para colores de acento que NO cambian entre temas (`--color-success`, `--color-error`, `--color-warning`, `--color-info`, `--color-pistacho`, `--color-menta`, `--color-nogal`, `--color-rosa`) o para lógica condicional explícita de `isDark` cuando el componente ya maneja su propio estado de tema (páginas públicas/landing).

## Variables CSS — Tema claro (`:root`, `[data-theme="light"]`)
```
--bg-primary: #FFFFFF        --text-primary: #474747
--bg-secondary: #FFFFFF      --text-secondary: #474747
--bg-card: #FFFFFF           --text-placeholder: #7FA8A5
--bg-integrated: rgba(0,130,124,.02)
--bg-sidebar: #FFFFFF        --border: rgba(0,130,124,.12)
--bg-hover: rgba(0,130,124,.06)   --border-light: rgba(0,130,124,.06)
--bg-input: #FFFFFF          --shadow: 0 1px 3px rgba(0,130,124,.06)
--bg-active: rgba(0,130,124,.10)  --divider: rgba(0,130,124,.08)
--bg-zebra: rgba(0,0,0,.01)
--bg-table-hover: rgba(0,0,0,.02)
--bg-table-header: rgba(0,130,124,.04)
--skeleton-base: #EBF5F4     --skeleton-shine: #F2F9F8
--text-on-brand: #FFFFFF     (texto sobre botón brand #00827C: blanco, SÍ se lee)
```

## Variables CSS — Tema noche (`[data-theme="dark"]`, "Protocolo Lurdes")
```
--bg-primary: #474747  (Negro Lurdes, fondo de página)      --text-primary: #FFFFFF
--bg-secondary: #525252  (Nivel 1: cards, paneles)           --text-secondary: #E0E0E0
--bg-card: #525252                                            --text-placeholder: #888888
--bg-input: #5A5A5A  (Nivel 2: inputs, hover)                --text-on-brand: #474747 (texto sobre botón brand pistacho: negro Lurdes, NUNCA blanco)
--bg-integrated: rgba(255,255,255,.04)
--bg-hover: rgba(214,243,145,.06)    --border: rgba(255,255,255,.08)
--bg-active: rgba(214,243,145,.10)   --border-light: rgba(255,255,255,.04)
--bg-zebra: rgba(255,255,255,.01)    --shadow: 0 12px 60px rgba(71,71,71,.4)
--bg-table-hover: rgba(255,255,255,.02)
--bg-table-header: rgba(214,243,145,.04)
--skeleton-base: #525252   --skeleton-shine: #5A5A5A
--divider: rgba(255,255,255,.06)
--color-brand: #D6F391   (en noche el "brand" ES el pistacho, no el teal)
--color-brand-light: rgba(214,243,145,.15)
--btn-error-text: #474747
```
**Elevación tonal en noche: los elementos se ACLARAN, nunca se oscurecen.** `#474747` (fondo) → `#525252` (nivel 1: cards) → `#5A5A5A` (nivel 2: inputs, hover). PROHIBIDO cualquier otro gris intermedio inventado.

`--color-brand` es la variable que cambia de significado entre temas (`#00827C` teal en día, `#D6F391` pistacho en noche) precisamente para que un mismo `bg-[var(--color-brand)] text-[var(--text-on-brand)]` sea siempre correcto y de alto contraste sin condicionales manuales. Prefiere esto sobre escribir `isDark ? ... : ...` a mano.

## Colores de acento (constantes, no cambian entre temas)
```
--color-brand-hover: #006B66   (hover del brand en día)
--color-success: #38B98E   --color-error: #FF5E4B
--color-warning: #F6BF3E   --color-info: #59A6E4
--color-pistacho: #D6F391  --color-menta: #8AD0B2
--color-nogal: #AD7C43     --color-rosa: #F3BBD3
--color-success-content / --color-error-content / --color-warning-content / --color-info-content:
  versiones ajustadas para texto legible sobre fondo tenue de cada color (día y noche tienen valores distintos, ya definidos en globals.css — úsalas en vez de recalcular opacidades a mano).
```

## FONDOS SIEMPRE PLANOS
Día: `#FFFFFF` puro. Noche: `#474747` Negro Lurdes. PROHIBIDO en fondo de PÁGINA: gradientes, blobs, `animate-blob`, glows, `radial-gradient`/`linear-gradient` de pantalla completa. Efectos visuales (glass, blur, sombras, blobs decorativos) solo dentro de componentes internos (cards, modales, sidebar, header), nunca como fondo de página completa.

## Componentes canónicos — ÚNICOS, no crear variantes ad-hoc

### Button — `src/components/ui/button.tsx`
Único componente permitido para botones de acción (Guardar, Crear, Cancelar, Eliminar, Confirmar). Antes de escribir `<button style={{...}}>` o una clase Tailwind ad-hoc para una acción, usa `<Button>`.
```tsx
import { Button } from '@/components/ui/button'

<Button variant="primary">Guardar</Button>            {/* acción principal: rounded-full, bg-[var(--color-brand)], text-[var(--text-on-brand)] */}
<Button variant="secondary" onClick={onCancelar}>Cancelar</Button>  {/* rounded-full, borde, fondo bg-[var(--bg-card)] */}
<Button variant="danger" onClick={eliminar}>Eliminar</Button>       {/* rounded-full, bg-[var(--color-error)], texto blanco (el error nunca es pistacho, el blanco sí contrasta) */}
<Button variant="ghost">Ver más</Button>               {/* sin fondo, solo texto + hover sutil */}
<Button loading={guardando}>Guardar</Button>            {/* spinner automático (Loader2 + animate-spin), reemplaza al texto */}
<Button size="sm">Añadir fila</Button>                  {/* botones chicos dentro de listas/editores */}
```
Nunca declares tu propio `btnPrimario`/`btnGuardar`/`btnBase` local en un componente — es exactamente el tipo de duplicación que rompe la unidad visual del sistema. Si `Button` no cubre un caso legítimo nuevo, se amplía `Button`, no se crea un botón paralelo.

**Regla de alternancia en grupos de botones (al lado o debajo uno de otro):** en cualquier fila o columna de `Button` contiguos (barras sticky, pies de tarjeta, toolbars), nunca dos `variant="secondary"` (borde) ni dos `variant="primary"` (verde sólido) quedan pegados entre sí. Cada botón alterna con el de al lado: sólido-borde-sólido o borde-sólido-borde, nunca sólido-sólido ni borde-borde consecutivos. Con 2 botones adyacentes: uno `primary`, el otro `secondary` (mismo criterio ya fijado para el pie de `Modal`, línea de abajo). Con 3 o más en fila/columna, revisa cada par consecutivo, no solo el conjunto completo — el del medio debe contrastar con AMBOS vecinos.

**Regla de centrado (directriz explícita del usuario, 2026-08-21):** una fila de acción tipo "Atrás + acción principal" (pie de formulario multi-paso, ej. Atrás/Crear y continuar, No es este cliente/Continuar) SIEMPRE se centra horizontalmente (`flex gap-3 justify-center`), nunca alineada a la izquierda ni estirada a ancho completo con `flex-1`/`w-full` — cada botón mide su ancho natural según el texto. Aplica también a `SwitchOpciones` (abajo): siempre `mx-auto` dentro de su contenedor, nunca pegado al borde izquierdo. Excepción: filas de botones de igual ancho por diseño (ej. el pie de una tarjeta de advertencia con 2 opciones que deben verse balanceadas, `flex-1` en ambos) — ahí sí se justifica el ancho completo porque ninguno es "el principal".

### SwitchOpciones — `src/components/ui/switch-opciones.tsx`
Único componente permitido para elegir entre 2-3 opciones excluyentes con apariencia de switch (fondo + píldora deslizante). Nunca un switch ad-hoc por pantalla.
```tsx
import { SwitchOpciones } from '@/components/ui/switch-opciones'

<SwitchOpciones
  className="max-w-[220px] mx-auto"   // siempre centrado, ver regla de arriba
  valor={tipo}
  onChange={setTipo}
  opciones={[
    { valor: 'persona', label: 'Persona', icon: <User size={14} /> },
    { valor: 'empresa', label: 'Empresa', icon: <Buildings size={14} /> },
  ]}
/>
```

### Modal — `src/components/ui/modal.tsx`
Único componente permitido para modales/popups de confirmación o formularios cortos.
```tsx
import { Modal } from '@/components/ui/modal'

<Modal
  abierto={modalOpen}
  onClose={() => setModalOpen(false)}
  titulo="Eliminar certificado"
  descripcion="Esta acción no se puede deshacer."
  varianteConfirmar="error"          // 'brand' (default) o 'error'
  textoConfirmar="Eliminar"
  onConfirmar={handleEliminar}
>
  {/* contenido adicional opcional: inputs, selects, listas */}
</Modal>
```
Especificación fija (no renegociable sin actualizar este archivo):
- Se monta con `createPortal(children, document.body)` — cubre el 100% del viewport, incluidos header/sidebar/footer.
- Overlay: `fixed inset-0 z-[9999] bg-[#474747]/60 backdrop-blur-xs` (Negro Lurdes, NUNCA `bg-black`/`#000000`, ni en overlays).
- Panel: `max-w-sm rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl`, animación `zoom-in-95`.
- Botón "X" de cierre: esquina superior derecha, `absolute top-4 right-4`.
- Encabezado: ícono opcional en círculo `rgba(0,130,124,0.1)` + título. `descripcion` es un subtítulo de **una sola línea**, nunca un párrafo largo — el texto explicativo largo va como primer elemento de `children` (dentro del cuerpo scrolleable), no en `descripcion`. **Sin `descripcion`, el título se centra verticalmente con el ícono (`items-center`) — nunca pegado arriba.** Con `descripcion` (título+subtítulo apilados, más alto que el ícono), se alinea arriba (`items-start`). El componente ya resuelve esto solo según si pasas `descripcion` o no, no lo fuerces con className.
- Pie: SIEMPRE dos acciones (`Button variant="secondary"` + `Button variant="primary"|"danger"`), nunca un solo botón ni tres.
- Para el aviso reutilizable de "salir sin guardar", usa `<ModalConfirmarSalida>` (ya preconfigurado), no lo repliques.

Modales con contenido más largo (formularios completos) pueden usar el mismo `Modal` pasando el formulario como `children` y controlando el submit desde `onConfirmar`. Si el contenido excede el alto de pantalla en móvil, el panel interno necesita `max-h-[90vh] overflow-y-auto` (regla mobile-first, ver skill `mobile-first` del proyecto).

### Popovers/menús desplegables (botón + panel) — regla general
Todo menú desplegable tipo botón+panel (columnas visibles, filtros, ordenar, "⋮" de una columna, etc.) se monta vía `createPortal(..., document.body)` con posición `fixed` calculada del botón que lo abre, nunca `position: absolute` dentro del propio elemento — si el trigger vive dentro de un contenedor con `overflow-x-auto`/`overflow-y-auto` (ej. una tabla), el panel `absolute` queda atrapado y recortado por ese scroll, obligando a scrollear DENTRO del contenedor para verlo completo (bug real reportado). Referencia: `Popover` en `src/app/(empresa)/empresa/cotizador/components/toolbar-vistas.tsx`.
Scrollear la página o cualquier contenedor de atrás **nunca cierra el menú** — lo reposiciona (recalcula `top`/`left` del botón en cada evento de scroll, capturado con `{ capture: true }` para atrapar scroll de contenedores internos también). Si el scroll ocurre DENTRO del propio panel (ej. una lista larga de columnas con su propio `overflow-y-auto`), se ignora por completo — no reposiciona ni cierra nada. Cerrar el popover queda reservado únicamente para clic fuera (trigger y panel) o Escape.

### Tablas ordenables y de columnas configurables — regla general (2026-08-17)
Toda tabla de la plataforma (con encabezado ordenable o no) sigue este patrón, no uno propio por archivo:

- **Sin animación en íconos de tabla**: `wrapIcon()` (`src/components/ui/icons.tsx`) agrega por defecto un zoom de hover (`group-hover:scale-110`) a TODO ícono del sistema, sin que un `className` propio pueda sobreescribirlo (se fusiona, no se reemplaza). Todo ícono dentro de una fila, encabezado, menú "⋮" o paginación pasa `sinAnimacion` (ej. `<ArrowUp size={13} sinAnimacion />`) para apagar ese comportamiento — directriz explícita: cero animación en controles de tabla.
- **Encabezado ordenable canónico**: `<SortTh>` (`src/components/sort-th.tsx`) para tablas de columnas fijas; `ColumnaHeaderMenu` (`toolbar-vistas.tsx`) para tablas con editor de columnas. El ícono de orden es una flecha recta Lucide (`ArrowUp`/`ArrowDown` cuando esa columna ordena, `ArrowsDownUp`/`ArrowUpDown` en reposo), nunca un chevron — mismo tamaño (`size={13}`) en ambos estados, porque el trazo bidireccional ocupa menos del viewBox y se ve más chico si no se iguala el size a mano.
- **Ícono de orden invisible en reposo**: oculto (`opacity-0 group-hover:opacity-40`) salvo que esa columna sea la que ordena activamente (`opacity-100` permanente). Al pasar el cursor sobre una columna YA activa, el botón de orden también muestra fondo de hover (`var(--table-orden-hover)`) — debe quedar claro que se puede volver a cambiar el sentido del orden, no solo en las columnas inactivas.
- **Columna activa = gris muy tenue derivado del token, nunca gris suelto**: `background: var(--table-orden-activo)` en el `<th>` y en cada `<td>` de esa columna (definidas en `globals.css`, día `rgba(71,71,71,0.015)`, noche `rgba(255,255,255,0.015)`; el hover no-activo usa `--table-orden-hover` a `0.01`). Es el mismo criterio que el gris de `/admin/status` en "Incidencias Activas" — un neutro derivado de Negro Lurdes/blanco, jamás un hex gris inventado.
- **Menú "⋮" por columna**: solo visible al hacer hover de esa columna (`opacity-0 group-hover:opacity-100`) o mientras su Popover está abierto (`abierto ? 'opacity-100' : ...`, vía render-prop `trigger(abrir, abierto)`) — nunca fijo. Contenido: Orden ascendente/descendente, Filtrar por esta columna, separador, Inmovilizar columna, Agregar columna (lista inline de columnas ocultas), Eliminar columna.
- **Paginación única de la plataforma**: `<Pagination>` (`src/components/ui/pagination.tsx`) — numeración con página actual recuadrada, Anterior/Siguiente, selector "N por página" (vía `Selector`, nunca `<select>` nativo). Prohibido armar paginación ad-hoc por archivo. **Posición: siempre después de la última fila de la tabla, nunca antes ni dentro de un contenedor con scroll horizontal propio** (ni el `overflow-x-auto` de la tabla, ni un `overflow-x-auto` puesto sobre el propio footer de paginación) — cualquiera de los dos deja el selector "N por página" fuera de vista, obligando a scrollear para encontrarlo (bug real reportado dos veces). El footer de paginación (`display:flex, justify-content:space-between`) nunca envuelve a una segunda línea ni scrollea: el texto de conteo ("X registros · Página Y de Z") se acorta primero (`min-width:0, overflow:hidden, text-overflow:ellipsis, white-space:nowrap, flex-shrink:1`) y el `<Pagination>` en sí siempre lleva `flex-shrink:0` — así el paginador nunca se comprime ni se esconde, pase lo que pase con el ancho disponible.
- **Tablet: SIEMPRE se ven las primeras 5 columnas de datos sin scroll horizontal, sin contar el check inicial ni el ícono de abrir del final.** Es la regla que manda por encima de que el contenido "respire" — prioridad explícita del usuario. En cualquier tabla con más de 5 columnas potenciales (ej. editor de columnas del Cotizador): padding de celda `px-2 lg:px-3` (checkbox `px-2 lg:px-4`), y el ancho tope por tipo de columna (`anchoColumna()` en `src/lib/cotizador/vistas.ts`) va MUY ajustado en tablet/móvil (rango 90-130px según el tipo) y solo se abre generoso en desktop (`lg:`, rango 130-240px). Antes de subir CUALQUIER ancho tope o gap en tablet/móvil (ej. el ícono `>` junto al texto), hay que volver a sumar el presupuesto completo de las 5 columnas + las columnas fijas — es fácil romper esta regla optimizando una sola columna sin revisar el total. Columnas adicionales (6ª en adelante) sí pueden requerir scroll horizontal dentro del contenedor `overflow-x-auto`, eso es aceptable — la regla es sobre las primeras 5, no sobre el total.
- **Desktop (`xl:` en adelante, NUNCA `lg:`): las mismas primeras columnas intentan caber en una sola línea, sin partirse.** El corte de "desktop real" es `xl:` (1280px), no `lg:` (1024px) — un iPad en horizontal mide exactamente 1024px, así que `lg:` le daba por error el ancho ancho de escritorio a una tablet real, rompiendo la regla de "5 columnas sin scroll" (bug real reportado 2026-08-17). Con más espacio disponible que en tablet, el ancho tope sube vía `xl:max-w-[...]` (ver `anchoColumna()` en vistas.ts) — sigue siendo "parte solo si hace falta" (`line-clamp-2 break-words`, nunca forzado), simplemente con más margen antes de que haga falta partir. Mismo criterio para padding de celda (`px-2 xl:px-3`, checkbox `px-2 xl:px-4`) y gap entre texto e ícono (`gap-1 xl:gap-2`) — cualquier ensanche "para desktop" en esta tabla usa `xl:`, nunca `lg:`.
- **El código de cotización ("COT XXXXXXXX") nunca se parte, en ninguna pantalla** — `whitespace-nowrap` siempre, con un ancho tope generoso (`anchoColumna` en vistas.ts) para que en la práctica nunca haga falta partirlo. Directriz explícita del usuario: en móvil y tablet es absoluto, en desktop solo se toleraría en un caso extremo (que el ancho amplio ya evita).
- **El número de teléfono NUNCA se parte y nunca se corta con "..." — se muestra completo siempre, en cualquier tabla de la plataforma.** `whitespace-nowrap` en el contenido + `overflow-visible` (nunca `truncate`/`overflow-hidden`) en el contenedor: si el ancho tope de la columna no alcanza, el número se desborda visualmente en vez de cortarse — se prioriza mostrarlo completo sobre la prolijidad del layout. Directriz explícita del usuario, repetida tras encontrar el mismo bug en más de una tabla — revisar TODAS las tablas con columna de teléfono al tocar esta regla, no solo la que se reportó.
- **Nunca truncar un título de columna con "...", en ningún tamaño de pantalla.** Si el label no cabe en el ancho tope del encabezado, pasa a una segunda línea (`whitespace-normal break-words`, nunca `truncate`) — directriz explícita del usuario. La celda de la **primera** columna de datos (la más leída, ej. nombre del cliente) sigue la misma regla con `line-clamp-2 break-words` en vez de `truncate` de una sola línea; el resto de columnas de datos sí puede truncar con "..." porque ahí el usuario prioriza compacidad sobre lectura completa.
- **Footer de paginación: nunca pasa a una segunda línea.** El contenedor del footer (conteo + `<Pagination>`) usa `overflow-x-auto` en vez de `flex-wrap` — con 100 resultados por página el contador de páginas se comprime o scrollea horizontalmente dentro de su propio contenedor, nunca empuja el resto del footer a una fila nueva.
- **Nunca uses `--color-brand-light` (8% de opacidad) como resaltado de una columna/fila entera** — es el tono correcto para el estado activo de un botón chico (pestaña, toggle), pero es demasiado oscuro para pintar una columna completa. El resaltado de columna activa es siempre `--table-orden-activo` (1.5%).
- **Alineación: título de columna SIEMPRE a la izquierda, el contenido de la celda depende del tipo de dato.** Texto (nombre, código, estado, correo) a la izquierda. Fechas y teléfonos al centro. Números (total, CO2, conteos, días) a la derecha. El encabezado nunca imita la alineación del contenido — es una directriz explícita del usuario, no una convención de "alinear todo igual".
- **Columnas de nombre (persona/cliente): nunca truncar con "...", pero tampoco forzar nombre y apellido en 2 renglones separados por defecto.** El salto a una segunda línea ocurre SOLO SI el contenido no cabe en el ancho tope de la columna, nunca de forma forzada para todos los nombres por igual — pero cuando SÍ hace falta partir, el corte va EXACTO entre nombre y apellido, nunca a mitad de un nombre/apellido compuesto (2 nombres + 2 apellidos). Patrón: nombre y apellido van cada uno en su propio `<span className="whitespace-nowrap">` (no se puede partir por dentro), separados por un espacio normal fuera de esos spans — ese espacio es el ÚNICO punto donde el navegador puede saltar de línea. Nunca uses una sola cadena `"nombre apellido"` con `break-words` suelto — el navegador puede partir en cualquier palabra, no necesariamente justo entre nombre y apellido. Directriz explícita del usuario. Regla general para cualquier tabla con nombres, no solo el Cotizador.
- **El ícono de "abrir fila" (`>`) no es una columna aparte al final de la tabla.** Va pegado a las columnas que identifican la fila (ej. código/nombre en el Cotizador — código y nombre juntos identifican a la persona de esa cotización), no en una columna vacía extra al borde derecho de la tabla — directriz explícita del usuario.
- **Filas de tabla: NO son clicables como bloque completo por defecto.** Solo las celdas que identifican a una entidad concreta navegan a algún lado (cada una a SU destino propio, no necesariamente el mismo — ej. en el Cotizador, "Cotización" abre la cotización y "Nombre" abre la ficha del cliente, dos destinos distintos), con su propio `onClick` + `e.stopPropagation()` y `cursor-pointer` solo en esa celda. El resto de columnas de una fila NUNCA navegan al hacer clic, solo se resaltan (el hover de fila ya lo hace vía CSS, no depende de ningún `onClick`). Directriz explícita del usuario — antes toda la fila era un solo link grande, eso quedó descartado.
- **Formato de fecha único de la plataforma**: `formatFecha(iso, { conHora? })` y `formatHora(iso)` en `src/lib/format.ts` — "D de mes. de AAAA" (el punto después del mes es obligatorio, `Intl`/`toLocaleDateString('es-CO', {month:'short'})` lo omite, es un error real). Con hora: agrega "H:MM a.m./p.m." sin coma antes. **Nunca** uses `toLocaleDateString`/`toLocaleString` con `month: 'short'` directo en un componente nuevo — siempre estas funciones, para que el punto del mes no vuelva a faltar. Cuando fecha+hora no caben en una línea, el salto a un segundo renglón ocurre SOLO SI hace falta — y cuando hace falta, el corte va EXACTO entre fecha y hora, nunca dentro de la fecha ("11 de" / "ago. de 2026") ni dentro de la hora ("1:55" / "p.m."). Mismo patrón que la columna de nombre: `<span className="whitespace-nowrap">{fecha}</span>{' '}<span className="whitespace-nowrap">{hora}</span>` — cada mitad no se puede partir por dentro, el espacio normal entre ambos spans es el único punto de corte posible. Nunca una sola cadena `"fecha hora"` con `break-words` suelto (el navegador partiría en cualquier palabra de la fecha, no en el límite fecha/hora).

### Spinners de carga
Usa la clase de Tailwind `animate-spin` sobre el ícono `Loader2` (de `@/components/ui/icons`). PROHIBIDO declarar `@keyframes spin` o `.lucide-spin` locales por archivo — ya existe soporte nativo de Tailwind, duplicarlo es exactamente el tipo de inconsistencia que este documento busca eliminar.

### Loading skeletons entre página y página
Cada grupo de rutas (`(auth)`, `(dashboard)`, `(empresa)`, `(admin)`) tiene su propio `loading.tsx` en la raíz del grupo (no en una carpeta literal fuera del grupo — ahí Next.js nunca lo ejecuta), y las subrutas de mayor tráfico tienen el suyo propio también (ej. `admin/categorias/loading.tsx`, `admin/usuarios/loading.tsx`) — el `loading.tsx` de grupo NO se dispara en navegación cliente entre subrutas del mismo grupo, solo en la entrada inicial. Usa la clase `.skeleton-shimmer` (ya definida en `globals.css`) para bloques que imitan la forma real del contenido que va a cargar (KPIs, tabla, tarjetas), mobile-first (`grid-cols-2 md:grid-cols-4`, nunca columnas fijas). Páginas públicas fuera de los 4 grupos (`/status`, `/cot/[token]`, `/verificar/[codigo]`, `/pasaporte/[codigo]`) usan `<LogoSpinner />` (`src/components/ui/logo-spinner.tsx`) a pantalla completa, mismo patrón que `src/app/loading.tsx` raíz.

### Loading dentro de un componente cliente (fetch propio, OBLIGATORIO)
Cualquier pantalla o sección que hace su propio `fetch` (no cubierto por un `loading.tsx` de ruta, ej. un `useEffect` que carga datos en un componente `'use client'` ya montado) DEBE usar `<Skeleton />`, `<SkeletonCard />` o `<SkeletonLista />` (`src/components/ui/skeleton.tsx`, envuelven `.skeleton-shimmer`) mientras `cargando === true`. **Prohibido**: texto plano `<p>Cargando...</p>`, `<div>Cargando X...</div>`, o `animate-pulse` con un color inventado por archivo (`bg-[#00827C]/05`, `bg-white/10`, etc. distintos cada vez) — esa inconsistencia es justo lo que generaba la sensación de "sistema lento" reportada por el usuario. Único caso fuera de esta regla: un texto de estado corto junto a un botón ya en curso (ej. "Guardando cambio..." al lado de un toggle), que no reemplaza contenido, solo informa una acción puntual.
```tsx
import { SkeletonLista, SkeletonCard, Skeleton } from '@/components/ui/skeleton'

{cargando ? <SkeletonLista filas={3} /> : /* contenido real */}
{cargando ? <SkeletonCard lineas={4} /> : /* una tarjeta */}
{cargando ? <Skeleton style={{ width: 120, height: 16 }} /> : /* un valor suelto */}
```

### Componentes que TODAVÍA no están unificados (estado real, no aspiracional)
`Button` y `Modal` (arriba) son los únicos componentes verdaderamente canónicos hoy — úsalos siempre. Lo siguiente NO es un componente único todavía, existe duplicado o disperso: KPI card (`src/components/admin/kpi-card.tsx` vs `src/components/dashboard/kpi-card-animado.tsx`, distintos), badges (`plan-badge.tsx`, `confianza-badge.tsx`, cada uno ad-hoc), tablas (cada página arma su propia `<table>`), tabs (cada página arma sus propios botones de pestaña). `EmptyState` (`src/components/empty-state.tsx`) sí es único, úsalo. **No afirmes que existe un `DataTable`, `Badge`, `StatusBadge`, `AlertBanner` o `Tabs` genérico — no existen.** Si vas a tocar varios de estos a la vez, es una buena oportunidad para unificarlos como se hizo con Button/Modal, pero no lo des por hecho sin verificar con `find`/`grep` primero.

## Estructura UI de la Calculadora de Reúso

### Sidebar (zona protegida, PR + aprobación del dueño del repo — ver `CLAUDE.md` Regla de Oro #2 y `conceptos/proteccion-codeowners` del Vault, ya no una clave hablada)
- Colapsado (default): 60px, solo íconos. Expandido (hover): 220px, ícono + texto, transición 0.3s ease.
- Mobile: oculto, hamburguesa en header, abre como drawer overlay.
- Item activo: fondo `var(--bg-active)`, color `var(--color-brand)`, indicador lateral 3-4px `var(--color-brand)`.
- **Máximo 4 ítems de primer nivel por rol** (directriz explícita del usuario 2026-09-01, mobile-first: es lo que se ve estético en 375px) — el resto se agrupa dentro de esos 4, nunca se agregan más ítems sueltos al nivel raíz.
- **Agrupación interna con subtítulo por grupo**: dentro del flyout de un ítem con `subItems`, un campo opcional `grupo` en cada `SubItem` (`src/components/sidebar.tsx`) pinta un encabezado (11px, bold, `letterSpacing: 0.04em`, blanco a 50-65% de opacidad) antes del primer ítem de ese grupo — solo cuando el grupo cambia respecto al anterior, nunca repetido en cada ítem. Referencia de patrón: mega-menú de barra lateral con categorías (ej. banca), no se inventa un componente nuevo, es una extensión del mismo flyout ya existente.

### Header (zona protegida, PR + aprobación del dueño del repo — ver `CLAUDE.md` Regla de Oro #2, ya no una clave hablada)
- Fondo `var(--bg-primary)`, borde inferior 1px `var(--border)`.
- Izquierda: saludo cálido ("Hola, [nombre]" + "¡Juntos recuperamos el planeta!", ver `feedback_voz_activa` — nunca reemplazar, solo añadir encima).
- Derecha: notificaciones, ayuda, badge de empresa, avatar de usuario.

### Dashboard (estructura de referencia)
1. KPI cards en fila (2 columnas en móvil, 4 en desktop): número grande + label + ícono + indicador de variación.
2. Gráfica (Recharts) con `ResponsiveContainer`/`width="100%"`, línea `var(--color-brand)`.
3. Tabla de registros: sortable, `StatusBadge` (dot + texto), envuelta en `overflow-x: auto` en un contenedor propio, paginación con botones ≥ 36-40px de objetivo táctil.

### Submenú de navegación por secciones
**Componente único:** `src/components/page-submenu.tsx` — `<PageSubmenu items={...} activeHash={...} />`. SIEMPRE usarlo para submenús laterales por anclas (páginas legales, configuración, etc.), nunca crear uno alternativo. `position: sticky`, ancho 180px, ítem activo con borde derecho 3px `var(--color-brand)`. En mobile (<768px) se oculta, sin reemplazo de pills horizontales.

## Reglas generales
- **Toda descarga de datos SIEMPRE pregunta el formato: CSV, Excel y PDF** (en ese orden) — nunca un botón que descarga directo un solo formato. Única excepción: la cotización pública compartida con el cliente (`/cot/[token]`), que siempre es PDF sin preguntar, porque ahí no hay "datos tabulares" que exportar en otro formato, es el documento en sí. Dos patrones válidos según de dónde salen los datos: `BotonDescargar` (`src/components/boton-descargar.tsx`, para exports generados en un endpoint server-side, ya usado en usuarios/empresas) o un `Popover` con las 3 opciones sobre datos ya cargados en el cliente (`descargarCSV`/`descargarExcel`/`descargarPDFTabla` de `src/lib/csv/`, patrón usado en el Cotizador). Nunca inventes un tercer patrón.
- **Los títulos de una card NUNCA llevan ícono al lado** (ej. `<User /> Datos del contacto`, `<Package /> Pasaportes DPP`) — solo el texto del título, sin `<div className="flex items-center gap-2">` envolviendo un ícono decorativo. Directriz explícita del usuario. Los íconos siguen siendo válidos en botones, badges, filas de dato individuales o acciones puntuales — la regla es específica del encabezado/título de una tarjeta.
- Mobile-first SIEMPRE (ver arriba).
- Radios: 12px cards, 10px botones normales, 999px (`rounded-full`) botones de acción y badges, 8px inputs.
- Transiciones: 0.2s hovers, 0.3s modales/sidebar/cambio de tema.
- Focus: `outline: 2px solid var(--color-brand); outline-offset: 2px`.
- NUNCA emojis en la interfaz del sistema (botones, títulos, labels, badges) como sustituto de un ícono Lucide — eso siempre es un ícono Lucide. Sí se permiten emojis en: (a) contenido de texto libre que escribe el propio usuario (notas internas, comentarios y campos de texto en general), y (b) elementos de personalización de cara al usuario (ej. ícono/avatar de usuario), cuando el diseño explícitamente lo contempla. La distinción es cromo del sistema (nunca emoji) vs. contenido o personalización del usuario (sí puede llevar emoji).
- **Íconos: Lucide Icons (`lucide-react`) por defecto**, vía el hub `src/components/ui/icons.tsx` — NUNCA importar `lucide-react` directamente en un componente de página, siempre desde el hub. Phosphor Icons (`@phosphor-icons/react`) se permite únicamente para (a) logotipos oficiales de marca/redes sociales (`brand-logos.tsx`), o (b) un ícono puntual que no exista en Lucide y sea irreemplazable — en ese caso se envuelve con `wrapPhosphorIcon` para igualar el grosor visual a Lucide.
- Tipografía: Open Sans en todo el cuerpo. `h1`/`h2`/`h3` heredan `seravek` como preferencia con fallback a Open Sans (definido en `globals.css`) — no introducir una tercera fuente.
- NUNCA gradientes en botones ni en fondos de página completa (sí se permiten en acentos puntuales dentro de tarjetas, con moderación).
- NUNCA grises puros (`#f5f5f5`, `#e8e8e8`, `#ccc`, `#999`, `#666`, `#333`) en ningún elemento. Todo neutro sale de `#00827C` (día) o de `#474747`/elevaciones (noche).
- NUNCA `rgba(0,0,0,...)` para sombras en tema claro (usar `rgba(0,130,124,...)`); en tema noche las sombras sí pueden partir de `rgba(71,71,71,...)` (Negro Lurdes), nunca de negro puro.
- NUNCA usar `;` ni `—` en textos de la UI. Punto o coma según el sentido de la frase.
- NUNCA `text-transform: uppercase` / clase `uppercase` en texto visible (directriz #5 de `CLAUDE.md`). Excepción: `capitalize` para nombres/roles generados dinámicamente.
- Microinteracciones: usar las clases `.hover-*` ya definidas en `globals.css` (`hover-pop`, `hover-trash`, `hover-slide-r`, etc.) en vez de inventar animaciones de hover nuevas por componente.
- **Clases Tailwind dentro de `src/lib/` sí se generan** — `tailwind.config.ts` (`content`) escanea `src/lib/**/*.{js,ts,jsx,tsx,mdx}` además de `pages/components/app` (agregado 2026-08-17 tras un bug real: `anchoColumna()` en `src/lib/cotizador/vistas.ts` devolvía clases `max-w-[...]` que nunca llegaban al CSS final porque `src/lib` no estaba en el glob). Si vas a devolver un className armado desde una función en `src/lib/`, confirma primero que el glob la cubre.
- **NUNCA `<select>` nativo del navegador** (sin estilo propio, distinto en cada sistema operativo). Usar `Selector` (`src/components/ui/selector.tsx`, genérico, opciones `{value,label}[]`) para listas simples, o `SelectorEmpresa` (`src/components/ui/selector-empresa.tsx`, con buscador) para elegir empresa. Mismo patrón botón+panel que `SelectorCiudad`/`SelectorPais`. Detectado 2026-08-11: 24 archivos usaban `<select>` nativo, migración parcial en curso (ver memoria `project_pendientes_2026-08-11`).
- **NUNCA un `<SelectorPais>` suelto junto a un `<input>` de celular armado a mano.** Único componente permitido para capturar un número de celular: `InputTelefono` (`src/components/ui/input-telefono.tsx`) — indicativo (bandera + código, ancho fijo 140px) + input con formato automático. Valida en vivo contra `validarTelefono()` (`src/lib/telefono.ts`, hoy solo Colombia +57 verificada: exactamente 10 dígitos, empieza en 3) y muestra el error al salir del campo (`onBlur`, nunca mientras el usuario todavía está escribiendo). Directriz explícita del usuario 2026-08-21: la validación de celular es un dato fundamental, tiene que atraparse temprano y de forma consistente en toda la plataforma, nunca replicada a mano pantalla por pantalla. Agregar un país nuevo a `validarTelefono` exige confirmar su formato real (dígitos/prefijo), nunca inventarlo. La validación bloqueante real sigue viviendo en el API route (server-side); `InputTelefono` es solo el feedback temprano para el usuario.

## Voz y Tono (Brand Voice)
- Idioma exclusivo: español.
- Voz activa, tono positivo. Evita "no", "complejo", "imposible", "difícil" — enmarca hacia lo que sí es posible.
- Alertas: empiezan por la solución, nunca por el error ("Ingresa una contraseña válida" en vez de "Error de contraseña").
- Integra la filosofía ecológica: el texto conecta emocionalmente con el impacto ambiental de las acciones del usuario.

## Nombre del producto
El nombre es **Calculadora de Reúso**. Nunca escribir solo "Reúso" como nombre del producto (excepción técnica: slugs de URL y variables de código).
