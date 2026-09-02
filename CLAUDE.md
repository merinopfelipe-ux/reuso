# CLAUDE.MD — Calculadora de Reúso
V15.1 (2026-07-27) · reuso.lurdes.co · Grupo MLP S.A.S
VOZ ACTIVA. MOBILE-FIRST. USUARIO PRIMERO. CONFIANZA EN DATOS.

## REGLA DE ESTE ARCHIVO — LÉELA ANTES DE EDITAR CLAUDE.MD
Este archivo NUNCA debe superar **180 líneas**. Es una regla dura, no una meta.
Antes de agregar algo aquí, pregúntate: ¿es una regla que SIEMPRE aplica y cabe en 1-3 líneas? Si no, va en una skill (`.claude/skills/`), no aquí.
**Nunca agregues aquí** un log de auditoría, un changelog de versión, una tabla de "bugs corregidos" ni el estado de un módulo terminado — eso es historia, no instrucción. Historia va en el Obsidian Vault (ver Reglas de Oro). Si algo deja de ser cierto, corrígelo o bórralo, no lo apiles debajo.
Si necesitas espacio para algo nuevo e importante, comprime o elimina otra línea primero.

## SKILLS DEL PROYECTO — cárgalas, no las repitas aquí
| Skill | Cuándo usarla |
|---|---|
| `design-system` | Antes de escribir CSS/className. Tiene TODAS las variables de color, Button/Modal canónicos, reglas de contraste. |
| `calculo-ambiental` | Antes de tocar `co2.ts`, `/api/calcular` o `item_materiales`. |
| `seguridad-reuso` | Al auditar bugs, tocar API routes, auth, storage o HTML de usuario. |
| `modelo-negocio-reuso` | Antes de tocar planes, límites, roles o permisos de empresa. |
| `email-design` | Antes de crear o modificar cualquier correo (Resend o Supabase Auth). |
| `dominios-datos` | Antes de crear una tabla nueva o escribir un cálculo/query que mezcle Costos, Cálculo Ambiental o DPP. |
Si vas a documentar un hecho nuevo del negocio/diseño/seguridad, escríbelo en la skill correspondiente, no aquí.

## COLORES — DOS TOKENS SAGRADOS (detalle completo en skill `design-system`)
**Negro Lurdes `#474747`** — único negro permitido. PROHIBIDO `#000000` sin excepción, ni en overlays semitransparentes (`bg-[#474747]/35`, nunca `bg-black/NN`).
**Sueños de Pistacho `#D6F391`** — único pistacho permitido, ninguna variante.
**Regla crítica de contraste:** fondo pistacho → texto SIEMPRE `#474747`. Prohibido texto blanco sobre pistacho.
**Antes de cambiar un hex en más de 2 archivos**, el usuario debe escribir el valor nuevo explícitamente en su mensaje. Si parece "no autorizado" → preguntar, nunca asumir.
**Fondos siempre planos:** día `#FFFFFF`, noche `#474747`. Prohibido gradiente/blob/glow como fondo de página completa (sí permitido dentro de cards/modales).

## NOMBRE DEL PRODUCTO
Es **Calculadora de Reúso**, nunca solo "Reúso" (UI, correos, commits, skills). Excepción técnica: slugs de URL y variables de código.

## PÚBLICO OBJETIVO
Empresas o personas con negocio en **restauración**, **diseño interior** o **producto** (moda o industrial) que usan materiales/objetos reciclados o reusados (economía circular). No es un público genérico ni de consumo masivo — toda copy, feature y priorización se piensa para estos 3 perfiles de negocio.

## DIRECTRICES IRRENUNCIABLES
0) **Fondo interior blanco puro**: dentro de la app autenticada el fondo de página es SIEMPRE `#FFFFFF`. `#F5FAFA`/`#F2F9F8` solo en tarjetas/secciones internas o páginas públicas, nunca pantalla completa en rutas protegidas.
1) **Mobile-first**: diseña 375px primero. Carga <2s en 4G, Lighthouse >80. Login→dashboard <1s, formulario→guardar <2s, QR→pasaporte <2s.
2) **Usuario primero**: cada pantalla resuelve UN problema (Sylvia admin <4min a reporte CFO, Marco empleado <90seg registra reúso, Roberto CFO <3seg ve el PDF, Patricia <30seg escanea QR y confía).
3) **Voz activa**: "Evitaste 125 kg CO2" no "Se evitaron 125 kg". Imperativo directo, celebra logros.
4) **Confianza en datos**: fuentes visibles, hash SHA-256, el usuario SIEMPRE confirma lo que la IA extrajo (la IA nunca inventa). Cada factor CO2 muestra su origen.
5) **Sin mayúsculas sostenidas**: nunca `uppercase`/`text-transform:uppercase` en texto visible (labels, botones, badges, headers de tabla). Title Case o Sentence case. Excepción: `capitalize` en nombres/roles dinámicos.
6) **Eficiencia**: reutiliza código y patrones existentes, no reescribas. <2s carga, ISR en públicas, lazy-load. Prohibido alucinar: no inventes colores, componentes, tablas ni factores — si no existe o no lo sabes, dilo o verifícalo con grep.
7) **Sin `;` ni `—` en copy**: ningún texto que el usuario lea (UI, correos, tooltips, errores) usa punto y coma o guión largo. Solo punto o coma.
8) **Turnstile siempre fail-open**: nunca bloquea al usuario. Frontend no exige `turnstileToken` para habilitar submit. Backend: token vacío → se omite la verificación y se continúa. Solo se rechaza si el token llega Y falla contra Cloudflare.
9) **Loading.tsx por grupo de rutas**: cada grupo `(auth)/(dashboard)/(empresa)/(admin)` tiene su propio `loading.tsx` en la RAÍZ del grupo, con skeleton mobile-first que muestra la forma real del contenido (no un spinner genérico). Nunca lo pongas en una carpeta literal fuera del grupo de rutas — ahí Next.js no lo ejecuta nunca (bug real ya corregido, no lo repitas).
10) **Solo páginas públicas (sin sesión) usan `<ProteccionPublica>`**: envuelve su contenido con `src/components/proteccion-publica.tsx` (bloquea copiar/cortar/pegar/seleccionar texto/clic derecho/arrastrar imágenes), sin que el usuario lo pida cada vez. Única excepción interna: dentro de una casilla real de formulario (input/textarea) sí se permite copiar/cortar/pegar, o se rompe pegar contraseñas desde un gestor. NUNCA en `(dashboard)/(empresa)/(admin)` ni en ninguna ruta autenticada. Excepción de página completa: `/sistema-diseno`.

## SEGURIDAD — MÍNIMAS INQUEBRANTABLES (detalle en skill `seguridad-reuso`)
- Nunca `dangerouslySetInnerHTML` con datos de usuario sin `DOMPurify.sanitize()` antes del INSERT.
- Nunca confíes en `user_id`/`empresa_id` del body del cliente: extrae siempre de `supabase.auth.getUser()`.
- Nunca `getPublicUrl()` para archivos privados: usa `createSignedUrl(ttl≤60s)`. Buckets privados: `documentos`, `dpp`, `firmas`, `cotizador`. Público: `logos`.
- Todo archivo subido por un tercero se sanitiza según su tipo (SVG con DOMPurify, imágenes recomprimidas) y se optimiza antes de guardarlo, nunca se sube el original tal cual llegó.

## REGLAS DE ORO
1. **Prohibido modificar lo que el usuario no pida específicamente.** Sin cambios colaterales.
2. **Zona protegida (hook local, no una clave hablada)**: `src/components/header.tsx`, `sidebar.tsx`, `footer.tsx` están protegidos por `.husky/pre-push` — bloquea cualquier push cuyo diff toque uno de esos 3 archivos, salvo que el usuario mismo escriba `DESBLOQUEAR_PROTEGIDOS=1 git push` en su propia terminal. El resto del repo NO requiere PR ni revisión ajena, se trabaja directo entre el usuario y Claude.
3. **Obsidian Vault** (`/Users/merinop/Documents/Automatizaciones/Bobedas/Reuso/`): al iniciar, lee `STATE.md` + diarios recientes. Al terminar, registra `diario/YYYY-MM-DD.md`, actualiza `STATE.md` y conceptos nuevos. **Aquí va la historia/changelog, no en este archivo.**

## STACK, COMANDOS Y ARQUITECTURA
- **Stack**: Next.js 14 App Router, TS, Tailwind, Supabase (Auth/Storage/RLS), jsPDF, Recharts, Zod.
- **Comandos**: `npm run dev` / `npm run dev:clean`. Build `npm run build`. Deploy `vercel`.
- **Arquitectura**: `(auth)` login/registro/recuperar, `(dashboard)` /dashboard, `(empresa)` /empresa, `(admin)` /admin, públicas sueltas `/verificar/[codigo]`, `/pasaporte/[codigo]`, `/propuesta/[token]`.
- **Arquitectura de Permisos (3 capas)**:
  1. **Módulos base (software)**: Ej. Cotizador CRM, Cálculo Ambiental, Pasaporte DPP.
  2. **Líneas de negocio (industrias/productos)**: Ej. Muebles, luminarias, remodelaciones.
  3. **Insumos y materiales (Auditoría/base)**: Ej. Maderas compartidas, aceros, factores de CO₂.
  *(Con esto, una empresa puede tener permiso para usar el "Cotizador" + "Cálculo", pero estar limitada únicamente a la línea de "Muebles").*
- **Matar caché**: `pkill -f "next dev" && rm -rf .next` antes de build o de pedir revisión tras cambios en múltiples archivos. Tras reiniciar, avisa siempre que hace falta refresh forzado (Cmd+Shift+R) en el navegador, antes de que el usuario pruebe, no después.
- **Nunca `next build` con el dev server corriendo**: si `next dev` (PM2) ya está activo, nunca correr `next build` u otro comando que toque `.next` en paralelo — deja el dev server en un estado mezclado. Parar PM2 primero, compilar, y reiniciar limpio.

## TABLAS SUPABASE (inventario, no tocar sin migración)
`profiles, empresas, invitaciones, modulos, modulos_empresa, categorias, items, calculos, informes, metas, tickets, tickets_mensajes, alertas, leads, logs_auditoria, config_sistema, log_firmas_confidencialidad` + DPP (`dpp_activos, dpp_ciclos, dpp_metricas_financieras, dpp_documentos_ingesta, dpp_verificaciones`) + Catálogo Universal (`item_materiales, item_servicios, item_insumos, categoria_materiales_base, categoria_servicios_base, categoria_insumos_base`) + Cotizador (`crm_cotizaciones, crm_clientes, crm_muebles_cotizados`).
Antes de asumir el nombre o las columnas de una tabla, verifica con `grep` en `sql/` — no lo inventes ni lo recuerdes de memoria.
**Migraciones expandir-contraer (obligatorio)**: nunca `DROP COLUMN`, `DROP TABLE` ni `RENAME` de algo en uso. Solo `ADD COLUMN IF NOT EXISTS` y actualizaciones — lo que se deja de usar se ignora, no se borra, para que la versión nueva y la anterior convivan sin romperse durante un despliegue.
**Una migración escrita no es una migración aplicada**: se corren a mano en el SQL Editor de Supabase. Antes de depurar un 500 en un endpoint que escribe, verifica que la columna exista de verdad en la base (`select` de esa columna con el service role), no que exista el archivo en `sql/`.
**5 dominios de datos (DDD, detalle en skill `dominios-datos`):** toda tabla se clasifica en Costos / Cálculo Ambiental / DPP / Metadatos del Negocio / Genérico. Prohibido cruzar datos de más de un dominio en un mismo cálculo salvo por un punto de unión ya definido explícitamente (snapshot, rollup, FK de trazabilidad) — nunca un join ad hoc.

## ROLES, PLANES Y LÍMITES
- **Roles (RBAC)**: `super_admin` (/admin, sin empresa_id), `empresa_admin` (/empresa, una empresa), `empleado` (/dashboard, invitado), `usuario_libre` (/dashboard, plan Explora).
- **Planes** (fuente exacta: `src/lib/plan-limits.ts`):

  | Display name | ID | Cálculos/mes | Informes/mes | Cotizador | Empleados |
  |---|---|---|---|---|---|
  | Explora | `free` | 10 | 0 | No | 1 |
  | Circular Lab | `lab` | 200 | 5 | No | 5 |
  | Impulso Sostenible | `impulso` | 200 | 5 | Sí | 10 |
  | Impacto Ilimitado | `ilimitado` | ∞ | ∞ | Sí | ∞ |
- **Invitaciones**: libre→crea empresa→empresa_admin | admin→invita por email→token | invitado abre link→empleado.
- **Documentos**: Informe (rango de fechas), código `RCO2-XXXX-YYYY` + QR.

## MOTOR LÓGICO UNIVERSAL DE ECONOMÍA CIRCULAR (Migración 031)
**Léelo antes de tocar `categorias`, `items` o el Cotizador.** No es un cotizador de muebles — es un motor genérico. Muebles es el primer caso de uso real, no el techo del sistema.

1. **Árbol de profundidad libre**: `categorias.parent_id` autoreferenciado, sin tabla fija de "subcategorías", sin límite de niveles. Un `item` cuelga de cualquier nodo vía `categoria_id`.
2. **Dimensiones aisladas, nunca cruzadas**: `item_materiales` (ambiental: peso_kg, factor_co2_kg, origen_fuente → alimenta `co2.ts`/`/api/calcular`) vive completamente separado de `item_servicios`+`item_insumos` (financiero: precio → alimenta el Cotizador). `items.peso_kg`/`co2_por_unidad` son un rollup de `item_materiales`, mantenido para que la Calculadora funcione sin cambios de código. Ningún query combina ambas dimensiones.
3. **Cotización = snapshot editable**: al confirmar un ítem detectado, `crm_muebles_cotizados` copia materiales/servicios/insumos de una unidad a `*_json` + `item_id` (trazabilidad) + `cantidad`. Editar una cotización nunca toca el catálogo compartido. Cálculo siempre por unidad × cantidad, nunca líneas repetidas.
4. **Detección multi-ítem por IA**: `/api/cotizador/diagnostico` usa `responseSchema.enum` contra los nombres reales del catálogo — la IA solo ve, clasifica y cuenta, nunca calcula precio ni inventa un ítem inexistente.

Antes de modificar: ¿agregas una noción de "mueble"/industria al schema o UI genérica? ¿mezclas `item_materiales` con servicios/insumos en un cálculo? ¿asumes profundidad fija? Si sí a cualquiera, está mal.

## COTIZADOR — notas vigentes
El DPP (`/empresa/dpp/nuevo`) es siempre opcional y nunca automático: hoy solo se crea de cero, con cliente vinculado (opcional, el mueble es del cliente, nunca de la empresa que cotiza) o sin él. **No existe todavía** un botón "crear DPP" al ganar una cotización, aunque es el flujo previsto — no lo asumas construido sin verificar. Sube foto por archivo o pegado (Cmd+V). Keys requeridas en `.env.local` y Vercel: `GEMINI_KEY`, `OR_KEY`, `GROQ_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_BASE_URL`.

## PDF → TXT
Todo PDF subido se convierte a TXT estructurado antes de almacenarse (`POST /api/dpp/ingesta/subir`, utilidad `src/lib/pdf-to-txt.ts`, fallback automático si falla) — la IA procesa texto plano en vez de binario de visión para ahorrar tokens.

## IA — AHORRO DE TOKENS SIEMPRE
Cualquier código que toque Gemini/OpenRouter/Groq minimiza tokens explícitamente: imágenes comprimidas/redimensionadas antes de enviar, prompts concisos, el modelo más barato que cumpla la tarea.

## PRINCIPIO FINAL
No es un proyecto sobre tecnología. Es sobre CONFIANZA. Simplicidad + velocidad + confianza = éxito en LATAM.

## REGLA DE OBJETIVIDAD Y CERO PROMESAS ABSOLUTAS (LEGAL)
**PROHIBIDO** usar adjetivos calificativos absolutos o rimbombantes para describir la plataforma, especialmente la calculadora de CO₂.
**NUNCA** uses palabras como: *exacto, preciso, 100%, perfecto, irrefutable, inquebrantable, certero, garantiza*.
**SIEMPRE** usa lenguaje prudente y objetivo: *estimado, promediado, de referencia, estructurado, transparente, promueve, permite*.
El sistema no es "mágico", es una herramienta estructurada. No exhaltes el sistema prometiendo cosas que no podemos cumplir.
