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

async function llamar(metodo: 'GET' | 'POST', ruta: string, cuerpo?: unknown): Promise<Record<string, unknown>> {
  const { base, token } = configuracion()
  const res = await fetchConTimeout(
    `${base}${ruta}`,
    {
      method: metodo,
      headers: { 'Content-Type': 'application/json', api_access_token: token },
      ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
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
  const r = await llamar('POST', '/platform/api/v1/accounts', { name: nombre })
  return idDe(r, 'crear cuenta')
}

// Usuario para el administrador de la empresa. Si el correo ya existe en
// Chatwoot, Chatwoot devuelve ese mismo usuario.
//
// La contraseña es aleatoria: Chatwoot exige una para crear el usuario, pero
// nadie la conoce ni se guarda. La persona no la necesita: entra con el enlace
// de acceso directo (ver enlaceDeAcceso).
export async function crearUsuarioChat(datos: { nombre: string; email: string }): Promise<number> {
  const contrasenaTemporal = randomBytes(24).toString('base64url') + 'Aa1!'
  const r = await llamar('POST', '/platform/api/v1/users', {
    name: datos.nombre,
    email: datos.email,
    password: contrasenaTemporal,
  })
  return idDe(r, 'crear usuario')
}

// Agrega al usuario a la cuenta como administrador.
export async function agregarAdministrador(cuentaId: number, usuarioId: number): Promise<void> {
  await llamar('POST', `/platform/api/v1/accounts/${cuentaId}/account_users`, {
    user_id: usuarioId,
    role: 'administrator',
  })
}

// Enlace de acceso directo de un solo uso: abre Chatwoot con la sesión ya
// iniciada, sin pedir contraseña. Se genera en el momento del clic y la persona
// es redirigida de inmediato, el enlace nunca se muestra ni se guarda.
export async function enlaceDeAcceso(usuarioId: number): Promise<string> {
  const { base } = configuracion()
  const r = await llamar('GET', `/platform/api/v1/users/${usuarioId}/login`)
  const url = r.url
  if (typeof url !== 'string') throw new ChatwootError('Respuesta sin enlace de acceso')
  // El enlace debe apuntar a la misma Chatwoot. Si no, algo está mal configurado.
  if (new URL(url).origin !== new URL(base).origin) throw new ChatwootError('El enlace de acceso apunta a otro sitio')
  return url
}
