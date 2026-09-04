// ─── Constantes de contacto ──────────────────────────────────────────────────
// WA_NUMBER es el respaldo si /admin/contenido (pestaña WhatsApp,
// contenido_landing clave 'whatsapp') no responde — el número real y
// editable vive ahí, no aquí. Ver auditoría de la landing 2026-09-03.
export const WA_NUMBER = '573147265212'

export const WA_MENSAJE_DEFAULT = 'Hola, quiero más información sobre la Calculadora de Reúso.'

export function waLink(mensaje: string = WA_MENSAJE_DEFAULT, numero: string = WA_NUMBER): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
