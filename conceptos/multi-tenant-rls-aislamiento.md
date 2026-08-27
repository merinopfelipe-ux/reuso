---
tags: [multi-tenant, rls, supabase, seguridad, arquitectura, aislamiento-datos]
fecha: 2026-08-18
actualizado: 2026-08-18
aliases: [multi-tenant-reuso, aislamiento-rls, seguridad-multiempresa]
---

# Multi-Tenant y Aislamiento por Row Level Security (RLS)

La arquitectura de Reúso es **nativamente multi-empresa**. Cada organización opera en un espacio de datos estrictamente aislado mediante políticas de seguridad a nivel de fila (Row Level Security - RLS) en PostgreSQL / Supabase.

---

## 1. Principio Rector de Aislamiento

Ninguna query, mutación o endpoint puede acceder a datos de una empresa distinta a la asignada en la sesión autenticada del usuario (`empresa_id`).

- **Super Admin:** Acceso de auditoría y configuración global (`/admin/*`).
- **Admin Empresa & Asesores:** Acceso restringido exclusivamente a filas donde `empresa_id = user.empresa_id`.
- **Usuario Libre:** Acceso a sus registros personales (`user_id = auth.uid()`).

---

## 2. Tablas Multi-Empresa Principales

- `empresas`: Registro de la organización, NIT, país, plan y configuración de marca blanca.
- `profiles`: Asignación de rol y vínculo a `empresa_id`.
- `item_materiales`, `item_servicios`, `item_insumos`: Catálogo propio de la empresa (`/empresa/catalogo`).
- `crm_clientes` y `crm_clientes_contactos`: Base de clientes y comités de compra corporativos.
- `crm_cotizaciones`, `crm_cotizaciones_envios`: Cotizaciones y auditoría de envíos.
- `dpp_activos`, `dpp_ciclos`: Pasaportes digitales y trazabilidad física.
- `calculos`, `informes`, `metas`: Impacto ambiental y reportes.

---

## 3. Pruebas Automatizadas de Aislamiento (RLS Testing)

Para asegurar que no existan fugas ni accesos cruzados:

1. **Suite de Pruebas Automatizadas (`scripts/run-rls-test.ts`):** Simula intentos deliberados de la Empresa A para leer, actualizar o eliminar registros de la Empresa B, verificando que Supabase bloquee la operación.
2. **Integración en CI/CD:** El pipeline de GitHub Actions (`.github/workflows/ci.yml`) ejecuta los tests de RLS en cada Pull Request antes de permitir cualquier merge a producción.
3. **Escaneo de Secretos (Gitleaks):** Bloqueo en pre-commit para evitar subir service keys o credenciales sensibles.

---

## 4. Hoja de Ruta de Desarrollo

En el plan de escalabilidad, el refuerzo de aislamiento multi-tenant se ejecuta en:
- **Base — DevOps 4:** Automatización de suite RLS en el pipeline de CI/CD.
- **V1 — Paso 1:** Aislamiento de catálogos privados por empresa en `/empresa/catalogo`.
- **V1 — Paso 2:** Aislamiento de contactos en `crm_clientes_contactos`.
- **V1 — Paso 7:** Refuerzo de permisos diferenciados en `/empresa/equipo` (administrador vs. vendedor).

Ver detalle completo en [[conceptos/plan-de-escalabilidad-anexos|Anexos y Checklist Maestro]].

---

## Relacionado
- [[conceptos/plan-de-escalabilidad-multiempresa|Plan de Escalabilidad Multi-Empresa]]
- [[conceptos/cotizador-crm-multiempresa|Cotizador B2B y CRM]]
- [[conceptos/pasaporte-digital-dpp|Pasaporte Digital de Producto (DPP)]]
- [[conceptos/role-routing-nextjs|Protección de Rutas por Rol]]
