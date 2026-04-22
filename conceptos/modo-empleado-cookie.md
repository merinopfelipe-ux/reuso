---
tags: [nextjs, rbac, cookie, roles, empresa_admin]
fecha: 2026-04-14
aliases: [switch-modo-empleado, conmutar-rol, empresa-admin-empleado]
---

# Modo colaborador: empresa_admin conmuta a vista de empleado via cookie

## El problema

`empresa_admin` necesita poder usar la calculadora como lo haría un empleado, sin perder su rol real. El mapa funcional describe esto como "switch de UI desde el avatar".

Implementar esto en Next.js App Router tiene una restricción: la decisión de redirección está en el **layout Server Component** (`(dashboard)/layout.tsx`). Si el usuario tiene `rol = empresa_admin`, el layout redirige a `/empresa`. Para permitir la excepción, necesitamos un mecanismo que sea **legible en el servidor antes del render**.

## La solución: cookie

Las cookies son la única forma de pasar estado del cliente al servidor en Next.js App Router **sin una API call**. A diferencia de `localStorage`, las cookies se envían automáticamente en cada request HTTP.

### Flujo

```
empresa_admin hace click "Ver como colaborador"
  → JS cliente: document.cookie = 'modo_empleado=1; path=/; max-age=86400'
  → router.push('/dashboard') + router.refresh()
  → request a /dashboard con cookie incluida
  → (dashboard)/layout.tsx lee cookies().get('modo_empleado')
  → si cookie existe: NO redirigir a /empresa
  → rolEfectivo = 'empleado' → LayoutShell con sidebar de empleado
```

### Código en el layout (Server Component)

```typescript
// src/app/(dashboard)/layout.tsx
import { cookies } from 'next/headers'

const modoEmpleado = cookies().get('modo_empleado')?.value === '1'

if (rol === 'super_admin') redirect('/admin')
if (rol === 'empresa_admin' && !modoEmpleado) redirect('/empresa')

const rolEfectivo: Rol = (rol === 'empresa_admin' && modoEmpleado) ? 'empleado' : rol
```

### Código en el cliente (HeaderUserDropdown)

```typescript
// Activar modo empleado
function activarModoEmpleado() {
  document.cookie = 'modo_empleado=1; path=/; max-age=86400'
  router.push('/dashboard')
  router.refresh() // invalida cache del layout
}

// Desactivar
function desactivarModoEmpleado() {
  document.cookie = 'modo_empleado=; path=/; max-age=0'
  router.push('/empresa')
  router.refresh()
}
```

### Detectar estado en el cliente

```typescript
useEffect(() => {
  setModoEmpleado(document.cookie.includes('modo_empleado=1'))
}, [])
```

## Por qué no localStorage

`localStorage` solo está disponible en el navegador (Client Component). Los layouts de Next.js App Router son Server Components. No pueden leer `localStorage`. Las cookies sí son enviadas en los headers de cada request y están disponibles via `cookies()` en cualquier Server Component.

## Consecuencias de diseño

- El rol real de la BD **no cambia**. Solo cambia la UI y el sidebar.
- Los cálculos registrados en modo colaborador se guardan con el `user_id` real del empresa_admin y se cuentan para la empresa normalmente.
- La cookie expira en 24 horas. Al renovar sesión o limpiar cookies, vuelve a modo admin.

## Dónde está aplicado

- `src/components/header-user-dropdown.tsx` (V4.0)
- `src/app/(dashboard)/layout.tsx` (V4.0)

## Ver también

- [[role-routing-nextjs]] — guards por rol en layouts
- [[supabase-upsert-onconflict]] — otro patrón que usa Server Components
