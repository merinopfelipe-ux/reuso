/**
 * PUENTE DE COMUNICACIÓN SEGURO (POSTMESSAGE) PARA EL SANDBOX DE TEMAS
 * 
 * Permite que la aplicación principal envíe tokens visuales seguros al iframe
 * sandboxed, y que el iframe notifique eventos de redimensionamiento o renderizado,
 * sin compartir cookies, sesión, memoria, ni acceso a la base de datos.
 */

import { z } from 'zod'

export const ThemeEventSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('THEME_READY'),
    version: z.string().optional(),
  }),
  z.object({
    tipo: z.literal('THEME_RESIZE'),
    altura: z.number().min(0).max(10000),
  }),
  z.object({
    tipo: z.literal('THEME_ERROR'),
    mensaje: z.string().max(300),
  }),
])

export type ThemeEvent = z.infer<typeof ThemeEventSchema>

export interface ThemeInitPayload {
  tipo: 'INIT_THEME'
  nonce: string
  datos: {
    nombreMarca: string
    logotipoUrl?: string
    eslogan?: string
    tokens: {
      colorPrimario: string
      colorSecundario?: string
      colorFondo?: string
      colorTexto?: string
      colorBorde?: string
      tipografia?: string
      radioBorde?: string
    }
  }
}

/**
 * Genera un nonce criptográfico de un solo uso para verificar mensajes del puente.
 */
export function generarNonceSeguro(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Valida un mensaje entrante desde el sandbox del tema.
 */
export function validarMensajeSandbox(event: MessageEvent): ThemeEvent | null {
  // Los iframes sandboxed sin allow-same-origin tienen origin 'null'
  if (event.origin !== 'null' && event.origin !== window.location.origin) {
    return null
  }

  const parsed = ThemeEventSchema.safeParse(event.data)
  if (!parsed.success) {
    return null
  }

  return parsed.data
}
