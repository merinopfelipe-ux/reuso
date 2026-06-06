// ─── Constantes de contacto ──────────────────────────────────────────────────
export const WA_NUMBER = '573147265212'

export const WA_MENSAJE_DEFAULT = 'Hola, quiero más información sobre la Calculadora de Reúso.'

export function waLink(mensaje: string = WA_MENSAJE_DEFAULT): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(mensaje)}`
}
