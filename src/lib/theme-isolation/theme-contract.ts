/**
 * CONTRATO DE SEGURIDAD Y AISLAMIENTO DE DATOS PARA TEMAS DE TERCEROS
 * 
 * Regla inquebrantable de Mínimo Privilegio:
 * Ningún tema de terceros (componente, plantilla o script) debe recibir
 * acceso a entidades de la base de datos (usuarios, clientes CRM, perfiles,
 * cotizaciones, empresas, tokens o secretos).
 * 
 * Solo se permite el paso de tokens cosméticos y datos de vista seguros (SafeThemeProps).
 */

export interface SafeThemeTokens {
  colorPrimario: string
  colorSecundario?: string
  colorFondo?: string
  colorTexto?: string
  colorBorde?: string
  tipografia?: string
  radioBorde?: string
}

export interface SafeThemeViewData {
  nombreMarca: string
  logotipoUrl?: string
  eslogan?: string
  titulo?: string
  descripcion?: string
  tokens: SafeThemeTokens
  customCss?: string
}

/**
 * Lista negra de nombres de propiedades sensibles de base de datos
 * que NUNCA deben llegar a un tema de terceros.
 */
const PROHIBITED_KEYS = new Set([
  'id',
  'user_id',
  'empresa_id',
  'cliente_id',
  'asesor_id',
  'duplicado_de_id',
  'empresa_cliente_id',
  'email',
  'correo',
  'telefono',
  'telefonos_extra',
  'correos_extra',
  'identificacion',
  'nit',
  'password',
  'contrasena',
  'hash',
  'token',
  'secret',
  'key',
  'enlace_publico_token',
  'session',
  'cookie',
  'subtotal',
  'descuento',
  'total',
  'costo',
  'precio',
  'margen',
  'balance',
  'auth',
  'service_role',
  'admin',
  'crm_clientes',
  'profiles',
  'empresas',
  'crm_cotizaciones',
  'calculos',
])

/**
 * Valida si una cadena es un color CSS seguro (hex, rgb, rgba, hsl, hsla).
 */
export function isValidCssColor(val: string): boolean {
  if (typeof val !== 'string') return false
  const trimmed = val.trim()
  // Hex (#FFF o #FFFFFF o con alfa)
  if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return true
  // rgb/rgba
  if (/^rgba?\(\s*([0-9]{1,3}\s*,\s*){2}[0-9]{1,3}(\s*,\s*(0|1|0?\.[0-9]+))?\s*\)$/.test(trimmed)) return true
  // hsl/hsla
  if (/^hsla?\(\s*[0-9]{1,3}(\.[0-9]+)?(deg)?\s*,\s*[0-9]{1,3}%\s*,\s*[0-9]{1,3}%(\s*,\s*(0|1|0?\.[0-9]+))?\s*\)$/.test(trimmed)) return true
  // Nombres de color básicos permitidos
  const safeNames = ['transparent', 'currentColor', 'inherit']
  return safeNames.includes(trimmed.toLowerCase())
}

/**
 * Valida si una URL es segura para recursos cosméticos (logo, favicon).
 * Prohíbe javascript:, data: con contenido activo, vbscript:, etc.
 */
export function isSafeAssetUrl(url: string): boolean {
  if (typeof url !== 'string') return false
  const trimmed = url.trim().toLowerCase()
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:') || trimmed.startsWith('data:text/html')) {
    return false
  }
  // Permitir relativas seguras o https
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true
  if (trimmed.startsWith('https://')) return true
  if (trimmed.startsWith('data:image/')) return true
  return false
}

/**
 * Limpia y normaliza texto plano eliminando etiquetas HTML y secuencias de escape peligrosas.
 */
export function sanitizePlainText(text: unknown, maxLen = 300): string {
  if (typeof text !== 'string') return ''
  return text
    .replace(/<[^>]*>/g, '') // Elimina cualquier etiqueta HTML
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Elimina caracteres de control
    .trim()
    .slice(0, maxLen)
}

/**
 * Sanitiza profundamente un objeto para que sea 100% seguro de pasar a un tema de terceros.
 * Filtra cualquier columna o metadato de base de datos.
 */
export function sanitizeThemeData(raw: unknown): SafeThemeViewData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      nombreMarca: 'Calculadora de Reúso',
      tokens: { colorPrimario: '#474747' },
    }
  }

  const record = raw as Record<string, unknown>
  const tokensRaw = (record.tokens && typeof record.tokens === 'object' && !Array.isArray(record.tokens))
    ? (record.tokens as Record<string, unknown>)
    : {}

  const safeTokens: SafeThemeTokens = {
    colorPrimario: isValidCssColor(String(tokensRaw.colorPrimario ?? ''))
      ? String(tokensRaw.colorPrimario).trim()
      : '#474747',
    colorSecundario: isValidCssColor(String(tokensRaw.colorSecundario ?? ''))
      ? String(tokensRaw.colorSecundario).trim()
      : undefined,
    colorFondo: isValidCssColor(String(tokensRaw.colorFondo ?? ''))
      ? String(tokensRaw.colorFondo).trim()
      : undefined,
    colorTexto: isValidCssColor(String(tokensRaw.colorTexto ?? ''))
      ? String(tokensRaw.colorTexto).trim()
      : undefined,
    colorBorde: isValidCssColor(String(tokensRaw.colorBorde ?? ''))
      ? String(tokensRaw.colorBorde).trim()
      : undefined,
    tipografia: typeof tokensRaw.tipografia === 'string'
      ? sanitizePlainText(tokensRaw.tipografia, 50)
      : undefined,
    radioBorde: typeof tokensRaw.radioBorde === 'string' && /^[0-9]+(px|rem|em|%)?$/.test(tokensRaw.radioBorde.trim())
      ? tokensRaw.radioBorde.trim()
      : undefined,
  }

  const rawLogo = typeof record.logotipoUrl === 'string' ? record.logotipoUrl : undefined
  const safeLogo = rawLogo && isSafeAssetUrl(rawLogo) ? rawLogo.trim() : undefined

  const result: SafeThemeViewData = {
    nombreMarca: sanitizePlainText(record.nombreMarca ?? 'Calculadora de Reúso', 100),
    logotipoUrl: safeLogo,
    eslogan: typeof record.eslogan === 'string' ? sanitizePlainText(record.eslogan, 150) : undefined,
    titulo: typeof record.titulo === 'string' ? sanitizePlainText(record.titulo, 150) : undefined,
    descripcion: typeof record.descripcion === 'string' ? sanitizePlainText(record.descripcion, 400) : undefined,
    tokens: safeTokens,
  }

  return freezeThemeData(result)
}

/**
 * Congela profundamente un objeto para evitar contaminación de prototipos o mutaciones
 * en tiempo de ejecución por parte de librerías de terceros.
 */
export function freezeThemeData<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj
  Object.freeze(obj)
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key]
    if (val && typeof val === 'object' && !Object.isFrozen(val)) {
      freezeThemeData(val)
    }
  }
  return obj
}

/**
 * Barrera defensiva (Assertion Guard):
 * Verifica que un objeto que se va a enviar a un tema no contenga ninguna clave
 * de base de datos sensible. Lanza una excepción inmediata si detecta filtración.
 */
export function assertNoDatabaseLeak(obj: unknown, path = 'root'): void {
  if (!obj || typeof obj !== 'object') return

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => assertNoDatabaseLeak(item, `${path}[${idx}]`))
    return
  }

  const record = obj as Record<string, unknown>
  for (const [key, value] of Object.entries(record)) {
    const lowerKey = key.toLowerCase()
    if (PROHIBITED_KEYS.has(lowerKey)) {
      throw new Error(
        `[ThemeSecurityViolation] Intento de pasar campo protegido "${key}" a un tema en "${path}". Acceso a base de datos denegado.`
      )
    }
    if (value && typeof value === 'object') {
      assertNoDatabaseLeak(value, `${path}.${key}`)
    }
  }
}
