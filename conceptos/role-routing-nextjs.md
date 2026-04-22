---
tags: [nextjs, rbac, routing, seguridad, roles]
fecha: 2026-04-13
aliases: [role-guard-layout, rbac-nextjs]
---

# Protección de rutas por rol en Next.js App Router

## El problema

En Next.js App Router, el middleware puede verificar si el usuario está autenticado, pero verificar el ROL requiere una query a la BD — algo que el middleware no debe hacer (Edge Runtime, sin acceso a Supabase SSR completo).

La solución es poner los guards de rol en los **layout.tsx de cada route group**.

## Patrón correcto

Cada route group tiene su propio `layout.tsx` que:
1. Obtiene el usuario autenticado
2. Consulta su rol desde `profiles`
3. Redirige si el rol no coincide

```typescript
// src/app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  const rol = perfil?.rol ?? 'usuario_libre'

  // super_admin nunca debe ver UI de empleado
  if (rol === 'super_admin') redirect('/admin')

  return <>{children}</>
}
```

```typescript
// src/app/(empresa)/layout.tsx
// empresa_admin solo; super_admin y empleados fuera
if (rol === 'super_admin') redirect('/admin')
if (rol !== 'empresa_admin') redirect('/dashboard')
```

## Mapa de roles → rutas

| Rol | Ruta permitida | Redirigir si llega a |
|---|---|---|
| `super_admin` | `/admin/*` | `/dashboard`, `/empresa` → `/admin` |
| `empresa_admin` | `/empresa/*`, `/dashboard/*` | `/admin` → `/admin` (no debería llegar) |
| `empleado` | `/dashboard/*` | `/empresa` → `/dashboard` |
| `usuario_libre` | `/dashboard/*` | `/empresa` → `/dashboard` |

## Rutas sin restricción de rol
- `/settings` — todos los roles autenticados
- `/ayuda` — todos los roles autenticados

## Error clásico a evitar

```typescript
// ❌ INCORRECTO: permite super_admin en empresa
if (rol !== 'empresa_admin' && rol !== 'super_admin') redirect('/dashboard')

// ✅ CORRECTO: super_admin siempre a su propia ruta
if (rol === 'super_admin') redirect('/admin')
if (rol !== 'empresa_admin') redirect('/dashboard')
```

## Dónde está aplicado

- `src/app/(dashboard)/layout.tsx` (V3.8)
- `src/app/(empresa)/layout.tsx` (V3.8)
- `src/app/(admin)/layout.tsx`

## Ver también

- [[landing-saas-nextjs]] — rutas públicas en middleware
- [[seguridad-reuso]] — skill completa de autenticación y RBAC
- [[useSearchParams-suspense-nextjs]] — otro patrón de layout en App Router
