---
tags: [seguridad, auth, recovery, email-enumeration, owasp]
fecha: 2026-04-14
aliases: [password-reset-seguro, email-enumeration]
---

# Seguridad en recuperación de contraseña — no revelar si el email existe

## El problema: Email Enumeration

Si un formulario de "olvidé mi contraseña" responde diferente según si el email existe o no ("Email no encontrado" vs "Código enviado"), un atacante puede enumerar qué emails están registrados en el sistema.

Esto viola OWASP A07 (Identification and Authentication Failures).

## La solución: respuesta uniforme

El formulario **siempre** avanza al paso 2 (pedir el código), sin importar si el email existe en Supabase:

```typescript
// Paso 1 — solicitar código
const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim())

// Si hay error: solo mostrar si es técnico (rate limit), nunca si es "email no existe"
if (err) {
  const msg = err.message?.toLowerCase() ?? ''
  if (msg.includes('rate limit') || msg.includes('too many')) {
    setError('Demasiados intentos. Espera unos minutos e intenta de nuevo.')
    return
  }
  // Cualquier otro error → silenciar y avanzar de todas formas
}

// SIEMPRE avanzar al paso 2
setPaso('codigo')
```

## Por qué el rate limit sí se puede mostrar

El rate limit es un error técnico de la infraestructura, no una confirmación de que el email existe. El usuario debe saber que debe esperar — no hacerlo resultaría en una UX confusa sin motivo aparente.

## UX correcta en el paso 2

Si el usuario ingresó un email que no existe, simplemente nunca recibirá el código. El formulario puede mostrar: "Si el correo está registrado, recibirás un código en los próximos minutos." Esta frase es neutral — confirma el envío sin revelar nada sobre la existencia de la cuenta.

## Supabase ya hace esto en su implementación por defecto

La API de Supabase generalmente no diferencia "email no existe" de "email existe pero hubo un error" en sus mensajes de respuesta. Sin embargo, en algunas versiones puede devolver errores distintos — por eso se suprime cualquier error que no sea de rate limit.

## Dónde está implementado

- `src/app/(auth)/recuperar/page.tsx` — función `handleSolicitarCodigo`

## Ver también

- [[supabase-auth-otp]] — tipos de OTP y flujo técnico completo
