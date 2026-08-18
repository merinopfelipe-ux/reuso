# Grupos de fotos apilados en /empresa/cotizador/nueva

## Contexto

**Esta spec revisa y reemplaza el comportamiento de `docs/superpowers/specs/2026-08-17-grupos-de-fotos-cotizador-design.md`** (que ya se había implementado). El modelo de "un ítem por grupo" y el tope de 3 grupos por cotización nueva se mantienen sin cambios — lo que cambia es el camino del usuario para llegar ahí: hoy, confirmar un grupo reinicia toda la pantalla a la zona de carga en blanco (`estado = 'idle'`, `fotos = []`, `itemsDetectados = []`), lo que el usuario reportó como confuso y con errores difíciles de entender.

El nuevo modelo: los hasta 3 grupos de fotos se **apilan** en la misma pantalla, uno debajo del otro, sin borrar lo ya subido. El vendedor decide cuándo tiene listos los grupos que quiere (1, 2 o 3) y da un solo "Procesar con IA", que analiza todos los grupos pendientes a la vez. Cada grupo procesado se confirma a la cotización por separado.

**Cambio no relacionado pero decidido en la misma sesión**: las cotizaciones sin ningún ítem no deben acumularse. Se documenta en la sección 6.

## Modelo de datos

Reemplaza los estados sueltos `fotos`, `itemsDetectados`, `noIdentificados`, `sinMatch`, `observaciones`, `modo` (todos hoy describen un solo grupo a la vez) por un array:

```ts
interface GrupoFotos {
  id: string                              // uiKey local, generado al crear el grupo
  modo: 'ia' | 'manual'
  fotos: { base64: string; preview: string }[]
  estado: 'apilando' | 'procesando' | 'resultado' | 'error'
  itemsDetectados: ItemConImagen[]        // candidatos IA a elegir, o el único ítem tras elegir/manual
  sinMatch: SinMatchConImagen[]
  noIdentificados: string[]
  observaciones: string
  errorMsg: string | null
}

const [grupos, setGrupos] = useState<GrupoFotos[]>([crearGrupoVacio()])

function crearGrupoVacio(): GrupoFotos {
  return { id: crypto.randomUUID(), modo: 'ia', fotos: [], estado: 'apilando', itemsDetectados: [], sinMatch: [], noIdentificados: [], observaciones: '', errorMsg: null }
}
```

`gruposUsados` (contador de grupos ya **confirmados** a la cotización, no de grupos en pantalla) se mantiene sin cambios, tope de 3 — sigue sin contar los ítems agregados vía "rescate" (`sin_match`/`no_identificados`/"Agregar ítem que no existe").

## Camino del usuario

1. Elige/crea cliente → se crea la cotización de inmediato (sin cambios, ver sección 6 para la regla nueva de limpieza).
2. La pantalla arranca con un **Grupo 1** en `estado: 'apilando'`: toggle "Con IA"/"Manual" propio + zona de subir/pegar fotos (máx `MAX_FOTOS_POR_TANDA = 3` fotos), con un botón "Quitar este grupo" — deshabilitado si es el único grupo en pantalla (`grupos.length === 1`).
3. Botón **"+ Agregar otro grupo de fotos"** debajo del último grupo apilado: agrega un `crearGrupoVacio()` al array, visible mientras `grupos.length < 3`. Cada grupo con fotos ya cargadas queda visible, apilado hacia abajo — nada se borra al agregar el siguiente.
4. En cuanto **algún** grupo tiene `fotos.length > 0`, aparece el botón **"Procesar con IA"** (fijo, mismo lugar donde hoy vive el botón de agregar grupo en la barra inferior). El vendedor puede procesarlo con 1, 2 o 3 grupos listos — no se exige llenar los 3.
5. Al procesar (`procesarGrupos()`):
   - Cada grupo con `modo: 'ia'` y `fotos.length > 0` pasa a `estado: 'procesando'` y dispara su propia llamada a `/api/cotizador/diagnostico` (una llamada por grupo, en paralelo vía `Promise.all` — nunca se mezclan fotos de distintos grupos en una sola llamada).
   - Cada grupo con `modo: 'manual'` y `fotos.length > 0` no llama IA: arma su tarjeta con `construirItemStub` (primera foto como principal) usando la misma lógica que ya existe.
   - Los grupos vacíos (`fotos.length === 0`, ej. si se agregó un grupo de más sin llenarlo) se ignoran, no procesan ni bloquean.
   - Todos los grupos pasan a `estado: 'resultado'` **a la vez** cuando cada uno termina — un grupo Manual no debe mostrarse antes que uno IA que sigue esperando respuesta; el criterio es que un grupo individual muestra su resultado en cuanto está listo (no hace falta esperar a los demás grupos IA más lentos), pero Manual y IA dentro del mismo click de "Procesar" arrancan al mismo tiempo.
6. Cada grupo en `estado: 'resultado'` se ve en su mismo lugar apilado:
   - Si la IA devolvió varios candidatos (`itemsDetectados.length > 1`), tarjetas de candidatos clicables — un clic dejar solo ese en `itemsDetectados` (igual que hoy, `elegirCandidato`).
   - Con 1 candidato (IA con match único, o Manual), se muestra directo la tarjeta editable `GrupoItemCard`, con selector de miniaturas si el grupo tiene más de 1 foto.
   - `sinMatch`/`noIdentificados` del grupo (piezas no reconocidas) se muestran igual que hoy, con "Buscar en catálogo" — no cuentan contra el tope de 3 grupos.
7. Cada tarjeta resuelta tiene su **propio** botón "Agregar a la cotización" (no uno solo para todos los grupos). Al confirmarse:
   - Se llama al mismo endpoint de creación de mueble que hoy usa `handleConfirmarTodos`, pero para un solo ítem.
   - Ese grupo se quita del array `grupos` (ya no se muestra apilado).
   - El ítem pasa a la lista de "líneas agregadas" que ya existe arriba de la zona de trabajo (sin cambios).
   - `gruposUsados` sube en 1.
8. Si un grupo falla al procesar (ambos proveedores de IA fallan, ver `[diagnostico]` logging ya agregado), ese grupo queda en `estado: 'error'` con su `errorMsg` y un botón "Reintentar" que vuelve a llamar `/api/cotizador/diagnostico` solo para ese grupo — los demás grupos no se bloquean ni se reprocesan.
9. Al llegar a `gruposUsados >= 3`: se oculta toda la zona de trabajo (todos los grupos apilados, el botón de agregar grupo, el botón de procesar), reemplazada por el aviso ya existente ("Ya agregaste 3 ítems a esta cotización...") con link a `/empresa/cotizador/[cotizacionId]`.

## Decisiones de detalle

- **Quitar un grupo apilado**: solo antes de procesar (`estado: 'apilando'`). Una vez en `'procesando'`/`'resultado'`/`'error'`, el grupo ya no se puede quitar directamente — se resuelve confirmándolo (con "Buscar en catálogo" si no hubo match) o queda pendiente hasta que se resuelva. No se agrega un "descartar resultado" nuevo en esta ronda — está fuera de alcance, el flujo ya obliga a confirmar o buscar en catálogo cada pieza detectada, igual que hoy.
- **Selector de miniaturas ("foto principal")**: sin cambios, sigue viviendo dentro de `GrupoItemCard`.
- **Botón "Procesar con IA"**: nombre puede ajustarse en implementación si "con IA" confunde cuando hay grupos Manual mezclados (ej. "Procesar grupos" a secas) — decisión de copy menor, no bloquea el diseño.
- **Barra inferior sticky**: pasa a mostrar, según el estado global:
  - "+ Agregar otro grupo de fotos" (secondary/borde) mientras `grupos.length < 3`.
  - "Procesar con IA" (primary/verde, alternando con el de arriba) mientras haya algún grupo con fotos sin procesar.
  - "Genera la propuesta" (primary/verde) sin cambios, deshabilitado hasta `gruposUsados >= 1`.
  - Regla de alternancia de la skill `design-system` (ya documentada) sigue aplicando: nunca dos botones `secondary` ni dos `primary` pegados.

## Lo que NO cambia

- `MAX_FOTOS_POR_TANDA = 3` fotos por grupo.
- Tope de 3 grupos por cotización nueva (editar después vía `/empresa/cotizador/[id]` para más).
- Terminología "mueble" en código y UI.
- `GrupoItemCard` (edición de materiales/servicios/foto principal), lista de "líneas agregadas", "Genera la propuesta", precio de mercado con IA.
- La ruta de "rescate" no cuenta contra el tope de 3 grupos.

## 6. Regla nueva: cotizaciones sin ítems

Decisión tomada en la misma sesión, independiente del rediseño de arriba pero implementada junto por tocar el mismo flujo:

- La cotización se sigue creando de inmediato al elegir/crear cliente (necesario para no perder la selección si se refresca la página antes de guardar el primer ítem).
- **Nuevo cron** `src/app/api/cron/cotizaciones-vacias-purga/route.ts` (mismo patrón que `src/app/api/cron/status-purga-30d/route.ts` y `alertas-retencion`: auth con `CRON_SECRET`, sin try/catch de más): borra `crm_cotizaciones` que no tengan ninguna fila en `crm_muebles_cotizados` y con más de 24 horas desde `created_at`. Se agrega a `vercel.json` con cadencia diaria (mismo patrón que los demás crons de purga del proyecto).
- **Filtro en el listado**: `GET /api/cotizador/cotizaciones` deja de devolver cotizaciones con 0 ítems (join/count contra `crm_muebles_cotizados`, filtrando en la query o en el resultado antes de responder) — así nunca se ven vacías en la lista, sin depender de que el cron ya haya corrido.
- Las 3 cotizaciones vacías reales encontradas en producción (`SAYFT4UV`, `QSWSYR7U`, `RRZZR8MK`) ya se verificaron con 0 ítems y se borraron manualmente durante esta sesión de diseño — no quedan pendientes de limpieza.

## Verificación

- Apilar 2 grupos (uno IA con 2 fotos de un sofá+mesa, otro Manual con 1 foto), procesar juntos: el grupo IA muestra candidatos para elegir, el grupo Manual muestra su tarjeta en blanco directo, ambos aparecen al mismo tiempo.
- Procesar con un solo grupo listo (sin llenar los 3): funciona igual, sin bloquear por "faltan grupos".
- Quitar un grupo apilado antes de procesar: desaparece sin afectar los demás grupos.
- Forzar que un grupo falle (mockear los dos proveedores IA para que fallen) mientras otro grupo sí procesa bien: el grupo fallido muestra "Reintentar", el otro no se bloquea.
- Confirmar cada tarjeta por separado: cada una tiene su propio botón, se agrega a "líneas agregadas" y sube `gruposUsados`.
- Llegar a `gruposUsados = 3`: toda la zona de trabajo desaparece, aparece el aviso con el link a editar.
- Crear una cotización, no agregar ningún ítem, esperar (o forzar `created_at` hacia atrás) y confirmar que el cron la borra a las 24h, y que mientras tanto no aparece en `GET /api/cotizador/cotizaciones`.
- `npx tsc --noEmit` y `npx eslint` limpios sobre todos los archivos tocados.
- Revisar en 375px y en modo noche: los grupos apilados no deben verse amontonados ni el botón "Procesar" cortado en mobile.

**Estado: diseño aprobado 2026-08-18, pendiente de implementación.**
