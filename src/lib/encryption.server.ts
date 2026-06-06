import 'server-only'
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

let ENCRYPTION_KEY: Buffer | null = null

function getEncryptionBuffer() {
  if (ENCRYPTION_KEY) return ENCRYPTION_KEY
  const hexString = process.env.APP_DATA_ENCRYPTION_KEY

  if (!hexString || hexString.length < 32) {
    console.warn("ADVERTENCIA DE SEGURIDAD: APP_DATA_ENCRYPTION_KEY es nula o menor de 32 caracteres. Usando llave de emergencia in-memory (sólo para que la app no colapse).")
    ENCRYPTION_KEY = Buffer.from("emergency-32-chars-long-fallback", 'utf-8')
    return ENCRYPTION_KEY
  }

  ENCRYPTION_KEY = Buffer.from(hexString.slice(0, 32), 'utf-8')
  return ENCRYPTION_KEY
}

export async function encryptSensitive(text: string | null | undefined): Promise<string | null> {
  if (!text) return null

  const keyBuffer = getEncryptionBuffer()
  const iv = crypto.randomBytes(12)

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export async function decryptSensitive(encryptedPayload: string | null | undefined): Promise<string | null> {
  if (!encryptedPayload) return null

  const parts = encryptedPayload.split(':')
  if (parts.length !== 3) return encryptedPayload

  try {
    const keyBuffer = getEncryptionBuffer()
    const [ivHex, authTagHex, encryptedHex] = parts

    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch {
    console.error("Fallo Criptográfico: No se pudo descifrar cadena. Llave probablemente corrompida o cambiada.")
    return encryptedPayload
  }
}
