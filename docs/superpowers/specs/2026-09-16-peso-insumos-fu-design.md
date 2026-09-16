# Peso de insumos (hueco de F_U en el MCI) — Design

## Contexto

El Índice de Flujo Lineal (MCI, ficha #5 del catálogo de 9 cálculos, exclusivo Impacto Ilimitado) necesita `F_U`: la fracción de masa original de un activo que se conservó durante su restauración (`V = M × (1 - F_U)`, parte de la fórmula real de la Ellen MacArthur Foundation). Hoy `F_U` no es calculable: requiere el peso de los insumos NUEVOS usados en la restauración, y `item_insumos` (dimensión financiera del Catálogo Universal, migración 031) solo guarda `precio_unitario`, nunca peso — a diferencia de `item_materiales` (dimensión ambiental), que sí tiene `peso_kg`.

Este diseño es sobre el **catálogo de datos** (agregar `peso_kg` a los insumos, con estimación asistida por IA), no sobre construir el MCI en sí — el MCI sigue sin código, sin fecha (⚪ V2, ver `conceptos/prioridades-2026-09-10.md` del Vault). Este trabajo deja el dato disponible para cuando se construya.

Investigación real que informa este diseño:
- `item_insumos` (catálogo compartido) solo lo edita `super_admin`, en `/admin/categorias`. Confirmado por grep: no existe ningún endpoint de escritura para empresas sobre esta tabla.
- Las empresas SÍ pueden agregar insumos *ad-hoc* al confirmar una cotización (`src/app/(empresa)/empresa/cotizador/nueva/components/grupo-item-card.tsx`), guardados como snapshot en `crm_muebles_cotizados.insumos_json` — un comentario explícito en el código confirma que esto **nunca** escribe de vuelta en `item_insumos`. Son dos superficies de datos distintas, ambas necesitan poder llevar `peso_kg`.
- `src/lib/ia/precio-mercado.ts` + `src/app/api/cotizador/muebles/[muebleId]/precio-mercado/route.ts` ya son el patrón real de "estimación con IA + búsqueda web, nunca inventa sin fuente, el usuario siempre confirma" que este diseño reutiliza tal cual: Gemini con grounding nativo (`tools: [{ google_search: {} }]`) + fallback OpenRouter (`:online`), Zod estricto sobre la respuesta, `sin_resultado` explícito si no hay fuente confiable.
- `planIncluyeIA(empresaId, plan)` (`src/lib/plan-limits.ts`) ya existe y ya gatea el mismo tipo de función en el Cotizador (Impulso Sostenible en adelante) — se reutiliza igual aquí para el lado de empresa.
- El super_admin no tiene un "plan" — la IA se le ofrece siempre en `/admin/categorias`, sin gate.

## Alcance

**Se construye**: el campo `peso_kg` en ambas superficies de insumo (catálogo y ad-hoc), con estimación asistida por IA gateada correctamente según quién la usa, y un caché de 2 capas explícito para minimizar llamadas repetidas (regla de ahorro de tokens del `CLAUDE.md`).

**No se construye aquí**: el cálculo del MCI en sí (`F_U`, LFI, MCI), ni su pantalla. Ese trabajo sigue en ⚪ V2 del Vault, sin fecha.

## 1. Modelo de datos

`sql/135_peso_insumos.sql`:
```sql
ALTER TABLE item_insumos
  ADD COLUMN IF NOT EXISTS peso_kg numeric(10,3);
ALTER TABLE categoria_insumos_base
  ADD COLUMN IF NOT EXISTS peso_kg numeric(10,3);

CREATE TABLE IF NOT EXISTS peso_insumos_referencia (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_normalizado text NOT NULL,
  unidad             text NOT NULL,
  peso_kg            numeric(10,3) NOT NULL,
  fuente_url         text,
  confianza          text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nombre_normalizado, unidad)
);
```
`peso_kg` nullable en ambas tablas, sin backfill forzado — se llena progresivamente, nunca bloquea nada existente (mismo criterio que el resto del catálogo). Convención: peso de **una unidad** de ese insumo, coherente con `cantidad`/`unidad` ya existentes.

`insumoSchema` (`src/lib/schemas/dimensiones.schema.ts`) gana `peso_kg: z.number().nonnegative().nullable().optional()` — aplica tanto al insumo de catálogo como al ad-hoc (`insumos_json` de la cotización), que hereda el peso del catálogo al agregarse y puede editarlo si la empresa lo cambia.

`peso_insumos_referencia` es una tabla nueva, **global, compartida entre todas las empresas** — es la capa 2 del caché (detalle abajo), no pertenece a ninguna empresa en particular.

## 2. Mecanismo de IA

Nueva función `buscarPesoInsumo(nombre: string, unidad: string)` en `src/lib/ia/peso-insumo.ts`, mismo patrón que `buscarPrecioMercado` en `precio-mercado.ts`:
- Prompt: "¿cuánto pesa 1 {unidad} de {nombre}?", pide JSON `{ peso_kg_estimado, fuente_url, fuente_titulo, confianza }` o `{ sin_resultado: true }`.
- Gemini con `tools: [{ google_search: {} }]` primero, fallback a OpenRouter `qwen/qwen2.5-72b-instruct:online` si Gemini falla.
- Zod estricto: `peso_kg_estimado` positivo, `fuente_url` con regex `^https?:\/\//`, `confianza` enum `alta/media/baja`. Sin fuente válida, nunca se persiste un número.
- Presupuesto de tokens menor que `precio-mercado.ts` (`maxOutputTokens` más bajo, `thinkingBudget` más bajo) — es una pregunta más simple que investigar un precio de mercado.

## 3. Caché de 2 capas (ahorro de tokens)

El peso de "1 litro de barniz" es prácticamente una constante física — no varía por empresa, por cotización, ni con el tiempo, a diferencia del precio de mercado (que sí es legítimamente volátil). Esto permite un ahorro más agresivo que el ya existente para precios:

1. **El catálogo es su propio caché**: si `item_insumos.peso_kg` ya tiene valor, no se llama nunca a la IA para esa fila — se reutiliza automáticamente en cada empresa que use ese ítem.
2. **`peso_insumos_referencia`** cubre el resto: antes de llamar a la IA (desde cualquiera de las 2 superficies), se busca por `(nombre_normalizado, unidad)`. Si hay match, respuesta instantánea, 0 tokens. Si no, se llama a la IA y el resultado se guarda ahí (`UPSERT`) para que la próxima vez — de cualquier empresa, desde cualquiera de las 2 pantallas — no cueste nada.

`nombre_normalizado`: minúsculas, sin tildes, recortado (mismo criterio de normalización ya usado en otros buscadores del proyecto, implementación local a este módulo, sin depender de la utilidad de búsqueda de íconos que es de otro dominio).

## 4. Dónde aparece en pantalla

- **`/admin/categorias`** (`categorias-client.tsx`, tanto en `EditorFinanciero` como en `PanelItemValores`): campo `peso_kg` (`InputConUnidad`, unidad "kg") junto a cada fila de insumo, con un botón "Sugerir con IA" — siempre disponible, el super_admin no tiene plan que gatee nada. Llama a `POST /api/admin/insumos/peso-sugerido` `{ nombre, unidad }`, rellena el campo con la sugerencia (editable antes de guardar, nunca se guarda solo).
- **Cotizador** (`grupo-item-card.tsx`, insumos ad-hoc): mismo campo + botón, pero gateado por `planIncluyeIA(empresaId, plan)` — mismo criterio que el precio de mercado. Sin ese plan, el campo queda solo manual, sin botón.

Ambos endpoints (`/api/admin/insumos/peso-sugerido` y `/api/cotizador/insumos/peso-sugerido`) son delgados: validan auth/plan según corresponda, llaman a `buscarPesoInsumo`, consultan/actualizan `peso_insumos_referencia` como capa 2 del caché, y devuelven la sugerencia — a diferencia de `precio-mercado.ts` (que persiste de inmediato porque actúa sobre un mueble YA guardado), estos endpoints **nunca** escriben en `item_insumos`/`insumos_json` directamente: ambas pantallas (`/admin/categorias`, Cotizador) ya tienen su propio flujo de "Guardar" que arma el payload completo del ítem/insumo, así que la sugerencia solo rellena el campo local — el guardado normal de la pantalla es quien confirma. Más simple que replicar el POST+PATCH de precio-mercado, sin perder el criterio de fondo (la IA sugiere, un guardado explícito confirma).

## Fuera de alcance

- El cálculo del MCI en sí (`F_U`, LFI, `Índice de Flujo Lineal`) — ⚪ V2 del Vault, sin fecha, sin código.
- Backfill retroactivo de `peso_kg` en insumos ya existentes — se llena progresivamente, nunca de una vez.
