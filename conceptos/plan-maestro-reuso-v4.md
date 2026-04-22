---
tags: [reuso, planificacion, arquitectura, bloques, v4, completado]
fecha: 2026-04-14
actualizado: 2026-04-18
aliases: [plan-v4, bloques-implementacion, roadmap-reuso]
estado: "✓ COMPLETO — V5.1 (2026-04-18). Todos los 10 bloques implementados."
---

# Plan Maestro V4.0 — Estructura de 10 bloques

> **Estado:** ✓ COMPLETO en V5.1 (2026-04-18). Los 10 bloques están implementados y el build pasa sin errores.

## Qué es

El plan maestro organiza el desarrollo restante de reuso.lurdes.co en **10 bloques ejecutables de forma independiente**. Cada bloque puede implementarse en una sesión separada sin bloquear los demás (salvo dependencias explícitas).

El plan completo con código de ejemplo y tablas de archivos está en `.claude/plans/synchronous-giggling-walrus.md`.

## Origen

En la sesión del 2026-04-14 se revisó el mapa funcional completo de la plataforma (5 flujos, 43+ páginas, 14 reglas transversales) y se identificó que ~58% estaba implementado. Se diseñó este plan para cubrir el 42% restante.

## Los 10 bloques

### Bloque 0 — Correcciones UX base (✓ COMPLETADO 2026-04-14)
Fixes inmediatos que afectan toda la plataforma:
- Ancho completo (sin maxWidth)
- Submenú a la derecha
- Primer nombre en header
- Modo colaborador para empresa_admin

### Bloque 1 — Auth flows completos
- `/confirmar-email` — código 6 dígitos post-registro
- `/recuperar` — reset de contraseña en 2 pasos
- Dependencias: ninguna. Sin cambios de schema.

### Bloque 2 — Roles separados / sidebar por rol
- Dashboard empleado vs usuario_libre con contenido diferente
- Sidebar con ítems distintos por rol
- Dependencias: ninguna.

### Bloque 3 — Calculadora completa
- Todo por peso (kg), nunca por unidad
- Selector módulo → categoría → items
- Rich text con copy/paste de imágenes (base64 en JSON)
- `factor_snapshot_json` al guardar (inmutabilidad)
- Dependencias: Bloque 2.

### Bloque 4 — Historial de cálculos
- Personal (`/dashboard/historial`) e empresa (`/empresa/calculos`)
- Inmutable, solo lectura, con filtros y paginación
- Dependencias: Bloque 3.

### Bloque 5 — Tickets y soporte
- Chat tipo hilo entre usuario y super_admin
- Tablas nuevas: `tickets`, `tickets_mensajes`
- Notificaciones en campana + email
- Dependencias: ninguna.

### Bloque 6 — Metas + certificados empresa
- Metas con progreso en tiempo real
- Certificado empresa full color, reporte escala de grises con marca de agua
- Tabla nueva: `metas`
- Dependencias: Bloque 4.

### Bloque 7 — Verificación 4 estados + leads landing
- `/verificar` con estado revocado, búsqueda sin código
- Formulario de lead en landing → tabla `leads`
- Botón flotante WhatsApp en todas las páginas públicas
- Dependencias: ninguna.

### Bloque 8 — Módulos comprables
- Tablas: `modulos`, `modulos_empresas`
- Super admin asigna módulos a cada empresa
- Calculadora filtra por módulos activos de la empresa
- Dependencias: Bloque 3.

### Bloque 9 — Admin: leads, reportes, cálculos globales
- `/admin/leads`, `/admin/reportes` (7 tipos), `/admin/calculos`
- Reportes descargables PDF + CSV
- Dependencias: Bloque 7 (leads), Bloque 4 (cálculos).

### Bloque 10 — Admin: contenido editable + plantillas
- Editar textos, precios y FAQ de la landing sin tocar código
- Plantillas de certificado con firma configurable
- `/admin/certificados` con revocación
- Dependencias: Bloque 6 (certs).

## Reglas transversales de todos los bloques

1. Sin emojis — solo Lucide icons
2. `userSelect: 'none'` en contenedores principales
3. Sin grises — blanco, verde #00827C, tonos orgánicos
4. Voz activa intocable
5. Zod en todas las API routes
6. `checkLimiteXxx` antes de insertar
7. `adminClient` para operaciones cross-user
8. `factor_snapshot_json` al guardar cálculos
9. `dangerouslySetInnerHTML` en todos los `<style>` inline
10. © Grupo MLP S.A.S. en footers

## Ver también

- [[role-routing-nextjs]] — guards por rol, base de los bloques 1-2
- [[modo-empleado-cookie]] — Bloque 0, Fix 4
- [[supabase-upsert-onconflict]] — patrón para inserts seguros
- [[calculo-ambiental]] — skill con lógica de cálculo e inmutabilidad
- [[margin-auto-flex-vs-block]] — layout del workspace
