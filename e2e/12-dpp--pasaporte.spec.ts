import { test, expect } from '@playwright/test'

test.describe('DPP / Pasaporte', () => {
  test.use({ storageState: 'playwright/.auth/empresa-admin.json' })

  test('dpp-01 - Lista de activos DPP', async ({ page }) => {
    await page.goto('/empresa/dpp')
    await expect(page.getByText('Pasaportes Digitales').first()).toBeVisible()
    await expect(page.getByText('Activos registrados')).toBeVisible()
  })

  test('dpp-02 - Crear pasaporte digital completo', async ({ page }) => {
    await page.goto('/empresa/dpp/nuevo')
    // Usamos label para rellenar
    await page.locator('input[placeholder="Silla de madera, Mesa de oficina..."]').fill(`Silla E2E ${Date.now()}`)
    await page.locator('input[placeholder="8.5"]').fill('15')
    await page.getByRole('button', { name: /crea el pasaporte/i }).click()
    
    // Debería redirigir a /empresa/dpp/[id]
    await expect(page.getByText(/Detalles del Activo|Pasaporte Digital/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('dpp-03 - Ingesta IA desde imagen - extracción de campos', async ({ page }) => { test.skip() })
  test('dpp-04 - Verificación pública del pasaporte por QR', async ({ page }) => { test.skip() })
  test('dpp-05 - Detalle DPP - editar y agregar ciclo', async ({ page }) => { test.skip() })
  test('dpp-06 - Generación de Pasaportes con ciclos de vida extensos', async ({ page }) => { test.skip() })
  test('dpp-07 - Verificación de Integridad Criptográfica del Pasaporte Digital', async ({ page }) => { test.skip() })
})
