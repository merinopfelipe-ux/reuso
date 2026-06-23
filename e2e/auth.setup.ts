import { test as setup, expect } from '@playwright/test'

const AUTH_DIR = 'playwright/.auth'

async function aceptarCookies(page: any) {
  await page.locator('button', { hasText: /Solo esenciales|Essential only/ }).first().click({ timeout: 5000 }).catch(() => {})
}

setup('auth: usuario_libre', async ({ page }) => {
  await page.goto('/login')
  await aceptarCookies(page)
  await page.locator('#email').fill(process.env.TEST_USER_EMAIL ?? 'test@reuso.lurdes.co')
  await page.locator('#password').fill(process.env.TEST_USER_PASSWORD ?? 'TestReuso2024!')
  await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 75_000 })
  await page.context().storageState({ path: `${AUTH_DIR}/usuario-libre.json` })
})

setup('auth: empleado', async ({ page }) => {
  await page.goto('/login')
  await aceptarCookies(page)
  await page.locator('#email').fill(process.env.TEST_EMPLEADO_EMAIL ?? 'empleado@reuso.lurdes.co')
  await page.locator('#password').fill(process.env.TEST_EMPLEADO_PASSWORD ?? 'TestReuso2024!')
  await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 75_000 })
  await page.context().storageState({ path: `${AUTH_DIR}/empleado.json` })
})

setup('auth: empresa_admin', async ({ page }) => {
  await page.goto('/login')
  await aceptarCookies(page)
  await page.locator('#email').fill(process.env.TEST_ADMIN_EMPRESA_EMAIL ?? 'admin@reuso.lurdes.co')
  await page.locator('#password').fill(process.env.TEST_ADMIN_EMPRESA_PASSWORD ?? 'TestReuso2024!')
  await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  await page.waitForURL(/\/empresa/, { timeout: 75_000 })
  await page.context().storageState({ path: `${AUTH_DIR}/empresa-admin.json` })
})

setup('auth: super_admin', async ({ page }) => {
  await page.goto('/login')
  await aceptarCookies(page)
  await page.locator('#email').fill(process.env.TEST_SUPER_ADMIN_EMAIL ?? 'merinop@me.com')
  await page.locator('#password').fill(process.env.TEST_SUPER_ADMIN_PASSWORD ?? 'Ejemplo123*')
  await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  await page.waitForURL(/\/admin/, { timeout: 75_000 })
  await page.context().storageState({ path: `${AUTH_DIR}/super-admin.json` })
})
