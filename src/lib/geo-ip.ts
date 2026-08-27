// Ubicación aproximada por IP, vía ipapi.co (gratis, sin API key, 1.000
// consultas/mes). Nunca es la ubicación exacta, solo la que reporta el
// proveedor de internet del cliente — y puede fallar o agotarse el límite
// mensual, así que esto SIEMPRE debe tratarse como "mejor esfuerzo": si
// falla, la apertura se sigue guardando igual, solo sin ciudad/país.

const IPS_PRIVADAS = /^(127\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|::1|localhost)/i

interface Ubicacion {
  ciudad: string | null
  pais: string | null
}

export async function buscarUbicacionPorIp(ip: string): Promise<Ubicacion> {
  if (!ip || ip === 'unknown' || IPS_PRIVADAS.test(ip)) {
    return { ciudad: null, pais: null }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: controller.signal })
    if (!res.ok) return { ciudad: null, pais: null }
    const data = await res.json()
    if (data.error) return { ciudad: null, pais: null }
    return {
      ciudad: typeof data.city === 'string' ? data.city : null,
      pais: typeof data.country_name === 'string' ? data.country_name : null,
    }
  } catch {
    // Timeout, proveedor caído o límite mensual agotado — no bloquea la carga de la propuesta.
    return { ciudad: null, pais: null }
  } finally {
    clearTimeout(timeout)
  }
}
