# Reforzar /status y /admin/status — Diseño

## De dónde sale este plan

El usuario revisó `/status` (reuso.lurdes.co/status) y la vio marcando "rendimiento degradado" en la base de datos. Se investigó y se confirmó que es un chequeo en vivo real (no inventado): Supabase mismo reportaba `degraded_performance` en su página oficial de estado en ese momento. Al explicárselo, el usuario notó dos huecos reales:

1. **"En el historial de los últimos 7 días no aparece, no queda traza."** — el panel de historial de la página pública no mostró nada de este incidente.
2. **"Lo que me explicas no dice que lo reportó Supabase y en qué estado está... Hay que elevarlo y reforzarlo para que entregue valor."** — la página no muestra el contexto rico que sí está disponible (qué dice exactamente el proveedor, si es un problema nuestro o externo, si hay un mantenimiento programado).

Tras explorar el código real (`src/lib/status-checker.ts`, `src/app/(public)/status/page.tsx`, `src/app/(admin)/admin/status/page.tsx`, `sql/021_incidentes.sql`) se confirmó la causa raíz exacta del hueco #1 y se diseñó una solución para el #2 con el usuario, en una sesión de brainstorming turno a turno. Decisiones confirmadas explícitamente por el usuario están marcadas abajo.

## El hueco real del historial (causa raíz confirmada)

`runChecks()` en `status-checker.ts` ya tiene una lógica de "auto-reportar fallos" que crea una fila en `dpp_incidencias` cuando un componente da `error` o `degradado` — pero la lista de componentes que vigila (`reportables`) **excluye a `supabase`** (solo incluye gemini/groq/openrouter/qwen/correo/hosting). Por eso el incidente de hoy, que era justo en la base de datos, nunca quedó registrado. Es un bug de una lista incompleta, no una limitación de arquitectura.

## Decisiones confirmadas con el usuario

- **No hace falta un cron ni chequeos periódicos.** El chequeo sigue siendo bajo demanda (cuando alguien visita `/status`), pero debe mostrar TODO el detalle disponible en ese momento, no un texto recortado.
- **Auto-resolución con una regla clara**: "Solo si lo creó un super_admin, lo cierra el super_admin. Si no, es automático." — una incidencia con `origen = 'sistema'` se cierra sola cuando el chequeo vuelve a ver el componente en `ok`. Una incidencia con `origen = 'admin'` (creada a mano) nunca se cierra sola, siempre requiere que el super_admin la marque resuelta desde `/admin/status`.
- **Distinguir "nuestro" vs "externo"** usando el campo `componente` que ya existe: `calculadora` es nuestro, los otros 5 (`supabase`, `gemini`, `groq`, `openrouter`, `qwen`) son proveedores externos. No se inventa un campo nuevo para esto.
- **Mantenimiento/mejora programada nuestra** se reporta como un tipo de aviso nuevo (no un "incidente"), y cuando está activo reemplaza el banner "Sistemas Operativos" de arriba de la página pública.
- **Mantenimiento programado de un proveedor externo** (ej. Supabase avisa en su propia página que va a hacer mantenimiento) se muestra en vivo dentro del detalle del chequeo, sin guardarse en ninguna tabla — es información del proveedor en ese momento, no un evento nuestro que haya que trazar.

## Cambios de datos

### `sql/090_incidencias_origen_tipo.sql` (nueva)

```sql
ALTER TABLE dpp_incidencias
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'admin'
    CHECK (origen IN ('admin', 'sistema')),
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'incidente'
    CHECK (tipo IN ('incidente', 'mantenimiento'));

-- Backfill: toda incidencia ya creada por el auto-reporte de runChecks() tiene
-- un título con uno de estos 2 patrones fijos (ver status-checker.ts) — el
-- resto (creadas a mano desde /admin/status) se queda en 'admin', el valor
-- por defecto.
UPDATE dpp_incidencias SET origen = 'sistema'
  WHERE titulo LIKE 'Interrupción detectada en %'
     OR titulo LIKE 'Rendimiento degradado en %';
```

Mismo patrón exacto que `sql/089_alertas_origen_y_delete.sql` (ya corrida en producción esta sesión), reutilizado por consistencia.

## Cambios de código

### `src/lib/status-checker.ts`

1. **Agregar `supabase` a la lista `reportables`** del auto-reporte — es el fix del bug raíz. Mismo patrón que los otros 6 (`label: 'Base de Datos y Servidores'`, `sev: 'critico'`).
2. **Marcar `origen: 'sistema'`** en el `insert()` del auto-reporte (ya existente, solo se le agrega el campo).
3. **Auto-resolución**: antes del loop de auto-reporte, para cada componente en estado `ok`, buscar una incidencia `origen = 'sistema'` y `estado != 'resuelto'` para ese `componente` y marcarla `estado: 'resuelto', resolved_at: now()`. Esto es nuevo — hoy `runChecks()` solo crea, nunca resuelve.
4. **Capturar el detalle completo del proveedor**, sin truncar: usar `spData.status.description` completo (ya se hace), y agregar lectura de `spData.scheduled_maintenances` (array, ya lo devuelve Statuspage.io en el mismo `/summary.json`, hoy se descarta) — si tiene al menos un elemento con `status` distinto de `completed`, exponerlo en un campo nuevo.
5. **Extender `ServiceCheck`**:
   ```ts
   export interface ServiceCheck {
     status: 'ok' | 'degradado' | 'error'
     latency: number
     details?: string
     uptime?: number
     origen?: 'nuestro' | 'externo'        // derivado del componente, no pedido al proveedor
     mantenimientoProgramado?: string      // texto tal cual lo publica el proveedor, si existe
   }
   ```
   `origen` se asigna en el propio `runChecks()` al construir `results` (fijo por componente: `supabase/gemini/groq/openrouter/qwen/correo/hosting` → `'externo'`; no hay un check para `'calculadora'` hoy porque la calculadora ES el sistema que corre el chequeo — el campo se usa para los incidentes manuales tipo `calculadora`, no para `ServiceCheck`).

Esto aplica a los 4 proveedores que ya usan Statuspage.io (`supabase`, `groq`, `resend`/correo, `vercel`/hosting) — `gemini` y `openrouter` no tienen ese formato de API (son pings directos), se quedan igual.

### `src/app/api/admin/status/incidentes/route.ts` y `[id]/route.ts`

- Zod schema: agregar `tipo: z.enum(['incidente', 'mantenimiento']).default('incidente')`. `origen` nunca lo manda el cliente — el POST desde el panel admin ya implica `origen: 'admin'` (default de la columna, igual que se hizo con `alertas`).

### `src/app/(admin)/admin/status/page.tsx`

- Agregar selector "Tipo de aviso" (Incidente / Mantenimiento programado) en el formulario de creación, junto a los que ya existen (Componente, Severidad, Estado).
- Cuando `tipo === 'mantenimiento'`, ocultar el selector de Severidad (no aplica — un mantenimiento no tiene "crítico/mayor/menor") y mostrar en su lugar campos de fecha/hora programada como parte de la descripción libre (sin campo estructurado nuevo, para no sobre-construir — el super_admin escribe "Sábado 16 de agosto, 10pm a 12am" en la descripción, igual que hoy escribe el detalle de un incidente).

### `src/app/(public)/status/page.tsx`

1. **Banner superior**: hoy decide entre "Sistemas Operativos" y reflejar un incidente activo. Se le agrega una tercera rama: si hay una incidencia `tipo = 'mantenimiento'` con `estado != 'resuelto'`, mostrar ese título/descripción en el banner en vez de "Sistemas Operativos" (prioridad: incidente activo > mantenimiento programado > todo operativo, un incidente real siempre pesa más que un aviso de mantenimiento).
2. **Detalle por componente**: reemplazar el filtro actual de 3 strings hardcodeados (`!== 'Operacional' && ...`) por mostrar `comp.details` completo siempre que `status !== 'ok'`, más una etiqueta `Externo` / `Nuestro` (de `comp.origen`), más — si `comp.mantenimientoProgramado` existe — una línea aparte tipo "📅 Mantenimiento programado del proveedor: {texto}", visualmente distinta de un problema (no roja/amarilla, un tono neutro informativo).
3. **Interfaz `Incidente` local**: agregar `origen: 'admin' | 'sistema'` y `tipo: 'incidente' | 'mantenimiento'` (hoy está duplicada del tipo real, se mantiene duplicada por ahora — no es parte de este cambio unificarla con un tipo compartido, fuera de alcance).

## Fuera de alcance (explícitamente, para no sobre-construir)

- Ningún cron ni proceso periódico — confirmado por el usuario, el chequeo sigue siendo bajo demanda.
- No se persiste el mantenimiento programado de un proveedor externo en ninguna tabla — es información en vivo de ellos, no nuestra.
- No se unifica la interfaz `Incidente` duplicada entre el page.tsx público y el admin en un tipo compartido — mejora aparte, no relacionada con este pedido.
- No se agregan campos estructurados de fecha/hora para mantenimientos (se escriben en la descripción libre) — evita construir un date-picker nuevo para un caso de uso que hoy es de baja frecuencia.
- El envío automático de correo cuando cambia el estado (para los que se "suscriben" en `/status`) sigue sin existir — detectado en la investigación anterior, pero no fue parte de lo que el usuario pidió reforzar aquí.

## Verificación

1. Simular (o esperar a) que Supabase vuelva a reportar `degraded`/`critical` en su status page real, o forzar el error temporalmente en desarrollo: confirmar que se crea una fila en `dpp_incidencias` con `componente = 'supabase'`, `origen = 'sistema'`.
2. Confirmar que cuando el componente vuelve a `ok` en un chequeo posterior, esa fila se marca `resuelto` sola, con `resolved_at` real.
3. Crear una incidencia a mano desde `/admin/status`, forzar (o esperar) a que el chequeo en vivo del mismo componente marque `ok` — confirmar que la incidencia manual NO se cierra sola.
4. Crear un aviso `tipo: 'mantenimiento'` desde `/admin/status` — confirmar que el banner de `/status` lo muestra en vez de "Sistemas Operativos".
5. Con un proveedor real en mantenimiento programado (o simulando la respuesta de `scheduled_maintenances`), confirmar que aparece la línea informativa en `/status`, distinta visualmente de una falla.
6. `npx tsc --noEmit` limpio, sin tocar ningún otro módulo (motor de cálculo CO2, catálogo, etc.).
