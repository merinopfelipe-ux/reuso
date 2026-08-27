---
tags: [sidebar, navegacion, roles, ux, rbac]
fecha: 2026-04-14
aliases: [nav-items-rol, sidebar-rbac, navegacion-por-rol]
---

# Sidebar con ítems distintos por rol

## El patrón

En Reúso, el sidebar muestra ítems de navegación diferentes según el rol del usuario autenticado. Esto se implementa con un objeto `NAV_ITEMS: Record<Rol, NavItem[]>` en `sidebar.tsx`.

```typescript
const NAV_ITEMS: Record<Rol, NavItem[]> = {
  super_admin: [...],   // ítems de administración global
  empresa_admin: [...], // ítems de gestión de empresa
  empleado: [...],      // ítems del colaborador con empresa
  usuario_libre: [...], // ítems del usuario free con upgrade prompt
}
```

El componente recibe `rol` como prop desde `LayoutShell`, que a su vez lo recibe del layout server del grupo de rutas. La selección de ítems es una sola línea:

```typescript
const navItems: NavItem[] = NAV_ITEMS[rol]
```

## Ítems actuales por rol (V4.2)

| Rol | Ítems |
|---|---|
| `super_admin` | Resumen, Empresas, Leads, Categorías, Catálogos, Módulos, Cálculos, Reportes, Usuarios, Auditoría, Alertas, Configuración, QA, Estado, Correos, Contenido, Plantillas, Tickets, Ayuda, Legales, Firmas, Cotizador |
| `empresa_admin` | Mi empresa, Equipo, Cálculos, Metas, Informes, Pasaportes DPP, Reportes, Cotizador, Clientes, Soporte, Ajustes |
| `empleado` | Inicio, Calcular, Historial, Cotizador, Clientes, Soporte, Ajustes |
| `usuario_libre` | Inicio, Calcular, Historial, Planes, Soporte, Ajustes |

## Diferencia empleado vs usuario_libre

`usuario_libre` tiene el ítem **"Subir de plan"** (`/empresa/nueva`) donde `empleado` no lo tiene. Esto es un recordatorio permanente de que puede crear una empresa para acceder a cotizador B2B, catálogo privado y cálculos ilimitados.

## Cómo fluye el rol hasta el sidebar

```
Database (profiles.rol)
  → (dashboard)/layout.tsx [Server Component]
    → rolEfectivo (considera cookie modo_empleado)
      → LayoutShell(rol={rolEfectivo})
        → Sidebar(rol={rolEfectivo})
          → NAV_ITEMS[rol]
```

## Ítems que apuntan a páginas futuras

Algunos ítems (historial, soporte) apuntan a rutas que aún no existen. Se usan `<Link>` igual — Next.js no prefetcha agresivamente en producción y el error 404 es mejor que no mostrar el ítem.

## Dónde está implementado

- `src/components/sidebar.tsx` — `NAV_ITEMS` y lógica de selección

## Ver también

- [[conceptos/cotizador-crm-multiempresa|Cotizador B2B y CRM]]
- [[conceptos/pasaporte-digital-dpp|Pasaporte Digital de Producto (DPP)]]
- [[conceptos/plan-de-escalabilidad-anexos|Anexos y Checklist de Rutas]]
- [[conceptos/modo-empleado-cookie|Modo Colaborador]]
- [[conceptos/role-routing-nextjs|Protección de Rutas por Rol]]
- [[conceptos/dashboard-bifurcacion-rol|Bifurcación de Vistas por Rol]]
