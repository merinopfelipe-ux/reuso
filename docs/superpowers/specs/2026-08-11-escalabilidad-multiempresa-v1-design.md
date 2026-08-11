# Escalabilidad multi-empresa V1.0 — Diseño

## Contexto

Hasta ahora la Calculadora de Reúso ha operado prácticamente con una sola empresa real (Lurdes). El usuario adjuntó `plan_escalabilidad.txt` con 4 propuestas pensadas para cuando muchas empresas distintas usen la plataforma al mismo tiempo. De las 4, se decidió construir en esta ronda (V1.0) las que resuelven gaps reales y contenidos; se identificaron además dos necesidades adicionales (idioma completo de la app, catálogo de país/ciudad más allá de Colombia) que se dejan explícitamente para V2.0 por ser proyectos grandes en sí mismos.

Ninguno de los 4 puntos de V1.0 toca el catálogo compartido global, el motor de cálculo de CO2 ya existente (`src/lib/calculos/co2.ts`), ni el trabajo en curso sin comitear de otras features (Cotizador avanzado, CRM, DPP, Reportes).

## 1. Localización (moneda, fecha y formato numérico por país)

**Problema real:** `empresas.moneda_preferida` existe en la base pero no se usa en ningún lado del código. Además, 83 sitios del código tienen `'es-CO'` (Colombia) escrito directo, afectando cómo se ven las fechas y números a cualquier empresa de otro país.

**Decisión de diseño:** la moneda y el formato de fecha/número se derivan automáticamente del país de la empresa (`empresas.pais`, ya existe), no de un campo nuevo. Sin selector adicional que llenar.

**Modelo de datos:** ninguna tabla ni columna nueva. Se reutiliza `empresas.pais`.

**Componentes:**
- `src/lib/locale.ts` (nuevo): mapa `PAIS_A_LOCALE: Record<string, { moneda: string; locale: string }>` para los 23 países ya definidos en `src/components/ui/selector-pais.tsx` (`PAISES`). Ej. `Colombia → { moneda: 'COP', locale: 'es-CO' }`, `México → { moneda: 'MXN', locale: 'es-MX' }`.
- Funciones exportadas `formatearMoneda(valor: number, pais: string | null): string` y `formatearFecha(fecha: string | Date, pais: string | null): string`, con `'Colombia'`/`'es-CO'` como fallback si el país no está en el mapa o es null (preserva el comportamiento actual para empresas sin país configurado, como Lurdes hoy si aún no lo tuviera).

**Flujo:** cualquier componente que hoy hace `n.toLocaleString('es-CO', ...)` pasa a llamar `formatearMoneda(n, empresa.pais)` / `formatearFecha(f, empresa.pais)`.

**Alcance de refactor (no los 83 de una vez):** se prioriza lo que ve el cliente final de la empresa:
1. `src/app/cot/[token]/propuesta-client.tsx` (propuesta pública)
2. `src/lib/pdf/generar-pdf-cotizacion.ts` (PDF de cotización)
3. El nuevo correo del punto 3 de este documento

El resto de los 83 sitios (reportes internos, PDFs de admin, panel de super_admin) quedan con `'es-CO'` fijo — los ve siempre el equipo de Reúso o la propia empresa en su panel interno, no el cliente final de la empresa, así que no es la prioridad de este ciclo.

**Pruebas:** `src/lib/locale.test.ts` — casos: país conocido, país no mapeado (fallback), país null (fallback), un valor de cada tipo (moneda con y sin decimales, fecha corta y larga).

## 2. Catálogo de materiales propios por empresa

**Hallazgo clave:** la parte de backend que este punto pedía ya existe y funciona hoy: `POST /api/cotizador/items` (`src/app/api/cotizador/items/route.ts`) ya permite a un `empresa_admin`/`empleado` crear un ítem nuevo con sus propios materiales y factor de CO2/agua, usable de inmediato, visible solo para su empresa (`visibilidad: 'restringido'`, `creado_por_empresa_id`, fila en `item_permisos_empresa`), con `pendiente_revision_co2: true` para auditoría posterior del super_admin. `patchItemSchema` (`src/lib/schemas/item.schema.ts`) ya cubre la edición.

**El gap real:** no existe ninguna pantalla donde la empresa vea/administre TODOS sus ítems propios fuera del flujo de "crear cotización, la IA no lo detectó, lo creo al vuelo". No hay lista, no hay forma de editarlo después sin volver a ese flujo puntual.

**Modelo de datos:** ninguna tabla nueva. Se reutiliza `items` + `item_materiales` + `item_permisos_empresa`, ya existentes.

**Componentes:**
- `src/app/(empresa)/empresa/catalogo/page.tsx` (nuevo, server component): guard `cotizadorAuthCheck(['empresa_admin', 'empleado'])`, consulta `items` donde `creado_por_empresa_id = empresa_id`, join a `item_materiales`.
- `src/app/(empresa)/empresa/catalogo/components/catalogo-empresa-client.tsx` (nuevo): tabla/lista de los ítems propios (nombre, categoría, peso, factor CO2, si está `pendiente_revision_co2`), botón "+ Nuevo material" que reutiliza el mismo formulario/schema que ya usa `grupo-item-card.tsx` para crear vía `POST /api/cotizador/items`.
- Nuevo endpoint `PATCH /api/cotizador/items/[id]/route.ts` (distinto del admin, que es solo para super_admin) — permite a `empresa_admin`/`empleado` editar únicamente ítems donde `creado_por_empresa_id` sea su propia empresa, usando `patchItemSchema` ya existente.
- Enlace nuevo en el sidebar de empresa (zona protegida, requiere clave 2680 del usuario antes de tocar `sidebar.tsx`).

**Pruebas:** manual — crear un material nuevo desde la pantalla nueva, confirmar que aparece en el selector de materiales del cotizador de inmediato, confirmar que otra empresa no lo ve.

## 3. Envío de cotización por correo con PDF adjunto

**Estado actual:** `POST /api/cotizador/cotizaciones/[id]/enviar` (`src/app/api/cotizador/cotizaciones/[id]/enviar/route.ts`) solo marca la cotización como `estado: 'enviada'` y devuelve el enlace público — no envía ningún correo. La empresa copia el enlace y lo manda ella misma (WhatsApp, su propio correo).

**Decisión de diseño:** el correo automático es una opción adicional, no reemplaza "copiar enlace".

**Modelo de datos:**
- Nueva tabla `crm_cotizaciones_envios` (dominio D, metadatos de negocio): `id`, `cotizacion_id` (FK), `contacto_id` (FK a `crm_clientes_contactos`, ver punto 4), `email`, `enviado_por` (user_id), `created_at`. Registra a quién y cuándo se le mandó, para el historial de actividad de la cotización.

**Componentes:**
- Nueva función en `src/lib/email.ts`: `enviarCotizacionCorreo()`, siguiendo el checklist completo de la skill `email-design` (estructura narrativa de 3 preguntas, sin `;` ni `—`, footer legal, ambos modos día/noche). A diferencia de los correos de autenticación (que sí quedan fijos con la marca "Calculadora de Reúso"), el encabezado de este correo usa `empresa.logo_svg_url`/`empresa.nombre` — es la empresa quien "habla", no la plataforma.
- Nuevo endpoint `POST /api/cotizador/cotizaciones/[id]/enviar-correo` — recibe `contacto_ids: string[]`, genera el PDF reusando `generar-pdf-cotizacion.ts` (ya existe, sin cambios), llama `enviarCotizacionCorreo()` por cada contacto seleccionado, adjunta el PDF (`email.ts` ya soporta `attachments`, confirmado en el código actual), inserta una fila en `crm_cotizaciones_envios` por cada envío.
- UI: en `src/app/(empresa)/empresa/cotizador/[id]/` (ficha de la cotización), el botón "Enviar" actual se separa en dos: "Copiar enlace" (sin cambios) y "Enviar por correo" (nuevo, abre un modal que carga los contactos del cliente vía el punto 4).

**Manejo de errores:** si el envío a un contacto falla (Resend caído, correo inválido), no se bloquea el envío a los demás contactos seleccionados — se reporta al final cuáles sí y cuáles no.

**Pruebas:** manual con `scripts/preview-emails.mjs` extendido para este correo nuevo, revisar modo día/noche, y una prueba real de extremo a extremo (enviar una cotización de prueba y confirmar que llega con el PDF adjunto y el logo de la empresa, no el de Reúso).

## 4. Contactos B2B del cliente

**Problema real:** `crm_clientes` es un solo contacto por cliente (nombre, identificación, teléfono, email). No hay forma de guardar varias personas de la misma empresa cliente (ej. el gerente de compras Y la persona de contabilidad).

**Modelo de datos:** nueva tabla `crm_clientes_contactos` (mismo patrón de nombrado que `crm_clientes_atributos`/`crm_clientes_notas`, ya existentes):
```sql
CREATE TABLE crm_clientes_contactos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES crm_clientes(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  rol_cargo text,
  telefono_celular text,
  telefono_fijo text,
  extension text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
RLS: mismo patrón que `crm_clientes` (acceso solo si `cliente_id` pertenece a la empresa del usuario vía join, o `empresa_admin`/`super_admin`).

**Componentes:**
- Sección "Contactos" nueva dentro de la ficha de cliente ya existente (`src/app/(empresa)/empresa/clientes/[id]/` — confirmar ruta exacta en implementación), con lista + formulario para agregar/editar/eliminar contactos.
- Endpoints `src/app/api/crm/clientes/[id]/contactos/route.ts` (GET, POST) y `.../contactos/[contactoId]/route.ts` (PATCH, DELETE), mismo patrón de `cotizadorAuthCheck` + verificación de `empresa_id` que el resto del Cotizador.
- El modal de "Enviar por correo" del punto 3 consume `GET .../contactos` del cliente de esa cotización para mostrar el checklist.

**Pruebas:** crear 2 contactos para un cliente, confirmar que ambos aparecen en el checklist al enviar una cotización, confirmar aislamiento (otra empresa no ve estos contactos).

## Fuera de alcance en este ciclo (V2.0, no construir ahora)

- Traducción completa de la app autenticada (hoy solo la landing pública tiene selector ES/ENG).
- Catálogo de departamentos/ciudades para países fuera de Colombia (hoy cae a texto libre, funcional pero no pulido).
- Elegir una moneda distinta a la del país de la empresa (se decidió automático por país en V1.0).
- Reemplazar "copiar enlace" — sigue existiendo igual que hoy.

## Verificación end-to-end (los 4 puntos juntos)

1. Cambiar el país de una empresa de prueba a México, confirmar que su propuesta pública y PDF muestran MXN y fechas en formato `es-MX`.
2. Crear un material propio desde la nueva pantalla de catálogo, usarlo en una cotización, confirmar que el CO2 se calcula con el factor propio.
3. Agregar 2 contactos a un cliente, enviar una cotización por correo a ambos, confirmar que llega con PDF adjunto y el logo de la empresa (no el de Reúso) en el encabezado.
4. Confirmar que "Copiar enlace" (el flujo viejo) sigue funcionando exactamente igual que antes.
5. `npx tsc --noEmit` limpio, build completo sin errores, sin tocar ningún archivo de las features grandes pendientes (Cotizador avanzado/CRM/DPP/Reportes).
