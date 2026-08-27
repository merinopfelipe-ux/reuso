---
name: seguridad-reuso
description: Seguridad para reuso.lurdes.co. Usar SIEMPRE cuando el usuario pida "revisión de bugs", "auditoría", "revisa seguridad", "busca vulnerabilidades", o al crear/modificar API routes, auth, storage, componentes con HTML de usuario, o lógica server-side.
---

# Seguridad Calculadora de Reúso

## CHECKLIST DE AUDITORÍA — Revisar en cada sesión de bugs

1. **XSS** — `dangerouslySetInnerHTML` con datos de usuario (BD, inputs)
   - Buscar en: `src/components/`, `src/app/`
   - Fix: `DOMPurify.sanitize(valor)` en el API route antes de INSERT, y antes de renderizar
   - Paquete: `isomorphic-dompurify`

2. **IDOR** — `user_id`/`empresa_id` del body del cliente usado en queries
   - Buscar: endpoints que lean `body.user_id`, `params.userId` sin comparar con sesión
   - Fix: extraer siempre de `supabase.auth.getUser()` + join a profiles

3. **Storage público para archivos privados**
   - Buscar: `getPublicUrl()` en rutas de documentos de usuarios (DPP, cotizador, firmas)
   - Fix: `createSignedUrl(path, 60)` para uso inmediato; `createSignedUrl(path, 3600)` para descarga
   - Buckets reales (verificados en código): `documentos`, `dpp`, `firmas`, `cotizador` son privados. `logos` es público. No inventes nombres de bucket sin confirmarlos con `grep -r ".storage.from("`.

4. **Secretos en código cliente**
   - Buscar: `NEXT_PUBLIC_` con keys reales; keys hardcodeadas en archivos con `'use client'`
   - Solo permitido en NEXT_PUBLIC_: SUPABASE_URL, SUPABASE_ANON_KEY, TURNSTILE_SITE_KEY, BASE_URL

5. **RLS con `USING (true)` en tablas de datos de usuarios**
   - Buscar en `sql/`: `USING (true)` en tablas con user_id o empresa_id
   - Excepciones legítimas: leads, dpp_verificaciones, contenido_landing, dpp_incidencias
   - Sospechoso: CRM, DPP, calculos, certificados, profiles con USING (true)

6. **adminClient en código cliente**
   - Buscar: `createAdminClient` en archivos con `'use client'` o en `src/components/`
   - Fix: mover a API route o Server Action

7. **Endpoints POST/PATCH sin validación Zod**
   - Buscar: handlers que lean `request.json()` sin `z.object().safeParse()`
   - Especial: campos de texto libre (mensajes, notas, descripciones)

8. **Rate limiting ausente en endpoints públicos**
   - Verificar: `/api/leads`, `/api/auth/login`, `/api/auth/registro`
   - Archivo: `src/lib/rate-limit.ts` — límite estándar: 3 req/min

9. **SSRF — `fetch(url_del_usuario)` sin domain allowlist**
   - Buscar: `fetch(` en API routes donde la URL viene de body/params
   - Fix: validar que `new URL(url).hostname === supabaseHost` antes del fetch + `AbortController` con timeout 8s
   - Riesgo: acceso a metadata cloud (169.254.169.254), servicios internos

10. **XSS por template literals con datos de usuario**
    - Buscar: `` `<p>${variableUsuario}</p> `` sin sanitizar en cualquier string HTML construido en server
    - Fix: siempre `DOMPurify.sanitize(htmlString)` antes de insertar en BD
    - Aplica aunque el campo sea un email o título "inofensivo"

11. **Subida de archivo de un tercero sin sanitizar ni optimizar** (ver sección "Subida de archivos" abajo)
    - Buscar: `.storage.from(...).upload(` donde el buffer/base64 viene directo de `request.json()`/`formData()` sin pasar por sanitización de contenido activo ni recompresión
    - Fix: sanitizar según tipo (SVG → `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })`, HTML → regla #1) y siempre recomprimir/optimizar antes de guardar, nunca subir el archivo tal cual llegó del cliente

---

# Reglas de seguridad obligatorias

Nota: las reglas mínimas irrenunciables (XSS, IDOR, signed URLs) ya están en `CLAUDE.md` sección "SEGURIDAD". Lo de abajo es el detalle operativo que no cabe ahí — no lo dupliques al editar CLAUDE.md.

## Autenticación
- Supabase Auth con cookies httpOnly (NO localStorage para tokens)
- Refresh tokens automáticos con rotación
- Logout invalida sesión en servidor
- Rate limiting: máximo 5 intentos de login por minuto por IP
- Contraseñas: mínimo 8 caracteres, al menos 1 número y 1 mayúscula

## Autorización (RBAC)
- Roles: super_admin, empresa_admin, empleado, usuario_libre
- Middleware en CADA API route que verifica rol antes de ejecutar
- Row Level Security en Supabase para CADA tabla
- super_admin: acceso total
- empresa_admin: solo datos de SU empresa
- empleado: solo SUS datos + datos públicos de su empresa
- usuario_libre: solo SUS datos

## Inputs y datos
- Validar TODOS los inputs con zod (server-side, NUNCA solo client-side)
- Sanitizar HTML en cualquier campo de texto libre
- Parametrizar TODAS las queries SQL (nunca concatenar strings)
- Limitar tamaño de uploads (logos: max 2MB, solo PNG/JPG/SVG)
- No exponer IDs internos en URLs (usar UUIDs o slugs)

## Headers de seguridad (next.config.js)
- Content-Security-Policy estricto
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security (HSTS)

## API routes
- Rate limiting en todas las rutas (usar upstash/ratelimit o similar)
- CORS solo para el dominio reuso.lurdes.co
- No exponer stack traces en errores de producción
- Logs de auditoría para acciones críticas (crear empresa, generar certificado, cambiar rol)

## PDFs y certificados
- Generar SOLO server-side (API routes)
- Códigos de verificación: UUID v4 (no secuenciales)
- QR apunta a URL con HTTPS obligatorio
- PDFs almacenados en Supabase Storage con políticas de acceso

## Subida de archivos de un tercero (MANDATORIO Y PERMANENTE, directriz 2026-08-06)
Aplica a cualquier archivo que suba un usuario (empresa_admin, super_admin subiendo a nombre de una empresa, empleado, cliente público) antes de guardarlo en Storage o en una columna de BD. Dos reglas, siempre juntas, nunca una sin la otra:

1. **Sanitizar contenido activo según el tipo de archivo, nunca confiar en la extensión ni el `mime` declarado por el cliente**:
   - SVG: `DOMPurify.sanitize(svgTexto, { USE_PROFILES: { svg: true, svgFilters: false } })` server-side antes de subir — un SVG puede llevar `<script>`/`on*=` embebidos.
   - HTML libre (notas, mensajes, descripciones): regla #1 del checklist de arriba, mismo paquete.
   - Imágenes raster (PNG/JPG/WebP): la recompresión de la regla 2 ya actúa como sanitización — redibujar en `<canvas>` y reexportar descarta metadatos/payloads del archivo original (EXIF, polyglots), nunca se sube el buffer tal cual llegó.
   - PDFs subidos por el usuario (no generados por el servidor): no se reconstruyen igual de fácil que una imagen. Mínimo: validar los primeros bytes (`%PDF-`) antes de aceptar el archivo, no solo el `mime` del input.

2. **Optimizar/recomprimir siempre antes de guardar, sin excepción**: imágenes se redimensionan a un máximo razonable y se recomprimen (WebP calidad ~0.7-0.9, patrón ya usado en `comprimirImagenBase64`/`comprimirLogoWebP`) antes de subir — nunca el archivo original completo. Límite de tamaño explícito por tipo de uso (ej. logos 2 MB, fotos de cotizador 10 MB) validado server-side, no solo en el `<input accept>` del cliente (eso es solo UX, se puede saltar).

**Antivirus / escaneo de malware real**: hoy el proyecto NO tiene integración de escaneo de malware (no hay ClamAV, VirusTotal API ni similar) — no lo inventes ni lo des por hecho en ninguna respuesta. Es una opción a evaluar a futuro si el volumen de uploads de terceros lo justifica (implica un servicio externo nuevo, costo y latencia por request), no algo a añadir sin que el usuario lo pida y confirme el proveedor.

## Variables de entorno
- NUNCA hardcodear secrets en código
- Todas en .env.local (desarrollo) y Vercel env vars (producción)
- .env.local en .gitignore SIEMPRE

## Invitaciones de empleados
- Tokens de invitación: hasheados en BD (nunca guardar el token plano)
- Expiración: 7 días
- Un solo uso (invalidar tras aceptar)
- Verificar que el email del token coincida con el email de registro

## Middleware Next.js (middleware.ts)
- Proteger TODAS las rutas bajo (dashboard), (empresa), (admin)
- Redirigir a /login si no hay sesión válida
- Verificar rol del usuario contra la ruta solicitada
- Rutas públicas: /login, /registro, /verificar/[codigo] ÚNICAMENTE

## Supabase RLS — patrones obligatorios
- Toda tabla con datos de usuario: policy `user_id = auth.uid()`
- Toda tabla con datos de empresa: policy `empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())`
- Tablas de super_admin: policy `EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'super_admin')`
- NUNCA deshabilitar RLS en producción

## CAPTCHA
- Cloudflare Turnstile en formulario de login Y registro
- Verificar token Turnstile server-side antes de procesar
- Fallback si Turnstile falla: rate limiting estricto 3/min

## Ruta /verificar/[codigo] — protección
- Rate limiting: máx 10 requests/min por IP (independiente del resto)
- Si el código no existe, responder siempre con el mismo mensaje genérico (no distinguir "no existe" de "expirado")
- No indexar esta ruta en robots.txt (noindex, nofollow)
- No exponer metadatos del certificado en la URL ni en OG tags
- Los códigos RCO2-XXXX-YYYY son UUID v4 internamente — el formato visible es solo presentación

## Supabase Storage — políticas de buckets
- Bucket `certificados/`: lectura pública para archivos con código de verificación válido; escritura solo desde service_role (API routes server-side)
- Bucket `logos/`: lectura pública; escritura solo empresa_admin de SU empresa o super_admin
- Bucket `informes/`: privado — solo el propietario o empresa_admin de su empresa puede leer
- Nunca usar `public` en buckets que contengan datos personales o financieros
- URLs de Storage para informes: signed URLs con expiración (no URLs públicas permanentes)

## Server Components vs Client Components — datos sensibles
- Datos sensibles (roles, IDs internos, balances, cálculos) solo en Server Components o API routes
- Client Components reciben solo lo que necesitan para renderizar — nada más
- No pasar el objeto de sesión completo como prop a Client Components
- No usar useEffect + fetch en Client Components para datos que requieren autorización; usar Server Components con fetch directo
- El rol del usuario puede usarse en Client Components para mostrar/ocultar UI, pero la autorización real siempre es server-side

## Error handling — códigos HTTP y user enumeration
- 401 Unauthorized: no hay sesión (usuario no autenticado)
- 403 Forbidden: hay sesión pero el rol no tiene permiso (no revelar por qué exactamente)
- 404 Not Found: usar cuando un recurso no existe Y el usuario no tiene permiso para saber si existe (evitar enumeration)
- 400 Bad Request: input inválido (zod errors — no exponer el schema interno)
- 500 Internal Server Error: error inesperado — loguear internamente, responder mensaje genérico
- NUNCA retornar stack traces, nombres de tablas, o estructura de BD en errores de producción
- Mensajes de error al usuario: siempre genéricos ("Credenciales incorrectas", no "Email no registrado")

## Logs de auditoría — esquema real
Tabla: `logs_auditoria` (ver `sql/001_schema_inicial.sql`, NUNCA la llames `audit_logs`, ese nombre no existe).
Columnas reales: `id uuid`, `user_id uuid` (FK a `auth.users`, nullable), `accion text`, `detalle_json jsonb`, `ip text`, `created_at timestamptz`. No tiene `actor_rol`, `empresa_id`, `entidad_tipo` ni `entidad_id` — si necesitas ese detalle, va dentro de `detalle_json`, no inventes columnas nuevas sin migración.
RLS real: solo `super_admin` puede hacer `SELECT` (policy `logs_super_admin_read`, `get_my_rol() = 'super_admin'`). INSERT se hace vía `src/lib/audit.ts` (`logAuditoria()`) con service role, nunca desde el cliente.

## Validación de rol client-side — solo UX
- El UI puede ocultar botones, menús o secciones según el rol del usuario para mejorar la experiencia
- Esto es decorativo — un usuario malicioso puede ignorar estas restricciones client-side
- La autorización real ocurre en: middleware.ts, API routes, y RLS de Supabase
- Patrón correcto: mostrar/ocultar con condicional en JSX basado en session.user.rol
- Patrón incorrecto: proteger rutas o datos solo con condicionales en Client Components

## Pipeline de seguridad automatizado (implementado 2026-08-07)
Cuatro capas gratuitas, sin plataformas de pago. Antes de asumir que alguna no existe, verifica los archivos.

1. **Dependencias** — `.github/dependabot.yml` (nativo de GitHub, revisa `npm` cada lunes). Los PR de vulnerabilidad crítica son una función APARTE ("Dependabot security updates" en Settings → Code security de GitHub), no depende de este archivo.
2. **Secretos** — Gitleaks (binario en `~/.local/bin`, instalado desde GitHub Releases, no es paquete npm) corre automático en cada `git commit` vía Husky + lint-staged (`.husky/pre-commit` → `lint-staged.config.mjs` → `gitleaks git --staged -c .gitleaks.toml`). Bloquea el commit si detecta un secreto. Escaneo manual: `npm run security:secrets`.
3. **SAST** — Semgrep (instalado vía `uv tool install semgrep --python 3.12`, porque el Python del sistema es 3.9 y Semgrep pide 3.10+). Escaneo manual: `npm run security:sast` (reglas gratis del registro, sin cuenta).
4. **Aislamiento RLS multi-tenant** — `tests/rls/multi-tenant-isolation.test.ts` (`npm run test:rls`), crea 2 empresas/usuarios reales, inicia sesión real con la anon key y prueba que Empresa B no puede leer/listar/editar/borrar datos de Empresa A vía RLS directo (no UI). Complementa, no reemplaza, `e2e/06-aislamiento-usuarios.spec.ts` (ese prueba aislamiento a nivel de aplicación/Playwright).

`npm run security:sast` corre sobre TODO el repo (no solo `src/`) — ya tiene `.semgrepignore` para `.email-previews/` (falso positivo conocido: `{{ .ConfirmationURL }}` es variable de plantilla de Supabase Auth, no input de usuario) y el `cooldown` de `.github/dependabot.yml` (protección anti supply-chain) ya está resuelto. `npm run security:sast` da 0 hallazgos (verificado 2026-08-07): el de `encryption.server.ts` (GCM sin `authTagLength` explícito) ya se corrigió, con `authTagLength: 16` en `createCipheriv`/`createDecipheriv` — verificado backward-compatible (datos cifrados antes del fix siguen descifrando bien, sin migración de datos).
