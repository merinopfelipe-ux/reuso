import { INDICATIVOS } from '@/lib/constants/indicativos'

export function parseE164(texto: string | null | undefined): { e164: string; indicativo: string; numero: string } | null {
  if (!texto) return null
  const limpio = texto.trim()
  if (!/^\+[1-9]\d{7,14}$/.test(limpio)) return null
  const indicativo = INDICATIVOS.find(i => limpio.startsWith(i) && limpio.length - i.length >= 7)
  if (!indicativo) return null
  return { e164: limpio, indicativo, numero: limpio.slice(indicativo.length) }
}
