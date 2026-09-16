# Onboarding directo para empresas que ya pagaron — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un segundo camino de entrada, exclusivo del super_admin, para dar acceso directo a la plataforma (en un plan pago) a un cliente que ya compró, sin pasar por el flujo de autogestión Free.

**Architecture:** Reutiliza el mecanismo de invitación por token ya existente (`invitaciones`, hash sha256, Resend) pero permite `empresa_id` nulo hasta el momento de aceptar. El super_admin decide en `/admin/empresas` si nombra la empresa de una vez (Camino A) o deja que el propio dueño la nombre al aceptar (Camino B). Ningún dato aparte de `nombre`+`plan` bloquea nunca la creación — el resto se recuerda con un banner no bloqueante.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres + Auth Admin API), Zod, Resend.

---

## Contexto para quien implemente (no repetir investigación)

Todo esto ya se verificó línea por línea contra el código real durante el brainstorming y la preparación de este plan — no vuelvas a investigarlo desde cero:

- El flujo de autogestión (`usuario_libre` → `/empresa/nueva` → `api/empresa/crear/route.ts`, siempre plan `'free'` fijo en la línea 84) **no se toca en este plan**.
- `sql/133_item_materiales_porcentaje_reciclable.sql` es la última migración — este plan usa `sql/134_...sql`.
- La tabla `invitaciones` hoy (`sql/001_schema_inicial.sql:101-112`): `empresa_id uuid NOT NULL`, `rol_asignado` ya permite `'empresa_admin'`, `token_hash`, `estado` (`pendiente`/`aceptada`/`expirada`), `expires_at` (7 días).
- `src/app/api/empresa/invitar/route.ts` (invitación de empleados a una empresa que YA existe) es el patrón de token a reutilizar: `randomBytes(32).toString('hex')` + `createHash('sha256')`, nunca se guarda el token plano.
- `src/lib/email.ts:244` tiene `enviarInvitacion(to, rawToken, empresaNombre, codigoEmpresa?, nombreDestinatario?)` — насколько useful, pero asume que YA hay nombre de empresa (aparece en el subject y el preheader). Para el Camino B (token abierto, sin nombre todavía) se necesita una función nueva, no forzar un nombre falso ahí.
- `src/app/(auth)/invitacion/[token]/page.tsx` hoy asume `empresa_id` siempre no nulo (`.eq('id', invitacion.empresa_id)` en la búsqueda del nombre de empresa) — se rompe si es nulo, hay que ramificar.
- `src/app/(auth)/invitacion/[token]/components/invitacion-form.tsx` hoy solo pide `nombre + password + password_confirm + acepta_terminos` — necesita campos extra condicionales.
- `src/app/api/auth/registro-invitacion/route.ts` hoy nunca crea una empresa, solo asigna `rol` + `empresa_id` (ya existente) al perfil recién creado por el trigger `handle_new_user`.
- `src/app/api/empresa/config/route.ts` hoy: solo `nombre/sector/logo_url`, exclusivo de `rol === 'empresa_admin'` (403 para cualquier otro rol, lo confirma la línea 25-27).
- **Hallazgo nuevo, importante para este plan**: `src/app/(empresa)/layout.tsx` redirige a `/dashboard` a cualquier rol que no sea `empresa_admin`/`super_admin` — un `empleado` **nunca llega a `/empresa/*`**, vive entero en `/dashboard/*` (confirmado en `(dashboard)/layout.tsx`, que sí deja pasar `empleado`). El diseño aprobado dice "cualquier empleado invitado puede editar estos campos" — para que eso sea real (no solo el backend), hace falta una página bajo `/dashboard` donde el empleado pueda llegar. Este plan crea `/dashboard/empresa` reutilizando el mismo componente cliente que ya usa `/empresa/configuracion`, en vez de tocar el layout o el middleware (menor superficie de cambio, cero riesgo de romper la separación empresa_admin/empleado que ya existe).
- `src/components/ui/selector-ciiu.tsx` — `<SelectorCiiu value={string} onChange={(actividad: string) => void} className?={string} />`, ya trae su propio dropdown con búsqueda, se reusa 3 veces tal cual, sin tocarlo.
- `src/lib/permisos/sync-modulos-plan.ts` — `sincronizarModulosSegunPlan(adminClient, empresaId, plan)` ya existe y ya se usa cuando el super_admin cambia el plan desde `/admin/empresas/[id]`. Este plan lo reusa en los 2 momentos en que una empresa nueva nace con un plan pago (Camino A y Camino B) — si no se llama, la empresa queda con plan pago pero módulos vacíos hasta que alguien la toque a mano.
- `src/lib/schemas/empresa.schema.ts` (`patchEmpresaSchema`) ya tiene `nit/telefono/pais/region/ciudad/direccion/sitio_web` — el super_admin ya puede editarlos todos hoy vía `PATCH /api/admin/empresas/[id]`, así que **la regla especial de NIT solo aplica al endpoint de empleados** (`/api/empresa/config`), no al de super_admin (que siempre pudo y debe poder seguir).
- `empresas.nit/telefono/pais/region/ciudad/direccion/sitio_web` ya existen como columnas (ver `Empresa` en `src/types/index.ts:49-55`) — no hace falta crearlas. Solo faltan `sector_ciiu_principal`/`sector_ciiu_secundarios`.
- Archivos protegidos por `.husky/pre-push` (`header.tsx`, `sidebar.tsx`, `footer.tsx`, `footer-public.tsx`, copyrights de login/registro/propuesta): **ninguna tarea de este plan los toca** — se evitó a propósito no agregar un ítem de navegación nuevo al sidebar (el banner enlaza directo por URL).
- Se trabaja directo sobre `main`, sin worktree ni PR (Regla de Oro #1 del `CLAUDE.md` de este repo).

---

## Task 1: Migración SQL — invitaciones con empresa_id nulo + CIIU en empresas

**Files:**
- Create: `sql/134_onboarding_empresas_pagas.sql`

- [x] **Step 1: Escribir la migración**

```sql
-- Onboarding directo de empresas que ya pagaron un plan (super_admin invita
-- antes de que la empresa exista). Ver
-- docs/superpowers/specs/2026-09-15-onboarding-empresas-pagas-design.md

-- invitaciones: empresa_id pasa a ser opcional (token "abierto", Camino B del
-- diseño) + columna nueva para el plan comprado, solo se llena cuando
-- empresa_id es nulo (en Camino A el plan ya vive en empresas.plan).
ALTER TABLE invitaciones
  ALTER COLUMN empresa_id DROP NOT NULL;

ALTER TABLE invitaciones
  ADD COLUMN IF NOT EXISTS plan_invitado text
    CHECK (plan_invitado IN ('lab', 'impulso', 'ilimitado'));

-- empresas: CIIU principal + hasta 2 complementarios (DIAN permite 3, DANE
-- solo usa el principal para clasificar — ver diseño sección 4). Reemplaza
-- conceptualmente a `sector` (texto libre), sin borrar esa columna.
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS sector_ciiu_principal text,
  ADD COLUMN IF NOT EXISTS sector_ciiu_secundarios text[] NOT NULL DEFAULT '{}';
```

- [x] **Step 2: Avisar al usuario que la corra a mano**

No se ejecuta desde este plan. El usuario la corre en el SQL Editor de Supabase, primero en staging (`rjcfqcqgqxoblisuyapq`), después en producción (`nxnjjncjpqckewwacgoj`) — como todas las migraciones de este proyecto.

- [x] **Step 3: Commit**

```bash
git add sql/134_onboarding_empresas_pagas.sql
git commit -m "feat: migración para onboarding directo de empresas pagas (invitaciones.empresa_id nulo + CIIU)"
```

---

## Task 2: Slug de empresa compartido (pequeño refactor, evita duplicar la función)

**Files:**
- Create: `src/lib/generar-slug.ts`
- Modify: `src/app/api/empresa/crear/route.ts:23-31`

`generarSlug` hoy vive solo dentro de `crear/route.ts`. El registro de invitación abierta (Task 6) también necesita generar un slug al crear la empresa — se extrae a un módulo compartido en vez de copiar la función dos veces.

- [x] **Step 1: Crear el módulo compartido**

```ts
// src/lib/generar-slug.ts
export function generarSlugEmpresa(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60)
}
```

- [x] **Step 2: Usarlo en `crear/route.ts`**

En `src/app/api/empresa/crear/route.ts`, quitar la función local `generarSlug` (líneas 23-31) y su uso (línea 59), reemplazando por:

```ts
import { generarSlugEmpresa } from '@/lib/generar-slug'
// ...
let slug = generarSlugEmpresa(nombre)
```

- [x] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```
Esperado: sin errores nuevos relacionados a `generarSlug`.

- [x] **Step 4: Commit**

```bash
git add src/lib/generar-slug.ts src/app/api/empresa/crear/route.ts
git commit -m "refactor: extraer generarSlugEmpresa a módulo compartido"
```

---

## Task 3: Esquemas Zod — CIIU en `patchEmpresaSchema` + esquema del nuevo endpoint de invitación

**Files:**
- Modify: `src/lib/schemas/empresa.schema.ts`

- [x] **Step 1: Agregar los campos CIIU al esquema que ya usa el super_admin**

En `src/lib/schemas/empresa.schema.ts`, dentro de `patchEmpresaSchema`, después de la línea de `tamano_empresa`:

```ts
  sector_ciiu_principal: z.string().max(255).nullable().optional(),
  sector_ciiu_secundarios: z.array(z.string().max(255)).max(2).optional(),
```

- [x] **Step 2: Agregar el esquema del nuevo endpoint de invitación de empresa**

En el mismo archivo, al final:

```ts
export const invitarEmpresaSchema = z.object({
  email: z.string().email('Correo inválido.'),
  plan: z.enum(['lab', 'impulso', 'ilimitado']),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120).optional(),
})

export type InvitarEmpresa = z.infer<typeof invitarEmpresaSchema>
```

- [x] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```

- [x] **Step 4: Commit**

```bash
git add src/lib/schemas/empresa.schema.ts
git commit -m "feat: esquemas Zod para CIIU y para invitar una empresa nueva"
```

---

## Task 4: Correo de invitación abierta (sin nombre de empresa todavía)

**Files:**
- Modify: `src/lib/email.ts`

`enviarInvitacion` (línea 244) asume que ya hay `empresaNombre` (aparece en subject/preheader/cuerpo). Para el Camino B (token abierto) se necesita una variante que hable del plan comprado, no de una empresa que todavía no existe.

- [x] **Step 1: Escribir `enviarInvitacionEmpresaAbierta`**

Agregar después de la función `enviarInvitacion` (después de la línea 315, antes de `enviarInvitacionFirma`):

```ts
const PLAN_LABELS_EMAIL: Record<string, string> = {
  lab: 'Circular Lab',
  impulso: 'Impulso Sostenible',
  ilimitado: 'Impacto Ilimitado',
}

export async function enviarInvitacionEmpresaAbierta(
  to: string,
  rawToken: string,
  plan: 'lab' | 'impulso' | 'ilimitado',
): Promise<{ resendEmailId: string | null }> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM_INVITACIONES ?? 'Calculadora de Reúso <invitaciones@calculadoradereuso.com>'
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://calculadoradereuso.com'
  const link = `${APP_URL}/invitacion/${rawToken}`
  const planLabel = PLAN_LABELS_EMAIL[plan] ?? plan

  const boton = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center">
      <a class="eb" href="${link}" style="display:inline-block;background-color:#00827C;color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:100px;font-size:16px;font-weight:700;letter-spacing:-0.2px;">
        Activar mi cuenta
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top:12px;">
      <p style="margin:0;font-size:12px;color:#474747;">O copia este enlace en tu navegador:<br>
        <a href="${link}" style="color:#00827C;word-break:break-all;font-size:11px;">${link}</a>
      </p>
    </td>
  </tr>
</table>`

  const bloqueExpiracion = `
<p style="margin:20px 0 0;font-size:13px;color:#474747;line-height:1.6;">
  <strong>Recuerda:</strong> Este enlace expira en <strong>7 días</strong>.
  Si no alcanzas a usarlo, pídele a tu contacto en Calculadora de Reúso que genere uno nuevo.
</p>`

  const html = emailPlantilla({
    preheader: `Activa tu cuenta en el plan ${planLabel} y registra el impacto de tu empresa`,
    subtituloHeader: 'Bienvenido a Calculadora de Reúso',
    saludo: '¡Hola! 👋',
    cuerpo: `Te dimos acceso al plan <strong>${planLabel}</strong> en la Calculadora de Reúso. Activa tu cuenta, crea tu empresa y empieza a registrar el impacto ambiental de tu organización.`,
    contenidoCentral: boton + bloqueExpiracion,
    alertaAccion: 'actives tu cuenta',
    mostrarAlerta: true,
  })

  const { data } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Activa tu cuenta en la Calculadora de Reúso (plan ${planLabel})`,
    html,
    replyTo: 'soporte@calculadoradereuso.com',
  })

  return { resendEmailId: data?.id ?? null }
}
```

- [x] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```

- [x] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: correo de invitación abierta para empresas sin nombre todavía"
```

---

## Task 5: Endpoint `POST /api/admin/empresas/invitar` (Camino A y B)

**Files:**
- Create: `src/app/api/admin/empresas/invitar/route.ts`

Un solo endpoint para los 2 caminos del diseño: si `nombre` viene en el body, crea la empresa de inmediato (Camino A); si no, deja `empresa_id` nulo y guarda el plan en `plan_invitado` (Camino B).

- [x] **Step 1: Escribir el endpoint**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { invitarEmpresaSchema } from '@/lib/schemas/empresa.schema'
import { generarSlugEmpresa } from '@/lib/generar-slug'
import { sincronizarModulosSegunPlan } from '@/lib/permisos/sync-modulos-plan'
import { enviarInvitacion, enviarInvitacionEmpresaAbierta } from '@/lib/email'

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = invitarEmpresaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { email, plan, nombre } = parsed.data
  const adminClient = guard.adminClient
  const ip = getIp(request)

  let empresaId: string | null = null

  // Camino A: el super_admin ya sabe el nombre — la empresa nace ya.
  if (nombre) {
    let slug = generarSlugEmpresa(nombre)
    const { data: existente } = await adminClient
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (existente) slug = `${slug}-${randomBytes(2).toString('hex')}`

    const { data: empresa, error: empresaError } = await adminClient
      .from('empresas')
      .insert({ nombre, slug, plan, activa: true })
      .select('id')
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json({ error: 'Error al crear la empresa.' }, { status: 500 })
    }

    empresaId = empresa.id
    await sincronizarModulosSegunPlan(adminClient, empresaId, plan)
  }

  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data: invitacion, error: invError } = await adminClient
    .from('invitaciones')
    .insert({
      empresa_id: empresaId,
      email,
      token_hash: tokenHash,
      rol_asignado: 'empresa_admin',
      plan_invitado: empresaId ? null : plan,
    })
    .select()
    .single()

  if (invError || !invitacion) {
    // Si ya se creó la empresa (Camino A) y la invitación falla, no dejar
    // una empresa huérfana sin ninguna invitación asociada.
    if (empresaId) await adminClient.from('empresas').delete().eq('id', empresaId)
    return NextResponse.json({ error: 'Error al generar la invitación.' }, { status: 500 })
  }

  let resendEmailId: string | null = null
  try {
    if (empresaId && nombre) {
      const res = await enviarInvitacion(email, token, nombre, null, null)
      resendEmailId = res.resendEmailId
    } else {
      const res = await enviarInvitacionEmpresaAbierta(email, token, plan)
      resendEmailId = res.resendEmailId
    }
    if (resendEmailId) {
      await adminClient.from('invitaciones').update({ resend_email_id: resendEmailId }).eq('id', invitacion.id)
    }
  } catch {
    // El envío de correo puede fallar sin bloquear la invitación — el
    // super_admin puede copiar el link manualmente (mismo criterio que el
    // endpoint de invitar empleados).
  }

  await logAuditoria(adminClient, {
    user_id: guard.user.id,
    accion: 'empresa_invitada',
    detalle: { empresa_id: empresaId, email, plan, camino: empresaId ? 'A' : 'B' },
    ip,
  })

  return NextResponse.json({ invitacion, rawToken: token, empresa_id: empresaId })
}
```

- [x] **Step 2: Verificar que compila**

```bash
npx tsc --noEmit
```
(`resend_email_id` ya existe como columna de `invitaciones`, agregada en `sql/124_invitaciones_tracking_email.sql` — el `update` de la Step 1 no necesita ninguna migración adicional.)

- [x] **Step 3: Commit**

```bash
git add src/app/api/admin/empresas/invitar/route.ts
git commit -m "feat: endpoint para que el super_admin invite una empresa nueva (Camino A y B)"
```

---

## Task 6: UI en `/admin/empresas` — botón "Invitar empresa nueva"

**Files:**
- Modify: `src/app/(admin)/admin/empresas/components/empresas-client.tsx`

**Nota importante**: `Modal` (`src/components/ui/modal.tsx`) es el único componente permitido para este formulario corto, per skill `design-system`. `Selector` (`src/components/ui/selector.tsx`) es el único permitido para el campo de plan, nunca un `<select>` nativo.

- [x] **Step 1: Agregar el estado y el formulario**

En `src/app/(admin)/admin/empresas/components/empresas-client.tsx`, agregar los imports:

```ts
import { Modal } from '@/components/ui/modal'
import { Selector } from '@/components/ui/selector'
import { UserPlus as UsersPlus } from '@/components/ui/icons'
```

Dentro del componente, junto a los demás `useState`:

```ts
const [modalInvitar, setModalInvitar] = useState(false)
const [invitarForm, setInvitarForm] = useState({ email: '', plan: 'lab' as 'lab' | 'impulso' | 'ilimitado', nombre: '' })
const [invitando, setInvitando] = useState(false)
const [invitarError, setInvitarError] = useState('')
const [invitarLink, setInvitarLink] = useState<string | null>(null)

async function handleInvitarEmpresa() {
  setInvitando(true)
  setInvitarError('')
  const res = await fetch('/api/admin/empresas/invitar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: invitarForm.email,
      plan: invitarForm.plan,
      nombre: invitarForm.nombre.trim() || undefined,
    }),
  })
  const data = await res.json()
  setInvitando(false)
  if (!res.ok) {
    setInvitarError(data.error ?? 'Error al enviar la invitación.')
    return
  }
  setInvitarLink(`${window.location.origin}/invitacion/${data.rawToken}`)
}

function cerrarModalInvitar() {
  setModalInvitar(false)
  setInvitarForm({ email: '', plan: 'lab', nombre: '' })
  setInvitarError('')
  setInvitarLink(null)
}
```

- [x] **Step 2: Agregar el botón junto al de Exportar**

Reemplazar el bloque del botón Exportar (líneas 123-128) por:

```tsx
{/* Botones */}
<div className="w-full sm:w-auto sm:ml-auto flex gap-2">
  <button
    type="button"
    onClick={() => setModalInvitar(true)}
    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
    style={{ background: 'var(--color-brand)', color: 'var(--text-on-brand)' }}
  >
    <UsersPlus size={14} sinAnimacion />
    Invitar empresa nueva
  </button>
  <div className="w-full sm:w-auto">
    <BotonDescargar endpoint="/api/admin/empresas/exportar" queryParams={queryParams.toString()} label="Exportar" />
  </div>
</div>
```

- [x] **Step 3: Agregar el Modal, al final del `return`, antes del cierre del `<div>` raíz**

```tsx
<Modal
  abierto={modalInvitar}
  onClose={cerrarModalInvitar}
  titulo="Invitar empresa nueva"
  descripcion="Para un cliente que ya compró un plan pago."
  varianteConfirmar="brand"
  textoConfirmar={invitando ? 'Enviando...' : 'Enviar invitación'}
  onConfirmar={handleInvitarEmpresa}
>
  {invitarLink ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
        Invitación enviada. Si el correo no llega, comparte este enlace manualmente:
      </p>
      <p style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--color-brand)', margin: 0 }}>
        {invitarLink}
      </p>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          Correo del dueño
        </label>
        <input
          type="email"
          value={invitarForm.email}
          onChange={e => setInvitarForm(p => ({ ...p, email: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
          required
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          Plan comprado
        </label>
        <Selector
          value={invitarForm.plan}
          onChange={val => setInvitarForm(p => ({ ...p, plan: val as 'lab' | 'impulso' | 'ilimitado' }))}
          opciones={[
            { value: 'lab', label: 'Circular Lab' },
            { value: 'impulso', label: 'Impulso Sostenible' },
            { value: 'ilimitado', label: 'Impacto Ilimitado' },
          ]}
        />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          Nombre de la empresa (opcional)
        </label>
        <input
          type="text"
          value={invitarForm.nombre}
          onChange={e => setInvitarForm(p => ({ ...p, nombre: e.target.value }))}
          placeholder="Déjalo vacío para que el dueño lo escriba al aceptar"
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
        />
      </div>
      {invitarError && (
        <p style={{ color: 'var(--color-error)', fontSize: 13, margin: 0 }}>{invitarError}</p>
      )}
    </div>
  )}
</Modal>
```

- [x] **Step 4: Verificar en el navegador**

Reiniciar el servidor de desarrollo (`npx pm2 restart reuso`), abrir `/admin/empresas` como `super_admin`, hacer clic en "Invitar empresa nueva":
- Con nombre vacío → confirmar que llega el link `/invitacion/<token>` y que `SELECT empresa_id, plan_invitado FROM invitaciones ORDER BY created_at DESC LIMIT 1` muestra `empresa_id NULL` y `plan_invitado` con el plan elegido.
- Con nombre puesto → confirmar que la empresa aparece de inmediato en la lista de `/admin/empresas` con el plan correcto, y que `modulos_empresas` para esa empresa ya tiene los módulos del plan activos.

- [x] **Step 5: Commit**

```bash
git add "src/app/(admin)/admin/empresas/components/empresas-client.tsx"
git commit -m "feat: botón para invitar una empresa nueva desde /admin/empresas"
```

---

## Task 7: Aceptar invitación abierta — página del servidor

**Files:**
- Modify: `src/app/(auth)/invitacion/[token]/page.tsx`

- [x] **Step 1: Leer el archivo completo para ubicar el bloque exacto a cambiar**

El bloque que busca el nombre de la empresa (alrededor de las líneas 82-88) hace `.eq('id', invitacion.empresa_id)` sin comprobar que no sea nulo. Reemplazarlo por:

```ts
let empresaNombre: string | null = null
if (invitacion.empresa_id) {
  const { data: empresa } = await adminClient
    .from('empresas')
    .select('nombre')
    .eq('id', invitacion.empresa_id)
    .single()
  empresaNombre = empresa?.nombre ?? null
}
```

(Usar el nombre real de las variables ya presentes en el archivo — `adminClient`/`invitacion` — confirmar los nombres exactos al editar, no inventarlos.)

- [x] **Step 2: Pasar el caso "sin empresa" al formulario**

Donde el archivo renderiza `<InvitacionForm ... empresaNombre={...} .../>`, cambiar para pasar también si es una invitación abierta:

```tsx
<InvitacionForm
  token={token}
  email={invitacion.email}
  empresaNombre={empresaNombre}
  rolAsignado={invitacion.rol_asignado}
  esEmpresaNueva={!invitacion.empresa_id}
/>
```

- [x] **Step 3: Ajustar el título/copy de la página cuando no hay empresa todavía**

Donde el archivo hoy construye el título/subtítulo con `empresaNombre` (buscar el texto tipo "te invitó a unirte"), agregar una rama:

```tsx
<h1>{empresaNombre ? `${empresaNombre} te invitó` : 'Activa tu cuenta en la Calculadora de Reúso'}</h1>
```

Adaptar la redacción exacta al bloque JSX real del archivo — mantener el mismo estilo visual, solo condicionar el texto.

- [x] **Step 4: Verificar que compila**

```bash
npx tsc --noEmit
```

- [x] **Step 5: Commit**

```bash
git add "src/app/(auth)/invitacion/[token]/page.tsx"
git commit -m "fix: la página de aceptar invitación soporta empresa_id nulo (invitación abierta)"
```

---

## Task 8: Aceptar invitación abierta — formulario con datos de empresa

**Files:**
- Modify: `src/app/(auth)/invitacion/[token]/components/invitacion-form.tsx`

- [x] **Step 1: Agregar los campos condicionales al estado del formulario**

En `invitacion-form.tsx`, agregar la prop nueva a la interfaz de props:

```ts
interface Props {
  token: string
  email: string
  empresaNombre: string | null
  rolAsignado: string
  esEmpresaNueva: boolean
}
```

Agregar al estado del formulario (junto a `nombre`, `password`, etc.):

```ts
const [nombreEmpresa, setNombreEmpresa] = useState('')
const [nit, setNit] = useState('')
const [telefono, setTelefono] = useState('')
const [pais, setPais] = useState('')
const [ciudad, setCiudad] = useState('')
```

- [x] **Step 2: Renderizar los campos extra cuando `esEmpresaNueva` es `true`**

Antes del campo `nombre` (el de la persona), agregar:

```tsx
{esEmpresaNueva && (
  <>
    <div>
      <label style={labelStyle}>Nombre de tu empresa</label>
      <input value={nombreEmpresa} onChange={e => setNombreEmpresa(e.target.value)} required style={inputStyle} />
    </div>
    <div>
      <label style={labelStyle}>NIT</label>
      <input value={nit} onChange={e => setNit(e.target.value)} required style={inputStyle} />
    </div>
    <div>
      <label style={labelStyle}>Teléfono</label>
      <input value={telefono} onChange={e => setTelefono(e.target.value)} required style={inputStyle} />
    </div>
    <div>
      <label style={labelStyle}>País</label>
      <input value={pais} onChange={e => setPais(e.target.value)} required style={inputStyle} />
    </div>
    <div>
      <label style={labelStyle}>Ciudad</label>
      <input value={ciudad} onChange={e => setCiudad(e.target.value)} required style={inputStyle} />
    </div>
  </>
)}
```

Usar los estilos (`labelStyle`/`inputStyle` o el nombre real que ya use el archivo) ya definidos en el propio componente — confirmar el nombre exacto al editar, no inventar uno nuevo.

- [x] **Step 3: Incluir los campos nuevos en el `fetch` de submit**

En el `handleSubmit` existente, donde se construye el `body` del `fetch('/api/auth/registro-invitacion', ...)`, agregar:

```ts
body: JSON.stringify({
  token,
  nombre,
  password,
  password_confirm: passwordConfirm,
  acepta_terminos: aceptaTerminos,
  turnstile_token: turnstileToken,
  ...(esEmpresaNueva ? { nombre_empresa: nombreEmpresa, nit, telefono, pais, ciudad } : {}),
}),
```

(Mantener el resto de los campos exactamente como ya los envía el archivo — solo agregar el spread condicional al final.)

- [x] **Step 4: Verificar en el navegador**

Abrir el link `/invitacion/<token>` de una invitación abierta (creada en la Task 6) sin iniciar sesión: confirmar que aparecen los 5 campos nuevos antes de nombre/contraseña.

- [x] **Step 5: Commit**

```bash
git add "src/app/(auth)/invitacion/[token]/components/invitacion-form.tsx"
git commit -m "feat: formulario de aceptar invitación pide datos de empresa cuando es invitación abierta"
```

---

## Task 9: Crear la empresa al aceptar una invitación abierta

**Files:**
- Modify: `src/app/api/auth/registro-invitacion/route.ts`

Este es el paso más delicado: si la invitación no tiene `empresa_id`, hay que crear la empresa ANTES de crear el usuario (para no dejar un usuario sin empresa si la creación de empresa falla), y hacer rollback de la empresa si el paso de usuario falla después.

- [x] **Step 1: Extender el `bodySchema`**

```ts
const bodySchema = z
  .object({
    token: z.string().min(1),
    nombre: z.string().min(2).max(100),
    password: z.string().min(8).regex(/[A-Z]/, 'Debe contener al menos una mayúscula.').regex(/[0-9]/, 'Debe contener al menos un número.'),
    password_confirm: z.string(),
    acepta_terminos: z.literal(true),
    turnstile_token: z.string().optional(),
    nombre_empresa: z.string().min(2).max(120).optional(),
    nit: z.string().min(1).max(100).optional(),
    telefono: z.string().min(1).max(100).optional(),
    pais: z.string().min(1).max(100).optional(),
    ciudad: z.string().min(1).max(100).optional(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Las contraseñas no coinciden.',
    path: ['password_confirm'],
  })
```

- [x] **Step 2: Agregar los imports necesarios**

```ts
import { generarSlugEmpresa } from '@/lib/generar-slug'
import { sincronizarModulosSegunPlan } from '@/lib/permisos/sync-modulos-plan'
import { randomBytes } from 'crypto'
```

(`randomBytes` ya se importa para el hash del token — confirmar si ya está y no duplicar el import.)

- [x] **Step 3: Traer `plan_invitado` en el `select` de la invitación**

El `select` existente (`id, email, empresa_id, rol_asignado, estado, expires_at`) no trae la columna nueva de la Task 1 — sin esto, `invitacion.plan_invitado` sería `undefined` en runtime aunque el tipo lo permita. Cambiarlo a:

```ts
  const { data: invitacion, error: invError } = await adminClient
    .from('invitaciones')
    .select('id, email, empresa_id, rol_asignado, estado, expires_at, plan_invitado')
    .eq('token_hash', tokenHash)
    .single()
```

- [x] **Step 4: Insertar la creación de empresa después de validar la invitación, antes de crear el usuario**

Justo después del bloque que valida `invitacion.expires_at` (antes de la línea `// Crear usuario`), agregar:

```ts
  let empresaIdFinal = invitacion.empresa_id
  let empresaCreadaId: string | null = null

  if (!invitacion.empresa_id) {
    const { nombre_empresa, nit, telefono, pais, ciudad } = parsed.data
    if (!nombre_empresa || !nit || !telefono || !pais || !ciudad) {
      return NextResponse.json(
        { error: 'Faltan datos de la empresa: nombre, NIT, teléfono, país y ciudad son obligatorios.' },
        { status: 400 }
      )
    }

    // plan_invitado siempre viene lleno cuando empresa_id es nulo (invariante
    // aplicado en el endpoint que crea la invitación, Task 5).
    const plan = invitacion.plan_invitado as 'lab' | 'impulso' | 'ilimitado'

    let slug = generarSlugEmpresa(nombre_empresa)
    const { data: existente } = await adminClient.from('empresas').select('id').eq('slug', slug).maybeSingle()
    if (existente) slug = `${slug}-${randomBytes(2).toString('hex')}`

    const { data: empresaNueva, error: empresaError } = await adminClient
      .from('empresas')
      .insert({ nombre: nombre_empresa, slug, plan, activa: true, nit, telefono, pais, ciudad })
      .select('id')
      .single()

    if (empresaError || !empresaNueva) {
      return NextResponse.json({ error: 'Error al crear la empresa. Intenta de nuevo.' }, { status: 500 })
    }

    empresaIdFinal = empresaNueva.id
    empresaCreadaId = empresaNueva.id
    await sincronizarModulosSegunPlan(adminClient, empresaIdFinal, plan)
  }
```

- [x] **Step 5: Usar `empresaIdFinal` en vez de `invitacion.empresa_id` en el resto del archivo**

Reemplazar las 2 apariciones siguientes de `invitacion.empresa_id` (asignación del perfil y `logAuditoria`) por `empresaIdFinal`.

- [x] **Step 6: Rollback de la empresa si falla la creación del usuario o del perfil**

En el bloque que ya existe para `createError`:

```ts
  if (createError || !authData.user) {
    if (empresaCreadaId) await adminClient.from('empresas').delete().eq('id', empresaCreadaId)
    if (createError?.message?.includes('already registered')) {
      return NextResponse.json({ error: 'Este email ya tiene una cuenta registrada.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear la cuenta. Intenta de nuevo.' }, { status: 500 })
  }
```

Y en el bloque que ya existe para `profileError`:

```ts
  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    if (empresaCreadaId) await adminClient.from('empresas').delete().eq('id', empresaCreadaId)
    return NextResponse.json({ error: 'Error al asignar el perfil. Contacta soporte.' }, { status: 500 })
  }
```

- [x] **Step 7: Verificar que compila**

```bash
npx tsc --noEmit
```

- [x] **Step 8: Verificar en el navegador**

Con el link de una invitación abierta (Task 6), llenar el formulario completo (Task 8) y enviarlo:
- Confirmar que se crea la empresa en `empresas` con el plan correcto y `nit/telefono/pais/ciudad` guardados.
- Confirmar que el usuario queda como `empresa_admin` de esa empresa nueva.
- Confirmar que `modulos_empresas` tiene los módulos del plan activos.
- Probar el caso de fallo (ej. contraseña débil) y confirmar que NO queda una empresa huérfana en la tabla (`SELECT COUNT(*) FROM empresas` antes y después del intento fallido).

- [x] **Step 9: Commit**

```bash
git add "src/app/api/auth/registro-invitacion/route.ts"
git commit -m "feat: crear la empresa al aceptar una invitación abierta, con rollback si falla"
```

---

## Task 10: `PATCH /api/empresa/config` — abrir a cualquier empleado + regla especial del NIT

**Files:**
- Create: `src/lib/empresa/nit-lock.ts`
- Modify: `src/app/api/empresa/config/route.ts`

**Decisión de mecanismo para el NIT** (la única parte del diseño que quedaba abierta a esta fase): no se necesita una columna nueva ni un flag — se compara el valor de NIT que YA tiene la empresa en la base contra quién está pidiendo el cambio. Si ya tiene un NIT guardado (no nulo, no vacío) y quien edita no es `super_admin`, se rechaza. Esto reproduce exactamente la regla ("lo escribe quien complete los datos por primera vez, después solo el super_admin") sin estado adicional que mantener sincronizado.

- [x] **Step 1: Escribir la función pura de la regla (con test)**

```ts
// src/lib/empresa/nit-lock.ts
export function puedeEditarNit(nitActual: string | null | undefined, rolQueEdita: string): boolean {
  const yaTieneNit = typeof nitActual === 'string' && nitActual.trim() !== ''
  if (!yaTieneNit) return true
  return rolQueEdita === 'super_admin'
}
```

```ts
// src/lib/empresa/nit-lock.test.ts
import { describe, it, expect } from 'vitest'
import { puedeEditarNit } from './nit-lock'

describe('puedeEditarNit', () => {
  it('permite escribirlo la primera vez, sin importar el rol', () => {
    expect(puedeEditarNit(null, 'empleado')).toBe(true)
    expect(puedeEditarNit('', 'empresa_admin')).toBe(true)
  })

  it('bloquea a cualquiera que no sea super_admin una vez ya tiene valor', () => {
    expect(puedeEditarNit('900123456', 'empresa_admin')).toBe(false)
    expect(puedeEditarNit('900123456', 'empleado')).toBe(false)
  })

  it('siempre permite al super_admin, tenga valor o no', () => {
    expect(puedeEditarNit('900123456', 'super_admin')).toBe(true)
    expect(puedeEditarNit(null, 'super_admin')).toBe(true)
  })
})
```

- [x] **Step 2: Correr el test**

```bash
npx vitest run src/lib/empresa/nit-lock.test.ts
```
Esperado: 3 tests pasan.

- [x] **Step 3: Reescribir el endpoint**

Reemplazar el contenido completo de `src/app/api/empresa/config/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { puedeEditarNit } from '@/lib/empresa/nit-lock'

const bodySchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  sector: z.string().min(1).max(255).nullable().optional(),
  logo_url: z.url('URL de logo inválida.').nullable().optional(),
  nit: z.string().min(1).max(100).nullable().optional(),
  telefono: z.string().min(1).max(100).nullable().optional(),
  pais: z.string().min(1).max(100).nullable().optional(),
  region: z.string().min(1).max(100).nullable().optional(),
  ciudad: z.string().min(1).max(100).nullable().optional(),
  direccion: z.string().max(500).nullable().optional(),
  sitio_web: z.string().url('URL inválida.').or(z.literal('')).nullable().optional(),
  sector_ciiu_principal: z.string().max(255).nullable().optional(),
  sector_ciiu_secundarios: z.array(z.string().max(255)).max(2).optional(),
})

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  // Cualquier miembro de una empresa (empleado, empresa_admin, super_admin
  // operando sobre su propia sesión) puede editar los datos operativos de su
  // empresa — cambio de permiso deliberado respecto al comportamiento
  // anterior, exclusivo de empresa_admin. usuario_libre nunca tiene
  // empresa_id, así que queda excluido de forma natural.
  if (!perfil?.rol || !perfil.empresa_id) {
    return NextResponse.json({ error: 'No tienes empresa asociada.' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const updates = parsed.data
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay cambios para guardar.' }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  if (typeof updates.nit !== 'undefined') {
    const { data: empresaActual } = await adminClient
      .from('empresas')
      .select('nit')
      .eq('id', perfil.empresa_id)
      .single()

    if (!puedeEditarNit(empresaActual?.nit ?? null, perfil.rol)) {
      return NextResponse.json(
        { error: 'El NIT ya fue registrado. Solo el equipo de Calculadora de Reúso puede corregirlo.' },
        { status: 403 }
      )
    }
  }

  const { error } = await adminClient
    .from('empresas')
    .update(updates)
    .eq('id', perfil.empresa_id)

  if (error) {
    return NextResponse.json({ error: 'Error al guardar los cambios.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'empresa_config_actualizada',
    detalle: { empresa_id: perfil.empresa_id, campos: Object.keys(updates) },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
```

- [x] **Step 4: Verificar que compila**

```bash
npx tsc --noEmit
```

- [x] **Step 5: Commit**

```bash
git add src/lib/empresa/nit-lock.ts src/lib/empresa/nit-lock.test.ts src/app/api/empresa/config/route.ts
git commit -m "feat: cualquier empleado puede editar los datos de su empresa, con NIT bloqueado tras el primer guardado"
```

---

## Task 11: Formulario de datos de empresa — nuevos campos + CIIU + NIT bloqueado + logo oculto en Free

**Files:**
- Modify: `src/app/(empresa)/empresa/configuracion/components/configuracion-client.tsx`

- [x] **Step 1: Extender las props y el estado**

Cambiar la interfaz `Props` y la firma del componente:

```ts
interface Props {
  empresaId: string
  nombre: string
  sector: string | null
  logoUrl: string | null
  plan: string
  nit: string | null
  telefono: string | null
  pais: string | null
  region: string | null
  ciudad: string | null
  direccion: string | null
  sitioWeb: string | null
  sectorCiiuPrincipal: string | null
  sectorCiiuSecundarios: string[]
  nitBloqueado: boolean
}

export default function ConfiguracionClient({
  nombre: nombreInicial, sector: sectorInicial, logoUrl: logoUrlInicial, plan,
  nit: nitInicial, telefono: telefonoInicial, pais: paisInicial, region: regionInicial,
  ciudad: ciudadInicial, direccion: direccionInicial, sitioWeb: sitioWebInicial,
  sectorCiiuPrincipal, sectorCiiuSecundarios, nitBloqueado,
}: Props) {
```

Extender el estado del formulario:

```ts
const [form, setForm] = useState({
  nombre: nombreInicial, sector: sectorInicial ?? '',
  nit: nitInicial ?? '', telefono: telefonoInicial ?? '', pais: paisInicial ?? '',
  region: regionInicial ?? '', ciudad: ciudadInicial ?? '', direccion: direccionInicial ?? '',
  sitio_web: sitioWebInicial ?? '',
})
const [ciiuPrincipal, setCiiuPrincipal] = useState(sectorCiiuPrincipal ?? '')
const [ciiuSecundarios, setCiiuSecundarios] = useState<string[]>(sectorCiiuSecundarios)
```

- [x] **Step 2: Agregar el import de `SelectorCiiu`**

```ts
import { SelectorCiiu } from '@/components/ui/selector-ciiu'
```

- [x] **Step 3: Agregar los campos nuevos al JSX, después del campo Sector existente**

```tsx
<div>
  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
    NIT{nitBloqueado ? ' (solo el equipo de Calculadora de Reúso puede cambiarlo)' : ''}
  </label>
  <input
    name="nit"
    value={form.nit}
    onChange={handleChange}
    disabled={nitBloqueado}
    style={{ ...inputStyle, opacity: nitBloqueado ? 0.6 : 1, cursor: nitBloqueado ? 'not-allowed' : 'text' }}
  />
</div>

<div>
  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>Teléfono</label>
  <input name="telefono" value={form.telefono} onChange={handleChange} style={inputStyle} />
</div>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
  <div>
    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>País</label>
    <input name="pais" value={form.pais} onChange={handleChange} style={inputStyle} />
  </div>
  <div>
    <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>Ciudad</label>
    <input name="ciudad" value={form.ciudad} onChange={handleChange} style={inputStyle} />
  </div>
</div>

<div>
  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>Región (opcional)</label>
  <input name="region" value={form.region} onChange={handleChange} style={inputStyle} />
</div>

<div>
  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>Dirección (opcional)</label>
  <input name="direccion" value={form.direccion} onChange={handleChange} style={inputStyle} />
</div>

<div>
  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>Sitio web (opcional)</label>
  <input name="sitio_web" value={form.sitio_web} onChange={handleChange} style={inputStyle} placeholder="https://" />
</div>

<div>
  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
    Actividad CIIU principal (opcional)
  </label>
  <SelectorCiiu value={ciiuPrincipal} onChange={setCiiuPrincipal} />
</div>

<div>
  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
    Actividad CIIU complementaria 1 (opcional)
  </label>
  <SelectorCiiu
    value={ciiuSecundarios[0] ?? ''}
    onChange={val => setCiiuSecundarios(prev => [val, prev[1] ?? ''].filter((v, i) => v || i === 0))}
  />
</div>

<div>
  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14, color: TEXT_DARK }}>
    Actividad CIIU complementaria 2 (opcional)
  </label>
  <SelectorCiiu
    value={ciiuSecundarios[1] ?? ''}
    onChange={val => setCiiuSecundarios(prev => [prev[0] ?? '', val])}
  />
</div>
```

- [x] **Step 4: Ocultar el bloque de logo cuando el plan es Free**

Envolver el bloque existente `{/* Logo */}` (líneas 116-153) con la condición:

```tsx
{plan !== 'free' && (
  <div>
    {/* ...bloque de logo existente, sin cambios internos... */}
  </div>
)}
```

- [x] **Step 5: Incluir los campos nuevos en el `fetch` de guardado**

En `handleSubmit`, extender el `body` del `fetch('/api/empresa/config', ...)`:

```ts
body: JSON.stringify({
  nombre: form.nombre,
  sector: form.sector || null,
  logo_url: nuevoLogoUrl,
  nit: form.nit || null,
  telefono: form.telefono || null,
  pais: form.pais || null,
  region: form.region || null,
  ciudad: form.ciudad || null,
  direccion: form.direccion || null,
  sitio_web: form.sitio_web || null,
  sector_ciiu_principal: ciiuPrincipal || null,
  sector_ciiu_secundarios: ciiuSecundarios.filter(Boolean),
}),
```

- [x] **Step 6: Verificar que compila**

```bash
npx tsc --noEmit
```

- [x] **Step 7: Commit**

```bash
git add "src/app/(empresa)/empresa/configuracion/components/configuracion-client.tsx"
git commit -m "feat: formulario de empresa con NIT/teléfono/país/ciudad/CIIU, logo oculto en Free"
```

---

## Task 12: Página `/empresa/configuracion` — pasar los datos nuevos, sin restringir el formulario a empresa_admin

**Files:**
- Modify: `src/app/(empresa)/empresa/configuracion/page.tsx`

- [x] **Step 1: Ampliar el `select` de la empresa**

Cambiar la línea del `select`:

```ts
.select('id, nombre, slug, plan, activa, sector, logo_url, created_at, codigo_registro, nit, telefono, pais, region, ciudad, direccion, sitio_web, sector_ciiu_principal, sector_ciiu_secundarios')
```

- [x] **Step 2: Calcular `nitBloqueado` y pasar todas las props nuevas**

Antes del `return`, agregar:

```ts
const nitBloqueado = Boolean(empresa.nit?.trim()) && perfil.rol !== 'super_admin'
```

Reemplazar el bloque `esAdmin && <ConfiguracionClient .../>` — el formulario deja de ser exclusivo de `empresa_admin` (cualquiera que llegue a esta página ya pertenece a la empresa, y este flujo solo es alcanzable por `empresa_admin`/`super_admin` por el layout, ver Task 13 para el caso `empleado`):

```tsx
<div style={{
  background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`,
  padding: '24px',
}}>
  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
    Editar información
  </h3>
  <ConfiguracionClient
    empresaId={empresa.id}
    nombre={empresa.nombre}
    sector={empresa.sector ?? null}
    logoUrl={empresa.logo_url ?? null}
    plan={empresa.plan}
    nit={empresa.nit ?? null}
    telefono={empresa.telefono ?? null}
    pais={empresa.pais ?? null}
    region={empresa.region ?? null}
    ciudad={empresa.ciudad ?? null}
    direccion={empresa.direccion ?? null}
    sitioWeb={empresa.sitio_web ?? null}
    sectorCiiuPrincipal={empresa.sector_ciiu_principal ?? null}
    sectorCiiuSecundarios={empresa.sector_ciiu_secundarios ?? []}
    nitBloqueado={nitBloqueado}
  />
</div>
```

Quitar el `{esAdmin && (...)}` que envolvía este bloque (dejar el `<CodigoRegistroClient>` de arriba con su propio `esAdmin &&`, ese no cambia).

- [x] **Step 3: Verificar que compila**

```bash
npx tsc --noEmit
```

- [x] **Step 4: Commit**

```bash
git add "src/app/(empresa)/empresa/configuracion/page.tsx"
git commit -m "feat: /empresa/configuracion pasa los datos operativos completos al formulario"
```

---

## Task 13: Página nueva `/dashboard/empresa` — para que un `empleado` también pueda completar los datos

**Files:**
- Create: `src/app/(dashboard)/dashboard/empresa/page.tsx`

`empleado` nunca llega a `/empresa/*` (ver nota de contexto arriba) — esta página nueva, bajo su propio grupo de rutas (`(dashboard)`, que sí lo deja pasar), reutiliza el MISMO componente `ConfiguracionClient` de la Task 11/12 para no duplicar el formulario.

- [x] **Step 1: Escribir la página**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ConfiguracionClient from '@/app/(empresa)/empresa/configuracion/components/configuracion-client'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

export default async function DashboardEmpresaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/dashboard')

  const adminClient = await createAdminClient()
  const { data: empresa } = await adminClient
    .from('empresas')
    .select('id, nombre, sector, logo_url, plan, nit, telefono, pais, region, ciudad, direccion, sitio_web, sector_ciiu_principal, sector_ciiu_secundarios')
    .eq('id', perfil.empresa_id)
    .single()

  if (!empresa) redirect('/dashboard')

  const nitBloqueado = Boolean(empresa.nit?.trim()) && perfil.rol !== 'super_admin'

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <AdminPageHeader
        titulo="Datos de tu empresa"
        subtitulo="Completa esta información para poder generar Informes y Pasaportes (DPP)."
        showBack
      />
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
        <ConfiguracionClient
          empresaId={empresa.id}
          nombre={empresa.nombre}
          sector={empresa.sector ?? null}
          logoUrl={empresa.logo_url ?? null}
          plan={empresa.plan}
          nit={empresa.nit ?? null}
          telefono={empresa.telefono ?? null}
          pais={empresa.pais ?? null}
          region={empresa.region ?? null}
          ciudad={empresa.ciudad ?? null}
          direccion={empresa.direccion ?? null}
          sitioWeb={empresa.sitio_web ?? null}
          sectorCiiuPrincipal={empresa.sector_ciiu_principal ?? null}
          sectorCiiuSecundarios={empresa.sector_ciiu_secundarios ?? []}
          nitBloqueado={nitBloqueado}
        />
      </div>
    </div>
  )
}
```

- [x] **Step 2: Agregar el `loading.tsx` de esta subruta (regla obligatoria del `CLAUDE.md`, skeleton, no spinner genérico)**

```tsx
// src/app/(dashboard)/dashboard/empresa/loading.tsx
export default function Loading() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton-shimmer" style={{ height: 32, width: 220, borderRadius: 8 }} />
      <div className="skeleton-shimmer" style={{ height: 320, borderRadius: 16 }} />
    </div>
  )
}
```

- [x] **Step 3: Verificar en el navegador**

Con un usuario `empleado` real (no `empresa_admin`), navegar directo a `/dashboard/empresa`: confirmar que carga (el layout de `(dashboard)` no lo bloquea) y que el formulario guarda igual que en `/empresa/configuracion`.

- [x] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/empresa/page.tsx" "src/app/(dashboard)/dashboard/empresa/loading.tsx"
git commit -m "feat: página en /dashboard/empresa para que un empleado también complete los datos de la empresa"
```

---

## Task 14: Banner de recordatorio (no bloqueante) en `/empresa` y `/empresa/configuracion`

**Files:**
- Create: `src/components/empresa/banner-datos-pendientes.tsx`
- Modify: `src/app/(empresa)/empresa/page.tsx`
- Modify: `src/app/(empresa)/empresa/configuracion/page.tsx`

Por diseño (sección 2 del spec aprobado): solo NIT, teléfono, país y ciudad disparan el banner. Nunca bloquea, nunca es un popup — banner fijo, siempre visible mientras falte alguno.

- [x] **Step 1: Escribir el componente**

```tsx
// src/components/empresa/banner-datos-pendientes.tsx
import Link from 'next/link'
import { Info } from '@/components/ui/icons'

interface Props {
  nit: string | null
  telefono: string | null
  pais: string | null
  ciudad: string | null
  hrefCompletar: string
}

const CAMPO_LABEL: Record<string, string> = {
  nit: 'NIT', telefono: 'teléfono', pais: 'país', ciudad: 'ciudad',
}

export function BannerDatosPendientes({ nit, telefono, pais, ciudad, hrefCompletar }: Props) {
  const valores: Record<string, string | null> = { nit, telefono, pais, ciudad }
  const faltantes = Object.keys(valores).filter(k => !valores[k]?.trim())

  if (faltantes.length === 0) return null

  const lista = faltantes.map(k => CAMPO_LABEL[k]).join(', ')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: '12px 16px', borderRadius: 12, marginBottom: 16,
      background: 'rgba(246,191,62,0.1)', border: '1px solid rgba(246,191,62,0.3)',
    }}>
      <Info size={17} color="var(--color-warning)" sinAnimacion />
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
        Completa {lista} de tu empresa para poder generar Informes y Pasaportes (DPP).
      </p>
      <Link href={hrefCompletar} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-brand)', whiteSpace: 'nowrap' }}>
        Completar ahora
      </Link>
    </div>
  )
}
```

- [x] **Step 2: Insertarlo en `/empresa/page.tsx`**

En la consulta que hoy es `adminClient.from('empresas').select('plan, nombre').eq('id', empresaId).single()` (línea 186), ampliar el `select`:

```ts
adminClient.from('empresas').select('plan, nombre, nit, telefono, pais, ciudad').eq('id', empresaId).single(),
```

Agregar el import y renderizar el banner justo debajo del saludo/encabezado de la página (antes de los `KpiCard`):

```tsx
import { BannerDatosPendientes } from '@/components/empresa/banner-datos-pendientes'
// ...
<BannerDatosPendientes
  nit={empresaInfo.nit ?? null}
  telefono={empresaInfo.telefono ?? null}
  pais={empresaInfo.pais ?? null}
  ciudad={empresaInfo.ciudad ?? null}
  hrefCompletar="/empresa/configuracion"
/>
```

(Usar el nombre real de la variable que guarda el resultado de esa consulta en el archivo — confirmar al editar, no asumir `empresaInfo` si el archivo usa otro nombre.)

- [x] **Step 3: Insertarlo en `/empresa/configuracion/page.tsx`**

Justo debajo de `<AdminPageHeader .../>`:

```tsx
<BannerDatosPendientes
  nit={empresa.nit ?? null}
  telefono={empresa.telefono ?? null}
  pais={empresa.pais ?? null}
  ciudad={empresa.ciudad ?? null}
  hrefCompletar="/empresa/configuracion"
/>
```

(Aquí el link "Completar ahora" simplemente hace scroll a un formulario que ya está en la misma página — sigue siendo válido como recordatorio visual aunque no navegue a otro lado.)

- [x] **Step 4: Verificar en el navegador**

Con una empresa a la que le falte NIT (ej. una creada por Camino A sin completar nada), abrir `/empresa`: confirmar que el banner aparece con el texto correcto. Completar los 4 campos desde `/empresa/configuracion`, recargar `/empresa`: confirmar que el banner desaparece.

- [x] **Step 5: Commit**

```bash
git add src/components/empresa/banner-datos-pendientes.tsx "src/app/(empresa)/empresa/page.tsx" "src/app/(empresa)/empresa/configuracion/page.tsx"
git commit -m "feat: banner no bloqueante en /empresa y /empresa/configuracion cuando faltan datos operativos"
```

---

## Task 15: Verificación final completa

**Files:** ninguno (solo verificación)

- [x] **Step 1: Tipos y lint limpios en todo lo tocado**

```bash
npx tsc --noEmit
npx eslint src/app/api/admin/empresas/invitar/route.ts src/app/api/empresa/config/route.ts src/app/api/auth/registro-invitacion/route.ts "src/app/(auth)/invitacion/[token]/page.tsx" "src/app/(auth)/invitacion/[token]/components/invitacion-form.tsx" "src/app/(empresa)/empresa/configuracion/components/configuracion-client.tsx" "src/app/(empresa)/empresa/configuracion/page.tsx" "src/app/(empresa)/empresa/page.tsx" "src/app/(dashboard)/dashboard/empresa/page.tsx" "src/app/(admin)/admin/empresas/components/empresas-client.tsx" src/lib/empresa/nit-lock.ts src/lib/generar-slug.ts src/lib/email.ts src/lib/schemas/empresa.schema.ts
```

- [x] **Step 2: Unit tests**

```bash
npx vitest run src/lib/empresa/nit-lock.test.ts
```

- [ ] **Step 3: Reinicio limpio y prueba end-to-end manual**

```bash
npx pm2 restart reuso --update-env
```

Recorrido completo (avisar al usuario que refresque con Cmd+Shift+R):
1. `super_admin` invita una empresa nueva SIN nombre (Camino B) con plan Impulso Sostenible.
2. Abrir el link en una ventana sin sesión, llenar nombre+NIT+teléfono+país+ciudad+contraseña, confirmar que crea la empresa, el usuario queda como `empresa_admin`, y los módulos del plan Impulso ya están activos.
3. Desde esa cuenta, ir a `/empresa` — el banner NO debe aparecer (los 4 campos ya se llenaron al aceptar).
4. `super_admin` invita una segunda empresa CON nombre (Camino A), plan Circular Lab.
5. Aceptar esa invitación (solo pide nombre+contraseña) y confirmar que en `/empresa` SÍ aparece el banner (NIT/teléfono/país/ciudad quedaron pendientes).
6. Completar esos 4 campos desde `/empresa/configuracion`, confirmar que el banner desaparece y que el NIT queda bloqueado (input deshabilitado) al recargar la página.
7. Invitar un `empleado` a esa segunda empresa (flujo YA existente, sin tocar), aceptar la invitación, ir a `/dashboard/empresa`: confirmar que puede ver y editar teléfono/país/ciudad/CIIU pero NO puede editar el NIT (deshabilitado).
8. Como `super_admin`, editar el NIT de esa empresa desde `/admin/empresas/[id]` y confirmar que sí se permite pese a ya tener valor.
9. Revisar ambas páginas (`/empresa`, `/empresa/configuracion`, `/dashboard/empresa`) en 375px y en modo noche — sin texto blanco sobre pistacho, sin `#000000`, fondo siempre plano.

- [x] **Step 4: Registrar en el Vault**

Agregar la entrada del día en `/Users/merinop/Documents/Automatizaciones/Bobedas/Reuso/diario/2026-09-15.md` describiendo el onboarding implementado (per directiva de memoria: documentar sin que lo pidan).
