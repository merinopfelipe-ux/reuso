import { test, expect } from '@playwright/test'

test.describe('empleado', () => {
  test.use({ storageState: 'playwright/.auth/empleado.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('01 — login aterriza en /dashboard (no /empresa ni /admin)', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    expect(page.url()).not.toMatch(/\/empresa/)
    expect(page.url()).not.toMatch(/\/admin/)
  })

  test('02 — cálculo persiste en historial tras recargar', async ({ page }) => {
    const boton = page.locator('button').filter({ hasText: /Ropa y Textiles|Muebles/i }).first()
    await expect(boton).toBeVisible({ timeout: 10_000 })
    await boton.click()
    const input = page.locator('input[type="number"]').first()
    await input.click({ clickCount: 3 })
    await page.keyboard.type('3')
    await page.locator('button:has-text("Guardar cálculo")').click()
    await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })

    await page.goto('/dashboard/historial')
    await page.waitForLoadState('load')
    const primeraFila = page.locator('table tbody tr').first()
    await expect(primeraFila).toBeVisible({ timeout: 10_000 })
    const textoCO2 = await primeraFila.textContent()
    expect(textoCO2).toMatch(/\d+/)
  })

  test('03 — /empresa/equipo bloqueado por URL directa', async ({ page }) => {
    await page.goto('/empresa/equipo')
    await page.waitForURL(/(?!.*\/empresa)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/empresa/)
  })

  test('04 — /empresa/configuracion bloqueado por URL directa', async ({ page }) => {
    await page.goto('/empresa/configuracion')
    await page.waitForURL(/(?!.*\/empresa)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/empresa/)
  })

  test('05 — API de invitar rechaza a empleado con 401 o 403', async ({ page }) => {
    const res = await page.request.post('/api/empresa/invitar', {
      data: {
        email: 'intruso@ejemplo.com',
        rol_asignado: 'empleado',
        empresa_id: '00000000-0000-0000-0000-000000000000',
      },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('06 — /admin/empresas bloqueado por URL directa', async ({ page }) => {
    await page.goto('/admin/empresas')
    await page.waitForURL(/(?!.*\/admin)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/admin/)
  })

  test('07 — ticket de soporte persiste en lista tras recargar', async ({ page }) => {
    await page.goto('/dashboard/soporte')
    await page.waitForLoadState('load')
    const tituloUnico = `E2E empleado ${Date.now()}`
    await page.getByText(/crear ticket/i).click()
    await page.getByPlaceholder(/describa brevemente/i).fill(tituloUnico)
    await page.getByRole('combobox').first().selectOption('bug')
    await page.getByPlaceholder(/proporcione toda/i).fill('Reporte de error encontrado en el sistema por el empleado.')
    await page.getByText('Enviar Ticket').click()
    await expect(page.getByPlaceholder(/describa brevemente/i)).not.toBeVisible({ timeout: 10_000 })

    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByText(tituloUnico)).toBeVisible({ timeout: 10_000 })
  })

  test('08 — panel certificados carga con ambos botones visibles', async ({ page }) => {
    await page.goto('/dashboard/certificados')
    await page.waitForLoadState('load')
    await expect(page.locator('button:has-text("Generar certificado")')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('button:has-text("Generar informe")')).toBeVisible()
  })
})
