# Diseño: contrastar el peso del catálogo contra la foto real (DPP/Cotizador)

## Contexto

Hoy, cuando se crea un DPP (`/empresa/dpp/nuevo`) o se confirma un mueble en el Cotizador (`/empresa/cotizador/nueva`), el peso de cada material viene siempre del catálogo (`items.peso_kg` / `item_materiales.peso_kg`, valores genéricos por categoría). La foto que el usuario sube solo se usa para identificar qué ítem del catálogo es (`diagnostico/route.ts`) — nunca para pesarlo.

El usuario pidió (2026-09-18) que, cuando la foto sugiera que el objeto real es claramente más grande o más chico que el promedio de su categoría, el peso se pueda ajustar — porque ese peso es la base del ahorro de huella de carbono y del futuro cálculo de F_U/MCI. Tras varias rondas de simplificación explícita (ver conversación), el alcance quedó reducido al mínimo viable: **el catálogo sigue siendo la base siempre; solo se sugiere una mejora cuando la foto no coincide, sin matemática visible para el usuario ni para la IA.**

**Fuera de alcance, explícitamente:** el cálculo real de F_U/MCI (sigue sin código), estimación material por material con visión, cualquier llamada de IA nueva y separada de la que ya existe.

## Arquitectura

**Cero llamadas de IA nuevas.** Se extiende la llamada que YA existe en `src/app/api/cotizador/diagnostico/route.ts` (la que identifica el ítem en la foto, usada por ambos flujos) para que, en la misma respuesta, devuelva un campo más por ítem detectado: `peso_total_estimado_kg` (número o `null` si la foto no permite estimarlo con confianza razonable — mismo criterio de "nunca inventar sin base" ya usado en `peso-materiales-item.ts`). La IA da un solo número para el objeto completo, nunca un porcentaje ni un desglose por material.

Al confirmar el ítem (ya con `items.peso_kg` del catálogo cargado, que es cuando también se conoce `peso_total_estimado_kg` devuelto por el paso anterior), el backend hace una sola comparación:

```
diferencia = abs(peso_total_estimado_kg - items.peso_kg) / items.peso_kg
```

- Si `diferencia <= 10%` → no se guarda nada, silencio total (igual que hoy).
- Si `diferencia > 10%` → se guarda `peso_total_estimado_kg` en un campo nuevo, nullable, propio del registro confirmado (nunca en el catálogo compartido).

## Dónde se guarda

Un campo nuevo, simple (no JSON, un solo número), en cada tabla de registro confirmado:

- `dpp_activos.peso_foto_sugerido_kg NUMERIC NULL` (migración `sql/138_peso_foto_sugerido.sql`)
- `crm_muebles_cotizados.peso_foto_sugerido_kg NUMERIC NULL` (misma migración)

Nunca se toca `item_materiales`/`items` (catálogo compartido) — coherente con que el peso, una vez confirmado, ya vive congelado en `composicion_json`/`materiales_json` de cada registro (verificado en el código real, no se relee del catálogo después de confirmar).

## Flujo completo

1. Usuario sube foto → `diagnostico/route.ts` identifica el ítem y, en la misma respuesta, incluye `peso_total_estimado_kg` (o `null`).
2. Usuario confirma el ítem → el endpoint de confirmación (`POST /api/dpp/activos/crear` o `POST /api/cotizador/cotizaciones/[id]/mueble`) ya recibe ambos números (el de la foto y el del catálogo, que ya carga hoy). Hace la comparación de arriba.
3. Si superó el 10%, el registro queda con `peso_foto_sugerido_kg` lleno. La pantalla de detalle (DPP o mueble cotizado) muestra un aviso simple: *"La foto sugiere ~14 kg. El catálogo estima 8 kg."* con dos botones: **Usar este peso** / **Descartar**.
4. **Usar este peso**: el código (no la IA, no el usuario) calcula la proporción `peso_foto_sugerido_kg / peso_total_original` y la aplica por igual a cada material dentro de `composicion_json`/`materiales_json` de ese registro, actualiza el peso total del registro, y limpia `peso_foto_sugerido_kg` (ya se aplicó, no hay nada más que sugerir).
5. **Descartar**: solo limpia `peso_foto_sugerido_kg` a `null`. El catálogo sigue mandando, como si nunca hubiera aparecido el aviso.
6. Si el usuario no hace nada, el aviso queda visible hasta que decida — no bloquea ni afecta ningún otro cálculo mientras tanto.

## Manejo de errores

- El campo `peso_total_estimado_kg` es siempre opcional en el esquema Zod de `diagnostico/route.ts` — si la IA no tiene confianza razonable (foto borrosa, objeto parcialmente oculto, ángulo que no deja ver tamaño), devuelve `null` y el flujo sigue exactamente igual que hoy, sin ningún aviso.
- Ningún paso de este mecanismo bloquea el guardado del ítem/mueble — es puramente informativo hasta que el usuario decide.
- Si `items.peso_kg` es 0 o no existe (no debería pasar, pero por seguridad), se omite la comparación (división por cero) y no se guarda ninguna sugerencia.

## Alcance de esta implementación

Ambos flujos a la vez (DPP y Cotizador), porque el mecanismo es idéntico (mismo campo nuevo en el esquema de `diagnostico`, misma comparación, mismo patrón de aviso) — la única diferencia entre los dos es el nombre de la tabla y el endpoint donde se guarda/aplica.

## Pruebas

- QA manual nueva en `/admin/qa`: subir foto de un objeto claramente atípico para su categoría (ej. una silla mucho más grande de lo normal) y confirmar que aparece el aviso con los dos números; subir foto de un objeto típico y confirmar que no aparece nada.
- Verificar que "Usar este peso" reparte proporcionalmente entre todos los materiales del registro (no solo uno) y limpia el campo de sugerencia.
- Verificar que "Descartar" limpia el campo sin tocar ningún otro dato.
- Verificar que un `peso_total_estimado_kg: null` (foto ambigua) no genera ningún aviso ni error.
