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
   - Buscar: `getPublicUrl()` en rutas de documentos de usuarios (certificados, DPP, firmas)
   - Fix: `createSignedUrl(path, 60)` para uso inmediato; `createSignedUrl(path, 3600)` para descarga
   - Buckets privados: `documentos`, `dpp`, `firmas` | Públicos: `logos`

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

---

## Hallazgos resueltos (V14.8 — 2026-06-08)
- ✅ XSS en hilo-ticket.tsx → DOMPurify en API routes de tickets
- ✅ Bucket `documentos` público → signed URLs (3600s)
- ✅ TTL signed URL DPP 300s → 60s
- ✅ Política RLS crm_cotizaciones_publico_token → eliminada
- ✅ getPublicUrl en cotizador/dpp/firmas → paths en BD + signed URLs al leer
- ✅ certificados.pdf_url guardaba URL firmada → ahora guarda path, URL se genera al servir
- ✅ Políticas RLS storage.objects → migración 021 ejecutada
- ✅ SSRF en cotizador/diagnostico → domain allowlist (supabase host) + timeout 8s
- ✅ XSS almacenado en status/reportar → DOMPurify + escape de email
- ✅ IDOR en tickets/[id]/mensajes GET → ownership check explícito
- ✅ Sin rate limit en status/suscribirse y status/reportar → 3/min y 2/min
- ✅ SVG sanitización regex frágil en admin/config/upload → DOMPurify con perfil SVG

---

# Reglas de seguridad obligatorias

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

## Logs de auditoría — esquema
Tabla: `audit_logs`
Campos obligatorios:
- id: UUID v4
- created_at: timestamp with timezone
- actor_id: UUID (FK a usuarios, nullable para acciones anónimas)
- actor_rol: text (snapshot del rol en el momento de la acción)
- empresa_id: UUID (FK a empresas, nullable si es acción de super_admin global)
- accion: text (enum: 'crear_empresa' | 'generar_certificado' | 'generar_informe' | 'cambiar_rol' | 'invitar_empleado' | 'cambiar_plan' | 'eliminar_usuario')
- entidad_tipo: text (ej: 'certificado', 'empresa', 'usuario')
- entidad_id: UUID (el ID del objeto afectado)
- ip: text (IP del request)
- metadata: jsonb (datos adicionales según la acción)

RLS en audit_logs:
- super_admin: lectura total
- empresa_admin: lectura solo de su empresa_id
- empleado/usuario_libre: sin acceso
- INSERT solo desde service_role (nunca desde el cliente)

## Validación de rol client-side — solo UX
- El UI puede ocultar botones, menús o secciones según el rol del usuario para mejorar la experiencia
- Esto es decorativo — un usuario malicioso puede ignorar estas restricciones client-side
- La autorización real ocurre en: middleware.ts, API routes, y RLS de Supabase
- Patrón correcto: mostrar/ocultar con condicional en JSX basado en session.user.rol
- Patrón incorrecto: proteger rutas o datos solo con condicionales en Client Components
