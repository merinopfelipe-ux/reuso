# Marketing Unsubscribe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la infraestructura completa de baja de correos de marketing: columnas en BD, token de baja, API route, página de confirmación, y función `emailMarketing()` con footer diferenciado.

**Architecture:** La columna `unsubscribe_token` en `profiles` sirve como token opaco de un solo uso. La página `/unsubscribe?token=xxx` muestra un botón de confirmación. Al confirmar, `POST /api/unsubscribe` marca `marketing_opt_out=true` y rota el token. La función `emailMarketing()` envuelve `emailPlantilla()` inyectando el footer de baja en lugar del aviso de sistema.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (admin client), Resend, Zod, `src/lib/rate-limit.ts`.

## Global Constraints

- Negro Lurdes `#474747` — único negro permitido. PROHIBIDO `#000000`.
- Pistacho `#D6F391` — único pistacho. Cuando fondo es pistacho, texto siempre `#474747`.
- Fondos de página: día `#FFFFFF`, noche `#474747`. PROHIBIDO gradientes, blobs, glows como fondo de página.
- Sin `uppercase` ni `text-transform: uppercase` en texto visible.
- Sin `;` ni `—` en texto visible.
- Voz activa, segunda persona singular, sin "estimado/a".
- Nombre del producto: siempre "Calculadora de Reúso", nunca solo "Reúso".
- Fuente: Open Sans únicamente.
- Iconos: Phosphor Icons (`@phosphor-icons/react`).
- Toda página con `useSearchParams()` requiere `<Suspense>` en su página padre.
- Rate limit en endpoints públicos: máximo 5/min. Usar `rateLimit(key, max, windowMs)` de `@/lib/rate-limit`.

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `sql/029_marketing_opt_out.sql` | Crear | Migración: añadir columnas a `profiles` |
| `src/middleware.ts` | Modificar | Agregar `/unsubscribe` a `PUBLIC_ROUTES` |
| `src/app/api/unsubscribe/route.ts` | Crear | POST: valida token, marca baja, rota token |
| `src/app/(public)/unsubscribe/page.tsx` | Crear | Página pública de confirmación de baja |
| `src/lib/email.ts` | Modificar | Añadir param `avisoPie` a `emailPlantilla` + nueva `emailMarketing()` + helper `urlBaja()` |
| `.claude/skills/email-design/SKILL.md` | Modificar | Documentar patrón `emailMarketing()` y checklist |

---

## Task 1: Migración SQL 029

**Files:**
- Create: `sql/029_marketing_opt_out.sql`

**Interfaces:**
- Produces: columnas `marketing_opt_out` y `unsubscribe_token` en tabla `profiles`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- sql/029_marketing_opt_out.sql
-- Infraestructura de baja de correos de marketing

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Índice para lookup rápido por token (la API busca por este campo)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_unsubscribe_token_idx
  ON profiles (unsubscribe_token);

-- Comentarios descriptivos
COMMENT ON COLUMN profiles.marketing_opt_out IS 'true si el usuario solicitó no recibir correos de marketing';
COMMENT ON COLUMN profiles.unsubscribe_token IS 'Token opaco de un solo uso para baja de marketing. Se rota tras cada uso.';
```

- [ ] **Step 2: Ejecutar en Supabase**

Ir a Supabase Dashboard → SQL Editor → pegar el contenido del archivo → ejecutar.
Verificar que la query devuelve éxito sin errores.

- [ ] **Step 3: Verificar columnas en Supabase**

En Table Editor → profiles → confirmar que existen `marketing_opt_out` (bool, default false) y `unsubscribe_token` (uuid, default gen_random_uuid()).

---

## Task 2: Middleware — ruta pública

**Files:**
- Modify: `src/middleware.ts:1`

**Interfaces:**
- Consumes: array `PUBLIC_ROUTES` existente (línea 1 del middleware)
- Produces: `/unsubscribe` accesible sin autenticación

- [ ] **Step 1: Abrir middleware.ts y localizar PUBLIC_ROUTES**

La línea actual es:
```typescript
const PUBLIC_ROUTES = ['/', '/login', '/registro', '/confirmar-email', '/recuperar']
```

- [ ] **Step 2: Agregar /unsubscribe**

```typescript
const PUBLIC_ROUTES = ['/', '/login', '/registro', '/confirmar-email', '/recuperar', '/unsubscribe']
```

- [ ] **Step 3: Verificar que el build no rompe**

```bash
npm run build 2>&1 | tail -5
```
Esperado: `✓ Compiled successfully` sin errores TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts sql/029_marketing_opt_out.sql
git commit -m "feat(unsubscribe): migración 029 y ruta pública /unsubscribe"
```

---

## Task 3: API Route POST /api/unsubscribe

**Files:**
- Create: `src/app/api/unsubscribe/route.ts`

**Interfaces:**
- Consumes: `createAdminClient` de `@/lib/supabase/admin`, `rateLimit` de `@/lib/rate-limit`
- Produces: `POST /api/unsubscribe` con body `{ token: string }` → `{ ok: true }` o `{ ok: false, error: string }` con status 400/429/500

- [ ] **Step 1: Crear el archivo**

```typescript
// src/app/api/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const Schema = z.object({
  token: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  const allowed = await rateLimit(`unsubscribe:${ip}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'Demasiados intentos. Espera un momento.' }, { status: 429 })
  }

  let token: string
  try {
    const body = await request.json()
    const parsed = Schema.parse(body)
    token = parsed.token
  } catch {
    return NextResponse.json({ ok: false, error: 'Token inválido.' }, { status: 400 })
  }

  try {
    const admin = await createAdminClient()

    // Buscar perfil por token
    const { data: perfil, error: findError } = await admin
      .from('profiles')
      .select('id')
      .eq('unsubscribe_token', token)
      .maybeSingle()

    if (findError || !perfil) {
      // Respuesta genérica para no revelar si el token existe
      return NextResponse.json({ ok: true })
    }

    // Marcar baja y rotar token en una sola operación
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        marketing_opt_out: true,
        unsubscribe_token: crypto.randomUUID(),
      })
      .eq('id', perfil.id)

    if (updateError) {
      return NextResponse.json({ ok: false, error: 'Error al procesar la baja.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno.' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep unsubscribe
```
Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/unsubscribe/route.ts
git commit -m "feat(unsubscribe): API route POST /api/unsubscribe"
```

---

## Task 4: Página pública /unsubscribe

**Files:**
- Create: `src/app/(public)/unsubscribe/page.tsx`

**Interfaces:**
- Consumes: `POST /api/unsubscribe` (Task 3)
- Produces: página en `/unsubscribe?token=xxx` con estados: pendiente / confirmando / éxito / error / token ausente

La página tiene tres estados:
1. **Pendiente**: muestra el botón "Confirmar baja"
2. **Éxito**: "Te diste de baja. No recibirás más correos de marketing."
3. **Error / sin token**: mensaje genérico amable

- [ ] **Step 1: Crear el archivo**

```tsx
// src/app/(public)/unsubscribe/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'

type Estado = 'pendiente' | 'confirmando' | 'exito' | 'error'

function UnsubscribeContent() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [estado, setEstado] = useState<Estado>('pendiente')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsDark(
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark'
      )
    }
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    return () => obs.disconnect()
  }, [])

  const t = {
    bg: isDark ? '#474747' : '#FFFFFF',
    card: isDark ? '#525252' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,130,124,0.12)',
    textPrimary: isDark ? '#FFFFFF' : '#474747',
    textSecondary: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(71,71,71,0.65)',
    shadow: isDark ? '0 8px 24px rgba(0,0,0,0.25)' : '0 8px 24px rgba(0,130,124,0.06)',
  }

  async function confirmarBaja() {
    if (!token) {
      setEstado('error')
      return
    }
    setEstado('confirmando')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      setEstado(data.ok ? 'exito' : 'error')
    } catch {
      setEstado('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: t.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      transition: 'background 0.3s',
    }}>
      {/* Logo / Marca */}
      <div style={{ marginBottom: 40, display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#00827C' }}>reuso</span>
        <span style={{ fontSize: 22, color: t.textSecondary }}>.lurdes.co</span>
      </div>

      <div style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 24,
        padding: '40px 32px',
        maxWidth: 420,
        width: '100%',
        boxShadow: t.shadow,
        textAlign: 'center',
      }}>
        {estado === 'exito' ? (
          <>
            <CheckCircle size={48} color="#38B98E" weight="fill" style={{ margin: '0 auto 20px' }} />
            <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: t.textPrimary }}>
              Baja confirmada
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: 15, color: t.textSecondary, lineHeight: 1.6 }}>
              Te diste de baja. No recibirás más correos de marketing de la Calculadora de Reúso.
            </p>
            <Link href="/" style={{
              display: 'inline-block',
              padding: '12px 28px',
              borderRadius: 100,
              background: '#00827C',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 700,
            }}>
              Volver al inicio
            </Link>
          </>
        ) : estado === 'error' || !token ? (
          <>
            <WarningCircle size={48} color="#F6BF3E" weight="fill" style={{ margin: '0 auto 20px' }} />
            <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: t.textPrimary }}>
              Enlace no válido
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: 15, color: t.textSecondary, lineHeight: 1.6 }}>
              Este enlace ya fue usado o no es válido. Si quieres darte de baja, usa el enlace del correo más reciente que recibiste.
            </p>
            <Link href="/" style={{
              display: 'inline-block',
              padding: '12px 28px',
              borderRadius: 100,
              background: '#00827C',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 700,
            }}>
              Volver al inicio
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: t.textPrimary }}>
              Cancelar suscripción
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: 15, color: t.textSecondary, lineHeight: 1.6 }}>
              Confirma para dejar de recibir correos de marketing de la Calculadora de Reúso. Los correos del sistema (confirmaciones, recuperación de contraseña) seguirán llegando.
            </p>
            <button
              onClick={confirmarBaja}
              disabled={estado === 'confirmando'}
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                borderRadius: 100,
                background: estado === 'confirmando' ? '#006B66' : '#00827C',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: estado === 'confirmando' ? 'not-allowed' : 'pointer',
                opacity: estado === 'confirmando' ? 0.8 : 1,
                transition: 'all 0.2s',
              }}
            >
              {estado === 'confirmando' ? 'Procesando...' : 'Confirmar baja'}
            </button>
          </>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: t.textSecondary, textAlign: 'center', maxWidth: 340 }}>
        ¿Tienes preguntas? Escríbenos desde la sección de ayuda en tu cuenta.
      </p>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, color: '#474747' }}>Cargando...</span>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep unsubscribe
```
Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/unsubscribe/page.tsx
git commit -m "feat(unsubscribe): página pública /unsubscribe con confirmación"
```

---

## Task 5: emailMarketing() en src/lib/email.ts

**Files:**
- Modify: `src/lib/email.ts`

**Interfaces:**
- Consumes: `emailPlantilla()` ya existente en el archivo
- Produces:
  - `urlBaja(token: string): string` — genera la URL completa de baja
  - `emailMarketing(params: EmailPlantillaParams & { unsubscribeToken: string }): string` — HTML con footer de baja
  - Parámetro opcional `avisoPie?: string` añadido a `emailPlantilla()`

**Cambio 1 — añadir `avisoPie` a `emailPlantilla()`**

Localizar la firma de `emailPlantilla()` en `email.ts`. La firma actual acepta:
`{ preheader, subtituloHeader, saludo, cuerpo, contenidoCentral, alertaAccion, mostrarAlerta }`

- [ ] **Step 1: Añadir `avisoPie` como parámetro opcional**

Localizar la declaración de la función. Añadir `avisoPie?: string` al objeto de parámetros:

```typescript
export function emailPlantilla({
  preheader,
  subtituloHeader,
  saludo,
  cuerpo,
  contenidoCentral,
  alertaAccion = 'compartas el código con nadie',
  mostrarAlerta = true,
  avisoPie,
}: {
  preheader: string
  subtituloHeader: string
  saludo: string
  cuerpo: string
  contenidoCentral: string
  alertaAccion?: string
  mostrarAlerta?: boolean
  avisoPie?: string
})
```

- [ ] **Step 2: Usar `avisoPie` en el footer, con fallback al aviso de sistema**

Localizar el bloque del footer dentro de `emailPlantilla()`. Reemplazar el párrafo del aviso legal:

```typescript
// Antes (texto hardcodeado):
<p style="margin:0 0 10px;font-size:11px;color:#474747;line-height:1.7;">
  Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso. ...
</p>

// Después (dinámico):
${avisoPie ?? `<p style="margin:0 0 10px;font-size:11px;color:#474747;line-height:1.7;">
  Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso. No tiene fines promocionales ni de marketing, por eso no incluye un enlace para darte de baja. Lo recibirás aunque hayas cancelado tu suscripción a correos de marketing.
</p>`}
```

- [ ] **Step 3: Añadir `urlBaja()` y `emailMarketing()` al final del archivo**

Después de `enviarNotificacionTicket()`, añadir:

```typescript
// ── Helpers de marketing ──────────────────────────────────────────────────────

export function urlBaja(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reuso.lurdes.co'
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`
}

export function emailMarketing(params: {
  preheader: string
  subtituloHeader: string
  saludo: string
  cuerpo: string
  contenidoCentral: string
  alertaAccion?: string
  mostrarAlerta?: boolean
  unsubscribeToken: string
}): string {
  const { unsubscribeToken, ...plantillaParams } = params
  const url = urlBaja(unsubscribeToken)

  const avisoPie = `<p style="margin:0 0 10px;font-size:11px;color:#474747;line-height:1.7;">
    Para dejar de recibir estos correos,
    <a href="${url}" style="color:#474747;text-decoration:underline;">cancela tu suscripción</a>.
  </p>`

  return emailPlantilla({ ...plantillaParams, avisoPie })
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "email\.ts|error"
```
Esperado: sin errores relacionados con email.ts.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(unsubscribe): emailMarketing() con footer de baja y urlBaja() helper"
```

---

## Task 6: Actualizar script supabase-templates.mjs

**Files:**
- Modify: `scripts/supabase-templates.mjs`

Los templates de Supabase son correos de sistema (confirmación, recuperación, etc.), no de marketing. Ya tienen el aviso de sistema hardcodeado. No requieren `avisoPie`. No hay nada que cambiar en la lógica. Solo actualizar el script de preview para que el footer sea consistente con el nuevo parámetro dinámico de `emailPlantilla`.

**Nota:** `supabase-templates.mjs` tiene su propia copia independiente de `emailPlantilla()` (no importa desde `email.ts`). El aviso de sistema ya está correcto en esa copia tras los cambios de la sesión anterior. Este task es solo verificación.

- [ ] **Step 1: Regenerar previews y verificar**

```bash
node scripts/preview-emails.mjs && node scripts/supabase-templates.mjs 2>&1 | tail -5
```
Esperado: todos los previews se generan sin error.

- [ ] **Step 2: Verificar que el aviso de sistema sigue en los 9 correos**

```bash
grep -l "fines promocionales" .email-previews/**/*.html .email-previews/supabase/*.html 2>/dev/null | wc -l
```
Esperado: 9 (3 Resend × 2 variantes + base = 9, o el número actual de archivos con el texto).

---

## Task 7: Actualizar skill email-design

**Files:**
- Modify: `.claude/skills/email-design/SKILL.md`

- [ ] **Step 1: Añadir sección de emailMarketing() después del inventario de correos (sección 9)**

```markdown
### Correos de marketing — emailMarketing()

Para correos promocionales o de marketing, usar `emailMarketing()` en lugar de `emailPlantilla()`.

```typescript
import { emailMarketing, urlBaja } from '@/lib/email'

// El token viene del campo unsubscribe_token del profile del destinatario
const html = emailMarketing({
  preheader: 'Texto de bandeja...',
  subtituloHeader: 'Título',
  saludo: '¡Hola, Nombre!',
  cuerpo: 'Cuerpo del correo.',
  contenidoCentral: '/* botón o CTA */',
  mostrarAlerta: false,
  unsubscribeToken: profile.unsubscribe_token,
})
```

El footer resultante es:
> Para dejar de recibir estos correos, [cancela tu suscripción](https://reuso.lurdes.co/unsubscribe?token=xxx).

**Reglas:**
- Verificar `profile.marketing_opt_out === false` antes de llamar a `emailMarketing()`. Si es `true`, no enviar.
- El token se rota automáticamente tras cada uso en `POST /api/unsubscribe`. No reutilizar tokens.
- `urlBaja(token)` genera la URL completa. No construir la URL manualmente.
```

- [ ] **Step 2: Agregar al checklist**

Al final de la sección 12 (Checklist), añadir:

```markdown
- [ ] Si es correo de marketing, ¿usa `emailMarketing()` (no `emailPlantilla()`)?
- [ ] Si es correo de marketing, ¿verificaste `marketing_opt_out === false` antes de enviar?
```

- [ ] **Step 3: Commit final**

```bash
git add .claude/skills/email-design/SKILL.md
git commit -m "docs(unsubscribe): documentar emailMarketing() en skill email-design"
```

---

## Task 8: Push y verificación final

- [ ] **Step 1: Build completo**

```bash
npm run build 2>&1 | tail -10
```
Esperado: `✓ Compiled successfully`. Página `/unsubscribe` aparece como ruta estática.

- [ ] **Step 2: Verificación manual del flujo**

1. Iniciar el servidor: `npm run dev`
2. Abrir `http://localhost:3000/unsubscribe` (sin token) → debe mostrar "Enlace no válido"
3. Abrir `http://localhost:3000/unsubscribe?token=00000000-0000-0000-0000-000000000000` → debe mostrar el botón "Confirmar baja" (token inexistente, al confirmar debe llegar la respuesta `ok: true` por la respuesta genérica de seguridad)
4. Para probar con token real: consultar un `unsubscribe_token` real en Supabase → abrir la URL → confirmar → verificar que `marketing_opt_out = true` y el token cambió.

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✓ Columnas BD: `marketing_opt_out` + `unsubscribe_token` (Task 1)
- ✓ API de baja con rate limit (Task 3)
- ✓ Página `/unsubscribe` pública (Task 2 + 4)
- ✓ `emailMarketing()` con footer diferenciado (Task 5)
- ✓ Skill actualizada (Task 7)
- ✓ Seguridad: token rota tras uso, respuesta genérica si no existe (Task 3)
- ✓ `<Suspense>` en página con `useSearchParams()` (Task 4)
- ✓ Voz activa, sin `;` ni `—`, sin `uppercase` (Task 4 + 5)

**Placeholders:** ninguno encontrado.

**Type consistency:** `urlBaja(token: string)` usada en `emailMarketing()` y exportada para uso externo. `avisoPie?: string` en `emailPlantilla()` tiene fallback al aviso de sistema, compatible con todos los llamadores existentes (no breaking change).
