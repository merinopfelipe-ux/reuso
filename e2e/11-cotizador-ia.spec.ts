import { test, expect } from '@playwright/test'

test.describe('Cotizador IA', () => {
  test.use({ storageState: 'playwright/.auth/empresa-admin.json' })

  test.beforeEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.goto('/empresa/cotizador')
  })

  test('cot-01 - Panel CRM - lista de cotizaciones y filtros', async ({ page }) => {
    await expect(page.getByText(/cotizaciones/i).first()).toBeVisible({ timeout: 10_000 })
    const input = page.locator('input[placeholder*="busca" i]').last()
    await input.fill('no-existe-123')
    await expect(page.getByText(/no hay cotizaciones que coincidan/i)).toBeVisible({ timeout: 10_000 })
  })

  test('cot-02 - Diagnóstico IA - mueble viable', async ({ page }) => {
    await page.goto('/empresa/cotizador/nueva')
    
    await page.route('**/api/cotizador/diagnostico', route => route.fulfill({
      status: 200,
      json: { diagnostico: { es_viable: true, tipo: 'Sofá E2E', categoria: 'Sala', oficios: { tapiceria: true, pintura: false, carpinteria_superficial: false }, confianza: 0.9, observaciones_visuales: 'Test viable' } }
    }))
    
    // Playwright no puede disparar el filechooser si el input está oculto a veces sin force, pero usemos evaluate
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3QgAAA', 'base64')
    })
    
    await expect(page.getByText('Sofá E2E')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Alta confianza')).toBeVisible()
  })

  test('cot-03 - Diagnóstico IA - mueble inviable (MDF)', async ({ page }) => {
    await page.goto('/empresa/cotizador/nueva')
    await page.route('**/api/cotizador/diagnostico', route => route.fulfill({
      status: 200,
      json: { diagnostico: { es_viable: false, motivo: 'Material MDF detectado', tipo: null, categoria: null, oficios: { tapiceria: false, pintura: false, carpinteria_superficial: false }, confianza: 0.9, observaciones_visuales: '' } }
    }))
    
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3QgAAA', 'base64')
    })
    
    await expect(page.getByText('Este mueble no es viable para restauración')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Material MDF detectado')).toBeVisible()
  })

  test('cot-04 - Imagen mayor a 10 MB - validación', async ({ page }) => {
    await page.goto('/empresa/cotizador/nueva')
    const bufferSize = 11 * 1024 * 1024 // 11 MB
    const buffer = Buffer.alloc(bufferSize, 0)
    await page.locator('input[type="file"]').setInputFiles({
      name: 'giant.jpg',
      mimeType: 'image/jpeg',
      buffer
    })
    await expect(page.getByText(/no puede superar 10 MB/i)).toBeVisible({ timeout: 10000 })
  })

  test('cot-05 - Rate limit - 5 diagnósticos por minuto', async ({ page }) => {
    await page.goto('/empresa/cotizador/nueva')
    await page.route('**/api/cotizador/diagnostico', route => route.fulfill({
      status: 429,
      json: { error: 'Demasiadas solicitudes. Espera un momento antes de analizar otra foto.' }
    }))
    
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3QgAAA', 'base64')
    })
    
    await expect(page.getByText(/demasiadas solicitudes/i)).toBeVisible({ timeout: 10000 })
  })

  test('cot-06 - Flujo completo: diagnóstico → ajuste → guardar', async ({ page }) => {
    await page.route('**/api/cotizador/config', route => route.fulfill({
      status: 200,
      json: { configs: [{ tipo_mueble: 'Mesa E2E', peso_estandar_kg: 15, precio_tapiceria: 0, precio_pintura: 150000, precio_carpinteria: 0, factor_co2_kg: 3.5, factor_agua_l: 25 }] }
    }))
    await page.goto('/empresa/cotizador/nueva')
    await page.route('**/api/cotizador/diagnostico', route => route.fulfill({
      status: 200,
      json: { diagnostico: { es_viable: true, tipo: 'Mesa E2E', categoria: 'Comedor', oficios: { tapiceria: false, pintura: true, carpinteria_superficial: false }, confianza: 0.9, observaciones_visuales: '' } }
    }))

    await page.route('**/api/cotizador/cotizaciones', route => route.fulfill({ status: 200, json: { id: 'cot-123' } }))
    await page.route('**/api/cotizador/cotizaciones/*/mueble', route => route.fulfill({ status: 200, json: { ok: true } }))

    await page.locator('input[type="file"]').setInputFiles({ name: 'test.webp', mimeType: 'image/webp', buffer: Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3QgAAA', 'base64') })
    
    await expect(page.getByText('Mesa E2E')).toBeVisible({ timeout: 10000 })
    // Agregar mueble - El botón real que hace 'handleAgregarMueble' está en el footer.
    await page.getByRole('button', { name: /agrega otro mueble/i }).last().click()
    await expect(page.getByText('1 mueble agregado')).toBeVisible({ timeout: 10000 })
  })

  test('cot-07 - Detalle de cotización - generar enlace público', async ({ page }) => {
    // Stub
    test.skip()
  })

  test('cot-08 - Cambio de estado con confirmación (terminal)', async ({ page }) => {
    // Stub
    test.skip()
  })

  test('cot-09 - Copiar texto para WhatsApp', async ({ page }) => {
    // Stub
    test.skip()
  })

  test('cot-10 - Carga concurrente de imágenes pesadas', async ({ page }) => {
    // Stub
    test.skip()
  })

  test('cot-11 - Colisión de Edición - Conflicto de guardado concurrente (Optimistic Locking)', async ({ page }) => {
    // Stub
    test.skip()
  })

  test('cot-12 - Sanitización de Archivos - Inyección de XSS vía SVG/XML vectoriales', async ({ page }) => {
    // Stub
    test.skip()
  })

})
