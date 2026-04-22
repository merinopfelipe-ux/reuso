---
tags: [diario, bugfix, v4.5, reuso, sesion, soporte, metas, perfil, lint]
fecha: 2026-04-14
version: V4.4 → V4.5
---

# Sesión 2026-04-14 — Bugfix post Bloque 6

## Contexto de entrada

Revisión exhaustiva del estado real del código tras implementar Bloques 0–6. Se detectaron 6 bugs funcionales + errores de TypeScript/lint que impedían el build.

---

## Bugs corregidos

### Bug 1 — empresa/soporte: esAdmin siempre false (CRÍTICO)
**Archivo:** `src/app/(empresa)/empresa/soporte/page.tsx`  
Se añadió consulta del perfil en el server component para derivar `esAdmin` correctamente.  
Antes: `<ListaTickets esAdmin={false} />` → empresa_admin no podía crear tickets.  
Después: `esAdmin = perfil?.rol === 'empresa_admin' || 'super_admin'`.

### Bug 2 — GET /api/tickets: columna unread_admin inexistente (CRÍTICO)
**Archivo:** `src/app/api/tickets/route.ts`  
Se eliminó el join `unread_admin:tickets_mensajes!inner(count)` — la columna no existe en el schema SQL.  
SELECT simplificado a campos reales: `id, titulo, tipo, prioridad, estado, user_id, empresa_id, created_at, updated_at`.

### Bug 3 — metas peso_kg sin cálculo de progreso (ALTO)
**Archivo:** `src/app/api/metas/route.ts`  
Se implementó la lógica de suma de `peso_kg` desde `detalle_json` de los cálculos.  
También se añadió `detalle_json` al SELECT de calculos para poder iterar los items.

### Bug 4 — admin/leads sin guard de rol en servidor (MEDIO)
**Archivos:** `src/app/(admin)/admin/leads/page.tsx` + nuevo `leads-client.tsx`  
Se separó en Server Component (valida rol) + Client Component (UI).  
Evita que usuarios no-admin vean la UI de leads.

### Bug 5 — DELETE meta sin verificar respuesta (MEDIO)
**Archivo:** `src/components/empresa/lista-metas.tsx`  
Se añadió verificación de `res.ok` antes de llamar `loadData()`.

### Bug 6 — estado ticket cambia a 'abierto' al responder como no-admin (BAJO)
**Archivo:** `src/app/api/tickets/[id]/mensajes/route.ts`  
Solo `super_admin` actualiza el estado a `en_proceso`. Usuarios normales no modifican el estado.

### Bug extra — perfil: apodo/apellido no se guardan (CAUSA RAÍZ)
**Archivos:** `src/app/api/profile/route.ts`, `src/app/settings/page.tsx`  
La causa raíz es infraestructural: la migración SQL `ALTER TABLE profiles ADD COLUMN apellido/apodo` está pendiente de ejecutar en Supabase (STATE.md lo indicaba).  
Fixes de código aplicados:
- `apellido ?? null` → `apellido ?? ''` (columna es NOT NULL)
- El error de Supabase ahora se loguea y se devuelve al cliente con el detalle exacto

**Acción pendiente del usuario:** Ejecutar en Supabase SQL Editor:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apellido text NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apodo text;
```

---

## Errores de lint/TypeScript corregidos (0 errores en build)

| Archivo | Error | Fix |
|---------|-------|-----|
| `api/leads/list/route.ts` | `request` unused | Eliminado parámetro |
| `api/leads/route.ts` | `err` unused en catch | `catch {}` |
| `api/metas/route.ts` | `req` unused en GET | Eliminado parámetro |
| `verificar/[codigo]/page.tsx` | `empresaPlan` unused | Eliminada variable |
| `verificar/[codigo]/page.tsx` | `createAdminClient` not found | Añadido import faltante |
| `verificar/page.tsx` | `let clean` → `const` | Cambiado a const |
| `historial-calculos.tsx` | `FileText` unused, `descripcionHtml` unused, `TEXT_LIGHT` undefined | Eliminados + reemplazado con TEXT_MED |
| `lista-metas.tsx` | `Edit2` unused | Eliminado import |
| `lista-tickets.tsx` | `X` unused | Eliminado import |
| `leads-form.tsx` | `err: any` | `err instanceof Error` |
| `sidebar.tsx` | `empresaId` unused | Eliminado de destructuración |
| `dashboard/historial/page.tsx` | `empresa_id` unused | Eliminada variable |

---

## Archivos modificados

```
src/app/(empresa)/empresa/soporte/page.tsx
src/app/api/tickets/route.ts
src/app/api/tickets/[id]/mensajes/route.ts
src/app/api/metas/route.ts
src/app/api/leads/list/route.ts
src/app/api/leads/route.ts
src/app/api/profile/route.ts
src/app/(admin)/admin/leads/page.tsx          ← convertido a Server Component
src/app/(admin)/admin/leads/leads-client.tsx  ← NUEVO (Client Component)
src/app/(dashboard)/dashboard/historial/page.tsx
src/app/verificar/page.tsx
src/app/verificar/[codigo]/page.tsx
src/app/settings/page.tsx
src/components/calculadora/historial-calculos.tsx
src/components/empresa/lista-metas.tsx
src/components/soporte/lista-tickets.tsx
src/components/leads-form.tsx
src/components/sidebar.tsx
```

## Estado del build
✓ 0 errores TypeScript · 0 errores de lint · Solo warnings de `<img>` (no bloquean)

---

## Pendientes para próxima sesión

- [ ] Ejecutar migración SQL de `apellido`/`apodo` en Supabase (usuario)
- [ ] Bloque 7: Verificación 4 estados + leads landing + WhatsApp flotante
