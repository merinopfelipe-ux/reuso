// Parser liviano de user-agent (sin librería externa) — solo necesitamos
// "dispositivo · navegador" en un string legible para la trazabilidad, no
// una detección exhaustiva. Cubre los casos reales que va a ver un vendedor:
// móvil (iOS/Android), escritorio (Windows/Mac/Linux) y los navegadores
// más comunes en Colombia.

function detectarDispositivo(ua: string): string {
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua)) return 'iPad'
  if (/android/i.test(ua)) return /mobile/i.test(ua) ? 'Android' : 'Tablet Android'
  if (/macintosh|mac os x/i.test(ua)) return 'Mac'
  if (/windows/i.test(ua)) return 'Windows'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Desconocido'
}

function detectarNavegador(ua: string): string {
  // Orden importa: Edge y Opera incluyen "Chrome" en su UA, hay que
  // descartarlos primero. Chrome incluye "Safari" en su UA, mismo caso.
  if (/edg\//i.test(ua)) return 'Edge'
  if (/opr\/|opera/i.test(ua)) return 'Opera'
  if (/firefox/i.test(ua)) return 'Firefox'
  if (/chrome/i.test(ua)) return 'Chrome'
  if (/safari/i.test(ua)) return 'Safari'
  return 'Desconocido'
}

export function formatDispositivo(userAgent: string | null): string {
  if (!userAgent) return 'Dispositivo desconocido'
  const dispositivo = detectarDispositivo(userAgent)
  const navegador = detectarNavegador(userAgent)
  if (dispositivo === 'Desconocido' && navegador === 'Desconocido') return 'Dispositivo desconocido'
  return `${dispositivo} · ${navegador}`
}
