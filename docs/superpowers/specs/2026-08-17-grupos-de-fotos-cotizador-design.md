# Grupos de fotos en /empresa/cotizador/nueva — un ítem por grupo

## Contexto

Hoy `/empresa/cotizador/nueva` trata cada "tanda" de fotos (hasta `MAX_FOTOS_POR_TANDA = 3`) como una bolsa de detección multi-ítem: la IA puede devolver varios ítems distintos de una sola tanda (ej. sofá + mesa + silla), y "Agregar a la cotización" los agrega todos de una vez. El modo Manual crea una tarjeta en blanco por cada foto subida.

El usuario redefinió el modelo mental: un **grupo de fotos** es una serie de fotos del **mismo ítem** (pueden aparecer otros objetos de fondo en el encuadre, pero las fotos del grupo son sobre una sola pieza — ej. 3 fotos de un sofá, aunque en el encuadre también salga una mesa). Cada grupo produce **un solo ítem**, sin importar el modo (IA o Manual). Máximo 3 grupos por cotización nueva; para agregar más ítems después, se edita la cotización ya creada (`/empresa/cotizador/[id]`).

No se toca la palabra "mueble" en código ni UI — sigue siendo el término usado hoy (el modelo de datos ya es genérico por categorías, ver "Motor Lógico Universal" en `CLAUDE.md`; renombrar la palabra es un cambio aparte, fuera de este alcance).

## Comportamiento

### 1. Contador de grupos
Nuevo estado `gruposUsados` (número, inicia en 0), **separado** de `muebles.length` — un ítem agregado vía "rescate" (Buscar en catálogo desde `sin_match`/`no_identificados`, o el modal de "Agregar ítem" manual fuera del flujo de fotos) no consume un grupo. `gruposUsados` sube en 1 solo cuando se confirma el ítem resultante de un grupo de fotos (IA o Manual). Tope: 3.

### 2. Modo IA — elegir un candidato, no todos
`analizarConIA()` no cambia (sigue mandando las fotos del grupo a `/api/cotizador/diagnostico`, que puede devolver varios candidatos). Cambia la pantalla de resultado:
- Las tarjetas de candidatos (`itemsDetectados`) se muestran igual que hoy, pero se vuelven clicables como selección única — un clic en una tarjeta la marca como "el ítem del grupo" y las demás se descartan de `itemsDetectados` (quedan solo esa una).
- Si el grupo tenía más de una foto, al elegir el candidato aparece un selector de miniaturas (las fotos del grupo) para que el vendedor elija cuál se muestra como principal — sustituye la miniatura recortada automáticamente si el vendedor prefiere otra foto. Con una sola foto en el grupo, no se pregunta.
- El botón "Agregar a la cotización" pasa a operar sobre ese único ítem (ya no hace falta que diga "todos").
- `sin_match`/`no_identificados` (piezas no reconocidas) se mantienen visibles igual que hoy — el vendedor puede "Buscar en catálogo" para cualquiera de esas por fuera del conteo de grupos (ver punto 1).

### 3. Modo Manual — una tarjeta por grupo, no por foto
`continuarManual()` cambia de `fotos.map(...)` (una tarjeta por foto) a construir **una sola** tarjeta con `construirItemStub`, usando la primera foto del grupo como imagen por defecto.
- Si el grupo tiene más de una foto, se muestra el mismo selector de miniaturas del punto 2 para elegir cuál foto es la principal antes de mostrar la tarjeta (o dentro de ella, ver "Preguntas abiertas").
- Con una sola foto, se usa esa directamente, sin preguntar.

### 4. Tope de 3 grupos
Cuando `gruposUsados >= 3`, la zona de "sube otro grupo de fotos" (la que hoy dice "Agrega otra tanda de fotos" cuando `muebles.length > 0`) deja de mostrarse. En su lugar, un aviso: *"Ya agregaste 3 ítems a esta cotización. Para agregar más, edítala después de guardarla."* con un botón que navega a `/empresa/cotizador/[cotizacionId]` (la cotización ya existe desde que se confirmó el primer grupo, vía `handleConfirmarTodos`).

### 5. Lo que no cambia
- Tope de `MAX_FOTOS_POR_TANDA = 3` fotos por grupo (ya implementado).
- El reset a `estado = 'idle'` + `fotos = []` + `itemsDetectados = []` tras confirmar, que ya permite subir el siguiente grupo.
- La ruta de "rescate" (ítem no detectado / agregado manualmente fuera de un grupo de fotos) no cuenta contra el tope de 3 grupos.
- Terminología "mueble" en código y UI.

## Decisiones de detalle

- **Selector de miniaturas ("foto principal")**: vive DENTRO de `GrupoItemCard`, como un control editable en cualquier momento mientras se llena/revisa el ítem (no un paso bloqueante aparte) — coherente con que todo lo demás del ítem (título, cantidad, materiales) ya se edita ahí mismo. Con una sola foto en el grupo, el control ni se muestra.
- **Al llegar al tope de 3 grupos**: toda la zona de carga (el toggle "Con IA"/"Manual" y la zona de subir/pegar fotos) deja de mostrarse por completo, reemplazada por el aviso del punto 4 — no queda un toggle deshabilitado a medias.

## Verificación

- Subir un grupo de 3 fotos con un sofá y una mesa visibles, modo IA: la IA detecta candidatos, el vendedor elige "sofá", queda solo ese ítem, puede elegir cuál de las 3 fotos es la principal, confirma y se agrega 1 mueble.
- Repetir en modo Manual con un grupo de 2 fotos: se crea 1 sola tarjeta en blanco, selector de miniaturas para elegir principal, se llena a mano y se confirma.
- Confirmar 3 grupos seguidos: al terminar el tercero, la zona de carga desaparece y aparece el aviso con el link a editar la cotización.
- Confirmar que un ítem agregado vía "Buscar en catálogo" desde `sin_match` no incrementa `gruposUsados` ni bloquea el tope.
- `npx tsc --noEmit` y `npx eslint` limpios sobre `nueva/page.tsx` y `components/grupo-item-card.tsx`.
