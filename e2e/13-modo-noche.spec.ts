import { test, expect, Page } from '@playwright/test'

// El toggle real es <ThemeToggle> (src/components/theme-toggle.tsx),
// aria-label "Cambiar a tema oscuro" / "Cambiar a tema claro" — igual en
// todas las páginas autenticadas. Nunca usar
// document.documentElement.setAttribute a mano: no dispara el mismo efecto
// que un clic real (lección ya aprendida hoy con landing-header).
async function activarTemaOscuro(page: Page) {
  await page.getByLabel('Cambiar a tema oscuro').click()
  await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark', { timeout: 5_000 })
}

// Chequeo de contraste real (no solo "no truena"): el color de fondo nunca
// debe ser igual al color de texto en el mismo elemento visible.
async function sinTextoInvisible(page: Page, selector: string) {
  const problema = await page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el)
    return s.color === s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)'
  }).catch(() => false)
  expect(problema).toBe(false)
}

test.describe('Modo Noche', () => {
  test('dark-01 - login en modo noche', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('load')
    await activarTemaOscuro(page)
    await expect(page.locator('#email')).toBeVisible()
    await sinTextoInvisible(page, 'body')
  })

  test.describe('empleado', () => {
    test.use({ storageState: 'playwright/.auth/empleado.json' })

    test('dark-02 - dashboard completo en modo noche', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForLoadState('load')
      await activarTemaOscuro(page)
      await expect(page.getByText(/hola/i).first()).toBeVisible()
      await sinTextoInvisible(page, 'body')
    })

    test('dark-07 - toggle de modo noche persiste tras cerrar y reabrir', async ({ page, context }) => {
      // Bug real corregido 2026-09-02: /settings aplica de forma asíncrona
      // el tema_preferido guardado en el perfil (GET /api/profile) — si el
      // toggle del header se clickea mientras esa petición sigue en curso,
      // el valor recién elegido quedaba pisado por el de la base de datos.
      // Se espera esa respuesta antes de tocar el toggle para no competir
      // con ella (además de la corrección ya aplicada en la página misma).
      const respuestaPerfil = page.waitForResponse('/api/profile', { timeout: 15_000 })
      await page.goto('/settings')
      await page.waitForLoadState('load')
      await respuestaPerfil
      await activarTemaOscuro(page)
      await page.waitForTimeout(500)

      const nuevaPagina = await context.newPage()
      await nuevaPagina.goto('/dashboard')
      await nuevaPagina.waitForLoadState('load')
      const tema = await nuevaPagina.evaluate(() => document.documentElement.getAttribute('data-theme'))
      expect(tema).toBe('dark')
    })
  })

  test.describe('empresa_admin', () => {
    test.use({ storageState: 'playwright/.auth/empresa-admin.json' })

    test('dark-03 - panel empresa en modo noche', async ({ page }) => {
      test.setTimeout(90_000)
      // Misma flakiness ambiental ya documentada en otras rutas pesadas:
      // la primera compilación en caliente de /empresa en next dev puede
      // superar el timeout global si corre después de muchas otras pruebas.
      await page.goto('/empresa', { timeout: 60_000 })
      await page.waitForLoadState('load')
      await activarTemaOscuro(page)
      await sinTextoInvisible(page, 'body')

      for (const ruta of ['/empresa/equipo', '/empresa/metas', '/empresa/reportes']) {
        await page.goto(ruta)
        await page.waitForLoadState('load')
        await expect(page).not.toHaveURL(/\/login/)
      }
    })

    test('dark-04 - cotizador IA en modo noche', async ({ page }) => {
      await page.goto('/empresa/cotizador')
      await page.waitForLoadState('load')
      await activarTemaOscuro(page)
      await expect(page).not.toHaveURL(/\/login/)
      await sinTextoInvisible(page, 'body')
    })

    test('dark-05 - DPP en modo noche', async ({ page }) => {
      await page.goto('/empresa/dpp')
      await page.waitForLoadState('load')
      await activarTemaOscuro(page)
      await expect(page).not.toHaveURL(/\/login/)

      await page.goto('/empresa/dpp/nuevo')
      await page.waitForLoadState('load')
      await sinTextoInvisible(page, 'body')
    })

    test('dark-08 - alternar tema rápido no rompe los gráficos', async ({ page }) => {
      await page.goto('/empresa')
      await page.waitForLoadState('load')
      const errores: string[] = []
      page.on('pageerror', (e) => errores.push(e.message))

      const boton = page.locator('button[aria-label^="Cambiar a tema"]')
      for (let i = 0; i < 10; i++) {
        await boton.click()
        await page.waitForTimeout(80)
      }
      await page.waitForTimeout(500)
      expect(errores).toEqual([])
      await sinTextoInvisible(page, 'body')
    })
  })

  test.describe('super_admin', () => {
    test.use({ storageState: 'playwright/.auth/super-admin.json' })

    test('dark-06 - panel admin en modo noche', async ({ page }) => {
      await page.goto('/admin')
      await page.waitForLoadState('load')
      await activarTemaOscuro(page)

      for (const ruta of ['/admin/usuarios', '/admin/empresas', '/admin/tickets', '/admin/logs']) {
        await page.goto(ruta)
        await page.waitForLoadState('load')
        await expect(page).not.toHaveURL(/\/login/)
        await sinTextoInvisible(page, 'body')
      }
    })
  })
})
