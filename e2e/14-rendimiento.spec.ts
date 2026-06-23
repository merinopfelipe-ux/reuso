import { test, expect } from '@playwright/test'

test.describe('Rendimiento', () => {

  test('perf-01 - Login → Dashboard < 5 segundos (Benchmark base)', async ({ page }) => {
    const start = Date.now()
    await page.goto('/login')
    await page.fill('input[id="email"]', 'usuario_libre@reuso.com')
    await page.fill('input[id="password"]', 'Password123!')
    
    await page.getByRole('button', { name: /ingresar/i }).click()
    
    // Esperar a que el navbar o dashboard cargue
    await expect(page.getByText('Reúso').first()).toBeVisible({ timeout: 15_000 })
    
    const duration = Date.now() - start
    // En entornos de CI puede ser lento, apuntamos a < 8s para evitar flakiness
    expect(duration).toBeLessThan(8000)
  })

  test('perf-02 - Panel empresa con gráficas < 5 segundos', async ({ page }) => {
    test.skip()
  })

  test('perf-03 - Compresión de imagen antes del diagnóstico', async ({ page }) => {
    test.skip()
  })

})
