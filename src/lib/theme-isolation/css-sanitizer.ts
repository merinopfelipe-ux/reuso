/**
 * SANITIZADOR Y BLINDAJE DE CSS PARA TEMAS DE TERCEROS
 * 
 * Previene ataques de:
 * 1. CSS Data Exfiltration (keyloggers vía selectores de atributos y background: url(...))
 * 2. Carga de estilos remotos no autorizados (@import)
 * 3. Ejecución de código vía CSS (expression(), -moz-binding, javascript:)
 */

const ALLOWED_IMAGE_HOSTS = [
  'images.unsplash.com',
  'supabase.co',
]

/**
 * Verifica si una URL embebida en CSS (vía url(...)) es segura.
 */
function isSafeCssUrl(urlStr: string): boolean {
  const clean = urlStr.replace(/['"]/g, '').trim()
  if (!clean) return false

  // Bloquea esquemas peligrosos
  const lower = clean.toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
    return false
  }

  // Permitir datos de imagen seguros en base64
  if (lower.startsWith('data:image/')) return true

  // Permitir URLs relativas seguras
  if (clean.startsWith('/') && !clean.startsWith('//')) return true

  // Si es absoluta https, validar contra orígenes permitidos
  try {
    const parsed = new URL(clean)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_IMAGE_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

/**
 * Sanitiza una hoja de estilos o bloque CSS de terceros.
 */
export function sanitizeThemeCss(rawCss: string): string {
  if (typeof rawCss !== 'string') return ''

  let sanitized = rawCss

  // 1. Elimina comentarios para evitar trucos de evasión
  sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '')

  // 2. Elimina todas las reglas @import (evita cargar CSS malicioso externo)
  sanitized = sanitized.replace(/@import\s+[^;]+;/gi, '/* regla import externa bloqueada */')

  // 3. Elimina expresiones JavaScript en CSS (legacy IE expression())
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, 'none')

  // 4. Elimina bindings de Mozilla (-moz-binding) y behaviours de IE
  sanitized = sanitized.replace(/-moz-binding\s*:[^;]+;/gi, '')
  sanitized = sanitized.replace(/behavior\s*:[^;]+;/gi, '')

  // 5. Bloquea ataques de exfiltración por selectores de atributos en inputs:
  // Ej: input[value^="a"] { background: url(...) }
  // Elimina cualquier regla que intente espiar valores de campos o tokens
  sanitized = sanitized.replace(/\[\s*(value|data-|id|name|placeholder)\b[^\]]*\]/gi, '/* selector sensible bloqueado */')

  // 6. Sanitiza todas las declaraciones url(...)
  sanitized = sanitized.replace(/url\s*\(\s*([^)]+?)\s*\)/gi, (match, innerUrl) => {
    if (isSafeCssUrl(innerUrl)) {
      return match
    }
    return 'none /* url externa no autorizada bloqueada */'
  })

  return sanitized
}
