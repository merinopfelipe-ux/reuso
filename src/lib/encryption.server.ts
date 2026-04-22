import 'server-only'
import crypto from 'crypto'
import { getSecret } from './infisical.server'

// El algoritmo industrial
const ALGORITHM = 'aes-256-gcm'

// Caching local del encryption key extraído una sola vez de la bóveda
let ENCRYPTION_KEY: Buffer | null = null

async function getEncryptionBuffer() {
  if (ENCRYPTION_KEY) return ENCRYPTION_KEY
  // Intentamos primero la variable del entorno en caso de desarrollo, luego bóveda
  let hexString = process.env.INFISICAL_ENCRYPTION_KEY || process.env.APP_DATA_ENCRYPTION_KEY
  
  if (!hexString) {
    hexString = await getSecret('APP_DATA_ENCRYPTION_KEY')
  }

  // Debemos asegurar que el buffer es de 32 bytes exactamente.
  if (!hexString || hexString.length < 32) {
    console.warn("ADVERTENCIA DE SEGURIDAD: APP_DATA_ENCRYPTION_KEY es nula o menor de 32 caracteres. Usando llave de emergencia in-memory (sólo para que la app no colapse).")
    hexString = "emergency-32-chars-long-fallback"
  }
  
  ENCRYPTION_KEY = Buffer.from(hexString.slice(0, 32), 'utf-8')
  return ENCRYPTION_KEY
}

export async function encryptSensitive(text: string | null | undefined): Promise<string | null> {
  if (!text) return null
  
  const keyBuffer = await getEncryptionBuffer()
  const iv = crypto.randomBytes(12) // Initialization vector recomendado para GCM
  
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag().toString('hex')
  
  // Guardamos un payload codificado con el formato: iv:authTag:encrypted_str
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export async function decryptSensitive(encryptedPayload: string | null | undefined): Promise<string | null> {
  if (!encryptedPayload) return null
  
  // Si no tiene el formato estándar nuestro, devolvemos el original (seguro transicional)
  const parts = encryptedPayload.split(':')
  if (parts.length !== 3) return encryptedPayload
  
  try {
    const keyBuffer = await getEncryptionBuffer()
    const [ivHex, authTagHex, encryptedHex] = parts
    
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error("Fallo Criptográfico: No se pudo descifrar cadena. Llave probablemente corrompida o cambiada.")
    return encryptedPayload // En caso extremo de no poder abrir, retornar el cifrado para análisis visual
  }
}
