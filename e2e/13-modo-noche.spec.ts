import { test, expect } from '@playwright/test'

test.describe('Modo Oscuro', () => {
  test.use({ colorScheme: 'dark' })

  test('dark-01 - Login en modo noche', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
  })

  test.skip('dark-02 - Dashboard completo en modo noche', async ({ page }) => {})
  test.skip('dark-03 - Panel empresa en modo noche', async ({ page }) => {})
  test.skip('dark-04 - Cotizador IA en modo noche', async ({ page }) => {})
  test.skip('dark-05 - DPP en modo noche', async ({ page }) => {})
  test.skip('dark-06 - Panel admin en modo noche', async ({ page }) => {})
  test.skip('dark-07 - Settings - toggle de modo noche persiste', async ({ page }) => {})
  test.skip('dark-08 - Consistencia de contraste extremo', async ({ page }) => {})
})
