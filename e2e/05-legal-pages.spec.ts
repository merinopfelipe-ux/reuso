import { test, expect } from '@playwright/test'

test.describe('Páginas Legales y Cookies (Sin Autenticación)', () => {
  // Sin usar estado de autenticación guardado - Acceso 100% público
  test.use({ storageState: { cookies: [], origins: [] } })

  test('01 - /legal es pública y accesible sin iniciar sesión', async ({ page }) => {
    await page.goto('/legal')
    await page.waitForLoadState('load')
    
    // Debería estar en /legal y no haber sido redirigido a /login
    await expect(page).toHaveURL(/\/legal$/)
    
    // Debería mostrar el título del índice de legales
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    const text = await heading.textContent()
    expect(text?.toLowerCase()).toContain('legal')
  })

  test('02 - Todas las subpáginas de legales son públicas y cargan correctamente', async ({ page }) => {
    const paginas = [
      '/legal/terminos',
      '/legal/privacidad',
      '/legal/datos',
      '/legal/cookies',
      '/legal/cookies/preferencias',
      '/legal/reglamento',
      '/legal/confidencialidad',
      '/legal/ia',
      '/legal/medicion',
      '/legal/dudas'
    ]

    for (const path of paginas) {
      await page.goto(path)
      await page.waitForLoadState('load')
      // No debería redirigir a /login
      expect(page.url()).toContain(path)
      // Debe haber un título h1 visible
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('03 - El footer de legales incluye el selector de idioma y funciona reactivamente', async ({ page }) => {
    await page.goto('/legal')
    await page.waitForLoadState('load')

    // El footer debería mostrar el selector de idioma
    const selectorBtn = page.locator('footer button', { hasText: /ES|ENG/ }).first()
    await expect(selectorBtn).toBeVisible()

    // El título original en ES es "Documentos legales"
    const heading = page.locator('h1')
    await expect(heading).toHaveText('Documentos legales')

    // Hacemos click en el selector
    await selectorBtn.click()

    // Seleccionamos English
    const englishBtn = page.locator('footer button', { hasText: /English/ }).first()
    await expect(englishBtn).toBeVisible()
    await englishBtn.click()

    // El título debería cambiar de inmediato y reactivamente a "Legal documents" sin refrescar la página
    await expect(heading).toHaveText('Legal documents', { timeout: 3000 })
  })

  test('04 - Las páginas de legales heredan la meta noindex, nofollow para SEO', async ({ page }) => {
    await page.goto('/legal')
    await page.waitForLoadState('load')

    // El layout de legales inyecta la meta robots
    const metaRobots = page.locator('meta[name="robots"]')
    await expect(metaRobots).toBeAttached()
    const content = await metaRobots.getAttribute('content')
    expect(content).toBe('noindex, nofollow')

    // Probar también en una subpágina
    await page.goto('/legal/ia')
    await page.waitForLoadState('load')
    const metaRobotsSub = page.locator('meta[name="robots"]')
    await expect(metaRobotsSub).toBeAttached()
    const contentSub = await metaRobotsSub.getAttribute('content')
    expect(contentSub).toBe('noindex, nofollow')
  })

  test('05 - El banner de cookies es bilingüe y reactivo al selector del footer', async ({ page }) => {
    // Abrimos una pestaña en blanco (limpiando almacenamiento de cookies para ver el banner de nuevo)
    await page.goto('/legal')
    await page.waitForLoadState('load')

    // El banner de cookies debería ser visible
    const banner = page.locator('text=Tu privacidad, tus reglas')
    await expect(banner).toBeVisible({ timeout: 15_000 })

    // Verificamos que tenga la opción de "Solo esenciales"
    const btnEsenciales = page.locator('button', { hasText: 'Solo esenciales' })
    await expect(btnEsenciales).toBeVisible()

    // Cambiamos el idioma en el footer a ENG
    const selectorBtn = page.locator('footer button', { hasText: /ES|ENG/ }).first()
    await selectorBtn.click()
    const englishBtn = page.locator('footer button', { hasText: /English/ }).first()
    await englishBtn.click()

    // El banner debería actualizarse instantáneamente a inglés
    const bannerEng = page.locator('text=Your privacy, your call')
    await expect(bannerEng).toBeVisible({ timeout: 3000 })

    // Hacemos click en "Essential only" (bilingüe)
    const btnEsencialesEng = page.locator('button', { hasText: 'Essential only' })
    await expect(btnEsencialesEng).toBeVisible()
    await btnEsencialesEng.click()

    // El banner debería ocultarse
    await expect(bannerEng).not.toBeVisible({ timeout: 3000 })
  })

  test('06 - Se han reemplazado los emojis de tarjetas en cookies y privacidad por iconos Phosphor', async ({ page }) => {
    // 1. En la página de cookies
    await page.goto('/legal/cookies')
    await page.waitForLoadState('load')

    // El div de tarjetas ya no debe contener los emojis 🔒, 📊, ⚙️, 🌍
    const contentHtml = await page.content()
    expect(contentHtml).not.toContain('🔒')
    expect(contentHtml).not.toContain('📊')
    expect(contentHtml).not.toContain('⚙️')
    expect(contentHtml).not.toContain('🌍')

    // 2. En la página de privacidad
    await page.goto('/legal/privacidad')
    await page.waitForLoadState('load')
    const privacyHtml = await page.content()
    expect(privacyHtml).not.toContain('🔒')
    expect(privacyHtml).not.toContain('🔐')
    expect(privacyHtml).not.toContain('⚖️')
    expect(privacyHtml).not.toContain('🙋')
  })
})
