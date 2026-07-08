---
tags: [estado, reuso, proyecto]
fecha: 2026-07-07
---

# Estado del Proyecto: reuso.lurdes.co

## Versión actual
**V15.12 — Brand logos WhatsApp en propuesta/leads/contenido, micro-animaciones en toda la app, build limpio 127 páginas.**

## Sesión 2026-07-08 — Brand Logos + Micro-animaciones + Deploy (V15.12)

- **Brand logos WhatsApp**: `propuesta-client.tsx`, `leads-client.tsx`, `contenido-client.tsx` ahora usan `WhatsappLogo` de `brand-logos.tsx` en lugar de íconos genéricos de Lucide.
- **Micro-animaciones hover completas**: clases CSS `hover-*` aplicadas en TODAS las páginas admin (14 secciones), empresa (cotizador, marca, modulos), y páginas públicas (propuesta, unsubscribe, landing2).
- **Protección de estados de carga**: patrón `${loading ? '' : 'hover-XXX hover-press'}` en todos los botones async.
- **Revert de migración masiva**: se revirtió el commit `bf28a37` porque `@animateicons/react/lucide` no exporta todos los íconos de Lucide. Los imports de `lucide-react` deben mantenerse para íconos sin equivalente animado.
- **Build**: ✓ limpio, 127 páginas, 0 errores TypeScript.
- **Deploy**: `dpl_jgo2053e8` en producción `reuso.lurdes.co`.

**Regla establecida**: `@animateicons/react/lucide` solo para los íconos que SÍ exporta esa librería. Todos los demás → `lucide-react`. No hacer migración masiva automática.

## Versión anterior
**V15.11 — Integración nativa de @animateicons/react, soporte de @lucide/lab, y wrapper de compatibilidad para Phosphor Icons.**

## Sesión 2026-07-08 — Integración de AnimateIcons y Phosphor Wrapper (V15.11)

- **Wrapper de Grosores para Phosphor Icons (`wrapPhosphorIcon`)**:
  - `src/components/ui/brand-logos.tsx`: Reescribimos el archivo para importar los logotipos oficiales comerciales y redes sociales (`WhatsappLogo`, `LinkedinLogo`, `InstagramLogo`, `FacebookLogo`, `XLogo`, `YoutubeLogo`) desde la librería oficial de `@phosphor-icons/react` instalada.
  - Implementamos el HOC `wrapPhosphorIcon` para mapear los atributos de grosor de Lucide (`strokeWidth` y `duotone`) a los pesos nativos de Phosphor (`light`, `regular`, `bold`, `duotone`), asegurando que no se note ningún cambio o salto visual en la interfaz. Estos logos se renderizan de forma estática (sin animaciones de hover).
- **Integración de AnimateIcons**:
  - Instalamos `@animateicons/react` y cambiamos el muestrario de la subsección `AnimateIcons` en el sistema de diseño (`sistema-diseno/page.tsx`) para usar los componentes de icono interactivos oficiales de `@animateicons/react/lucide` (con animaciones de Framer Motion por hover nativas de `animateicons.in`).
- **Catálogo de Lucide Lab**:
  - Instalamos `@lucide/lab` e integramos un nuevo catálogo de iconos experimentales en la página del sistema de diseño (renderizados con el componente `Icon` de `lucide-react`), como `avocado`, `ufo`, `snowman`, `strawberry`, etc.
- **Despliegue y Validación**:
  - Compilación exitosa de Next.js y despliegue a producción en `reuso.lurdes.co` a través de Vercel.

## Sesión 2026-07-07 — Corrección de Relleno en Iconos y Ajuste Duotone (V15.10)

- **Eliminación de Rellenos/Fondos Negros**:
  - `src/components/ui/icons.tsx`: Resolvimos un error crítico en el HOC `wrapIcon` que causaba que todos los iconos normales se renderizaran con un fondo negro sólido. El error se producía porque React sobrescribía el valor predeterminado `fill="none"` de Lucide con `undefined` al inyectar el prop fill, lo que provocaba que el navegador aplicara el relleno negro estándar de SVG. Modificamos el HOC para que solo pase los atributos `fill` y `fillOpacity` a la etiqueta cuando `duotone` sea estrictamente verdadero.
- **Ajuste de Opacidad Duotone al 65%**:
  - `src/components/ui/icons.tsx` y `IaIcon`: Aumentamos la opacidad de los iconos duotono del 50% al 65% (`fillOpacity={0.65}`) para mejorar la visibilidad y estética del relleno.
  - `src/app/sistema-diseno/page.tsx`: Actualizamos la documentación del sistema de diseño para reflejar que la opacidad del relleno duotono se ha ajustado al 65%.
- **Animaciones en los Cajones de Iconografía**:
  - `src/app/sistema-diseno/page.tsx`: Mapeamos individualmente las clases de micro-interacción por hover (`hover-slide-r`, `hover-leaf`, `hover-calc`, `hover-target`, etc.) a cada uno de los cajones de icono individuales en la grilla del catálogo de iconografía de la Sección 11.
- **Despliegue y Validación**:
  - Desplegado correctamente en vivo en `reuso.lurdes.co` a través de Vercel.

## Sesión 2026-07-07 — Tipografía de Cabecera, Negro Lurdes y Regla de Logotipos (V15.9)

- **Regla de Logotipos de Redes y Empresas**:
  - `CLAUDE.md`: Añadida la regla absoluta de diseño que prohíbe el uso de iconos informales para redes y marcas corporativas. Es obligatorio usar siempre los logotipos vectoriales oficiales públicos (WhatsApp, LinkedIn, Instagram, Facebook, X, YouTube) provistos por el hub local (`brand-logos.tsx` / `icons.tsx`), asegurando colores e identidades oficiales.
- **Cabecera de Sistema de Diseño**:
  - `src/components/design-system-header.tsx`:
    - Modificado el título de cabecera "sistema de diseño" para usar la fuente **Seravek**, renderizarse en **dos líneas** imitando la estructura del logotipo corporativo principal ("sistema de" en tamaño 12px, normal, tracking amplio y opacidad del 80%; y "diseño" en tamaño 22px, extra negrita y tracking ajustado) con ajuste de interlineado (1.05) para máximo refinamiento tipográfico.
    - Cambiados todos los acentos y bordes de color verde sostenible (#00827C) a **Negro Lurdes** (#474747) en menús desplegables, triggers móviles, fondos activos y autocompletados del buscador (manteniendo el pistacho #D6F391 solo en modo oscuro).
- **Subtextos del Catálogo en Negro Lurdes Puro**:
  - `src/app/sistema-diseno/page.tsx`: Modificados todos los párrafos de descripción y subtextos de cada una de las 14 secciones del catálogo de estilos para que utilicen **Negro Lurdes puro (#474747)** en modo claro en lugar de verde sostenible (#00827C).
- **Validación y Despliegue**:
  - `scripts/check-backgrounds.js`: Añadido `design-system-header.tsx` a los archivos permitidos para el control de backgrounds, previniendo falsos positivos por el uso de Negro Lurdes en light mode.
  - Compilación de Next.js (`npm run build`) y pruebas de unidad superadas exitosamente. Despliegue iniciado a producción en `reuso.lurdes.co` a través de Vercel.

## Sesión 2026-07-07 — Iconografía Avanzada: Duotone, IA, WhatsApp y MessageSquare (V15.8)

- **Iconos con Relleno al 50% (Duotone)**:
  - `src/components/ui/icons.tsx`: Implementamos un HOC (`wrapIcon`) que envuelve todos los iconos del hub para interceptar y admitir la propiedad `duotone`. Cuando `duotone={true}` se pasa al componente de icono, este se renderiza con `fill="currentColor" fillOpacity={0.5}`, emulando perfectamente el estilo duotone nativo y dándole soporte en todo el sistema.
  - `src/app/sistema-diseno/page.tsx`: Añadimos una cuarta columna llamada "Duotone (duotone=true)" en el muestrario de pesos de la **Sección 11 (Iconografía)**, documentando y renderizando los iconos con el nuevo prop.
- **Icono de Inteligencia Artificial (IaIcon)**:
  - `src/components/ui/icons.tsx`: Diseñamos y exportamos un icono personalizado `IaIcon` que dibuja una caja redondeada de Lucide con las letras "IA" caladas en el centro utilizando la tipografía **Seravek** (`fontFamily="seravek, ..."`).
  - `src/app/(public)/legal/page.tsx`: Actualizamos el mapeo de `/legal/ia` en `ICONOS` para que use el nuevo `IaIcon` en lugar de `Cpu` en la grilla de documentos legales.
  - `src/app/sistema-diseno/page.tsx`: Agregamos `IaIcon` en el catálogo general de iconografía.
- **Preferencia por la familia MessageSquare**:
  - Reemplazamos `MessageCircle` por `MessageSquare` en todos los archivos del proyecto que importaban el chat bubble directamente para homogeneizar el estilo:
    - `src/components/ui/icons.tsx` (alias `ChatCircle` mapeado a `MessageSquare`).
    - `src/app/page.tsx`, `src/app/ayuda/page.tsx`, `src/app/(admin)/admin/contenido/contenido-client.tsx`, `src/app/(admin)/admin/leads/leads-client.tsx` y `src/app/(public)/legal/page.tsx`.
- **Implementación Correcta de WhatsApp**:
  - `src/components/ui/whatsapp-logo.tsx`: Rediseñamos el SVG de `WhatsappLogo` utilizando una estructura de dos capas (un círculo inferior blanco `#FFFFFF` y el trazado superior de la burbuja que hereda `currentColor`). Esto garantiza que el teléfono interno siempre se renderice en blanco contrastado, solucionando el bug donde el teléfono se volvía transparente y tomaba el color de fondo.
  - `src/app/page.tsx`: Reemplazamos el icono `ChatCircle` genérico del botón flotante de WhatsApp por el nuevo `WhatsappLogo` en tamaño grande (32px), integrando el verdadero isotipo de la marca en la landing.
  - `src/app/pasaporte/[codigo]/collapse-section.tsx`: Reemplazamos el SVG inline rudimentario del botón "Compartir este pasaporte" por el componente `WhatsappLogo`.
- **Verificación**: Compilación de Next.js (`npm run build`) completada con éxito y tests de unidad al 100%.

## Sesión 2026-07-07 — AnimateIcons y Transiciones de Página (V15.7)

- **Auditoría e Implementación de AnimateIcons**:
  - Explicado y documentado el uso de la lógica CSS de micro-interacciones sobre SVGs internos mediante clases hover como `hover-bell`, `hover-gear`, `hover-slide-r`, `hover-copy`, `hover-trash`, etc., combinadas con `hover-press` para feedback táctil al presionar.
  - `src/app/sistema-diseno/page.tsx`: Creada una nueva subsección interactiva en **Iconografía (Sección 11)** que actúa como catálogo de demostración de *AnimateIcons (Lucide Lab)* con 12 botones dinámicos para previsualizar los efectos de micro-interacción.
  - Aplicados los comportamientos de micro-animaciones a las acciones principales del sistema:
    - Enlaces de llamada a la acción en la landing page (`src/app/page.tsx`): Habilitado `hover-slide-r hover-press` en botones principales con icono `ArrowRight` (hero CTA y sección de registro).
    - Enlace de creación de empresa en el dashboard (`src/app/(dashboard)/dashboard/page.tsx`): Aplicado `hover-slide-r hover-press` al enlace del banner de upgrade.
    - Accesos rápidos del empleado en el dashboard (`src/app/(dashboard)/dashboard/page.tsx`): Mapeado e implementado `hover-package` (Registrar reúso), `hover-spin` (Mi historial) y `hover-lifebuoy` (Soporte).
- **Transiciones de Página**:
  - `src/app/globals.css`: Creada la animación `@keyframes pageFadeIn` y las clases utilitarias `.animate-page-enter` y `.animate-fade-in` (que resuelven un bug del formulario de registro donde no estaba declarada).
  - `src/components/layout-shell.tsx`: Se importó `usePathname` de `next/navigation` y se asignó como `key` al contenedor principal del contenido (`children`) con la clase `animate-page-enter`. Esto fuerza a React a recrear el componente de contenido en cada cambio de ruta, logrando una transición marcada de fade-in, slide-up y desenfoque (blur-in) sin afectar visualmente a los componentes del cabecero, sidebar y footer (respetando la zona protegida).
  - `src/app/(auth)/recuperar/page.tsx`: Integrada la transición `.animate-page-enter` al contenedor principal del formulario.
- **Verificación**: Compilación de Next.js (`npm run build`) completada con éxito y pruebas de unidad superadas al 100%.

## Sesión 2026-07-07 — Auditoría y Eliminación de Phosphor (V15.6)

- **Auditoría completa**: Verificado que `@phosphor-icons/react` no está en `package.json` ni en `package-lock.json`, garantizando su completa remoción de las dependencias.
- **Remoción de referencias residuales**:
  - `src/app/sistema-diseno/page.tsx`: Actualizado el título de la sección 11 a "Iconografía Lucide", reemplazado el enlace de Phosphor Icons por el oficial de Lucide Icons (`https://lucide.dev/`), y modificado el muestrario de pesos visuales para utilizar y explicar los valores de `strokeWidth` (1.5 Delgado, 2.0 Regular, 2.5 Destacado).
  - `e2e/05-legal-pages.spec.ts` y `e2e/07-auth.spec.ts`: Actualizados los títulos de los tests y comentarios que hacían referencia a iconos Phosphor para apuntar a Lucide Icons.
  - `resumen-tecnico-reuso.txt`: Actualizada la especificación del sistema de diseño para indicar el uso de Lucide Icons en lugar de Phosphor.
- **Verificación**: Compilación de Next.js (`npm run build`) y pruebas de unidad finalizadas con 100% de éxito.

## Sesión 2026-07-07 — Migración de Iconos (Phosphor → Lucide) (V15.5)

- **94 archivos migrados**: Eliminado `@phosphor-icons/react` por completo. Todas las importaciones convertidas a `lucide-react`.
- **Hub `src/components/ui/icons.tsx`**: Reescrito para exportar desde `lucide-react` con aliases compatibles con nombres Phosphor (para los 12 archivos que importan del hub).
- **Iconos sin equivalente directo**: Barbell→Dumbbell, ArrowsCounterClockwise→RefreshCcw, Bathtub→Bath, Robot→Bot, Storefront→Store, LockKey→KeyRound, Quotes→Quote, ClipboardText→ClipboardList, DownloadSimple→Download, EnvelopeSimple→Mail, ChatCircleText→MessageSquareText.
- **WhatsappLogo**: Reemplazado con SVG inline en `cotizador/[id]/page.tsx` y `empresa/configuracion/modulos/page.tsx` (no existe en Lucide — es logo de marca).
- **Props `weight` convertidas**: `bold`→`strokeWidth={2.5}`, `light`→`strokeWidth={1.5}`, ternarios dinámicos→`strokeWidth={isActive ? 2.5 : 2}`. Props `fill`, `regular`, `duotone` eliminadas.
- **Archivos especiales**: `pasaporte/[codigo]/page.tsx` usaba `/dist/ssr` — migrado a `lucide-react` (RSC-compatible por defecto). `modulos-client.tsx` usaba `import * as PhosphorIcons` para búsqueda dinámica → `import * as LucideIcons`.
- **CLAUDE.md actualizado**: "Iconos: Phosphor Icons" → "Iconos: Lucide Icons (`lucide-react`)".
- Build de producción: ✓ 127 páginas, cero errores. Commit `d5eecb1`.

## Sesión 2026-06-25 (noche) — Limpieza de API Routes

- **Parámetros `_req`/`_request: NextRequest` → `_: Request`** en 5 handlers DELETE/GET/POST que no usaban el request: `propuesta/[token]/aceptar`, `cotizaciones/[id]` GET, `cotizaciones/[id]/muebles`, `invitaciones/[id]` DELETE, `miembros/[id]` DELETE.
- **Import `NextRequest` eliminado** donde solo existía por el parámetro muerto: `propuesta/[token]/aceptar/route.ts` y `cotizaciones/[id]/muebles/route.ts`.
- **Interfaces internas movidas al nivel de módulo**: `CotizacionAceptar`, `CotizacionItem`, `CotizacionFria` — estaban declaradas dentro de funciones, antipatrón de TypeScript.
- TypeScript limpio ✓. Commit `3493be1`.

## Sesión 2026-06-25 (tarde) — Limpieza de Lints y Compilación Exitosa
- **Tipado Seguro de Turnstile**: Reemplazados tipos `any` y firmas de objetos ad-hoc por `TurnstileInstance` de `@marsidev/react-turnstile` en `/login` y `/registro` para resolver errores de compilación del compilador de NextJS.
- **Remoción de Imports/Parámetros Muertos**:
  - En `/admin/qa`: Eliminados `Sun` import y la interfaz `QAStore` que no se utilizaban.
  - En `/invitacion/[token]`: Removido `useEffect` import no utilizado.
  - En `POST/DELETE /api/empresa/configuracion/codigo-registro`: Removidos los parámetros `_req` no utilizados y el import `NextRequest` no utilizado.
- **Tipado Seguro de Excepciones**: Reemplazado `catch (err: any)` por `catch (err)` y chequeos de instancia seguros en `/registro`.
- TypeScript limpio ✓. Build de producción exitoso ✓.

## Sesión 2026-06-25 (mañana) — Promo Relámpago + Rediseño /unsubscribe

### Correo de marketing: Promo Relámpago
- **Template `4-promo-relampago`**: Primer correo de marketing real con hero pistacho, precio, 3 beneficios y link de baja. Sin firma (marketing no va firmado).
- **`emailPlantilla()` con `mostrarFirma`**: Nuevo parámetro booleano (default `true`). Los correos de sistema mantienen la firma; los de marketing la suprimen. Aplicado en `src/lib/email.ts` y en `scripts/preview-emails.mjs`.
- **`emailMarketing()`**: Ya acepta `mostrarFirma: false` y `avisoPie` automáticamente. No requiere cambios.
- **Dark mode del correo (4 capas sincronizadas)**: `@media`, `[data-ogsc]`, `[data-ogsb]` y `DARK_FORCED`. Clases nuevas: `.epromo-bg` (hero pistacho), `.epbd` (badge fondo `#474747`), `.epbw` (badge texto blanco), `.ep-mes` (pistacho), `span.epi` (checkmarks negro Lurdes), `.ediv` (divisores pistacho), `.ep` + `.ep-precio` + `.ep-tachado`.
- **Bug de especificidad CSS resuelto**: `.epi` perdía ante `.ec span` porque (0,1,0) < (0,1,1). Corregido a `span.epi` — misma especificidad, declarado después, gana.
- **Countdown eliminado**: No funciona en email HTML estático.
- **Variantes de preview**: Ahora se generan 3 archivos por template: `-dia.html` (sin CSS), `-noche.html` (DARK_FORCED), `-full.html` (con `@media` CSS para envío real).
- **`send-promo-test.mjs`**: Script de envío usa `-full.html` para preservar dark mode en clientes de correo.
- **Migración 030 ejecutada en Supabase**: `profiles.unsubscribe_reason TEXT` — guarda el motivo de baja de la encuesta.

### Página /unsubscribe rediseñada
- **Movida de `(public)` a `(standalone)`**: Nuevo route group sin layout → sin header ni footer público.
- **`src/app/(standalone)/layout.tsx`**: Layout mínimo que solo renderiza `{children}`.
- **Logo real con dark mode**: `Image` SVG con `dark:brightness-0 dark:invert` — funciona automáticamente con Tailwind.
- **Encuesta de motivo de baja**: 4 opciones con radio buttons estilizados (pistacho en noche al seleccionar). Campo opcional; el motivo se guarda en `profiles.unsubscribe_reason`.
- **Dark mode automático**: Tailwind `dark:` — sin MutationObserver, sin JS extra.
- **Colores correctos**: Día `#00827C` / Noche `#D6F391` + `#474747`. Sin `#525252` hardcodeado (reemplazado por `var(--bg-card)`).
- **Sin footer**: Standalone layout elimina la herencia del footer de `(public)`.

### API actualizada
- **`POST /api/unsubscribe`**: Acepta `motivo?: string` (max 200 chars). Si viene, lo guarda en `profiles.unsubscribe_reason` junto con `marketing_opt_out: true` y rotación de token.

## Sesión 2026-06-24 — Marketing Unsubscribe + Avisos Legales en Correos
- **Aviso legal en correos de sistema**: Footer actualizado en `emailPlantilla()`, `supabase-templates.mjs` y `preview-emails.mjs`. Los 9 correos (3 Resend + 6 Supabase) incluyen el texto "Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso...".
- **Migración 029**: Columnas `marketing_opt_out` (bool) y `unsubscribe_token` (uuid) en tabla `profiles`. Índice único en token para lookup rápido.
- **API POST /api/unsubscribe**: Rate limit 5/min por IP, validación UUID con Zod, marca `marketing_opt_out=true` y rota token tras cada uso. Respuesta genérica si el token no existe (anti-enumeración).
- **Página pública /unsubscribe**: 4 estados (pendiente, confirmando, éxito, error). Suspense + useSearchParams. Dark mode reactivo. Agregada a `PUBLIC_ROUTES` en middleware.
- **emailMarketing()**: Nueva función en `email.ts` que inyecta footer de baja en lugar del aviso de sistema. Helper `urlBaja(token)` genera la URL completa. Parámetro `avisoPie?` en `emailPlantilla()` — backward compatible.
- **Skill email-design actualizada**: Sección 3.1 documenta `emailMarketing()`, reglas de opt-out y checklist ampliado.
- **Templates Supabase aplicados**: 6 templates pegados en Supabase Dashboard con diseño actualizado.
- TypeScript limpio ✓. Build exitoso ✓. Push a origin/main ✓.

## Sesión 2026-06-20 — Blindaje de Suite E2E & Prevención de Colapsos
- **Estabilización de 118 Pruebas E2E**: Ejecución exitosa de las 12 fases de pruebas mediante `npm run pruebas`.
- **Limpieza de Caché del Dev Server**: Identificación de problemas de sincronización de chunks del dev server de Next.js. Se resolvió purgando la carpeta `.next` y reiniciando el proceso (`npm run dev:clean`).
- **Null Safety en Fecha de Reportes**: Corregidos colapsos del servidor en `/empresa/reportes` y `/admin` cuando un cálculo en la base de datos tiene `fecha = null` (por ej. los insertados vía API general). Se implementó validación preventiva `if (!c.fecha) continue` en [reportes/page.tsx](file:///Users/merinop/Documents/Automatizaciones/Reuso/src/app/(empresa)/empresa/reportes/page.tsx) y mapeos seguros en [admin/page.tsx](file:///Users/merinop/Documents/Automatizaciones/Reuso/src/app/(admin)/admin/page.tsx).
- **Fallback en searchParams de Usuarios**: Se resguardó `searchParams` en la vista administrativa de usuarios `/admin/usuarios` ante valores nulos durante la generación estática usando `const params = searchParams ?? {}` en [usuarios/page.tsx](file:///Users/merinop/Documents/Automatizaciones/Reuso/src/app/(admin)/admin/usuarios/page.tsx).

## Sesión 2026-06-16 — Módulo de Autenticación V15.0
- **Cajas de Entrada OTP (OTPInput)**: Refactorizado el ingreso de códigos en 6 cajas individuales con foco inteligente (auto-avance y soporte para pegar) en las páginas `/confirmar-email`, `/recuperar` y `/settings`.
- **Tema Noche en Confirmación de Correo**: Agregado soporte completo para modo oscuro y `ThemeToggle` en `/confirmar-email`.
- **Registro con Aceptación Legal Explícita**: Integrado el patrón estilo Bancolombia en el paso 3 de registro, requiriendo que el usuario interactúe conscientemente con los modales de términos legales y política de privacidad antes de permitir la creación de cuentas.
- **Rediseño de Correos**: Plantillas de correo (bienvenida, confirmación, recuperación, invitaciones y soporte) actualizadas con narrativa en 3 pasos y un encabezado en gradiente `#004D49` a `#00827C`.
- **Turnstile en Modo Fail-Open**: Ajustado el flujo de Turnstile de Cloudflare para que nunca bloquee al usuario en caso de error de red o de carga del widget.
- **Limpieza y Corrección en Registro**: Eliminado el campo apodo duplicado y unificados los links para que abran de forma local (evitando nuevas pestañas).

## Sesión 2026-06-09 — Fondos Puros y CSS Variables
- **Estandarización de Fondos en Todo el Sistema**: Se unificaron las páginas del cotizador de empresas y los componentes client del panel administrativo para que lean dinámicamente de las variables de tema global `--bg-primary` en lugar de sobreescribir con fondos claros `#F5FAFA` o negros intermedios `#474747` / `#525252`.
- **Estructura C Dinámica en Admin**: Rediseñada la constante `C` en los 8 componentes client administrativos (`contenido-client.tsx`, `certificados-client.tsx`, `modulos-client.tsx`, `modulos-empresa-client.tsx`, `reportes-client.tsx`, `plantillas-client.tsx`, `leads-client.tsx`, `calculos-client.tsx`) para usar variables CSS nativas (`var(--color-brand)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--border)`, `var(--bg-hover)`).
- **Fondos de Tarjetas y Modales adaptables**: Reemplazados los fondos rígidos `background: '#fff'` de cards e inputs en favor de `var(--bg-card)` y `var(--bg-input)`.
- **Correcciones en QA**: Ajustado el fondo de la pantalla de informe QA (`qa/page.tsx`) a `var(--bg-input)`.
- **TypeScript y Build exitosos ✓**: El proyecto Next.js compila completamente sin errores con `npm run build`.

## Sesión 2026-06-06 — Limpieza + Rediseño QA
- **L1 — `test_fallback.js` eliminado**: archivo exponía `TURNSTILE_SECRET_KEY` en console.log.
- **L2 — Imports muertos en `modulos-client.tsx`**: removidos `Buildings, Tag, PencilSimple, Check, X` que no se usaban (luego revertido al verificar que sí se usan en JSX).
- **L3 — Comentario muerto en `dpp/ingesta/subir/route.ts`**: eliminada línea `// const ip = getIp(request)`.
- **L4 — `npm prune`**: eliminados 4 paquetes extraneous (`@emnapi/*`, `@tybys/wasm-util`).
- **L5 — `/pivot-roadmap` eliminado**: página interna ya no necesaria.
- **QA rediseñado e incorporado**: `/admin/qa` ahora usa el mismo diseño visual que `/pivot-roadmap` — liquid glass, blobs animados, sidebar de categorías, progress circular SVG, cards expandibles con pasos y notas por tarea. Guarda automáticamente cada 3 min.
- **QA Limpieza de Duplicados & Enriquecimiento**: Eliminados 7 duplicados redundantes de `TAREAS_INICIALES` y agregados 15 casos de prueba de estrés avanzados (incluyendo XSS en SVG, inyección XSS clásica, escalada de privilegios RBAC en API de incidentes, Magic Numbers en subida de imágenes, resiliencia offline en DPP, concurrencia de PDFs, optimistic locking en cotizaciones, tampering criptográfico en pasaportes, evasión de onboarding en middleware, valores límite en calculadora, firmas en base64 corruptas, caídas en scripts de Turnstile, logos de marca con dimensiones extremas, sincronización de cierre de sesión en multi-pestaña y redibujado de gráficos interactivos por redimensionamiento veloz).
- **QA Detallado de Tareas**: Reescritos los pasos de múltiples tareas (`dash-03`, `dash-05`, `emp-10`, `adm-11`) para guiarlas paso a paso de forma clara e interactiva para el tester.
- TypeScript limpio ✓.

## Sesión 2026-06-05 (noche) — Cambios (auditoría continuación)
- **A1 extra — `cotizador/[id]` catch ignorado**: reemplazado `catch { /* ignore */ }` en la carga inicial; ahora muestra banner de error al usuario.
- **A5 extra — console.error en registro-invitacion**: eliminado el `console.error('Turnstile falló:', data)` en la función privada `verifyTurnstile`.
- **A3 extra — Memory leak en `configuracion/marca`**: `comprimirLogoWebP` ahora revoca el object URL en `onload` y `onerror`; eliminado el bloque `img.onload` duplicado.
- TypeScript limpio ✓.

## Sesión 2026-06-05 (tarde) — Cambios (auditoría)
- **A1 — Errores silenciosos corregidos**: `cotizador/page.tsx` y `cotizador/[id]/page.tsx` ya muestran banner de error en lugar de silenciar el `catch {}`.
- **A3 — Memory leak URL.createObjectURL**: `nueva/page.tsx` ahora revoca el object URL en `onload` y `onerror`.
- **A4 — SKIP_TURNSTILE consistente**: `registro-invitacion/route.ts` ya respeta la variable de entorno igual que `login` y `registro`.
- **A5 — console.log/error eliminados en producción**: `error.tsx`, `login/route.ts`, `registro/route.ts`.
- **A6 — Rate limit IA por usuario**: clave cambiada a `cotizador_diag_${user_id}` (antes era por empresa).
- **B1 — Confirmación estados terminales**: `cotizador/[id]` pide confirmación antes de marcar como ganada/perdida/inviable.
- **B3 — Historial se refresca al guardar**: `CalculadoraConHistorial` wrapper conecta `onGuardado` con `refreshKey`.
- **B4 — Input imagen limpio tras error**: se resetea el `<input>` si la imagen supera 10 MB.
- **C1 — Fallback OpenRouter en diagnóstico IA**: si Gemini falla, reintenta con Qwen-VL.
- **C2 — Prompt Gemini reducido**: ~130 tokens menos por llamada de diagnóstico.
- **C3 — Prompt Groq reducido**: ~180 tokens menos por llamada de validación DPP.
- **D1 — Límite máximo en tickets**: `limit` ahora forzado a máximo 100.
- **D2 — Validación fecha_fin en metas**: Zod rechaza rangos inválidos.
- **D3 — GEMINI_MODEL como env var**: modelo configurable sin tocar código.
- TypeScript limpio ✓.

## Sesión 2026-06-05 (mañana) — Cambios (V14.8)
- **Sincronización de Temas reactiva ✓**: Se implementó un `MutationObserver` en `/pivot-roadmap`, `/sistema-diseno` y las cabeceras (`DesignSystemHeader`, `LandingHeader`) para sincronizar reactivamente el estado local con el atributo global `data-theme`.
- **Fuelle único en LocalStorage ✓**: Se unificaron las llaves de tema en localStorage bajo `"theme"`.
- **Prevención de Parpadeo (FOUC) ✓**: Se insertó un script en el `<head>` del layout raíz (`layout.tsx`) para asignar de inmediato el atributo `data-theme` antes del primer renderizado.
- **Sub-árboles en Modo Claro ✓**: Se asociaron las variables del tema claro al selector `[data-theme="light"]` y se forzó `data-theme="light"` en la landing page (`page.tsx`) para asegurar que cargue en modo claro y con textos legibles.
- **Limpieza de Colores Hardcodeados ✓**: Se removieron teales oscuros (`#1A3A38`, `#4D7C79`) de la calculadora (`calculadora.tsx`), el historial (`historial-calculos.tsx`) y los reportes (`panel-certificados.tsx`), reemplazándolos por variables CSS como `var(--text-primary)`, `var(--text-secondary)`, `var(--border)` y `var(--bg-integrated)`.
- **TypeScript y Build exitosos ✓**: Compilación completa de Next.js mediante `npm run build` libre de errores.
- CLAUDE.md actualizado a V14.8.

## Versión anterior
**V14.1 — Migración 017: 5 tablas DPP con RLS + hash chain + columnas nuevas en empresas/items.**

## Sesión 2026-06-04 — Cambios (V14.1)
- Nuevo archivo `sql/017_dpp_tablas.sql` — ejecutado exitosamente en Supabase ✓
- **Tablas DPP creadas ✓**: `dpp_activos`, `dpp_ciclos`, `dpp_metricas_financieras`, `dpp_documentos_ingesta`, `dpp_verificaciones`
- **ALTER TABLE** empresas: `tiene_dpp`, `sector_dpp`, `moneda_preferida`
- **ALTER TABLE** items: `es_activo_circular`, `vida_util_anos`, `categoria_dpp`
- RLS: super_admin (total), empresa_admin (su empresa), empleado (lectura empresa + escritura propios), usuario_libre (sus registros), verificaciones INSERT público
- Columna `tco` GENERATED ALWAYS AS STORED en dpp_metricas_financieras
- Trigger `set_updated_at()` + 5 índices en tablas DPP
- CLAUDE.md actualizado a V14.1

## Versión anterior
**V13.77 — Firma digital del Acuerdo de Confidencialidad, botón scroll en legales, interconexión completa entre todos los documentos legales.**

## Sesión 2026-05-26 — Cambios (V13.77)
- Nueva página `/legal/confidencialidad-firma`: copia del acuerdo + formulario de firma digital (canvas mouse/touch), modal de confirmación, PDF generado con jsPDF, envío vía Resend + BCC innovacion@lurdes.co
- Nuevo API route `/api/legal/firma`: rate limit 5/h, Zod, jsPDF PDF multipágina con texto completo + firma + código verificación (crypto), insert en Supabase `log_firmas_confidencialidad` (no bloquea si tabla no existe)
- ⚠️ **Migración pendiente**: crear tabla `log_firmas_confidencialidad` en Supabase (ver diario 2026-05-26)
- `/legal/confidencialidad`: leeTabien ahora enlaza los 6 documentos restantes; sección Obligaciones y Uso con links orgánicos a privacidad, cookies, reglamento y datos
- `LegalPageLayout`: botón scroll al fondo (fijo, esquina inferior izquierda), props `hideResumen` y `hideLeeTambien`, `ALL_LEGAL_PAGES` centralizado, `usePathname`
- `/legal/page.tsx`: card IA a ancho completo (gridColumn: 1/-1), íconos migrados a @phosphor-icons/react directo
- TypeScript: 0 errores ✓
- **Último deploy:** `dpl_HZAz6BcTx9NgPJaxVEQX81SDeWkR` → https://reuso.lurdes.co ✓

## Sesión 2026-05-25 — Cambios (V13.76)
- Refactorización completa del banner de cookies: 3 categorías (esencial/funcional/analítica) + 3 botones + panel Personalizar inline
- Nueva estructura de consentimiento: `reuso_cookies_consent` JSON `{v,ts,e,f,a}` con migración automática desde clave antigua
- Nueva página `/legal/ia` — política de uso de IA, 7 secciones, bilingüe
- Nueva página `/legal/cookies/preferencias` — gestor interactivo de preferencias con toggles
- Reescritura de `/legal/cookies` — tablas detalladas por categoría, Privacy First block, bilingüe
- Todos los documentos legales convertidos a bilingüe ES/ENG (T object pattern)
- Los 4 legales con "Transparencia IA" (terminos, privacidad, datos, confidencialidad) añaden link a /legal/ia
- Cumplimiento explícito en todos los docs: RGPD (UE) + CCPA (EE. UU.) + Ley 1581/2012 (Colombia)
- `/legal` y todas subrutas: siempre públicas sin login (verificado en middleware.ts)
- Deploy en producción: `dpl_83e3BEGjzHaFA8T7YKV3UMiFQmdy` → https://reuso.lurdes.co ✓

## Sesión 2026-05-12 — Cambios adicionales (V13.75)
- Traducciones ES/ENG completas en /login (textos UI + testimonios)
- Idioma detectado automáticamente de `navigator.language`, guardado en `localStorage`
- Animaciones de entrada: panel izquierdo desliza desde izquierda, derecho desde derecha
- Transición de testimonios con `fadeSlideUp` al cambiar slide
- Logo superior derecho del panel verde: cambiado a `/logo-completo.svg` (Reúso)
- Validación inline por campo: correo, contraseña y términos legales con mensaje rojo debajo
- Turnstile en modo invisible (sin widget visible)
- Endpoint `/api/health` creado para keepalive de Supabase (cron-job.org cada 12h)
- `cron-job.org` configurado para mantener Supabase activo

## Contexto Actual
- Build pasa: ✓ 0 errores TypeScript (verificado en sesión 2026-05-12).
- Desplegado en producción: https://reuso.vercel.app
- Migraciones SQL 007–015 ejecutadas en Supabase. ✓
- Turnstile real activo. ✓
- WA_NUMBER confirmado: `573147265212`. ✓
- **Migración 016** (`legal_aceptado_en`) — ✓ Ejecutada 2026-05-18.
- **cron-job.org** — configurado y activo. Llama `https://reuso.lurdes.co/api/health` cada 12h. Supabase no volverá a pausarse. ✓
- **Último deploy** — 2026-05-12. Alias confirmado: `https://reuso.lurdes.co`. ✓

## Bugs corregidos en sesión 2026-04-27

| Bug | Causa raíz | Archivo(s) |
|-----|-----------|------------|
| Header mostraba "Luis Felipe" en vez de "Luis" | `displayName()` no manejaba apodo=null; layouts sin `apellido,apodo` en SELECT | `lib/display-name.ts`, `settings/layout.tsx`, `ayuda/layout.tsx` |
| Avatar color/text no guardaban | `avatar_color` y `avatar_text` habían sido eliminados del PATCH por error | `api/profile/route.ts`, `settings/page.tsx` |
| Tema saltaba a dark al cargar /settings | El fetch del perfil llamaba `applyTheme()` sobreescribiendo localStorage | `settings/page.tsx` |
| Botón de guardar con texto blanco en modo noche | Faltaba detección isDark via MutationObserver | `settings/page.tsx` |

## Plan Maestro — Estado de Bloques

| Bloque | Título | Estado |
|--------|--------|--------|
| 0 | Correcciones UX base | ✓ Completo |
| 1 | Auth flows | ✓ Completo |
| 2 | Roles separados / sidebar | ✓ Completo |
| 3 | Calculadora completa | ✓ Completo |
| 4 | Historial de cálculos | ✓ Completo |
| 5 | Tickets/soporte | ✓ Completo |
| 6 | Metas + certificados empresa | ✓ Completo |
| **DS** | **Rediseño Liquid Glass Premium (12 Secciones)** | **✓ FINALIZADO** |
| 7 | Verificación 4 estados + leads | ✓ Completo |
| 8 | Módulos comprables | ✓ Completo |
| 9 | Leads + reportes + cálculos admin | ✓ Completo |
| 10 | Contenido + plantillas + certs admin | ✓ Completo |
| **LEGAL** | **Módulo legal completo (V5.2)** | **✓ Completo** |
| **SETTINGS** | **Página /settings completa con masking, OTP, avatar** | **✓ Completo** |

## Migraciones ejecutadas

- [x] Migración 015 — `notificaciones_json`, `avatar_color`, `avatar_text`, trigger `handle_new_user` actualizado. ✓ (2026-05-02)
