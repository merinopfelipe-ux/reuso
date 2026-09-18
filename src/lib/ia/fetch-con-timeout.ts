// Sin timeout, un proveedor de IA degradado deja la petición de Next.js
// colgada hasta el límite del servidor, congelando la interfaz del usuario.
// Envoltorio mínimo de fetch + AbortController, compartido por los archivos
// de src/lib/ia/ y las rutas que llaman directo a Gemini/OpenRouter/Perplexity.
export async function fetchConTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}
