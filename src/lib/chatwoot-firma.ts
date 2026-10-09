import crypto from 'crypto'

const TOLERANCIA_SEG = 300

export function verificarFirmaChatwoot({
  cuerpo,
  timestamp,
  firma,
  secreto,
  ahoraSeg = Math.floor(Date.now() / 1000),
}: {
  cuerpo: string
  timestamp: string
  firma: string
  secreto: string
  ahoraSeg?: number
}): boolean {
  if (!timestamp || !firma || !secreto) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(ahoraSeg - ts) > TOLERANCIA_SEG) return false
  const esperada = `sha256=${crypto.createHmac('sha256', secreto).update(`${timestamp}.${cuerpo}`).digest('hex')}`
  const a = Buffer.from(esperada)
  const b = Buffer.from(firma)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
