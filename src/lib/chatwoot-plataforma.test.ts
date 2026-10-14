import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  crearCuentaChat,
  crearUsuarioChat,
  agregarAdministrador,
  pedirRestablecer,
  ChatwootError,
} from './chatwoot-plataforma'

type Llamada = { url: string; init: RequestInit }

function respuesta(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })
}

describe('cliente de plataforma de Chatwoot', () => {
  let llamadas: Llamada[]

  beforeEach(() => {
    llamadas = []
    process.env.CHATWOOT_PLATFORM_TOKEN = 'token-de-prueba'
    process.env.NEXT_PUBLIC_CHATWOOT_URL = 'https://chat.ejemplo.test/'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CHATWOOT_PLATFORM_TOKEN
    delete process.env.NEXT_PUBLIC_CHATWOOT_URL
  })

  function simular(respuestas: Response[]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        llamadas.push({ url, init })
        return respuestas.shift() ?? respuesta({}, 500)
      })
    )
  }

  it('crea la cuenta con el token de la aplicación y devuelve su id', async () => {
    simular([respuesta({ id: 42, name: 'Lurdes' })])
    const id = await crearCuentaChat('Lurdes')
    expect(id).toBe(42)
    expect(llamadas[0].url).toBe('https://chat.ejemplo.test/platform/api/v1/accounts')
    expect((llamadas[0].init.headers as Record<string, string>).api_access_token).toBe('token-de-prueba')
    expect(JSON.parse(String(llamadas[0].init.body))).toEqual({ name: 'Lurdes' })
  })

  it('crea el usuario con una contraseña aleatoria que nadie recibe', async () => {
    simular([respuesta({ id: 7 }), respuesta({ id: 7 })])
    const id = await crearUsuarioChat({ nombre: 'Ana Pérez', email: 'ana@ejemplo.test' })
    expect(id).toBe(7)
    const cuerpo = JSON.parse(String(llamadas[0].init.body))
    expect(cuerpo.email).toBe('ana@ejemplo.test')
    expect(cuerpo.password.length).toBeGreaterThanOrEqual(30)
  })

  it('agrega al administrador con rol administrador', async () => {
    simular([respuesta({ id: 1 })])
    await agregarAdministrador(42, 7)
    expect(llamadas[0].url).toBe('https://chat.ejemplo.test/platform/api/v1/accounts/42/account_users')
    expect(JSON.parse(String(llamadas[0].init.body))).toEqual({ user_id: 7, role: 'administrator' })
  })

  it('pide el correo de restablecer contraseña sin token de plataforma', async () => {
    simular([respuesta({ message: 'ok' })])
    await pedirRestablecer('ana@ejemplo.test')
    expect(llamadas[0].url).toBe('https://chat.ejemplo.test/auth/password')
    expect(JSON.parse(String(llamadas[0].init.body))).toEqual({ email: 'ana@ejemplo.test' })
  })

  it('si Chatwoot responde error, lanza ChatwootError', async () => {
    simular([respuesta({ error: 'no' }, 401)])
    await expect(crearCuentaChat('X')).rejects.toBeInstanceOf(ChatwootError)
  })

  it('sin token configurado no llama a Chatwoot', async () => {
    delete process.env.CHATWOOT_PLATFORM_TOKEN
    simular([])
    await expect(crearCuentaChat('X')).rejects.toThrow('CHATWOOT_PLATFORM_TOKEN')
    expect(llamadas).toHaveLength(0)
  })
})
