# Diseño — La empresa es el cliente en B2B (Cotizador)

## Contexto

Hoy, en `/empresa/cotizador/nueva`, crear un cliente B2B pide primero nombre, apellido y celular de una persona, y solo después los datos de la empresa (NIT, razón social, nombre comercial). El usuario reporta que esto está invertido: en B2B **el cliente es la empresa**, no una persona puntual. Las personas son contactos de esa empresa, útiles sobre todo para saber a quién escribirle (por ejemplo, al enviar la propuesta por correo), y ninguno de sus datos (nombre, apellido, teléfono, correo) debería ser obligatorio — una empresa puede vivir en el sistema con solo NIT + razón social y cero contactos.

El modelo de datos real (`sql/034_crm_empresas_clientes.sql`) ya soporta esto: `crm_empresas_clientes` (la empresa) tiene una relación 1 a muchos hacia `crm_clientes` (contactos) vía `empresa_cliente_id`. Lo que falta es que la UI, la validación del backend y varios lugares que asumen "1 contacto = 1 persona con nombre" se ajusten a que ese nombre pueda no existir.

Se investigó el radio de impacto completo (no solo la página de nueva cotización, a pedido explícito del usuario) antes de diseñar la solución — ver hallazgos citados abajo.

## Decisión de arquitectura: NO se toca `crm_cotizaciones.cliente_id`

Se evaluó agregar un `empresa_cliente_id` directo en `crm_cotizaciones`, pero el radio de impacto sería mucho mayor (bastarían ~20 archivos que hoy leen el cliente de una cotización vía `crm_clientes` join `crm_empresas_clientes`: reportes, PDF, propuesta pública, dashboards, cron de purga, tickets, DPP). En vez de eso:

- `crm_cotizaciones.cliente_id` sigue apuntando a una fila de `crm_clientes` — pero para B2B, esa fila puede quedar como un **"ancla" de empresa sin contacto real**: solo con `tipo='empresa'`, `empresa_cliente_id` (vínculo al NIT/razón social) y nada más.
- Cuando el vendedor no da nombre de contacto, el servidor autocompleta `crm_clientes.nombre` con `nombre_comercial || razon_social` de la empresa — así la columna `nombre` (NOT NULL en la base, no se toca esa restricción) nunca queda vacía, sin obligar al vendedor a inventar un nombre de persona. Ya es el mismo criterio que usa `definicionDe('cliente_nombre')` en `src/lib/cotizador/vistas.ts:51-59` para mostrar en tablas.
- Nueva columna `crm_clientes.es_contacto_real boolean NOT NULL DEFAULT true` — `true` cuando el vendedor sí dio datos reales de una persona (o es un cliente B2C, siempre persona real), `false` cuando la fila es solo el ancla autocompletada de una empresa sin contacto. Esto reemplaza cualquier heurística frágil de "¿el nombre es igual al de la empresa?" y es lo que le indica a cada pantalla (propuesta pública, PDF, ficha de cliente) si debe mostrar una línea de "contacto" o no.

## 1. Formulario "Crear nuevo" en `/empresa/cotizador/nueva`

**B2B**: NIT y Razón social primero (obligatorios), Nombre comercial debajo (opcional). Ningún contacto es obligatorio para guardar.

Debajo, sección "Contactos" — repetible, empieza vacía, botón "+ Agregar otro contacto". Cada tarjeta: Nombre, Apellido, Teléfono, Correo, todos opcionales. Al guardar:
- Si no se agregó ningún contacto → se crea solo la fila-ancla (`es_contacto_real = false`, nombre autocompletado).
- Si se agregó 1 o más → se crean esas filas reales (`es_contacto_real = true`) vinculadas a la misma empresa, y `cliente_id` de la cotización apunta a la **primera** de ellas (elección automática, sin pedirle al vendedor que "elija cuál es el cliente" — conceptualmente el cliente ya es la empresa, esa fila es solo el ancla técnica).

**B2C** sigue exactamente igual que hoy (persona primero, todos los campos que ya son obligatorios se quedan igual — el cambio es solo para B2B).

Reutiliza la comparación por similitud de teléfono que ya existe (`identificacion-cliente.tsx:67-138`) para cada contacto que sí traiga celular, para no crear contactos duplicados sueltos dentro de la misma empresa.

## 2. Botón "Agregar contacto" en `/empresa/clientes/[id]`

Hoy no existe (confirmado, sin resultados de "Agregar contacto" en todo `src/`). Se agrega un botón que abre el mismo mini-formulario (Nombre, Apellido, Teléfono, Correo, todos opcionales salvo que al menos un campo tenga algo — un contacto en blanco no tiene sentido crearlo desde acá). Mismo chequeo de duplicados por teléfono.

Si la empresa solo tenía la fila-ancla (`es_contacto_real = false`) y no tiene ningún dato, el primer contacto real que se agregue **reutiliza esa misma fila** (se le pone `es_contacto_real = true` y se llenan sus campos) en vez de crear una fila nueva — así nunca queda una fila-ancla vacía Y un contacto real por separado cuando en realidad hay uno solo.

## 3. Buscar un cliente existente en "nueva cotización"

Antes de la caja de búsqueda: elegir B2B o B2C (si no se elige, busca en ambos, como hoy). En B2B, la búsqueda matchea contra NIT/razón social/nombre comercial de la empresa **y** contra nombre/apellido/teléfono/correo de cualquiera de sus contactos. El resultado que se selecciona es la empresa; se muestran sus contactos (si tiene) debajo, disponibles para el paso 4.

## 4. Envío de la propuesta por correo — el punto que el usuario señaló como afectado

**Estado real hoy** (`enviar-correo/route.ts:10-14,42`, `email.ts:443,493-495`): 1 cotización → 1 correo, tomado de `crm_clientes.email` de la fila `cliente_id`, sin ningún soporte para varios destinatarios. El modal de "enviar propuesta" en `/empresa/cotizador/[id]/page.tsx:1776-1783` es un input de texto libre precargado con ese mismo correo.

**Cambio**: cuando la cotización es B2B, el modal de enviar propuesta muestra la lista de contactos reales de la empresa (los que tengan correo) para elegir a **cuál de ellos** enviarle — un selector, no una casilla de texto a ciegas. Si ninguno tiene correo, o el vendedor quiere escribirle a alguien nuevo, el input de texto libre sigue disponible como hoy (fallback, nunca se quita). Se sigue enviando a **un solo destinatario por envío** (no se agrega multi-destinatario/CC en esta ronda — Resend sí lo soportaría, pero cambia cómo se trackea "a quién se le envió" y no fue pedido explícitamente; queda anotado como posible ronda futura, no construido a ciegas).

`guardarCorreo` (la casilla "recordar este correo") sigue escribiendo en la fila de contacto elegida — si se eligió uno existente, se actualiza ese; si fue texto libre y no hay contacto seleccionado, no hay dónde guardarlo (se deshabilita esa casilla en ese caso).

## 5. Saludo "Hola, [nombre]" — 4 lugares afectados

Encontrados exactos: `propuesta-client.tsx:342` (WhatsApp), `:349` (mailto), `:629` (encabezado `<h1>`), y `email.ts:487` (correo transaccional). Los 4 usan `crm_clientes.nombre` crudo. Con el autocompletado, ese nombre para una empresa sin contacto real sería la razón social/nombre comercial — "Hola, Grupo Constructor XYZ S.A.S." suena a error, no a saludo natural.

Fix: en los 4 puntos, si `es_contacto_real === false`, el saludo usa una forma neutra en vez del nombre autocompletado — ej. "Hola" a secas, o "Hola equipo de {razón social}" (a definir el texto exacto al implementar, siguiendo voz activa y sin sonar robótico, mismo criterio de la skill `email-design`). Si `es_contacto_real === true`, sigue mostrando el nombre de la persona real, sin cambios.

## 6. Líneas "nombre de contacto" duplicadas en PDF y propuesta pública

`vista-cot.tsx:111-121` y `generar-pdf-cotizacion.ts:82-91` ya distinguen `esEmpresa` y muestran una línea secundaria de "contacto" solo si `esEmpresa && clienteNombre`. Con el autocompletado, `clienteNombre` nunca es falsy, así que esa condición pasaría a ser **siempre verdadera** — mostrando la razón social duplicada como si fuera el nombre de un contacto. Fix: cambiar esa condición a `esEmpresa && esContactoReal` (propagando el nuevo flag hasta esos dos archivos).

## 7. `/empresa/clientes` — lista de "Personas vinculadas"

`page.tsx:311-337` y `[id]/page.tsx` muestran cada contacto de la empresa en una tarjeta. Con el cambio, filtrar por `es_contacto_real = true` para no mostrar la fila-ancla como si fuera una persona (hoy no hay filtro, mostraría una tarjeta de "contacto" idéntica al encabezado de la empresa).

`[id]/page.tsx:556`, el modal "Cambiar el celular", asume que siempre hay un teléfono previo real. Ajustar el texto cuando `telefonoOriginal` está vacío (primera vez que se pone un celular, no es "un cambio").

## 8. Validación backend — el bloqueo real encontrado

`src/app/api/cotizador/clientes/route.ts:70,72`: hoy `telefono` y `nombre` son **obligatorios** en el schema Zod de creación (`min(5)`/`min(1)`, sin `.optional()`), y `validarTelefono()` (línea 112) se llama siempre. Esto contradice directamente el diseño nuevo y es el bloqueo técnico principal a resolver primero: sin tocar este archivo, nada de lo demás puede probarse.

Cambio: `nombre` y `telefono` pasan a `.optional()` para `tipo === 'empresa'` (siguen obligatorios para `tipo === 'persona'`, B2C no cambia); `validarTelefono()` solo se llama si `telefono` viene con valor. El `.refine()` existente (líneas 84-87, exige `nit`+`razon_social` cuando `tipo==='empresa'`) se mantiene igual. El servidor aplica el autocompletado de `nombre` descrito arriba antes del INSERT.

## 9. "Convertir contacto B2B en cliente B2C" — vínculo y anti-duplicados

Se dispara desde el resultado de una búsqueda (paso 3): junto a cada contacto B2B que aparece en los resultados, un botón "Convertir en cliente B2C" — pide confirmar y pide el celular si el contacto no lo tiene (B2C se identifica por celular). Al confirmar, crea una fila `crm_clientes` nueva (`tipo='persona'`, sin `empresa_cliente_id`) con los datos disponibles del contacto, y guarda el vínculo.

**Nueva columna**: `crm_clientes.duplicado_de_id uuid REFERENCES crm_clientes(id)`.

**Ajuste al índice único de teléfono** (`idx_crm_clientes_telefono`, hoy `UNIQUE (empresa_id, telefono_indicativo, telefono) WHERE telefono IS NOT NULL`, `sql/034_crm_empresas_clientes.sql:29-31`): se agrega `AND duplicado_de_id IS NULL` a la condición del índice parcial. Efecto: la fila duplicada (que sí tiene `duplicado_de_id`) queda excluida de la comprobación de unicidad, así que puede compartir el mismo celular que su original sin que la base de datos lo rechace — pero dos filas SIN relación entre sí (ambas con `duplicado_de_id IS NULL`) siguen sin poder repetir teléfono, exactamente como hoy. Esto es lo que garantiza "cero duplicados sueltos": la única forma de compartir un teléfono es estar explícitamente vinculado.

Ninguna otra pantalla necesita cambios para soportar esto — es una fila `crm_clientes` normal, tipo `persona`, que ya funciona con todo lo existente.

## Migración SQL

`sql/101_empresa_cliente_contactos_opcionales.sql`:
```sql
ALTER TABLE crm_clientes
  ADD COLUMN IF NOT EXISTS es_contacto_real boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duplicado_de_id uuid REFERENCES crm_clientes(id);

DROP INDEX IF EXISTS idx_crm_clientes_telefono;
CREATE UNIQUE INDEX idx_crm_clientes_telefono
  ON crm_clientes (empresa_id, telefono_indicativo, telefono)
  WHERE telefono IS NOT NULL AND duplicado_de_id IS NULL;
```
El `DEFAULT true` sobre filas existentes es correcto: todo contacto ya creado hoy tiene nombre real (la columna siempre fue obligatoria hasta ahora), así que son "contacto real" por definición — no hace falta backfill especial.

## Fuera de alcance (a propósito, no se construye en esta ronda)

- Envío simultáneo a varios destinatarios (CC/multi-to) de la propuesta — solo selector de "a cuál de los contactos", uno por envío.
- Editar/reasignar `duplicado_de_id` manualmente o "deshacer" una conversión a B2C.
- Cambiar el agrupamiento de `/empresa/clientes` (ya funciona por NIT, no se toca esa lógica, solo el filtro de qué contactos mostrar dentro de cada grupo).

## Verificación

- Crear una empresa B2B solo con NIT + razón social, sin ningún contacto, guardar la cotización — confirmar que no pide ningún dato de persona y que la cotización se crea igual.
- Agregar 2 contactos al crear esa misma empresa, confirmar que ambos quedan vinculados y que `cliente_id` apunta al primero.
- Buscar esa empresa después, confirmar que aparece por NIT y también si se busca por el nombre de uno de sus contactos.
- Enviar la propuesta: confirmar que aparece el selector de contactos (no un input vacío) cuando hay contactos con correo, y que el input libre sigue funcionando si no hay ninguno.
- Abrir la propuesta pública y el PDF de una cotización sin contacto real — confirmar que el saludo NO dice "Hola, Grupo X S.A.S." y que no aparece una línea de contacto duplicada.
- Convertir un contacto B2B (con celular ya puesto) a cliente B2C — confirmar que no falla por el índice único, que queda un cliente B2C nuevo, y que la base de datos sigue rechazando un tercer registro sin relación que intente repetir ese mismo teléfono.
- `/empresa/clientes`: confirmar que una empresa sin contactos reales no muestra ninguna tarjeta de "persona vinculada".
