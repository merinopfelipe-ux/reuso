import { describe, it, expect } from 'vitest'
import DOMPurify from 'isomorphic-dompurify'
import { NOTA_SANITIZE_CONFIG } from './sanitize-notas'
import { parsearNotasLead, formatearFechaNota } from './notas-lead'

describe('Sanitización de notas WYSIWYG (NOTA_SANITIZE_CONFIG)', () => {
  it('permite etiquetas de formato inline (negrita, cursiva, subrayado, tachado)', () => {
    const html = '<b>Negrita</b> <i>Cursiva</i> <u>Subrayado</u> <s>Tachado</s> <del>Borrado</del>'
    const sanitized = DOMPurify.sanitize(html, NOTA_SANITIZE_CONFIG)
    expect(sanitized).toBe(html)
  })

  it('permite listas ordenadas, desordenadas e items', () => {
    const html = '<ul><li>Viñeta 1</li><li>Viñeta 2</li></ul><ol><li>Paso 1</li></ol>'
    const sanitized = DOMPurify.sanitize(html, NOTA_SANITIZE_CONFIG)
    expect(sanitized).toBe(html)
  })

  it('permite párrafos, saltos de línea y separadores horizontales (hr)', () => {
    const html = '<p>Párrafo uno</p><hr><p>Párrafo dos<br>línea extra</p>'
    const sanitized = DOMPurify.sanitize(html, NOTA_SANITIZE_CONFIG)
    expect(sanitized).toBe(html)
  })

  it('permite estilos de resaltado de marca con fondo y color', () => {
    const html = '<span style="background-color:#FBEEB8;color:#474747">Texto resaltado</span>'
    const sanitized = DOMPurify.sanitize(html, NOTA_SANITIZE_CONFIG)
    expect(sanitized).toContain('background-color:#FBEEB8')
    expect(sanitized).toContain('color:#474747')
  })

  it('permite hipervínculos con href válido', () => {
    const html = '<a href="https://reuso.co" target="_blank" rel="noopener noreferrer">Enlace seguro</a>'
    const sanitized = DOMPurify.sanitize(html, NOTA_SANITIZE_CONFIG)
    expect(sanitized).toContain('href="https://reuso.co"')
    expect(sanitized).toContain('Enlace seguro')
  })

  it('bloquea scripts maliciosos y eventos onerror / onclick', () => {
    const malicious = '<p>Hola</p><script>alert("hack")</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">Click</a>'
    const sanitized = DOMPurify.sanitize(malicious, NOTA_SANITIZE_CONFIG)
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).not.toContain('onerror')
    expect(sanitized).not.toContain('javascript:alert')
  })
})

describe('Gestión de notas de leads (notas-lead.ts)', () => {
  it('parsea array de notas con fechas, autor y fecha de edición', () => {
    const json = JSON.stringify([
      { id: '1', texto: 'Nota inicial', fecha: '2026-09-01T10:00:00Z', autor: 'Admin' },
      { id: '2', texto: 'Nota modificada', fecha: '2026-09-02T12:00:00Z', editadoEl: '2026-09-03T15:00:00Z' },
    ])
    const notas = parsearNotasLead(json)
    expect(notas).toHaveLength(2)
    expect(notas[0].autor).toBe('Admin')
    expect(notas[1].editadoEl).toBe('2026-09-03T15:00:00Z')
  })

  it('soporta formato legacy en texto plano convirtiéndolo a nota única', () => {
    const legacy = 'Llamada telefónica pendiente para mañana'
    const notas = parsearNotasLead(legacy)
    expect(notas).toHaveLength(1)
    expect(notas[0].id).toBe('legacy')
    expect(notas[0].texto).toBe(legacy)
  })

  it('formatea fechas colombianas de forma legible', () => {
    const formatted = formatearFechaNota('2026-10-08T14:30:00Z')
    expect(formatted.dia).toBeTruthy()
    expect(formatted.hora).toBeTruthy()
  })
})
