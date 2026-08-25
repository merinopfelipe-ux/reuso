# Agregar ítems automático + borradores visibles — Diseño

**Estado**: aprobado por el usuario, 2026-08-25. Listo para plan de implementación.

## Contexto

`/empresa/cotizador/nueva` (`src/app/(empresa)/empresa/cotizador/nueva/page.tsx`) implementa hoy el modelo aprobado en la sesión anterior (journey 15, "cascada de ítems"): hasta `MAX_ITEMS_POR_COTIZACION = 4` tarjetas de fotos se arman de antemano (`gruposPendientes`), y solo al pulsar "Genera la propuesta" se procesan en una cola secuencial (`colaProcesar`/`procesandoIdx`), pidiendo un clic explícito ("Guardar y seguir con el siguiente") entre cada ítem para avanzar al siguiente.

Esta sesión encontró 3 problemas reales con ese modelo, verificados en vivo:
1. Un bug real y ya corregido (`titulo: item.titulo` sin fallback a `item.item_nombre`, fallaba con "Invalid input: expected string, received null" y dejaba el ítem siguiente atascado "en cola" para siempre) mostró que el modelo de "un clic para avanzar" es frágil: cualquier error de guardado bloquea TODA la cola sin explicación clara.
2. El usuario reportó que el clic entre ítems es fricción innecesaria: "apenas pase el ítem uno, lo tenga listo, pase el ítem dos, sin que yo le tenga que dar nada."
3. La cascada de hasta 4 tarjetas vacías de antemano ya no tiene sentido si cada ítem se procesa solo apenas se le suben sus fotos — el usuario pidió volver a un modelo de "uno a la vez", sin pre-armar varias tarjetas.

Además, el usuario pidió (tema B, relacionado pero independiente) que las cotizaciones con al menos 1 ítem ya guardado, mientras siguen en borrador (`por_cotizar`), sean visibles en la lista y tengan el mismo tipo de límite de tiempo que ya se implementó hoy para las cotizaciones completamente vacías (ver `sql/` migraciones de hoy y `GET /api/cotizador/cotizaciones`), pero contado desde un punto de referencia distinto.

## A. Procesamiento automático, un ítem a la vez

### Modelo anterior (a reemplazar)
- `gruposPendientes: GrupoPendiente[]` — hasta 4 tarjetas de fotos armadas de antemano, ninguna se analiza hasta "Genera la propuesta".
- `colaProcesar` + `procesandoIdx` — cola armada de una vez, procesada secuencialmente, con un clic humano ("Guardar y seguir con el siguiente") requerido entre cada ítem para avanzar.
- `itemsDetectados` — representa únicamente "el resultado del ítem que se está procesando ahora", se limpia antes de procesar el siguiente índice.

### Modelo nuevo
- Un solo ítem "activo" a la vez: se sube hasta 4 fotos (`MAX_FOTOS_POR_TANDA` se mantiene igual), se elige modo IA/Manual (igual que hoy, por ítem), y el análisis arranca automáticamente en el momento en que el vendedor confirma que ya subió las fotos que quería para ese ítem — no hay una cascada de varias tarjetas vacías esperando de antemano. (Nota de implementación: sigue existiendo un único punto de "listo, procesa esto" por ítem — lo que desaparece es la posibilidad de armar 2, 3 o 4 tarjetas ANTES de que cualquiera se analice, no el hecho de confirmar cuándo las fotos de ESE ítem están completas.)
- Al terminar el análisis de ese ítem, se resuelve automáticamente sin esperar clic:
  - **Con coincidencia de catálogo** (`item_id` resuelto): se guarda de inmediato vía el mismo `POST /api/cotizador/cotizaciones/[id]/mueble` ya existente, con los valores por defecto (precio y materiales del catálogo, `factor_rentabilidad = 2`). Dispara `dispararPrecioMercado` en segundo plano exactamente como hoy, sin cambios ahí.
  - **Sin coincidencia** (`item_nombre === SIN_MATCH`): se convierte automáticamente en una tarjeta de armado manual, pre-llenada con el `titulo` y la `descripcion` que ya generó la IA (mismo dato que hoy se descarta) como punto de partida — el vendedor completa precio/materiales y elige "solo esta cotización" vs "Ítem Maestro" (mismo mecanismo que hoy tiene `abrirRescate`/`confirmarTipoRescate`, reutilizado, no reinventado). Aquí sí hay un guardado explícito del vendedor, porque precio y materiales son datos que la IA no puede inventar (directriz irrenunciable del proyecto).
  - **"¿Es un ítem aparte?"** (pieza `sin_match` detectada dentro de las fotos de este mismo ítem): se sigue preguntando igual que hoy, pero SIN bloquear que el vendedor pueda seguir avanzando — response queda pendiente hasta que la responda, visible en pantalla.
  - **Guardado con error** (ej. sin internet un instante): el ítem no se pierde (sigue en memoria + en el respaldo local ya implementado hoy vía `localStorage`), se muestra con un botón "Reintentar guardar", sin bloquear que el vendedor agregue igual el siguiente ítem si quiere.
- Botón **"Agregar ítem que no existe en el catálogo"**: se elimina. Queda redundante — el caso que resolvía (un mueble que el vendedor ya sabe que no está en catálogo) ahora se resuelve solo, automáticamente, apenas la IA no encuentra coincidencia.
- Botón **"Agregar otro ítem"**: se conserva conceptualmente, pero cambia de "sumar una tarjeta más a la cascada" a "empezar el ciclo completo del siguiente ítem" (pregunta IA/Manual de nuevo, exactamente como al principio). Aparece habilitado apenas el ítem activo actual queda resuelto (guardado, o con su tarjeta de armado manual ya visible). Se puede repetir tantas veces como el vendedor quiera — no hay cascada previa, y **no hay tope fijo de ítems por sesión** (se elimina `MAX_ITEMS_POR_COTIZACION` como límite de esta pantalla — decisión del usuario: "se pueden agregar los ítems que sean necesarios"). El mismo botón de "agregar otro ítem" ya existe también en la pantalla de detalle de la cotización (`/empresa/cotizador/[id]`, vía `?cotizacion_id=` en esta misma página) y sigue funcionando igual, sin cambios ahí.
- Nunca hay más de un ítem analizándose a la vez (una sola llamada a la IA en curso en cualquier momento) — eso no cambia, solo desaparece la espera de un clic humano ENTRE ítems.

### Cambio de estado en `page.tsx`
- `gruposPendientes` dejar de ser un array de hasta 4 — pasa a representar solo el ítem activo actual (o se simplifica a variables sueltas: `fotosActuales`, `modoActual`).
- `colaProcesar`/`procesandoIdx` se eliminan — ya no hay cola pre-armada, solo "hay o no hay un ítem analizándose ahora mismo" (`analizando: boolean`).
- `itemsDetectados` sigue existiendo para el ítem recién analizado, pero su ciclo de vida es más corto: en el mismo tick en que llega el resultado, o se auto-guarda (caso con match) o se convierte en tarjeta de armado manual (caso sin match) — nunca queda "esperando un clic para guardarse".
- Nuevo estado: `itemsPendientesManual: ItemConImagen[]` — tarjetas de armado manual (sin match) que ya existen en pantalla pero el vendedor no ha terminado de completar y guardar. Pueden acumularse más de una si el vendedor agrega varios ítems seguidos sin match antes de terminar de completar el primero.
- `preguntaItemAparte` se mantiene igual (una pieza sin_match pendiente de responder sí/no), pero deja de bloquear que el vendedor agregue otro ítem mientras la responde.

### UI resultante (reemplaza "una tarjeta a la vez" del modelo cascada)
1. **Ítem activo**: fotos subidas + selector IA/Manual, o el skeleton de "Analizando..." mientras corre la IA (misma tarjeta grande que ya existe hoy, sin cambios visuales ahí).
2. **Necesita tu atención**: tarjetas de armado manual sin terminar (sin match) + preguntas "¿ítem aparte?" sin responder + guardados fallidos con botón "Reintentar" — puede haber varias a la vez.
3. **Ya guardados**: resumen compacto de lo que ya quedó en la cotización (igual que ya existe hoy).
4. Botón final: en vez de "Guardar y terminar", pasa a **"Ir a la cotización"** — solo se habilita cuando no hay ningún ítem activo analizándose Y no queda nada pendiente en "Necesita tu atención".

## B. Borradores con al menos 1 ítem: visibles + retención de 8 horas

### Regla de negocio (confirmada por el usuario)
- El propósito del "borrador" es únicamente no perder información por mala conexión — no es un espacio de trabajo de varios días.
- Una cotización con **0 ítems** ya se oculta de la lista y se borra a las 8h desde su creación (implementado hoy mismo, sin cambios: `GET /api/cotizador/cotizaciones` filtra `crm_muebles_cotizados` vacío, cron `cotizador-purga-vacias-8h`).
- Una cotización con **al menos 1 ítem** ya guardado, mientras sigue en estado `por_cotizar` (no enviada al cliente todavía), pasa a ser **visible** en `/empresa/cotizador` con una marca de "Borrador".
- El reloj de las 8 horas para ESTA cotización arranca en el momento en que se guardó su primer ítem — no desde que se creó la cotización (el cliente pudo identificarse mucho antes de subir la primera foto) y no se reinicia con cada edición posterior.
- Si pasadas esas 8 horas la cotización sigue en `por_cotizar`, se borra igual que las vacías (mismo criterio, cron extendido). Si ya avanzó de estado (`enviada` o cualquier estado posterior) antes de esas 8 horas, queda a salvo permanentemente, sujeta solo a la purga general de 90 días que ya existe (`cotizador-purga-90d`), sin relación con esta regla.

### Cambios necesarios
- **Migración SQL** (`sql/107_...`): nueva columna `crm_cotizaciones.borrador_iniciado_at timestamptz` (nullable) — se setea UNA sola vez, en el momento en que se guarda el primer ítem de esa cotización (tanto el `POST /mueble` automático como el guardado manual de una tarjeta sin match), nunca se vuelve a tocar después.
- **`POST /api/cotizador/cotizaciones/[id]/mueble`**: al insertar el primer mueble de una cotización (verificar si `crm_muebles_cotizados` estaba vacío antes de este insert), setear `borrador_iniciado_at = now()` si todavía es `null`. Update condicional, no se toca si ya tiene valor.
- **`GET /api/cotizador/cotizaciones`**: el filtro de hoy (oculta cotizaciones con 0 ítems) se mantiene igual. Las cotizaciones con ≥1 ítem y `estado = 'por_cotizar'` se marcan con un campo nuevo en la respuesta (ej. `es_borrador: boolean`) para que el frontend pinte la marca visual.
- **`/empresa/cotizador` (lista)**: cotizaciones con `es_borrador: true` muestran una marca "Borrador" (badge, mismo criterio visual que otros badges de estado ya existentes en la tabla/tarjetas).
- **Cron nuevo o extendido**: junto a (o en vez de, si se prefiere consolidar) `cotizador-purga-vacias-8h`, purgar también cotizaciones con `estado = 'por_cotizar'` AND `borrador_iniciado_at IS NOT NULL` AND `borrador_iniciado_at < now() - interval '8 hours'` — sin importar cuántos ítems tenga. Mismo patrón de borrado que `cotizador-purga-90d` (incluye limpiar imágenes de Storage de los muebles que se borran en cascada). `crm_clientes` nunca se toca, mismo criterio ya establecido hoy.

### El borrado automático de 8h no reemplaza el borrado manual
El vendedor (o el super_admin) sigue pudiendo borrar cualquier cotización — borrador o no, tenga o no `borrador_iniciado_at` — en cualquier momento, desde `/empresa/cotizador` (`DELETE /api/cotizador/cotizaciones/[id]`, ya existente, individual y en lote). La regla de las 8 horas es un piso de limpieza automática, no una restricción sobre el borrado manual: nada de este diseño cambia, oculta ni deshabilita esa acción existente para una cotización marcada como "Borrador".

## Fuera de alcance (explícito)
- No se cambia nada del motor de precios, cálculo de CO2/agua, ni la estructura de `crm_muebles_cotizados`.
- No se cambia el flujo de "agregar más ítems" desde la pantalla de detalle de la cotización más allá de que ahora también puede alimentar `borrador_iniciado_at` si esa cotización nunca tuvo ítems (caso límite: cotización creada, 0 ítems durante horas, luego se le agrega el primer ítem desde el detalle en vez de desde `/nueva` — mismo trigger, mismo endpoint `POST /mueble`, se cubre solo).
- No se construye ninguna notificación ni aviso proactivo al vendedor de "tu borrador se va a borrar pronto" — fuera de alcance de esta ronda, el usuario no lo pidió.
