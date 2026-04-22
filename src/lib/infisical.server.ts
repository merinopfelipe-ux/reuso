import 'server-only'
import { InfisicalSDK } from '@infisical/sdk'

/**
 * Cliente global de Infisical.
 * Solo puede ser llamado desde componentes o rutas de servidor (server/api).
 */
export const infisical = new InfisicalSDK()

// Variables de caché para evitar múltiples auth requests si la lambda es reutilizada
let isAuthenticated = false

export async function getSecret(keyName: string): Promise<string> {
  // 1. Verificamos si estamos en desarrollo para usar .env local en caso de que alguien levante el proyecto sin cloud
  if (process.env.NODE_ENV === 'development' && process.env[keyName]) {
    return process.env[keyName] as string
  }

  const token = process.env.INFISICAL_TOKEN
  if (!token) {
    if (process.env[keyName]) return process.env[keyName] as string
    throw new Error('No se encontró INFISICAL_TOKEN y la llave original no está en el entorno público.')
  }

  // 2. Nos autenticamos solo si no lo hemos hecho en esta instancia en memoria
  if (!isAuthenticated) {
    // Intentamos autenticar con el token. Si es un Machine Identity se usa universalAuth, si es Service Token a veces basta en el constructor, 
    // pero aquí simplemente dejamos que falle suavemente si el token no es universalAuth, y usamos el fallback de entorno por si acaso.
    try {
      await infisical.auth().universalAuth.login({
        clientId: process.env.INFISICAL_CLIENT_ID || 'reuso_machine',
        clientSecret: token
      })
    } catch(e) {
      // Ignorar, asume que el token puede auto-autenticarse o es inválido
    }
    isAuthenticated = true
  }

  // 3. Descargamos la llave en memoria
  try {
    const secrectObj = await infisical.secrets().getSecret({
      secretName: keyName,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
      path: '/'
    })
    return secrectObj.secretValue
  } catch (error) {
    console.error(`Error de Bóveda: No se encontró la llave ${keyName}. Revisando fallbacks locales...`)
    return process.env[keyName] || ''
  }
}
