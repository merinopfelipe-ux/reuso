# La empresa es el cliente en B2B (Cotizador) — Plan de implementación

> **Para quien ejecute:** usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** en B2B el cliente es la empresa (NIT + razón social), nunca un contacto puntual — los contactos (nombre/apellido/teléfono/correo) pasan a ser 100% opcionales, se pueden agregar varios, y sirven para saber a quién escribirle (ej. enviar la propuesta).

**Arquitectura:** no se toca `crm_cotizaciones.cliente_id` (sigue apuntando a `crm_clientes`). Nueva columna `es_contacto_real` distingue una fila con datos reales de persona de una fila-ancla autocompletada con el nombre de la empresa. Nueva columna `duplicado_de_id` vincula un contacto B2B con su copia B2C.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Zod.

**Spec de referencia:** `docs/superpowers/specs/2026-08-19-b2b-empresa-cliente-design.md`

---

## Task 1: Migración SQL

**Files:**
- Create: `sql/101_empresa_cliente_contactos_opcionales.sql`

- [ ] **Escribir la migración**

```sql
-- La empresa es el cliente en B2B: los contactos (nombre/apellido/
-- teléfono/correo) pasan a ser opcionales. es_contacto_real distingue una
-- fila con datos reales de persona de una fila-ancla autocompletada con el
-- nombre de la empresa (para cliente_id de la cotización, que sigue
-- apuntando a una fila de crm_clientes). duplicado_de_id vincula un
-- contacto B2B con su copia B2C ("convertir en cliente B2C").
ALTER TABLE crm_clientes
  ADD COLUMN IF NOT EXISTS es_contacto_real boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duplicado_de_id uuid REFERENCES crm_clientes(id);

-- El mismo celular solo puede repetirse entre un contacto y su copia
-- vinculada (duplicado_de_id IS NOT NULL queda fuera de esta comprobación) —
-- entre dos filas sin relación, sigue bloqueado exactamente como hoy.
DROP INDEX IF EXISTS idx_crm_clientes_telefono;
CREATE UNIQUE INDEX idx_crm_clientes_telefono
  ON crm_clientes (empresa_id, telefono_indicativo, telefono)
  WHERE telefono IS NOT NULL AND duplicado_de_id IS NULL;
```

- [ ] **Correr en el SQL Editor de Supabase** (el usuario la ejecuta manualmente, no yo).

- [ ] **Verificar en vivo** con un script Node (`node --env-file=.env.local`, patrón ya usado en la sesión) que consulte `information_schema.columns` para `crm_clientes` y confirme que `es_contacto_real` y `duplicado_de_id` existen, antes de tocar código de aplicación.

---

## Task 2: `POST /api/cotizador/clientes` — contactos opcionales + autocompletado

**Files:**
- Modify: `src/app/api/cotizador/clientes/route.ts`

- [ ] **Cambiar el schema (líneas 68-87)** — `telefono` y `nombre` obligatorios solo para `tipo: 'persona'`:

```typescript
const schema = z.object({
  tipo: z.enum(['persona', 'empresa']),
  telefono: z.string().max(20).optional(),
  telefono_indicativo: z.string().min(1).max(6).default('+57'),
  nombre: z.string().max(200).optional(),
  apellido: z.string().max(200).optional(),
  identificacion: z.string().max(50).optional(),
  email: z.string().email('Correo inválido.').optional().or(z.literal('')),
  pais: z.string().max(100).optional(),
  ciudad: z.string().max(200).optional(),
  direccion: z.string().max(300).optional(),
  direccion_notas: z.string().max(300).optional(),
  // Solo cuando tipo === 'empresa'
  nit: z.string().max(50).optional(),
  razon_social: z.string().max(200).optional(),
  nombre_comercial: z.string().max(200).optional(),
}).refine(
  (d) => d.tipo !== 'empresa' || (!!d.nit && !!d.razon_social),
  { message: 'NIT y razón social son obligatorios para un cliente empresa.' }
).refine(
  (d) => d.tipo !== 'persona' || (!!d.telefono && d.telefono.length >= 5 && !!d.nombre),
  { message: 'Nombre y celular son obligatorios para un cliente persona.' }
)
```

- [ ] **Validar teléfono solo si viene (después de la línea 110, reemplazar líneas 112-115)**:

```typescript
  if (d.telefono) {
    const errorTelefono = validarTelefono(d.telefono, d.telefono_indicativo)
    if (errorTelefono) {
      return NextResponse.json({ error: errorTelefono }, { status: 400 })
    }
  }
```

- [ ] **Autocompletar `nombre` para el ancla B2B sin contacto** — justo antes del `INSERT` de `crm_clientes` (antes de la línea 152 actual `const { data: cliente, error } = ...`), insertar:

```typescript
  // Ancla de empresa sin contacto real: nombre se autocompleta con el
  // nombre comercial/razón social para que la columna NOT NULL nunca quede
  // vacía, sin obligar al vendedor a inventar un nombre de persona.
  const esContactoReal = d.tipo === 'persona' || !!d.nombre?.trim()
  const nombreFinal = d.nombre?.trim() || (d.tipo === 'empresa' ? (d.nombre_comercial?.trim() || d.razon_social!.trim()) : d.nombre!)
```

  Y cambiar el `.insert({...})` de `crm_clientes` (líneas 152-168) para usar `nombreFinal` y agregar `es_contacto_real`:

```typescript
  const { data: cliente, error } = await adminClient
    .from('crm_clientes')
    .insert({
      empresa_id,
      tipo: d.tipo,
      empresa_cliente_id,
      es_contacto_real: esContactoReal,
      nombre: nombreFinal,
      apellido: d.apellido || null,
      identificacion: d.identificacion || null,
      telefono: d.telefono || null,
      telefono_indicativo: d.telefono_indicativo,
      email: d.email || null,
      pais: d.pais || null,
      ciudad: d.ciudad || null,
      direccion: d.direccion || null,
      direccion_notas: d.direccion_notas || null,
    })
    .select(CLIENTE_SELECT)
    .single()
```

- [ ] **Agregar `es_contacto_real, duplicado_de_id` a `CLIENTE_SELECT`** (línea 6-10):

```typescript
const CLIENTE_SELECT = `
  id, tipo, nombre, apellido, identificacion, telefono, telefono_indicativo,
  email, pais, ciudad, direccion, direccion_notas, notas, empresa_cliente_id, created_at,
  es_contacto_real, duplicado_de_id,
  crm_empresas_clientes ( id, nit, razon_social, nombre_comercial, direccion )
`
```

- [ ] **`npx tsc --noEmit` y `npx eslint src/app/api/cotizador/clientes/route.ts`**, deben quedar limpios.

- [ ] **Verificar en vivo** (script Playwright/fetch efímero, patrón de la sesión): `POST` con `{ tipo: 'empresa', nit: '900...', razon_social: 'Empresa Test' }` sin ningún otro campo → 201, `cliente.es_contacto_real === false`, `cliente.nombre === 'Empresa Test'`. Luego `POST` con los mismos NIT/razón social más `nombre: 'Juan'` → 201, reutiliza la misma `crm_empresas_clientes`, `es_contacto_real === true`.

---

## Task 3: `PATCH /api/cotizador/clientes/[id]` — permitir vaciar el nombre y re-flip del flag

**Files:**
- Modify: `src/app/api/cotizador/clientes/[id]/route.ts`

- [ ] **Cambiar `nombre` en el schema (línea 50)** para aceptar string vacío (significa "volver a ser el ancla"):

```typescript
  nombre: z.union([z.string().min(1).max(200), z.literal('')]).optional(),
```

- [ ] **Agregar `es_contacto_real, duplicado_de_id` a `CLIENTE_SELECT`** (líneas 5-9), mismo cambio que en Task 2.

- [ ] **Resolver el nombre final y el flag antes del `UPDATE`** — reemplazar el bloque de las líneas 86-95:

```typescript
  const { razon_social, nombre_comercial, empresa_direccion, ...contactoFields } = parsed.data

  if (Object.keys(contactoFields).length > 0) {
    const limpio: Record<string, unknown> = { ...contactoFields, email: contactoFields.email || null }
    // Si mandan nombre vacío en un contacto de empresa, vuelve a ser el
    // ancla autocompletada; si mandan un nombre real, se vuelve contacto
    // real. En B2C (sin empresa_cliente_id) siempre es contacto real.
    if ('nombre' in contactoFields) {
      if (!actual.empresa_cliente_id) {
        limpio.es_contacto_real = true
      } else if (!contactoFields.nombre) {
        const { data: empActual } = await adminClient
          .from('crm_empresas_clientes')
          .select('razon_social, nombre_comercial')
          .eq('id', actual.empresa_cliente_id)
          .single()
        limpio.nombre = empActual?.nombre_comercial || empActual?.razon_social || 'Empresa'
        limpio.es_contacto_real = false
      } else {
        limpio.es_contacto_real = true
      }
    }
    const { error } = await adminClient.from('crm_clientes').update(limpio).eq('id', params.id)
    if (error) {
      console.error('[PATCH /api/cotizador/clientes/[id]]', error)
      return NextResponse.json({ error: 'Error al actualizar el cliente.' }, { status: 500 })
    }
  }
```

  (El resto de la función, líneas 97-119, queda igual.)

- [ ] **`npx tsc --noEmit` y `npx eslint src/app/api/cotizador/clientes/[id]/route.ts`**.

- [ ] **Verificar en vivo**: crear un ancla B2B (Task 2), `PATCH` con `{ nombre: 'María' }` → `es_contacto_real: true`. Luego `PATCH` con `{ nombre: '' }` → vuelve a `es_contacto_real: false` y `nombre` es el nombre comercial/razón social de la empresa.

---

## Task 4: Nuevo endpoint — Convertir contacto B2B en cliente B2C

**Files:**
- Create: `src/app/api/cotizador/clientes/[id]/convertir-b2c/route.ts`

- [ ] **Escribir el endpoint completo**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { validarTelefono } from '@/lib/telefono'

const CLIENTE_SELECT = `
  id, tipo, nombre, apellido, identificacion, telefono, telefono_indicativo,
  email, pais, ciudad, direccion, direccion_notas, notas, empresa_cliente_id, created_at,
  es_contacto_real, duplicado_de_id,
  crm_empresas_clientes ( id, nit, razon_social, nombre_comercial, direccion )
`

const schema = z.object({
  telefono: z.string().min(5).max(20).optional(),
  telefono_indicativo: z.string().min(1).max(6).default('+57'),
})

// Crea un cliente B2C nuevo e independiente a partir de un contacto B2B,
// vinculado por duplicado_de_id — nunca automático, siempre lo dispara el
// vendedor desde la búsqueda (identificacion-cliente.tsx). No modifica ni
// borra el contacto original.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : auth.status === 400 ? 'Selecciona una empresa para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  const { data: original, error: fetchError } = await adminClient
    .from('crm_clientes')
    .select('id, empresa_cliente_id, nombre, apellido, telefono, telefono_indicativo, email, pais, ciudad, direccion, direccion_notas')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()

  if (fetchError) {
    console.error('[POST /api/cotizador/clientes/[id]/convertir-b2c]', fetchError)
    return NextResponse.json({ error: 'Error al verificar el contacto.' }, { status: 500 })
  }
  if (!original) return NextResponse.json({ error: 'Contacto no encontrado.' }, { status: 404 })
  if (!original.empresa_cliente_id) {
    return NextResponse.json({ error: 'Este cliente ya es B2C, no hace falta convertirlo.' }, { status: 400 })
  }

  const raw = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const telefono = original.telefono || parsed.data.telefono
  const telefono_indicativo = original.telefono ? (original.telefono_indicativo ?? '+57') : parsed.data.telefono_indicativo
  if (!telefono) {
    return NextResponse.json({ error: 'Este contacto no tiene celular — ingresa uno para crear el cliente B2C.' }, { status: 400 })
  }
  const errorTelefono = validarTelefono(telefono, telefono_indicativo)
  if (errorTelefono) return NextResponse.json({ error: errorTelefono }, { status: 400 })

  const { data: nuevo, error } = await adminClient
    .from('crm_clientes')
    .insert({
      empresa_id,
      tipo: 'persona',
      empresa_cliente_id: null,
      es_contacto_real: true,
      duplicado_de_id: original.id,
      nombre: original.nombre,
      apellido: original.apellido,
      telefono,
      telefono_indicativo,
      email: original.email,
      pais: original.pais,
      ciudad: original.ciudad,
      direccion: original.direccion,
      direccion_notas: original.direccion_notas,
    })
    .select(CLIENTE_SELECT)
    .single()

  if (error || !nuevo) {
    console.error('[POST /api/cotizador/clientes/[id]/convertir-b2c]', error)
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un cliente con ese celular.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error al crear el cliente B2C.' }, { status: 500 })
  }

  return NextResponse.json({ cliente: nuevo }, { status: 201 })
}
```

- [ ] **`npx tsc --noEmit` y `npx eslint`** sobre el archivo nuevo.

- [ ] **Verificar en vivo**: contacto B2B sin teléfono → `POST` sin `telefono` en el body → 400 con el mensaje esperado. Con `telefono` → 201, el nuevo cliente tiene `tipo: 'persona'`, `duplicado_de_id` apuntando al original. Contacto B2B que YA tiene teléfono → `POST` sin body → 201 reutilizando ese mismo teléfono, sin violar el índice único (confirmar con una consulta directa a la base que ambas filas coexisten).

---

## Task 5: Formulario "Crear nuevo" en `/empresa/cotizador/nueva` — empresa primero + contactos repetibles

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/components/identificacion-cliente.tsx`

Este es el cambio más grande del plan. El paso `'crear'` (líneas 287-421 hoy) se reestructura así: cuando `tipoNuevo === 'empresa'`, arriba va SOLO el bloque de empresa (NIT/razón social/nombre comercial), y debajo una lista repetible de contactos (cada uno con nombre/apellido/teléfono/correo, todos opcionales). Cuando `tipoNuevo === 'persona'`, el formulario queda EXACTAMENTE igual que hoy (no se toca esa rama).

- [ ] **Agregar `es_contacto_real` y `duplicado_de_id` a `ClienteIdentificado`** (interfaz exportada, líneas 13-27) — se necesitan en Task 6 para no ofrecer "Convertir en cliente B2C" sobre la fila-ancla de una empresa:

```typescript
export interface ClienteIdentificado {
  id: string
  tipo: 'persona' | 'empresa'
  nombre: string
  apellido: string | null
  identificacion: string | null
  telefono: string
  telefono_indicativo: string
  email: string | null
  pais: string | null
  ciudad: string | null
  direccion: string | null
  empresa_cliente_id: string | null
  es_contacto_real: boolean
  duplicado_de_id: string | null
  crm_empresas_clientes: { id: string; nit: string; razon_social: string; nombre_comercial: string | null; direccion: string | null } | { id: string; nit: string; razon_social: string; nombre_comercial: string | null; direccion: string | null }[] | null
}
```

- [ ] **Nuevo tipo y estado para la lista de contactos** — agregar después de la línea 64 (`const [nombreComercial, setNombreComercial] = useState('')`):

```typescript
  interface ContactoNuevo { nombre: string; apellido: string; telefono: string; email: string }
  const [contactos, setContactos] = useState<ContactoNuevo[]>([])

  function agregarContacto() {
    setContactos(prev => [...prev, { nombre: '', apellido: '', telefono: '', email: '' }])
  }
  function actualizarContacto(idx: number, patch: Partial<ContactoNuevo>) {
    setContactos(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }
  function quitarContacto(idx: number) {
    setContactos(prev => prev.filter((_, i) => i !== idx))
  }
```

- [ ] **Simplificar `intentarCrear` (líneas 107-138)** — la validación de nombre/teléfono obligatorios solo aplica a `tipoNuevo === 'persona'`; para empresa, valida NIT/razón social y delega la creación a un flujo distinto (múltiples POST):

```typescript
  async function intentarCrear() {
    if (tipoNuevo === 'persona') {
      if (!telefono.trim() || telefono.length < 5) { setError('El celular es obligatorio y debe ser válido.'); return }
      const errorTelefono = validarTelefono(telefono.trim(), indicativo.dial)
      if (errorTelefono) { setError(errorTelefono); return }
      if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
      setError(null)
      setBuscandoDuplicado(true)
      try {
        const res = await fetch(conEmpresa('/api/cotizador/clientes'))
        const data = await res.json()
        const candidatos: ClienteIdentificado[] = data.clientes ?? []
        const telefonoLimpio = telefono.trim()
        const match = candidatos.find(c =>
          c.telefono !== telefonoLimpio &&
          distanciaLevenshtein(c.telefono ?? '', telefonoLimpio) <= 2
        )
        if (match) {
          setPosibleDuplicado(match)
          setBuscandoDuplicado(false)
          return
        }
      } catch {
        // Si falla la búsqueda de coincidencias no se bloquea la creación —
        // el índice único de la base sigue siendo la protección real.
      }
      setBuscandoDuplicado(false)
      await crearClientePersona()
      return
    }

    // tipoNuevo === 'empresa'
    if (!nit.trim() || !razonSocial.trim()) {
      setError('NIT y razón social son obligatorios.')
      return
    }
    // Chequeo de duplicado por teléfono solo para los contactos que sí
    // trajeron celular — igual criterio que B2C, un contacto por uno.
    const conTelefono = contactos.filter(c => c.telefono.trim())
    if (conTelefono.length > 0) {
      setBuscandoDuplicado(true)
      try {
        const res = await fetch(conEmpresa('/api/cotizador/clientes'))
        const data = await res.json()
        const candidatos: ClienteIdentificado[] = data.clientes ?? []
        for (const c of conTelefono) {
          const match = candidatos.find(cand =>
            cand.telefono !== c.telefono.trim() &&
            distanciaLevenshtein(cand.telefono ?? '', c.telefono.trim()) <= 2
          )
          if (match) {
            setPosibleDuplicado(match)
            setBuscandoDuplicado(false)
            return
          }
        }
      } catch {
        // mismo criterio: el índice único es la protección real
      }
      setBuscandoDuplicado(false)
    }
    setError(null)
    await crearClienteEmpresa()
  }
```

- [ ] **Renombrar `crearCliente` a `crearClientePersona`** (líneas 140-172, sin otro cambio de contenido más que el nombre de la función) y **agregar `crearClienteEmpresa`** justo debajo:

```typescript
  // Crea la empresa + tantos contactos como se hayan agregado, con POSTs
  // secuenciales al mismo endpoint (reutiliza la lógica ya existente de
  // "reusar crm_empresas_clientes si el NIT ya existe" — sin esto habría
  // que duplicar esa lógica en el backend). Si no hay ningún contacto, un
  // solo POST crea el ancla de la empresa. cliente_id de la cotización
  // termina apuntando al PRIMER cliente creado.
  async function crearClienteEmpresa() {
    setGuardando(true)
    try {
      const base = {
        tipo: 'empresa' as const,
        nit: nit.trim(),
        razon_social: razonSocial.trim(),
        nombre_comercial: nombreComercial.trim() || undefined,
        pais: pais.trim() || undefined,
        ciudad: ciudad.trim() || undefined,
        direccion: direccion.trim() || undefined,
        direccion_notas: direccionNotas.trim() || undefined,
      }
      const lista = contactos.length > 0 ? contactos : [null]
      let primero: ClienteIdentificado | null = null
      for (const c of lista) {
        const res = await fetch(conEmpresa('/api/cotizador/clientes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...base,
            nombre: c?.nombre.trim() || undefined,
            apellido: c?.apellido.trim() || undefined,
            telefono: c?.telefono.trim() || undefined,
            telefono_indicativo: indicativo.dial,
            email: c?.email.trim() || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Error al crear el cliente.'); setGuardando(false); return }
        if (!primero) primero = data.cliente
      }
      onClienteListo(primero!)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }
```

- [ ] **Actualizar el `onClick` del botón "No, es alguien distinto"** (línea 407, dentro del bloque `posibleDuplicado`) para llamar a la función correcta según el tipo:

```typescript
              <Button size="sm" className="flex-1" loading={guardando} onClick={() => { setPosibleDuplicado(null); tipoNuevo === 'persona' ? crearClientePersona() : crearClienteEmpresa() }}>
                No, es alguien distinto
              </Button>
```

- [ ] **Reescribir el JSX del paso `'crear'` (líneas 314-389)** — separar en dos ramas completas según `tipoNuevo`:

```tsx
        <div className="flex flex-col gap-3">
          {tipoNuevo === 'persona' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} className={inputSt} placeholder="Nombre" />
                </div>
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${ts}`}>Apellido</label>
                  <input value={apellido} onChange={e => setApellido(e.target.value)} className={inputSt} placeholder="Apellido" />
                </div>
              </div>
              <div>
                <label className={`text-xs font-semibold mb-1 block ${ts}`}>Celular</label>
                <div className="flex gap-2">
                  <SelectorPais value={indicativo} onChange={setIndicativo} />
                  <input
                    value={telefono}
                    onChange={e => setTelefono(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="Número de celular"
                    inputMode="tel"
                    className={`${inputSt} flex-1`}
                  />
                </div>
              </div>
              <div>
                <label className={`text-xs font-semibold mb-1 block ${ts}`}>Cédula</label>
                <input value={identificacion} onChange={e => setIdentificacion(e.target.value)} className={inputSt} placeholder="Opcional" inputMode="numeric" />
              </div>
              <div>
                <label className={`text-xs font-semibold mb-1 block ${ts}`}>Correo electrónico</label>
                <input value={email} onChange={e => setEmail(e.target.value)} className={inputSt} placeholder="Opcional" type="email" />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl p-3 border border-[var(--border)] bg-[var(--bg-input)]">
                <p className={`text-xs font-semibold mb-2 ${ts}`}>Datos de la empresa</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-semibold mb-1 block ${ts}`}>NIT</label>
                    <InputDocumento value={nit} onChange={setNit} className={inputSt} placeholder="Ej. 900.123.456" />
                  </div>
                  <div>
                    <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre comercial</label>
                    <input value={nombreComercial} onChange={e => setNombreComercial(e.target.value)} className={inputSt} placeholder="Opcional" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={`text-xs font-semibold mb-1 block ${ts}`}>Razón social</label>
                  <input value={razonSocial} onChange={e => setRazonSocial(e.target.value)} className={inputSt} placeholder="Razón social completa" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs font-semibold ${ts}`}>Contactos (opcional)</p>
                  <button type="button" onClick={agregarContacto} className={`text-xs font-semibold hover-pop ${tp}`} style={{ color: 'var(--color-brand)' }}>
                    + Agregar contacto
                  </button>
                </div>
                {contactos.length === 0 && (
                  <p className={`text-xs italic ${ts}`}>Ninguno todavía — puedes guardar la empresa sin contactos y agregarlos después.</p>
                )}
                <div className="flex flex-col gap-3">
                  {contactos.map((c, idx) => (
                    <div key={idx} className="rounded-xl p-3 border border-[var(--border)] bg-[var(--bg-card)]">
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-[11px] font-semibold ${ts}`}>Contacto {idx + 1}</p>
                        <button type="button" onClick={() => quitarContacto(idx)} className={`text-xs font-semibold ${ts}`}>
                          Quitar
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input value={c.nombre} onChange={e => actualizarContacto(idx, { nombre: e.target.value })} className={inputSt} placeholder="Nombre" />
                        <input value={c.apellido} onChange={e => actualizarContacto(idx, { apellido: e.target.value })} className={inputSt} placeholder="Apellido" />
                      </div>
                      <div className="flex gap-2 mb-3">
                        <SelectorPais value={indicativo} onChange={setIndicativo} />
                        <input
                          value={c.telefono}
                          onChange={e => actualizarContacto(idx, { telefono: e.target.value.replace(/[^\d]/g, '') })}
                          placeholder="Celular (opcional)"
                          inputMode="tel"
                          className={`${inputSt} flex-1`}
                        />
                      </div>
                      <input value={c.email} onChange={e => actualizarContacto(idx, { email: e.target.value })} className={inputSt} placeholder="Correo (opcional)" type="email" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>País</label>
            <SelectorPais value={pais} onChange={setPais} />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Ciudad</label>
            <SelectorCiudad value={ciudad} onChange={setCiudad} pais={pais} conEmpresa={conEmpresa} />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Dirección</label>
            <InputDireccion value={direccion} onChange={setDireccion} paisCodigo={PAISES.find(p => p.nombre === pais)?.codigo} paisNombre={pais} ciudad={ciudad} />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Notas sobre la dirección</label>
            <input value={direccionNotas} onChange={e => setDireccionNotas(e.target.value)} className={inputSt} placeholder="Ej. torre, apto, punto de referencia" />
          </div>
        </div>
```

- [ ] **Ícono de País dentro de cada contacto**: como `SelectorPais` para el indicativo telefónico se comparte (`indicativo`/`setIndicativo`) entre todos los contactos y la empresa (un solo indicativo por formulario, no uno distinto por contacto) — esto es una simplificación intencional, no un bug: casi siempre todos los contactos de una misma empresa colombiana usan el mismo indicativo. Si el vendedor necesita indicativos distintos por contacto, lo ajusta después desde `/empresa/clientes/[id]` (Task 8).

- [ ] **`npx tsc --noEmit` y `npx eslint`** sobre el archivo.

- [ ] **Verificar en vivo con Playwright** (login efímero, patrón de la sesión): crear empresa B2B solo con NIT+razón social (sin contactos) → cotización se crea, `cliente_id` apunta a un cliente con `es_contacto_real: false`. Repetir agregando 2 contactos → confirmar que ambos quedan creados vinculados al mismo NIT (consulta directa a Supabase) y que `cliente_id` de la cotización es el primero.

---

## Task 6: Búsqueda de cliente existente — filtro B2B/B2C + "Convertir en cliente B2C"

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/nueva/components/identificacion-cliente.tsx`

- [ ] **Nuevo estado para el filtro**, junto a `const [q, setQ] = useState('')` (línea 38):

```typescript
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'persona' | 'empresa'>('todos')
```

- [ ] **Toggle B2B/B2C en el paso `'buscar'` (dentro del `return` final, líneas 424-444)** — agregar antes del input de búsqueda:

```tsx
      <div className="flex gap-2 mb-3">
        {(['todos', 'persona', 'empresa'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setFiltroTipo(t)}
            className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${
              filtroTipo === t ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'
            }`}
          >
            {t === 'todos' ? 'Ambos' : t === 'persona' ? 'Persona (B2C)' : 'Empresa (B2B)'}
          </button>
        ))}
      </div>
```

- [ ] **Pasar el filtro a la búsqueda** — en `buscar()` (línea 78-102), cambiar la construcción de `params`:

```typescript
      const params = new URLSearchParams({ q: q.trim() })
      if (filtroTipo !== 'todos') params.set('tipo', filtroTipo)
```

- [ ] **Backend: soportar `?tipo=` en `GET /api/cotizador/clientes`** — en `src/app/api/cotizador/clientes/route.ts`, después de leer `q` (línea 30), agregar:

```typescript
  const tipoFiltro = request.nextUrl.searchParams.get('tipo')
```

  Y en el filtrado (líneas 51-63), agregar el filtro de tipo antes/junto al de texto:

```typescript
  interface ClienteRow {
    tipo: 'persona' | 'empresa'
    nombre: string
    apellido: string | null
    telefono: string | null
    crm_empresas_clientes: { nit: string; razon_social: string } | { nit: string; razon_social: string }[] | null
  }

  let clientes = (data ?? []) as unknown as ClienteRow[]
  if (tipoFiltro === 'persona' || tipoFiltro === 'empresa') {
    clientes = clientes.filter(c => c.tipo === tipoFiltro)
  }
  if (q) {
    clientes = clientes.filter((c) => {
      const emp = Array.isArray(c.crm_empresas_clientes) ? c.crm_empresas_clientes[0] : c.crm_empresas_clientes
      return (
        c.nombre.toLowerCase().includes(q) ||
        (c.apellido ?? '').toLowerCase().includes(q) ||
        (c.telefono ?? '').includes(q) ||
        (emp?.nit ?? '').toLowerCase().includes(q) ||
        (emp?.razon_social ?? '').toLowerCase().includes(q)
      )
    })
  }
```

  (`tipo` ya viene en el `CLIENTE_SELECT` existente, no hace falta agregarlo.)

- [ ] **Resultados de búsqueda: agrupar por empresa + botón "Convertir en cliente B2C"** — reescribir el bloque `paso === 'resultados'` (líneas 179-228) para agrupar los contactos B2B por su empresa y mostrar el botón de conversión junto a cada uno:

```tsx
  if (paso === 'resultados') {
    const empresasAgrupadas = new Map<string, { emp: { id: string; nit: string; razon_social: string; nombre_comercial: string | null }; contactos: ClienteIdentificado[] }>()
    const personasSueltas: ClienteIdentificado[] = []
    resultados.forEach(c => {
      const emp = Array.isArray(c.crm_empresas_clientes) ? c.crm_empresas_clientes[0] : c.crm_empresas_clientes
      if (emp) {
        if (!empresasAgrupadas.has(emp.id)) empresasAgrupadas.set(emp.id, { emp, contactos: [] })
        empresasAgrupadas.get(emp.id)!.contactos.push(c)
      } else {
        personasSueltas.push(c)
      }
    })

    return (
      <div className={`rounded-[12px] border p-5 ${cardBg}`}>
        <p className={`text-sm font-semibold mb-1 ${tp}`}>Resultados de búsqueda</p>
        <p className={`text-xs mb-4 ${ts}`}>Se encontraron {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} para &quot;{q}&quot;</p>

        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 mb-4">
          {Array.from(empresasAgrupadas.values()).map(({ emp, contactos: contactosEmp }) => (
            <div key={emp.id} className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] p-3">
              <button
                onClick={() => seleccionarCliente(contactosEmp[0])}
                className="w-full text-left"
              >
                <p className={`text-sm font-bold ${tp}`}>{emp.razon_social}</p>
                <p className={`text-xs ${ts}`}>NIT {emp.nit}{emp.nombre_comercial ? ` · ${emp.nombre_comercial}` : ''}</p>
              </button>
              {/* La fila-ancla (es_contacto_real: false) nunca se muestra como
                  si fuera un contacto elegible — su nombre autocompletado
                  (el de la empresa) haría que "Convertir en cliente B2C"
                  no tuviera sentido sobre ella. */}
              {contactosEmp.filter(c => c.es_contacto_real).length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-1.5">
                  {contactosEmp.filter(c => c.es_contacto_real).map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <button onClick={() => seleccionarCliente(c)} className="text-left flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${tp}`}>{c.nombre} {c.apellido ?? ''}</p>
                        {c.telefono && <p className={`text-[11px] ${ts}`}>{formatTelefonoVista(c.telefono, c.telefono_indicativo)}</p>}
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirConvertirB2C(c)}
                        className="text-[11px] font-semibold px-2 py-1 rounded-full border border-[var(--border)] hover-pop flex-shrink-0"
                        style={{ color: 'var(--color-brand)' }}
                      >
                        Convertir en cliente B2C
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {personasSueltas.map(c => (
            <button
              key={c.id}
              onClick={() => seleccionarCliente(c)}
              className="w-full text-left p-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-bold ${tp}`}>{c.nombre} {c.apellido ?? ''}</p>
                  <p className={`text-xs ${ts}`}>{formatTelefonoVista(c.telefono, c.telefono_indicativo)}</p>
                </div>
                <span className="text-[10px] uppercase font-bold bg-[#59A6E4]/20 text-[#59A6E4] px-2 py-0.5 rounded-full">B2C</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => setPaso('buscar')}>Atrás</Button>
          <Button size="sm" onClick={() => {
            const qNum = q.replace(/[^\d]/g, '')
            if (qNum.length >= 7) setTelefono(qNum)
            setPaso('crear')
          }} className="flex-1">
            No está en la lista, crear nuevo
          </Button>
        </div>

        {/* Confirmar conversión a B2C */}
        <Modal
          abierto={convirtiendo !== null}
          onClose={() => setConvirtiendo(null)}
          titulo="Convertir en cliente B2C"
          descripcion={convirtiendo ? `${convirtiendo.nombre} ${convirtiendo.apellido ?? ''} pasa a existir también como cliente independiente, sin dejar de ser contacto de su empresa.` : ''}
          textoConfirmar={convirtiendoGuardando ? 'Creando...' : 'Convertir'}
          onConfirmar={confirmarConvertirB2C}
        >
          {convirtiendo && !convirtiendo.telefono && (
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Celular (obligatorio para el cliente B2C)</label>
              <div className="flex gap-2">
                <SelectorPais value={indicativo} onChange={setIndicativo} />
                <input
                  value={telefonoConversion}
                  onChange={e => setTelefonoConversion(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Número de celular"
                  inputMode="tel"
                  className={`${inputSt} flex-1`}
                />
              </div>
            </div>
          )}
          {errorConversion && <p className="mt-2 text-sm text-[#FF5E4B]">{errorConversion}</p>}
        </Modal>
      </div>
    )
  }
```

- [ ] **Import de `Modal`** — agregar `import { Modal } from '@/components/ui/modal'` al inicio del archivo (línea 5).

- [ ] **Estado y handlers para la conversión** — agregar junto a los demás estados (después de `posibleDuplicado`/`buscandoDuplicado`, línea 71):

```typescript
  const [convirtiendo, setConvirtiendo] = useState<ClienteIdentificado | null>(null)
  const [telefonoConversion, setTelefonoConversion] = useState('')
  const [convirtiendoGuardando, setConvirtiendoGuardando] = useState(false)
  const [errorConversion, setErrorConversion] = useState<string | null>(null)

  function abrirConvertirB2C(c: ClienteIdentificado) {
    setConvirtiendo(c)
    setTelefonoConversion('')
    setErrorConversion(null)
  }

  async function confirmarConvertirB2C() {
    if (!convirtiendo) return
    setConvirtiendoGuardando(true)
    setErrorConversion(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/clientes/${convirtiendo.id}/convertir-b2c`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: telefonoConversion.trim() || undefined, telefono_indicativo: indicativo.dial }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorConversion(data.error ?? 'No se pudo convertir.'); return }
      setConvirtiendo(null)
      // Se queda en la lista de resultados — el vendedor puede ahora
      // buscar de nuevo y encontrar el B2C recién creado si lo necesita.
    } catch {
      setErrorConversion('Error de conexión. Intenta de nuevo.')
    } finally {
      setConvirtiendoGuardando(false)
    }
  }
```

- [ ] **`npx tsc --noEmit` y `npx eslint`** sobre `identificacion-cliente.tsx` y `route.ts`.

- [ ] **Verificar en vivo**: buscar por el nombre de un contacto B2B → aparece agrupado bajo su empresa con el botón "Convertir en cliente B2C". Confirmar sin celular propio → pide celular → crea el B2C. Buscar de nuevo con ese celular → aparece como resultado B2C suelto.

---

## Task 7: `/empresa/clientes` — filtrar contactos-ancla de la lista

**Files:**
- Modify: `src/app/(empresa)/empresa/clientes/page.tsx`

- [ ] **Agregar `es_contacto_real: boolean` a `ClienteResumen`** (línea 15-27).

- [ ] **Filtrar contactos reales al agrupar (línea 113-142)** — cambiar la línea `empresasMap.get(key)!.contactos.push(c)` (aparece 2 veces, líneas 127 y 140) para que solo empuje contactos reales:

```typescript
      if (c.es_contacto_real) empresasMap.get(key)!.contactos.push(c)
```

  (Reemplazar ambas ocurrencias — la de la rama `emp && emp.nit` en línea 127 y la de la rama `c.tipo === 'empresa' || c.empresa_cliente_id` en línea 140 — con esta misma línea condicional.)

- [ ] **`npx tsc --noEmit` y `npx eslint`**.

- [ ] **Verificar en vivo**: una empresa creada sin contactos (Task 5) no debe mostrar ninguna tarjeta bajo "Personas vinculadas" en `/empresa/clientes`, y el contador de "N contactos" (línea 300-302) debe decir 0.

---

## Task 8: `/empresa/clientes/[id]` — empresa primero, "Agregar contacto", fix modal de celular

**Files:**
- Modify: `src/app/(empresa)/empresa/clientes/[id]/page.tsx`

- [ ] **Agregar `es_contacto_real: boolean` a `ClienteDetalle`** (línea 44-59).

- [ ] **Nuevo estado para "otros contactos de la empresa" y el modal de agregar** — junto a los demás estados (después de línea 128, `const [nombreComercial, setNombreComercial] = useState('')`):

```typescript
  interface ContactoHermano { id: string; nombre: string; apellido: string | null; telefono: string | null; telefono_indicativo: string | null; email: string | null }
  const [otrosContactos, setOtrosContactos] = useState<ContactoHermano[]>([])
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false)
  const [nuevoContacto, setNuevoContacto] = useState({ nombre: '', apellido: '', telefono: '', email: '' })
  const [nuevoIndicativo, setNuevoIndicativo] = useState<Pais>(PAISES[0])
  const [agregandoContacto, setAgregandoContacto] = useState(false)
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null)
```

- [ ] **Cargar los contactos hermanos** — dentro de `cargar()` (línea 144-181), después de resolver `emp` (línea 168-169), agregar:

```typescript
          if (emp) {
            setRazonSocial(emp.razon_social); setNombreComercial(emp.nombre_comercial ?? '')
            const resHermanos = await fetch(conEmpresa(`/api/cotizador/clientes?q=&empresa_cliente_id=${emp.id}`))
            const dHermanos = await resHermanos.json().catch(() => null)
            if (dHermanos?.clientes) {
              setOtrosContactos(
                dHermanos.clientes.filter((h: ClienteDetalle) => h.es_contacto_real && h.id !== c.id)
              )
            }
          }
```

- [ ] **Backend: soportar `?empresa_cliente_id=` en `GET /api/cotizador/clientes`** — en `src/app/api/cotizador/clientes/route.ts`, después de leer `tipoFiltro` (Task 6), agregar:

```typescript
  const empresaClienteId = request.nextUrl.searchParams.get('empresa_cliente_id')
```

  Y aplicar el filtro sobre la query de Supabase (antes del `.order(...)`, línea 36) usando `.eq('empresa_cliente_id', empresaClienteId)` condicionalmente:

```typescript
  let query = adminClient
    .from('crm_clientes')
    .select(CLIENTE_SELECT)
    .eq('empresa_id', empresa_id)
  if (empresaClienteId) query = query.eq('empresa_cliente_id', empresaClienteId)
  const { data, error } = await query.order('created_at', { ascending: false }).limit(300)
```

  (Reemplaza el bloque actual de líneas 32-37.)

- [ ] **Handler para agregar contacto** — junto a `guardar()` (después de línea 210):

```typescript
  async function agregarContactoNuevo() {
    if (!emp) return
    setAgregandoContacto(true)
    setErrorAgregar(null)
    try {
      const res = await fetch(conEmpresa('/api/cotizador/clientes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'empresa',
          nit: emp.nit,
          razon_social: emp.razon_social,
          nombre_comercial: emp.nombre_comercial || undefined,
          nombre: nuevoContacto.nombre.trim() || undefined,
          apellido: nuevoContacto.apellido.trim() || undefined,
          telefono: nuevoContacto.telefono.trim() || undefined,
          telefono_indicativo: nuevoIndicativo.dial,
          email: nuevoContacto.email.trim() || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setErrorAgregar(d.error ?? 'No se pudo agregar el contacto.'); return }
      setOtrosContactos(prev => [...prev, d.cliente])
      setNuevoContacto({ nombre: '', apellido: '', telefono: '', email: '' })
      setModalAgregarAbierto(false)
    } catch {
      setErrorAgregar('Error de conexión. Intenta de nuevo.')
    } finally {
      setAgregandoContacto(false)
    }
  }
```

  (`emp` ya está definido en el render con `const emp = Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes` — línea 293. Como `agregarContactoNuevo` está fuera del render, usa el mismo cálculo a partir de `cliente` en vez de la variable local: reemplaza `if (!emp) return` y los usos de `emp.` dentro de la función por `const emp = cliente && (Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes); if (!emp) return`.)

- [ ] **Reordenar el render: empresa primero (líneas 313-383)** — mover el bloque "Datos de empresa (B2B)" (371-383) para que quede ANTES del bloque "Datos del contacto" (315-368), cuando `emp` existe. Estructura final de esa sección:

```tsx
        <div className="flex flex-col gap-4">
        {/* Datos de empresa (B2B) — primero, es el cliente real */}
        {emp && (
          <div className={`rounded-[12px] border p-4 ${cardBg}`}>
            <p className={`text-xs font-semibold mb-3 ${ts}`}>Empresa cliente · NIT {emp.nit}</p>
            <div className="mb-3">
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Razón social</label>
              <input value={razonSocial} onChange={e => setRazonSocial(e.target.value)} className={inputSt} />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre comercial</label>
              <input value={nombreComercial} onChange={e => setNombreComercial(e.target.value)} className={inputSt} placeholder="Opcional" />
            </div>
          </div>
        )}

        {/* Otros contactos de esta empresa + agregar uno nuevo */}
        {emp && (
          <div className={`rounded-[12px] border p-4 ${cardBg}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-xs font-semibold ${ts}`}>Otros contactos de esta empresa</p>
              <button type="button" onClick={() => setModalAgregarAbierto(true)} className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>
                + Agregar contacto
              </button>
            </div>
            {otrosContactos.length === 0 ? (
              <p className={`text-xs italic ${ts}`}>Ningún otro contacto todavía.</p>
            ) : (
              <div className="space-y-1.5">
                {otrosContactos.map(h => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => router.push(conEmpresa(`/empresa/clientes/${h.id}`))}
                    className="w-full text-left p-2.5 rounded-[8px] bg-[var(--bg-input)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <p className={`text-xs font-semibold ${tp}`}>{h.nombre} {h.apellido ?? ''}</p>
                    {h.telefono && <p className={`text-[11px] ${ts}`}>{formatTelefonoVista(h.telefono, h.telefono_indicativo)}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Datos del contacto actual — segundo, es opcional para B2B */}
        <div className={`rounded-[12px] border p-4 ${cardBg}`}>
          <p className={`text-xs font-semibold mb-3 ${ts}`}>{emp ? 'Este contacto (opcional)' : 'Datos del contacto'}</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} className={inputSt} placeholder={emp ? 'Opcional' : undefined} />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Apellido</label>
              <input value={apellido} onChange={e => setApellido(e.target.value)} className={inputSt} />
            </div>
          </div>
          {cliente.tipo === 'persona' && (
            <div className="mb-3">
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Cédula</label>
              <input value={identificacion} onChange={e => setIdentificacion(e.target.value)} className={inputSt} placeholder="Opcional" inputMode="numeric" />
            </div>
          )}
          <div className="mb-3">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Celular</label>
            <div className="flex gap-2">
              <SelectorPais value={telefonoIndicativo} onChange={setTelefonoIndicativo} />
              <input
                value={telefono}
                onChange={e => setTelefono(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Número de celular"
                inputMode="tel"
                className={`${inputSt} flex-1`}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Correo</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputSt} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>País</label>
              <SelectorPais value={pais} onChange={setPais} />
            </div>
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Ciudad</label>
              <SelectorCiudad value={ciudad} onChange={setCiudad} pais={pais} conEmpresa={conEmpresa} />
            </div>
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Dirección</label>
            <InputDireccion value={direccion} onChange={setDireccion} paisCodigo={PAISES.find(p => p.nombre === pais)?.codigo} paisNombre={pais} ciudad={ciudad} />
          </div>
          <div className="mt-3">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Notas sobre la dirección</label>
            <input value={direccionNotas} onChange={e => setDireccionNotas(e.target.value)} className={inputSt} placeholder="Ej. torre, apto, punto de referencia" />
          </div>
        </div>
```

- [ ] **Fix del modal "Cambiar el celular" (líneas 215-218 y 546-558)** — solo pedir confirmación si YA había un celular:

```typescript
  function intentarGuardar() {
    if (telefonoOriginal && telefono !== telefonoOriginal) { setConfirmandoTelefono(true); return }
    guardar()
  }
```

- [ ] **Modal "Agregar contacto" nuevo** — agregar junto a los otros `<Modal>` (después del de "Cambiar el celular", línea 558):

```tsx
      <Modal
        abierto={modalAgregarAbierto}
        onClose={() => !agregandoContacto && setModalAgregarAbierto(false)}
        titulo="Agregar contacto"
        descripcion={`Nuevo contacto de ${emp?.razon_social ?? 'esta empresa'}.`}
        textoConfirmar={agregandoContacto ? 'Agregando...' : 'Agregar'}
        onConfirmar={agregarContactoNuevo}
      >
        <div className="flex flex-col gap-3">
          {errorAgregar && <p className="text-sm text-[#FF5E4B]">{errorAgregar}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input value={nuevoContacto.nombre} onChange={e => setNuevoContacto(p => ({ ...p, nombre: e.target.value }))} className={inputSt} placeholder="Nombre" />
            <input value={nuevoContacto.apellido} onChange={e => setNuevoContacto(p => ({ ...p, apellido: e.target.value }))} className={inputSt} placeholder="Apellido" />
          </div>
          <div className="flex gap-2">
            <SelectorPais value={nuevoIndicativo} onChange={setNuevoIndicativo} />
            <input
              value={nuevoContacto.telefono}
              onChange={e => setNuevoContacto(p => ({ ...p, telefono: e.target.value.replace(/[^\d]/g, '') }))}
              placeholder="Celular (opcional)"
              inputMode="tel"
              className={`${inputSt} flex-1`}
            />
          </div>
          <input value={nuevoContacto.email} onChange={e => setNuevoContacto(p => ({ ...p, email: e.target.value }))} className={inputSt} placeholder="Correo (opcional)" type="email" />
        </div>
      </Modal>
```

- [ ] **`npx tsc --noEmit` y `npx eslint`** sobre este archivo y `clientes/route.ts`.

- [ ] **Verificar en vivo**: abrir la ficha de la empresa-ancla creada en Task 5 → ver "Empresa cliente" primero, luego "Este contacto (opcional)" con los campos vacíos, sin ningún dato de persona forzado. Agregar un contacto nuevo desde el botón → aparece en "Otros contactos". Poner un celular por primera vez en "Este contacto" y guardar → NO debe aparecer el modal de confirmación "Cambiar el celular" (porque no había uno antes).

---

## Task 9: `GET /api/cotizador/cotizaciones/[id]` — exponer `es_contacto_real` + contactos de la empresa

**Files:**
- Modify: `src/app/api/cotizador/cotizaciones/[id]/route.ts`

- [ ] **Agregar `es_contacto_real` al select del `GET`** (dentro del bloque `crm_clientes (...)`, líneas 109-113):

```typescript
        crm_clientes (
          id, tipo, nombre, apellido, identificacion, telefono, telefono_indicativo, email,
          pais, ciudad, direccion, direccion_notas, empresa_cliente_id, es_contacto_real,
          crm_empresas_clientes ( id, nit, razon_social, nombre_comercial, direccion )
        )
```

  Mismo cambio en el segundo `select` (líneas 225-245, del `PATCH`, mismo bloque `crm_clientes(...)`).

- [ ] **Cargar los contactos reales de la empresa** — después de obtener `cotizacion` y antes del `return` (después de la línea 126 `if (!cotizacion) {...}`), agregar:

```typescript
    let contactosEmpresa: unknown[] = []
    const clienteInfo = Array.isArray(cotizacion.crm_clientes) ? cotizacion.crm_clientes[0] : cotizacion.crm_clientes
    if (clienteInfo?.empresa_cliente_id) {
      const { data: hermanos } = await adminClient
        .from('crm_clientes')
        .select('id, nombre, apellido, email, telefono, telefono_indicativo')
        .eq('empresa_cliente_id', clienteInfo.empresa_cliente_id)
        .eq('es_contacto_real', true)
        .order('created_at', { ascending: true })
      contactosEmpresa = hermanos ?? []
    }

    return NextResponse.json({ cotizacion, contactos_empresa: contactosEmpresa })
```

  (Reemplaza el `return NextResponse.json({ cotizacion })` actual de la línea 128.)

- [ ] **`npx tsc --noEmit` y `npx eslint`**.

- [ ] **Verificar en vivo**: `GET` de una cotización de una empresa con 2 contactos reales → `contactos_empresa` trae los 2, cada uno con `email`.

---

## Task 10: Modal "Enviar propuesta" — elegir contacto en vez de escribir a ciegas

**Files:**
- Modify: `src/app/(empresa)/empresa/cotizador/[id]/page.tsx`
- Modify: `src/app/api/cotizador/cotizaciones/[id]/enviar-correo/route.ts`
- Modify: `src/lib/email.ts`

### 10.1 Frontend

- [ ] **Interfaz + estado para los contactos** — agregar `es_contacto_real: boolean` al tipo `crm_clientes` de la interfaz de cotización (línea 85-91), y un nuevo estado junto a los demás (buscar `const [cot, setCot]`):

```typescript
  interface ContactoEmpresa { id: string; nombre: string; apellido: string | null; email: string | null; telefono: string | null; telefono_indicativo: string | null }
  const [contactosEmpresa, setContactosEmpresa] = useState<ContactoEmpresa[]>([])
```

- [ ] **Guardar `contactos_empresa` al cargar** — en `cargarCotizacion()` (línea 322-325), agregar tras `setCot(d.cotizacion)`:

```typescript
          if (d.contactos_empresa) setContactosEmpresa(d.contactos_empresa)
```

- [ ] **`abrirModalCorreo` — precargar con el primer contacto que tenga correo** (línea 437-442):

```typescript
  function abrirModalCorreo() {
    const conCorreo = contactosEmpresa.find(c => c.email)
    setCorreoDestino(conCorreo?.email ?? cot?.crm_clientes?.email ?? '')
    setMensajeCorreo('')
    setGuardarCorreo(false)
    setModalCorreoAbierto(true)
  }
```

- [ ] **Selector de contactos en el modal (antes del input "Correo del cliente", línea 1775-1784)** — solo se muestra si hay contactos con correo:

```tsx
        {contactosEmpresa.filter(c => c.email).length > 0 && (
          <div className="mb-1">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Contactos de la empresa</label>
            <div className="flex flex-col gap-1.5">
              {contactosEmpresa.filter(c => c.email).map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCorreoDestino(c.email!)}
                  className={`text-left px-3 py-2 rounded-xl border text-sm transition-colors ${correoDestino === c.email ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'}`}
                >
                  <span className={`font-semibold ${tp}`}>{c.nombre} {c.apellido ?? ''}</span>
                  <span className={`ml-2 ${ts}`}>{c.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className={`text-xs font-semibold mb-1 block ${ts}`}>{contactosEmpresa.filter(c => c.email).length > 0 ? 'O escribe otro correo' : 'Correo del cliente'}</label>
          <input
            type="email"
            value={correoDestino}
            onChange={e => setCorreoDestino(e.target.value)}
            placeholder="cliente@correo.com"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-sm text-[var(--text-primary)]"
          />
        </div>
```

  (Esto reemplaza el bloque `<div>...</div>` de las líneas 1775-1784 — el `<label>`+`<input>` originales se conservan, solo con el texto del label condicional y el bloque de contactos agregado antes.)

- [ ] **`guardarCorreo` deshabilitado si no hay contacto seleccionado ni existente** — el checkbox actual (línea ~1796-1804) sigue igual; no requiere cambio porque `guardarCorreo` ya solo actualiza el contacto ancla (`cliente_id`) en el backend, que siempre existe.

### 10.2 Backend — `enviar-correo/route.ts`

- [ ] **Agregar `es_contacto_real` al select del cliente** (línea 42):

```typescript
      crm_clientes ( id, nombre, email, es_contacto_real ),
```

- [ ] **Pasar `null` en vez del nombre autocompletado cuando no hay contacto real** (línea 87):

```typescript
      cliente?.es_contacto_real ? (cliente.nombre ?? null) : null,
```

### 10.3 `src/lib/email.ts` — saludo neutro sin contacto real

- [ ] **Cambiar la firma y el saludo de `enviarPropuestaCotizacion`** (líneas 442-450 y 487):

```typescript
export async function enviarPropuestaCotizacion(
  to: string,
  nombreCliente: string | null,
  empresaNombre: string,
  codigoCotizacion: string,
  link: string,
  pdfBuffer: Buffer,
  mensajeAsesor?: string | null,
): Promise<void> {
```

  Y en la construcción del `html` (línea 484-491):

```typescript
  const html = emailPlantilla({
    preheader: `Tu propuesta de restauración de ${empresaNombre} ya está lista`,
    subtituloHeader: 'Tu propuesta está lista',
    saludo: nombreCliente ? `¡Hola, ${nombreCliente}!` : '¡Hola!',
    cuerpo: `${empresaNombre} preparó tu propuesta de restauración con el código <strong>${formatCodigoCotizacion(codigoCotizacion)}</strong>. Revisa los detalles en el enlace o abre el PDF que adjuntamos a este correo.`,
    contenidoCentral: bloqueMensaje + boton,
    mostrarAlerta: false,
  })
```

- [ ] **`npx tsc --noEmit` y `npx eslint`** sobre los 3 archivos.

- [ ] **Verificar en vivo**: cotización de una empresa con 2 contactos con correo → el modal muestra los 2 como opciones seleccionables antes del input libre. Cotización de una empresa SIN ningún contacto real → el modal solo muestra el input libre, y si se envía así, el correo dice "¡Hola!" (revisar el HTML renderizado, ej. con `scripts/preview-emails.mjs` si aplica, o inspeccionando el envío real en modo prueba).

---

## Task 11: Propuesta pública + PDF — no duplicar el nombre de la empresa como "contacto"

**Files:**
- Modify: `src/app/cot/[token]/vista-cot.tsx`
- Modify: `src/app/cot/[token]/propuesta-client.tsx`
- Modify: `src/app/cot/[token]/page.tsx`
- Modify: `src/lib/pdf/generar-pdf-cotizacion.ts`
- Modify: `src/lib/pdf/construir-pdf-cotizacion.ts`

### 11.1 `vista-cot.tsx`

- [ ] **Agregar `esContactoReal` a `Props`** (después de `clienteTipo?: 'persona' | 'empresa' | null` en la línea 32):

```typescript
  esContactoReal?: boolean
```

- [ ] **Destructurar** — en la firma de `VistaCot` (línea 87), agregar `esContactoReal = true,` junto a `clienteTipo`.

- [ ] **Cambiar la condición de `nombreContacto`** (línea 120):

```typescript
  const nombreContacto = esEmpresa && esContactoReal && clienteNombre ? `${clienteNombre} ${clienteApellido ?? ''}`.trim() : null
```

### 11.2 `propuesta-client.tsx`

- [ ] **Calcular `esContactoReal` y un nombre de saludo seguro** — después de la línea 279 (`const clienteNombre = ...`):

```typescript
  const esContactoReal = cotizacion.crm_clientes?.es_contacto_real ?? true
  const saludoNombre = esContactoReal ? clienteNombre : null
```

- [ ] **Usar `saludoNombre` en los 3 saludos**:
  - Línea 342: `const shareText = encodeURIComponent(\`Hola${saludoNombre ? ' ' + saludoNombre : ''}, aquí está tu propuesta de restauración: ${propuestaUrl}\`)`
  - Línea 349: `const mailtoUrl = \`mailto:?subject=${encodeURIComponent(\`Tu propuesta de ${empresaNombre}\`)}&body=${encodeURIComponent(\`Hola${saludoNombre ? ' ' + saludoNombre : ''}, aquí está tu propuesta de restauración: ${propuestaUrl}\`)}\``
  - Línea 629: `<h1 className={...}>{saludoNombre ? \`Hola ${saludoNombre},\` : 'Hola,'}</h1>`

- [ ] **Pasar `esContactoReal` a `VistaCot`** (junto a `clienteTipo={...}` en la línea 586):

```tsx
                esContactoReal={esContactoReal}
```

### 11.3 `src/app/cot/[token]/page.tsx` — agregar `es_contacto_real` al select

- [ ] **Ubicar el select de `crm_clientes`** (líneas 34-37 según la investigación previa) y agregar `es_contacto_real` a la lista de columnas, mismo patrón que en las Tasks 2/9.

### 11.4 PDF

- [ ] **`generar-pdf-cotizacion.ts`**: agregar `cliente_es_contacto_real?: boolean` a `DatosCotizacionPDF` (después de `cliente_tipo`, línea 24), y cambiar la línea 91:

```typescript
  const nombreContacto = esEmpresa && datos.cliente_es_contacto_real && datos.cliente_nombre ? `${datos.cliente_nombre} ${datos.cliente_apellido ?? ''}`.trim() : null
```

- [ ] **`construir-pdf-cotizacion.ts`**: agregar `es_contacto_real` al select de `crm_clientes` (línea 17), y pasar el campo al llamar `generarPDFCotizacion` (después de la línea 64, `cliente_tipo: ...`):

```typescript
    cliente_es_contacto_real: cliente?.es_contacto_real ?? true,
```

- [ ] **`npx tsc --noEmit` y `npx eslint`** sobre los 5 archivos.

- [ ] **Verificar en vivo**: abrir la propuesta pública (`/cot/[token]`) de una cotización sin contacto real → el saludo dice "Hola," (sin nombre de empresa repetido) y la vista "lista" no muestra una segunda línea de "contacto" bajo la razón social. Descargar el PDF de esa misma cotización → mismo resultado, sin línea de contacto duplicada. Repetir con una cotización que SÍ tiene un contacto real → sigue mostrando su nombre normalmente en los 2 lugares.

---

## Verificación final (todo el flujo junto)

- [ ] `npx tsc --noEmit` limpio en todo el proyecto.
- [ ] `npx eslint src/app/api/cotizador src/app/\(empresa\)/empresa/cotizador src/app/\(empresa\)/empresa/clientes src/app/cot src/lib/email.ts src/lib/pdf` limpio.
- [ ] Reinicio limpio de PM2 (`pm2 stop reuso && rm -rf .next && pm2 flush && pm2 restart reuso --update-env`), confirmar `200` en `/login`.
- [ ] Flujo completo con Playwright y un usuario efímero `empresa_admin` (patrón de toda la sesión, limpiar al final):
  1. Nueva cotización → Empresa (B2B) → solo NIT + razón social, 0 contactos → guardar → cotización creada.
  2. Nueva cotización → Empresa (B2B) → mismo NIT, esta vez con 2 contactos con celular y correo → guardar → confirmar en Supabase que existen 2 filas `crm_clientes` con el mismo `empresa_cliente_id`, ambas `es_contacto_real: true`.
  3. Buscar esa empresa por el nombre de uno de los 2 contactos → aparece agrupada bajo la empresa.
  4. Convertir uno de esos 2 contactos en cliente B2C → confirmar que queda un cliente `tipo: persona` nuevo con `duplicado_de_id` apuntando al original, y que la base de datos sigue bloqueando un tercer registro sin relación con ese mismo teléfono.
  5. Abrir la cotización de la empresa con 0 contactos → "Enviar propuesta" solo muestra el input libre. Abrir la cotización con 2 contactos → el modal muestra los 2 como opciones.
  6. `/empresa/clientes` → la empresa con 0 contactos no muestra ninguna "persona vinculada"; la de 2 contactos muestra ambos.
  7. `/empresa/clientes/[id]` de la empresa sin contactos → "Empresa cliente" aparece primero, "Este contacto (opcional)" vacío debajo, botón "Agregar contacto" visible.
  8. Descargar el PDF y abrir la propuesta pública de la cotización sin contacto real → sin saludo raro, sin línea de contacto duplicada.
- [ ] Limpiar todos los scripts `__*.mjs` temporales usados para verificar.
