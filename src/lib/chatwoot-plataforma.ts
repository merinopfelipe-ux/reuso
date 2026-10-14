// Cliente de la API de plataforma de Chatwoot: crea el chat de cada empresa.
// Solo se usa desde el servidor (el token nunca va al navegador).
//
// Requiere en el servidor:
//   CHATWOOT_PLATFORM_TOKEN   token de una "Platform App" creada en el super admin de Chatwoot.
//   NEXT_PUBLIC_CHATWOOT_URL  dirección de Chatwoot (opcional, por defecto la de la calculadora).

import { randomBytes } from 'crypto'
import { fetchConTimeout } from '@/lib/ia/fetch-con-timeout'

const TIMEOUT_MS = 10_000

export class ChatwootError extends Error {}

function configuracion(): { base: string; token: string } {
  const token = process.env.CHATWOOT_PLATFORM_TOKEN
  if (!token) throw new ChatwootError('Falta CHATWOOT_PLATFORM_TOKEN')
  const base = (process.env.NEXT_PUBLIC_CHATWOOT_URL ?? 'https://chat.calculadoradereuso.com').replace(/\/$/, '')
  return { base, token }
}

async function enviar(ruta: string, cuerpo: unknown): Promise<Record<string, unknown>> {
  const { base, token } = configuracion()
  const res = await fetchConTimeout(
    `${base}${ruta}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', api_access_token: token },
      body: JSON.stringify(cuerpo),
    },
    TIMEOUT_MS
  )
  if (!res.ok) throw new ChatwootError(`Chatwoot respondió ${res.status} en ${ruta}`)
  return (await res.json()) as Record<string, unknown>
}

function idDe(respuesta: Record<string, unknown>, contexto: string): number {
  const id = respuesta.id
  if (typeof id !== 'number') throw new ChatwootError(`Respuesta sin id en ${contexto}`)
  return id
}

// Cuenta nueva para la empresa. Devuelve su id.
export async function crearCuentaChat(nombre: string): Promise<number> {
  const r = await enviar('/platform/api/v1/accounts', { name: nombre })
  return idDe(r, 'crear cuenta')
}

// Usuario para el administrador de la empresa. Si el correo ya existe en
// Chatwoot, Chatwoot devuelve ese mismo usuario.
//
// La contraseña es aleatoria: Chatwoot exige una para crear el usuario, pero
// nadie la conoce ni se guarda. La persona fija la suya con el correo de
// "restablecer contraseña" (ver pedirRestablecer).
export async function crearUsuarioChat(datos: { nombre: string; email: string }): Promise<number> {
  const contrasenaTemporal = randomBytes(24).toString('base64url') + 'Aa1!'
  const r = await enviar('/platform/api/v1/users', {
    name: datos.nombre,
    email: datos.email,
    password: contrasenaTemporal,
  })
  return idDe(r, 'crear usuario')
}

// Agrega al usuario a la cuenta como administrador.
export async function agregarAdministrador(cuentaId: number, usuarioId: number): Promise<void> {
  await enviar(`/platform/api/v1/accounts/${cuentaId}/account_users`, {
    user_id: usuarioId,
    role: 'administrator',
  })
}

// Envía el correo de "restablecer contraseña" de Chatwoot. Es el mismo correo
// que sale desde la pantalla de inicio de sesión: la persona elige su contraseña.
export async function pedirRestablecer(email: string): Promise<void> {
  const { base } = configuracion()
  const res = await fetchConTimeout(
    `${base}/auth/password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
    TIMEOUT_MS
  )
  if (!res.ok) throw new ChatwootError(`Chatwoot respondió ${res.status} al pedir restablecer`)
}
