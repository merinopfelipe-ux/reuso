import { test, expect } from '@playwright/test'

test.describe('empresa_admin', () => {
  test.use({ storageState: 'playwright/.auth/empresa-admin.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/empresa')
  })

  test('01 — login aterriza en /empresa con KPI visible', async ({ page }) => {
    await expect(page).toHaveURL(/\/empresa/)
    await expect(page.locator('text=/CO₂|impacto|equipo/i').first()).toBeVisible({ timeout: 10_000 })
  })

  test('02 — cálculo persiste en /empresa/calculos tras recargar', async ({ page }) => {
    const boton = page.locator('button').filter({ hasText: /Ropa y Textiles|Muebles/i }).first()
    await expect(boton).toBeVisible({ timeout: 10_000 })
    await boton.click()
    const input = page.locator('input[type="number"]').first()
    await input.click({ clickCount: 3 })
    await page.keyboard.type('5')
    await page.locator('button:has-text("Guardar cálculo")').click()
    await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })

    await page.goto('/empresa/calculos')
    await page.waitForLoadState('load')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  })

  test('03 — certificado generado es verificable en /verificar', async ({ page }) => {
    const botonCert = page.locator('button:has-text("Generar certificado")').first()
    await expect(botonCert).toBeVisible({ timeout: 10_000 })

    const responsePromise = page.waitForResponse('/api/certificados/generar', { timeout: 50_000 })
    await botonCert.click()
    const response = await responsePromise
    const data = await response.json() as { codigo_verificacion?: string }
    expect(data.codigo_verificacion).toBeTruthy()
    const uuid = data.codigo_verificacion!
    const codigo = `RCO2-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`

    await page.goto(`/verificar/${codigo}`)
    await page.waitForLoadState('load')
    await expect(page.getByText(codigo)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/kilogramos CO₂-eq/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test('04 — informe generado con fechas es verificable en /verificar', async ({ page }) => {
    const botonInforme = page.locator('button:has-text("Generar informe")').first()
    await expect(botonInforme).toBeVisible({ timeout: 10_000 })
    await botonInforme.click()
    await expect(page.getByText('Elige el período a incluir')).toBeVisible({ timeout: 8_000 })
    const modal = page.locator('[style*="z-index: 51"]').first()
    await modal.locator('input[type="date"]').first().fill('2024-01-01')
    await modal.locator('input[type="date"]').last().fill('2024-12-31')

    const responsePromise = page.waitForResponse('/api/certificados/generar', { timeout: 50_000 })
    await page.locator('button:has-text("Generar informe")').last().click()
    const response = await responsePromise
    const data = await response.json() as { codigo_verificacion?: string }
    expect(data.codigo_verificacion).toBeTruthy()
    const uuid = data.codigo_verificacion!
    const codigo = `RCO2-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`

    await page.goto(`/verificar/${codigo}`)
    await page.waitForLoadState('load')
    await expect(page.getByText(/Informe de Impacto/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('05 — invitación persiste en lista de equipo', async ({ page }) => {
    await page.goto('/empresa/equipo')
    await page.waitForLoadState('load')
    await page.locator('button:has-text("Invitar")').click()
    const emailInvitado = `e2e-invitado-${Date.now()}@ejemplo.com`
    await page.locator('input[type="email"]').fill(emailInvitado)
    await page.locator('select').selectOption('empleado')
    await page.locator('button:has-text("Generar invitación")').click()
    await expect(page.getByText(/copiar|copiado/i)).toBeVisible({ timeout: 15_000 })

    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByText(emailInvitado)).toBeVisible({ timeout: 10_000 })
  })

  test('06 — nombre de empresa persiste tras guardar y recargar', async ({ page }) => {
    await page.goto('/empresa/configuracion')
    await page.waitForLoadState('load')
    const inputNombre = page.locator('input[name="nombre"]')
    await expect(inputNombre).toBeVisible({ timeout: 10_000 })
    const nombreOriginal = await inputNombre.inputValue()

    const nombreTest = `Empresa Test ${Date.now()}`
    await inputNombre.click({ clickCount: 3 })
    await page.keyboard.type(nombreTest)
    await page.locator('button:has-text("Guardar cambios")').click()
    await expect(page.getByText(/guardado|éxito/i)).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await page.waitForLoadState('load')
    const inputDespues = page.locator('input[name="nombre"]')
    await expect(inputDespues).toHaveValue(nombreTest, { timeout: 8_000 })

    await inputDespues.click({ clickCount: 3 })
    await page.keyboard.type(nombreOriginal)
    await page.locator('button:has-text("Guardar cambios")').click()
  })

  test('07 — meta persiste tras crear y desaparece tras eliminar', async ({ page }) => {
    await page.goto('/empresa')
    await page.waitForLoadState('load')

    const tituloMeta = `Meta E2E ${Date.now()}`
    await page.locator('button:has-text("Crear Meta")').click()
    await page.getByPlaceholder(/título|meta|reducción/i).fill(tituloMeta)
    await page.locator('select').first().selectOption('co2_kg')
    await page.getByPlaceholder(/500|objetivo|numeral/i).fill('100')
    const hoy = new Date().toISOString().slice(0, 10)
    const fin = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10)
    await page.locator('input[type="date"]').first().fill(hoy)
    await page.locator('input[type="date"]').nth(1).fill(fin)
    await page.locator('button[type="submit"]').filter({ hasText: /^Guardar$/ }).click()

    await expect(page.getByText(tituloMeta)).toBeVisible({ timeout: 10_000 })
    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByText(tituloMeta)).toBeVisible({ timeout: 10_000 })

    page.on('dialog', d => d.accept())
    await page.locator('h4').filter({ hasText: tituloMeta })
      .locator('xpath=../../../button')
      .click()
    await expect(page.getByText(tituloMeta)).not.toBeVisible({ timeout: 10_000 })
    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByText(tituloMeta)).not.toBeVisible()
  })

  test('08 — reportes muestran datos numéricos reales', async ({ page }) => {
    await page.goto('/empresa/reportes')
    await page.waitForLoadState('load')
    await expect(page.locator('text=/\\d+\\.\\d+|\\d+ kg/').first()).toBeVisible({ timeout: 15_000 })
  })

  test('09 — /admin bloqueado para empresa_admin', async ({ page }) => {
    await page.goto('/admin/empresas')
    await page.waitForURL(/(?!.*\/admin)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/admin/)
  })

  test('10 — API admin rechaza a empresa_admin con 401 o 403', async ({ page }) => {
    const res = await page.request.patch('/api/admin/empresas/00000000-0000-0000-0000-000000000000', {
      data: { plan: 'ilimitado' },
    })
    expect([401, 403]).toContain(res.status())
  })
})
