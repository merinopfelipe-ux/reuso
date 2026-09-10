// Sincronización de contactos con Loops.so (marketing / ciclo de vida).
//
// Reemplaza al viejo /admin/correos (eliminado 2026-09-06). Las campañas se
// arman en el panel de Loops; aquí solo mantenemos su lista de contactos al
// día: cada alta/cambio/baja de usuario hace un upsert o delete en Loops.
//
// Reglas:
//   - Si no hay LOOPS_API_KEY, todo es no-op (no rompe nada en local ni en
//     Preview sin la variable).
//   - Nunca lanza. Un fallo de Loops jamás debe tumbar un registro o un
//     borrado de cuenta. Se registra en consola y se sigue.
//   - Se llama con await desde los endpoints (en serverless, sin await no
//     corre), pero con un timeout corto para no colgar la respuesta.

const LOOPS_API = 'https://app.loops.so/api/v1'
const TIMEOUT_MS = 4000

function apiKey(): string | null {
  return process.env.LOOPS_API_KEY?.trim() || null
}

async function llamar(path: string, body: Record<string, unknown>): Promise<void> {
  const key = apiKey()
  if (!key) return

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${LOOPS_API}${path}`, {
      method: path.endsWith('/delete') ? 'POST' : 'PUT',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const detalle = await res.text().catch(() => '')
      console.error(`[loops] ${path} respondió ${res.status}: ${detalle.slice(0, 200)}`)
    }
  } catch (err) {
    console.error(`[loops] ${path} falló:`, err instanceof Error ? err.message : err)
  } finally {
    clearTimeout(t)
  }
}

export interface ContactoLoops {
  email: string
  firstName?: string | null
  lastName?: string | null
  /** De dónde salió el contacto: 'registro', 'invitacion', etc. */
  source?: string
  /** true solo si la persona marcó recibir novedades. */
  subscribed?: boolean
  /** Rol actual en la plataforma. */
  rol?: string
  /** Sector declarado en el registro. */
  sector?: string | null
  /** Nombre de la empresa, cuando aplica. */
  empresa?: string | null
}

/** Crea o actualiza el contacto en Loops. Upsert por email. */
export async function sincronizarContactoLoops(c: ContactoLoops): Promise<void> {
  const payload: Record<string, unknown> = { email: c.email }
  if (c.firstName) payload.firstName = c.firstName
  if (c.lastName) payload.lastName = c.lastName
  if (c.source) payload.source = c.source
  if (typeof c.subscribed === 'boolean') payload.subscribed = c.subscribed
  if (c.rol) payload.rol = c.rol
  if (c.sector) payload.sector = c.sector
  if (c.empresa) payload.empresa = c.empresa
  await llamar('/contacts/update', payload)
}

/** Borra el contacto de Loops (baja de cuenta, derecho al olvido). */
export async function eliminarContactoLoops(email: string): Promise<void> {
  await llamar('/contacts/delete', { email })
}
