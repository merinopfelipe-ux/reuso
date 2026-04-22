---
tags: [estado, reuso, proyecto]
fecha: 2026-04-20
---

# Estado del Proyecto: reuso.lurdes.co

## Versión actual
**V5.3 — Suite E2E completa: 49/50 pasando. Desplegado en producción.**

## Contexto Actual
- Build pasa: ✓ 0 errores TypeScript, 0 errores de lint bloqueantes.
- **PENDIENTE EJECUTAR EN SUPABASE (en orden):**
  - `sql/007_modulos.sql`
  - `sql/008_calculos_estado.sql`
  - `sql/009_contenido_plantillas.sql`
  - `sql/010_fix_planes.sql`
  - `sql/011_certificados_beneficiario.sql`
  - `sql/012_contenido_legal.sql` (NUEVO — tabla `contenido_legal` para edición de legales)
  - `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apellido text NOT NULL DEFAULT ''; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apodo text; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_color text;`
- Buckets Supabase Storage pendientes: `documentos`, `logos`, `firmas`.
- **Número WhatsApp real:** reemplazar `'573000000000'` en `src/lib/constants/contacto.ts`.

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
| LANDING | Rediseño landing + design system | ✓ Completo |
| 7 | Verificación 4 estados + leads | ✓ Completo |
| 8 | Módulos comprables | ✓ Completo |
| 9 | Leads + reportes + cálculos admin | ✓ Completo |
| 10 | Contenido + plantillas + certs admin | ✓ Completo |
| **LEGAL** | **Módulo legal completo (V5.2)** | **✓ Completo** |

## Módulo Legal — Páginas

| Ruta | Estado |
|------|--------|
| `/legal` | ✓ Índice con grid de tarjetas |
| `/legal/terminos` | ✓ Nuevo, editable por super_admin |
| `/legal/privacidad` | ✓ Refactorizado con nuevo layout |
| `/legal/datos` | ✓ Nuevo, Ley 1581 + RGPD + CCPA |
| `/legal/cookies` | ✓ Nuevo, editable por super_admin |
| `/legal/reglamento` | ✓ Refactorizado, con aceptación obligatoria |
| `/legal/confidencialidad` | ✓ Nuevo, con aceptación + localStorage |
| `/legal/medicion` | ✓ Refactorizado con nuevo layout |
| `/legal/dudas` | ✓ Formulario legal |
| `/admin/legal` | ✓ Edición de contenido por super_admin |

## Checklist para producción (hacer antes del deploy)
1. Ejecutar migraciones SQL 007 a 012 en Supabase
2. Ejecutar ALTER TABLE profiles (apellido, apodo, avatar_color)
3. Crear buckets Storage: `documentos`, `logos`, `firmas`
4. Reemplazar `WA_NUMBER` en `src/lib/constants/contacto.ts` con número real
5. Configurar variables de entorno en Vercel (RESEND_API_KEY, etc.)
