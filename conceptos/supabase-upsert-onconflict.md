---
tags: [supabase, postgresql, perfil, upsert]
fecha: 2026-04-13
aliases: [upsert-supabase, supabase-profile-update]
---

# Supabase upsert con onConflict para perfiles

## El problema con update

`supabase.from('table').update({...}).eq('user_id', id)` **falla silenciosamente** si no existe ninguna fila que coincida con el filtro. No retorna error, retorna `{ data: [], error: null }`. El usuario ve el spinner desaparecer pero nada cambia en la BD.

Esto ocurre con perfiles de usuarios nuevos que aún no tienen fila en `profiles`, o en cualquier caso donde la fila puede o no existir.

## La solución: upsert

```typescript
const { error } = await supabase
  .from('profiles')
  .upsert({
    user_id: user.id,
    email: user.email ?? '',
    nombre,
    apellido,
    apodo,
  }, { onConflict: 'user_id' })
```

`upsert` hace INSERT si no existe, UPDATE si ya existe, usando la columna `onConflict` como clave de deduplicación.

## Requisitos en la BD

La columna `onConflict` debe tener una constraint `UNIQUE` o ser PRIMARY KEY:

```sql
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  -- o bien:
  -- UNIQUE(user_id)
  ...
);
```

## Cuándo usar upsert vs update

| Situación | Usar |
|---|---|
| La fila siempre existe (garantizado por trigger) | `update` |
| La fila puede no existir (usuario nuevo) | `upsert` |
| Quiero INSERT OR UPDATE explícito | `upsert` |

## Dónde está aplicado

- `src/app/api/profile/route.ts` — PATCH de perfil de usuario (V3.8)

## Ver también

- [[supabase-rls]] — RLS y permisos de escritura
- [[rollback-manual-supabase]] — sin transacciones en JS, rollback manual
