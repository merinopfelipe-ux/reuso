# Calculadora de Reúso — Plataforma de Certificación de Impacto Ambiental por Reúso

## Versión actual: V5.0 — Bloque 10 completo: Contenido + Plantillas + Certificados admin

## Qué es este proyecto
SaaS que mide, certifica y comunica el CO₂ evitado cuando personas y organizaciones reutilizan objetos. Genera certificados PDF e informes con QR verificable. **Landing pública en `/`, login en `/login`.**

## Stack
Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase (PostgreSQL + Auth + Storage + RLS) · Vercel (reuso.lurdes.co) · jsPDF · Recharts · Lucide React · Open Sans · Zod

## Estilo de comunicación obligatorio
El usuario no es desarrollador, usa Mac, y aprende de forma empírica. SIEMPRE dar instrucciones paso a paso para Mac, numeradas, con el comando exacto entre comillas de código, indicando qué aparece en pantalla cuando sale bien. Nunca omitir pasos ni asumir conocimiento previo.

## Comandos
- `npm run dev` / `npm run dev:clean` → desarrollo local (usar clean si se modificaron muchos archivos)
- `npm run build` → verificar antes de deploy · `vercel` → deploy

## Arquitectura
```
app/(auth)/          → login, registro, invitación, recuperar (rutas públicas)
app/(dashboard)/     → dashboard personal del empleado/usuario_libre
app/(empresa)/       → vistas de empresa_admin
app/(admin)/         → panel super_admin
app/empresa/nueva/   → crear empresa (accesible a usuario_libre)
app/verificar/       → verificación pública de certificados e informes
app/api/             → API routes (server-side only)
components/          → componentes reutilizables
lib/plan-limits.ts   → checkLimiteEmpleados, checkLimiteCalculos, checkLimiteCertificados, checkLimiteInformes
lib/constants/contacto.ts → WA_NUMBER centralizado (actualizar antes de producción)
```

## Roles y permisos (RBAC)
- `super_admin` → /admin (gestiona TODO el sistema)
- `empresa_admin` → /empresa (gestiona su empresa, invita empleados, genera certificados)
- `empleado` → /dashboard (calcula, ve impacto de su empresa)
- `usuario_libre` → /dashboard (calcula con límites del plan Explora, sin empresa)

IMPORTANT: Verificar rol en CADA API route. NUNCA confiar solo en el frontend. Ver skill `seguridad-reuso`.

## Documentos verificables (PRIORIDAD #1)
- **CERTIFICADO** — acumulado desde el primer cálculo hasta HOY (sin selector fecha)
- **INFORME** — rango de fechas seleccionable (inicio → fin)
- Ambos: código `RCO2-XXXX-YYYY` + QR → `/verificar/[codigo]`. Generación server-side con jsPDF.

## Planes — nombres, IDs y límites

| Display name | ID en BD | Cálculos/mes | Informes/mes | Certificados/mes | Cotizador | Empleados |
|---|---|---|---|---|---|---|
| Explora | `free` | 10 | 0 | 0 | No | 1 |
| Circular Lab | `lab` | 200 | 5 | 2 | No | 5 |
| Impulso Sostenible | `impulso` | 200 | 5 | 2 | Si | 10 |
| Impacto Ilimitado | `ilimitado` | ∞ | ∞ | ∞ | Si | ∞ |

- **Explora**: solo panel de control + calculadora. Sin certificados ni informes.
- **Impulso Sostenible**: igual que Circular Lab + cotizador circular (en desarrollo, próximamente).
- Los límites se verifican en `src/lib/plan-limits.ts` antes de cada inserción.
- Nombres de display en `NOMBRES_PLAN` (plan-limits.ts). **NUNCA** usar el ID como label en la UI.
- NO hay pasarela de pagos. El super_admin cambia el plan manualmente desde `/admin/empresas`.

## Flujo de empresas e invitaciones
1. `usuario_libre` (plan Explora) → `/empresa/nueva` → crea empresa → pasa a `empresa_admin`
2. `empresa_admin` → `/empresa/equipo` → invita por email → recibe rawToken (efímero) → link copiable
3. Invitado abre `/invitacion/[token]` → se registra → queda como `empleado`
4. Token: `randomBytes(32)` hex → solo hash SHA-256 persiste en BD. Ver concepto `token-sha256-invitaciones`.

## Diseño y seguridad
- **Colores**: Blanco puro (#FFFFFF) + brand (#00827C). **PROHIBIDO usar grises** (#f5f5f5, #e8e8e8, etc.).
- **Mobile-first**. Open Sans es la ÚNICA fuente. NUNCA emojis en producción (solo Lucide React).
- **`user-select: none`** en toda la UI autenticada. Solo el `super_admin` puede copiar/pegar.
- **Copyright** "© Grupo MLP S.A.S." en footers y pies de documentos.
- Ver skill `design-system` para sistema de colores completo, sidebar, layout y componentes.
- Ver skill `seguridad-reuso` antes de implementar auth, API routes o consultas a BD.

## Convenciones de código
- TypeScript strict · Functional components · Server Components por defecto · `'use client'` solo para interactividad
- Imports con alias `@/` · kebab-case para archivos · PascalCase para componentes · camelCase para variables
- Zod en todas las API routes · No `any` → usar `unknown` + type guards · Sin `console.log` en producción
- Idioma de la UI: **Español**

## Skills disponibles (leer antes de implementar)
- `modelo-negocio-reuso` → planes, límites, roles, diferencial (OBLIGATORIO antes de tocar planes o permisos)
- `design-system` → colores, layout, sidebar, componentes reutilizables
- `calculo-ambiental` → factores de emisión, lógica de cálculos, inmutabilidad (`factor_snapshot_json`)
- `seguridad-reuso` → auth, RBAC, RLS, headers, rate limiting

## Documentación del vault (OBLIGATORIO al INICIAR y al TERMINAR cualquier tarea)
**El vault de Obsidian está en:** `/Users/merinop/Documents/Automatizaciones/Bobedas/Reuso/`
**Al INICIAR:** leer `STATE.md` (proyecto), `Bobedas/Reuso/diario/YYYY-MM-DD.md` más reciente y `Bobedas/Reuso/conceptos/` relevantes.
**Al TERMINAR:** crear/actualizar `Bobedas/Reuso/diario/YYYY-MM-DD.md` + `STATE.md` (proyecto) + nota en `Bobedas/Reuso/conceptos/` por cada patrón no obvio nuevo.
Esta regla NO es opcional.

## Versionado y caché
IMPORTANT: Al terminar una sesión: (1) actualizar versión aquí, (2) `pkill -f "next dev" && rm -rf .next`, (3) `npm run dev:clean`.
IMPORTANT: Ejecutar `pkill -f "next dev" && rm -rf .next` ANTES de pedirle al usuario que revise en el browser si se modificaron varios archivos.

## Errores conocidos (NO repetir)
- **`Cannot find module` / página sin CSS** → caché webpack corrupta. Matar proceso PRIMERO: `pkill -f "next dev"`, luego `rm -rf .next`, luego `npm run dev`.
- **`unsafe-eval` en CSP** → Next.js solo lo necesita en dev. En next.config.mjs ya está condicionado a `NODE_ENV === 'development'`. NO volver a poner `unsafe-eval` sin condición.
- **Endpoint `/api/admin/config/upload`** → Ya existe en `src/app/api/admin/config/upload/route.ts`. Valida MIME (PNG/JPG/SVG) y tamaño (2MB) server-side. NO duplicar validación de uploads en frontend solamente.
- **`error.message` de Supabase en respuestas API** → Expone detalles internos. SIEMPRE usar mensajes genéricos en errores 500. Ya corregido en `/admin/legal`, `/leads/list`, `/profile`.
- **Rate limiting en endpoints públicos** → `/api/leads` y `/api/legal/dudas` tienen rate limit 3/min. Cualquier endpoint público nuevo DEBE tener rate limit usando `src/lib/rate-limit.ts`.
- **Parámetros de query sin validación Zod** → Los parámetros `formato` y `tipo` en rutas de exportación/reportes ya tienen `z.enum()`. Siempre validar con Zod, nunca asumir valores seguros de querystring.

## Vault de Conocimiento
Vault en `/Users/merinop/Documents/Automatizaciones/Bobedas/Reuso/`. Notas atómicas en `conceptos/` (kebab-case, frontmatter YAML, wikilinks). Carpetas: `conceptos/`, `diario/`, `proyectos/`. Nota de inicio: `Reúso.md`.