---
tags: [supabase, auth, otp, verifyOtp, recovery, email-confirm]
fecha: 2026-04-14
aliases: [supabase-otp, verify-otp, otp-recovery]
---

# Supabase Auth OTP — tipos y flujos

## Dos tipos de OTP en Supabase

Supabase usa el mismo método `verifyOtp` para dos flujos distintos, diferenciados por el campo `type`:

```typescript
// Confirmar cuenta nueva (post-registro)
await supabase.auth.verifyOtp({
  email,
  token,
  type: 'email',   // ← confirmar cuenta
})

// Reset de contraseña
await supabase.auth.verifyOtp({
  email,
  token,
  type: 'recovery', // ← password reset
})
```

Usar el tipo incorrecto resulta en error aunque el token sea válido.

## Flujo completo de confirmación de cuenta

1. `supabase.auth.signUp({ email, password })` — Supabase envía email con código OTP automáticamente
2. Usuario ingresa el código en `/confirmar-email`
3. `supabase.auth.verifyOtp({ email, token, type: 'email' })` — confirma la cuenta
4. Redirect a `/login`

## Flujo completo de reset de contraseña

1. `supabase.auth.resetPasswordForEmail(email)` — Supabase envía email con código OTP
2. Usuario ingresa el código + nueva contraseña en `/recuperar`
3. `supabase.auth.verifyOtp({ email, token, type: 'recovery' })` — crea sesión temporal
4. `supabase.auth.updateUser({ password })` — actualiza contraseña (requiere sesión activa)
5. `supabase.auth.signOut()` — cierra la sesión temporal (usuario debe autenticarse con la nueva contraseña)

## Reenviar código de confirmación

```typescript
await supabase.auth.resend({
  type: 'signup',  // 'signup' para confirmar cuenta
  email,
})
```

## Manejo de errores

```typescript
const msg = err.message?.toLowerCase() ?? ''
if (msg.includes('expired') || msg.includes('invalid')) {
  // Código expirado o incorrecto → pedir uno nuevo
} else if (msg.includes('rate limit') || msg.includes('too many')) {
  // Demasiados intentos → esperar
} else {
  // Error técnico genérico
}
```

## signOut después de updateUser

Cuando se verifica un OTP de recovery, Supabase crea automáticamente una sesión temporal. Después de actualizar la contraseña hay que cerrar esa sesión explícitamente para que el usuario deba autenticarse de nuevo con la nueva contraseña. Si no se hace `signOut`, el usuario queda logueado con la sesión temporal.

## Dónde está implementado

- `src/app/(auth)/confirmar-email/page.tsx` — `type: 'email'` + resend con cooldown
- `src/app/(auth)/recuperar/page.tsx` — `type: 'recovery'` + signOut post-update

## Ver también

- [[password-recovery-security]] — por qué no revelar si el email existe
- [[useSearchParams-suspense-nextjs]] — fix necesario en confirmar-email por useSearchParams
