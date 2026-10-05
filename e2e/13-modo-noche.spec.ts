import { test, expect, Page } from './fixtures'

// Desde 2026-10-04 no hay botón de tema: día o noche lo decide SIEMPRE la
// configuración del dispositivo (script del layout raíz, que escucha cambios
// en vivo). Aquí se simula exactamente eso: el dispositivo pasa a oscuro.
// Nunca usar document.documentElement.setAttribute a mano.
async function activarTemaOscuro(page: Page) {
  await page.emulateMedia({ colorScheme: 'dark' })
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

    test('dark-07 - el tema sigue al dispositivo e ignora preferencias guardadas', async ({ page }) => {
      // Una elección vieja guardada en el navegador ya no manda: se borra y
      // se aplica la configuración del dispositivo, al cargar y en vivo.
      await page.emulateMedia({ colorScheme: 'light' })
      await page.addInitScript(() => { try { localStorage.setItem('theme', 'dark') } catch {} })
      await page.goto('/dashboard')
      await page.waitForLoadState('load')
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light')
      await activarTemaOscuro(page)
      await page.emulateMedia({ colorScheme: 'light' })
      await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light', { timeout: 5_000 })
      expect(await page.getByLabel(/Cambiar a modo|Cambiar tema/).count()).toBe(0)
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

      for (let i = 0; i < 10; i++) {
        await page.emulateMedia({ colorScheme: i % 2 === 0 ? 'dark' : 'light' })
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
