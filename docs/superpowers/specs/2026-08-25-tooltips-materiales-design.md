# Tooltips editables para materiales base del Cotizador — Diseño

**Estado**: aprobado por el usuario, 2026-08-25. Listo para plan de implementación.

## Contexto

`src/lib/cotizador/plantillas-base.ts` define `BASE_MATERIALES = ['Hierro', 'Acero', 'Polipropileno', 'Espumas rígidas', 'Espumas flexibles', 'Madera dura', 'Madera blanda', 'Cuero']` — la lista fija de materiales que siempre se muestran (vía `mergeMateriales`) en la Tarjeta 3 ("Cálculo ambiental") de `GrupoItemCard`, el componente donde el vendedor arma los materiales de un ítem NUEVO en `/empresa/cotizador/nueva`.

El usuario pidió agregar un tooltip explicativo a 4 de esos 8 nombres (los que generan más confusión: espuma rígida vs flexible, madera dura vs blanda), con textos exactos ya provistos, sin registro de quién/cuándo lo editó.

**Alcance final (corregido dos veces durante el brainstorming, esta versión es la definitiva):**
- **Ver el tooltip**: en CUALQUIER pantalla donde se muestre una fila de material cuyo nombre coincida con uno de los 8 conocidos — se identificaron 5 pantallas reales en el código: `grupo-item-card.tsx` (agregar ítem nuevo), `editar-mueble-modal.tsx` (editar mueble ya guardado), `src/app/(admin)/admin/categorias/components/categorias-client.tsx` (catálogo maestro), `src/app/(admin)/admin/catalogo-pendientes/page.tsx`, `src/app/(empresa)/empresa/dpp/nuevo/page.tsx`. El ícono de información solo aparece si ese material específico tiene una descripción no vacía cargada — no todos los materiales van a tenerla siempre, ni en todas las pantallas.
- **Editar el texto**: exclusivamente desde `/admin/categorias` — ninguna otra pantalla tiene la opción de editar, solo de ver.

## Textos iniciales (ya aprobados, van tal cual)

- **Espumas rígidas**: "Bloque duro y denso que sostiene la estructura sin deformarse. Ej.: espuma rosada de alta densidad, espuma aglomerada/prensada (chipboard) y poliestireno extruido (para moldes internos)."
- **Espumas flexibles**: "Acolchado suave y elástico que brinda comodidad al sentarse. Ej.: Espuma gris clásica de cojines, espuma viscoelástica (memory foam) y espuma de poliuretano suave para respaldos."
- **Madera dura**: "Madera maciza y resistente para partes expuestas o de alto soporte. Ej.: Roble, cedro y nogal (para patas, brazos a la vista y armazones principales)."
- **Madera blanda**: "Material liviano y fácil de trabajar para piezas internas. Ej.: Láminas de MDF, triplex/contrachapado de pino y listones de pino cepillado (para fondos, respaldos ciegos y refuerzos ocultos)."

`Hierro`, `Acero`, `Polipropileno`, `Cuero` quedan sembrados con descripción vacía — el mismo mecanismo permite completarlos después, no son parte de esta ronda.

## Modelo de datos

Tabla nueva, sin columnas de auditoría (decisión explícita del usuario: "no quiero saber quién y cuándo lo editó"):

```sql
CREATE TABLE IF NOT EXISTS cotizador_material_descripciones (
  nombre text PRIMARY KEY,
  descripcion text NOT NULL DEFAULT ''
);
```

`nombre` coincide exactamente (case-sensitive) con las 8 entradas de `BASE_MATERIALES` — es la clave de búsqueda, no un UUID aparte, porque `BASE_MATERIALES` en sí no tiene id, solo nombres. Un único texto por material, compartido por toda la plataforma (no hay `empresa_id` — decisión explícita del usuario: "uno solo, compartido").

RLS: lectura abierta a cualquier usuario autenticado con acceso al Cotizador (`empresa_admin`, `empleado`); escritura solo `empresa_admin` o `super_admin` — mismo patrón de permisos que el resto del módulo Cotizador (`cotizadorAuthCheck`).

## Backend

- `GET /api/cotizador/material-descripciones` — devuelve `{ [nombre]: descripcion }` para las 8 entradas (empresa_admin, empleado, super_admin). Sin filtro por empresa, es una sola fuente para todos.
- `PATCH /api/cotizador/material-descripciones` — body `{ nombre: string, descripcion: string }`, solo `empresa_admin`/`super_admin` (mismo criterio que `cotizadorAuthCheck(['empresa_admin'])` con bypass automático de `super_admin` ya incorporado en esa función). Valida que `nombre` sea uno de los 8 valores de `BASE_MATERIALES` (no se puede crear una entrada arbitraria desde este endpoint). `upsert` sobre `nombre`.

## Frontend — componente compartido `TooltipInfo` (solo lectura)

Se extrae un componente nuevo y chico `src/components/ui/tooltip-info.tsx` (mismo patrón visual que ya usa `sales-dashboard.tsx` para el tooltip de "Ticket promedio" — ícono `Question` + `group/tt` + span absoluto — se extrae porque esta es la segunda vez que hace falta el mismo patrón). Recibe `texto: string` y solo renderiza el ícono si `texto` no está vacío; se usa en modo solo-lectura (sin lápiz, sin edición) en las 5 pantallas listadas arriba, junto a cada nombre de material que matchee una de las 8 entradas conocidas.

Cada una de las 5 pantallas necesita cargar el mapa `{ [nombre]: descripcion }` una sola vez (mismo patrón ya usado en `grupo-item-card.tsx` para el `catalogo`: fetch al montar, cacheado en el padre y pasado por prop) vía `GET /api/cotizador/material-descripciones`.

## Frontend — edición exclusiva en `/admin/categorias`

Dentro de `categorias-client.tsx`, junto a cada fila de material (tanto en el editor de un ítem del catálogo como en el flujo de "extra materiales" que ya existe ahí, líneas ~136 y ~921): si el nombre de esa fila coincide con uno de los 8 nombres conocidos, aparece un lápiz pequeño (visible solo para `super_admin`, que es el único rol que entra a `/admin/categorias`) que abre ahí mismo un `<textarea>` simple con el texto actual, botón Guardar/Cancelar. Al guardar, llama al `PATCH /api/cotizador/material-descripciones` y actualiza el estado local al instante — "muy fácil de dictar" implica un `<textarea>` normal (el dictado por voz del sistema operativo ya funciona sobre cualquier campo de texto nativo, sin nada especial en el código). Si el material todavía no tiene descripción, el lápiz abre el mismo `<textarea>` vacío en vez de mostrar un tooltip con contenido.

## Fuera de alcance (explícito)

- Ninguna pantalla fuera de `/admin/categorias` tiene edición — las otras 4 son solo lectura.
- Sin registro de quién/cuándo editó cada descripción.
- Sin descripciones por empresa — un solo texto compartido por toda la plataforma.
- No se tocan `Hierro`, `Acero`, `Polipropileno`, `Cuero` con contenido en esta ronda (quedan vacíos, editables después con el mismo mecanismo).
