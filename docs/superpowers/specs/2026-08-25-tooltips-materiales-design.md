# Tooltips editables para materiales base del Cotizador — Diseño

**Estado**: aprobado por el usuario, 2026-08-25. Listo para plan de implementación.

## Contexto

`src/lib/cotizador/plantillas-base.ts` define `BASE_MATERIALES = ['Hierro', 'Acero', 'Polipropileno', 'Espumas rígidas', 'Espumas flexibles', 'Madera dura', 'Madera blanda', 'Cuero']` — la lista fija de materiales que siempre se muestran (vía `mergeMateriales`) en la Tarjeta 3 ("Cálculo ambiental") de `GrupoItemCard`, el componente donde el vendedor arma los materiales de un ítem NUEVO en `/empresa/cotizador/nueva`.

El usuario pidió agregar un tooltip explicativo a 4 de esos 8 nombres (los que generan más confusión: espuma rígida vs flexible, madera dura vs blanda), con textos exactos ya provistos, y que ese texto sea editable en el momento — sin pantalla de administración aparte, sin registro de quién/cuándo lo editó — **exclusivamente** en la pantalla donde se crean los materiales de un ítem nuevo (no en la edición de un mueble ya guardado, `editar-mueble-modal.tsx`, que también usa `BASE_MATERIALES` pero queda fuera de alcance).

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

## Frontend — exclusivamente en `grupo-item-card.tsx`

- Nuevo hook/fetch en `GrupoItemCard` (o en su padre, `page.tsx` de `/empresa/cotizador/nueva`, y pasado por prop — a decidir en el plan según qué evite refetch innecesario) que carga el mapa de descripciones una sola vez.
- Junto a cada `<span>{m.nombre}</span>` de un material que esté en `BASE_MATERIALES` (no aplica a materiales agregados a mano vía "+ Añadir material", esos no tienen nombre fijo): un ícono de información pequeño. Al pasar el mouse/tocar, muestra la descripción si existe (mismo patrón visual ya usado en `sales-dashboard.tsx` para el tooltip de "Ticket promedio" — ícono `Question` + `group/tt` + span absoluto, se extrae a un componente compartido `TooltipInfo` ya que esta es la segunda vez que se necesita el mismo patrón, evitando duplicar el CSS a mano otra vez).
- Si el rol actual es `empresa_admin` o `super_admin`: un lápiz pequeño junto al ícono de información abre, ahí mismo (sin modal, sin navegar), un `<textarea>` simple con el texto actual, botón Guardar/Cancelar. Al guardar, llama al `PATCH` y actualiza el estado local al instante — "muy fácil de dictar" implica un `<textarea>` normal (el dictado por voz del sistema operativo ya funciona sobre cualquier campo de texto nativo, no hace falta nada especial en el código para soportarlo).
- Si un material de `BASE_MATERIALES` todavía no tiene descripción (los 4 sembrados vacíos), el rol con permiso ve un estado "Agregar descripción" en vez de un tooltip con contenido; los demás roles simplemente no ven ícono ahí.

## Fuera de alcance (explícito)

- `editar-mueble-modal.tsx` (edición de un mueble ya guardado en la cotización) NO recibe este tooltip — decisión explícita del usuario ("exclusivamente ahí").
- Sin registro de quién/cuándo editó cada descripción.
- Sin descripciones por empresa — un solo texto compartido por toda la plataforma.
- No se tocan `Hierro`, `Acero`, `Polipropileno`, `Cuero` con contenido en esta ronda (quedan vacíos, editables después con el mismo mecanismo).
