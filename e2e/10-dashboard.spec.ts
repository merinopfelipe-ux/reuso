import { test, expect, Page } from '@playwright/test'

async function seleccionarCategoriaYPeso(page: Page, peso = '2') {
  const boton = page.locator('button').filter({ hasText: /Ropa y Textiles|Muebles/i }).first()
  await expect(boton).toBeVisible({ timeout: 10_000 })
  await boton.click()
  const input = page.locator('input[type="number"]').first()
  await expect(input).toBeVisible({ timeout: 5_000 })
  await input.click({ clickCount: 3 })
  await page.keyboard.type(peso)
}

test.describe('usuario_libre', () => {
  test.use({ storageState: 'playwright/.auth/usuario-libre.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('load')
  })

  test('dash-01 - login aterriza en /dashboard con saludo', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/hola/i).first()).toBeVisible()
  })

  test('dash-02 - peso cero no habilita el botón guardar', async ({ page }) => {
    const boton = page.locator('button').filter({ hasText: /Ropa y Textiles|Muebles/i }).first()
    await expect(boton).toBeVisible({ timeout: 10_000 })
    await boton.click()
    const input = page.locator('input[type="number"]').first()
    await input.click({ clickCount: 3 })
    await page.keyboard.type('0')
    await expect(page.locator('button:has-text("Guardar cálculo")')).toBeDisabled({ timeout: 3_000 })
  })

  test('dash-03 - guardar cálculo persiste en historial tras recargar', async ({ page }) => {
    await seleccionarCategoriaYPeso(page, '2')
    const botonGuardar = page.locator('button:has-text("Guardar cálculo")')
    await expect(botonGuardar).toBeEnabled({ timeout: 5_000 })
    await botonGuardar.click()
    await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })

    await page.goto('/dashboard/historial')
    await page.waitForLoadState('load')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  })

  test('dash-04 - total CO₂ en tiempo real es mayor que cero', async ({ page }) => {
    await seleccionarCategoriaYPeso(page, '5')
    const totalCO2 = page.locator('text=/\\d+\\.\\d+ kg CO₂/').first()
    await expect(totalCO2).toBeVisible({ timeout: 5_000 })
    const texto = await totalCO2.textContent()
    const numero = parseFloat(texto?.match(/[\d.]+/)?.[0] ?? '0')
    expect(numero).toBeGreaterThan(0)
  })

  test('dash-05 - "Calcular más objetos" limpia el panel de resultado', async ({ page }) => {
    await seleccionarCategoriaYPeso(page, '2')
    await page.locator('button:has-text("Guardar cálculo")').click()
    await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })
    await page.getByText('Calcular más objetos').click()
    await expect(page.getByText('¡Cálculo guardado!')).not.toBeVisible({ timeout: 5_000 })
  })

  test('dash-06 - plan Explora bloquea certificados con mensaje exacto', async ({ page }) => {
    await page.goto('/dashboard/certificados')
    await page.waitForLoadState('load')
    await page.locator('button:has-text("Generar certificado")').click()
    await expect(
      page.getByText('El plan Explora no incluye generación de certificados. Contacta a reuso.lurdes.co para ampliar tu plan.')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('dash-07 - plan Explora bloquea informes con mensaje exacto', async ({ page }) => {
    await page.goto('/dashboard/certificados')
    await page.waitForLoadState('load')
    await page.locator('button:has-text("Generar informe")').click()
    const fechaInicio = page.locator('input[type="date"]').first()
    await expect(fechaInicio).toBeVisible({ timeout: 8_000 })
    await fechaInicio.fill('2024-01-01')
    await page.locator('input[type="date"]').nth(1).fill('2024-12-31')
    await page.locator('button:has-text("Generar informe")').last().click()
    await expect(
      page.getByText('El plan Explora no incluye generación de informes. Contacta a reuso.lurdes.co para ampliar tu plan.')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('dash-08 - historial de usuario_libre tiene máximo 15 filas', async ({ page }) => {
    await page.goto('/dashboard/historial')
    await page.waitForLoadState('load')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
    const filas = await page.locator('table tbody tr').count()
    expect(filas).toBeLessThanOrEqual(15)
  })

  test('dash-09 - modal informe abre con campos fecha y cierra correctamente', async ({ page }) => {
    await page.goto('/dashboard/certificados')
    await page.waitForLoadState('load')
    await page.locator('button:has-text("Generar informe")').click()
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 8_000 })
    await page.getByText('Cancelar').click()
    await expect(page.locator('input[type="date"]').first()).not.toBeVisible({ timeout: 5_000 })
  })

  test('dash-10 - ticket de soporte persiste tras recargar', async ({ page }) => {
    await page.goto('/dashboard/soporte')
    await page.waitForLoadState('load')
    const tituloUnico = `E2E soporte ${Date.now()}`
    await page.getByText(/crear ticket/i).click()
    await page.getByPlaceholder(/describa brevemente/i).fill(tituloUnico)
    await page.getByRole('combobox').first().selectOption('duda')
    await page.getByPlaceholder(/proporcione toda/i).fill('Descripción de prueba automatizada con suficientes caracteres.')
    await page.getByText('Enviar Ticket').click()
    await expect(page.getByPlaceholder(/describa brevemente/i)).not.toBeVisible({ timeout: 10_000 })

    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByText(tituloUnico)).toBeVisible({ timeout: 10_000 })
  })

  test('dash-11 - /empresa/nueva accesible para usuario_libre', async ({ page }) => {
    await page.goto('/empresa/nueva')
    await page.waitForLoadState('load')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('dash-12 - /admin bloqueado por URL directa', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/(?!.*\/admin)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/admin/)
  })

  test('dash-13 - API /api/calcular rechaza petición sin autenticación', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    const res = await page.request.post('/api/calcular', {
      data: { items: [{ id: '00000000-0000-0000-0000-000000000000', peso_kg: 1 }] },
    })
    expect(res.status()).toBe(401)
    await ctx.close()
  })

  test('dash-14 - logout invalida la sesión correctamente', async ({ page }) => {
    await page.request.post('/api/auth/logout')
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
