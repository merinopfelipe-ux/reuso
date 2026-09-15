import { test, expect } from '@playwright/test'

// NOTA IMPORTANTE: Navegamos con domcontentloaded para evitar esperas infinitas
// de hojas de estilo externas (use.typekit.net) que bloquean el evento 'load'.

test.describe('pub-24 - Verificación y reglas de los 3 footers del sistema', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. FOOTER PÚBLICO: Home (/) y Sistema de Diseño (/sistema-diseno)
  // ─────────────────────────────────────────────────────────────────────────────
  test.describe('Variante 1: Footer Público (Home y Sistema de Diseño)', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('Home (/) muestra 4 columnas, enlaces legales, seminegrita (600) en Inicia ahora y Contacto', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })

      const footer = page.locator('#site-footer')
      await expect(footer).toBeVisible({ timeout: 15_000 })

      // Columna 1: Título con rainbow
      await expect(footer.getByRole('heading', { level: 2 })).toContainText(/Tecnología con propósito/i)

      // Columna 2: Enlaces legales públicos
      const privacyLink = footer.getByRole('link', { name: 'Política de privacidad' })
      await expect(privacyLink).toBeVisible()
      expect(await privacyLink.getAttribute('href')).toBe('/legal/privacidad')

      const reglamentoLink = footer.getByRole('link', { name: 'Reglamento' })
      await expect(reglamentoLink).toBeVisible()
      expect(await reglamentoLink.getAttribute('href')).toBe('/legal/reglamento')

      const medicionLink = footer.getByRole('link', { name: 'Sobre la medición' })
      await expect(medicionLink).toBeVisible()
      expect(await medicionLink.getAttribute('href')).toBe('/legal/medicion')

      // Columna 3: Redes sociales oficiales
      await expect(footer.getByLabel('Instagram')).toBeVisible()
      await expect(footer.getByLabel('LinkedIn')).toBeVisible()
      await expect(footer.getByLabel('YouTube')).toBeVisible()

      // Columna 4: "Inicia ahora" y "Contacto"
      const iniciaAhoraLink = footer.locator('a[href="/registro"]').first()
      await expect(iniciaAhoraLink).toBeVisible()
      await expect(iniciaAhoraLink).toContainText('Inicia ahora')
      await expect(iniciaAhoraLink).toContainText('En 3 minutos tienes tu primer reporte.')

      const contactoLink = footer.locator('a[href^="mailto:"]').first()
      await expect(contactoLink).toBeVisible()
      expect(await contactoLink.getAttribute('href')).toBe('mailto:servicio@calculadoradereuso.com')
      await expect(contactoLink).toContainText('Contacto')
      await expect(contactoLink).toContainText('servicio@calculadoradereuso.com')

      // REGLA CRÍTICA DE PESO TIPOGRÁFICO:
      // Únicamente en Home y Sistema de diseño, "Inicia ahora" y "Contacto" van en seminegrita (600).
      const weightInicia = await footer.getByText('Inicia ahora', { exact: true }).evaluate(
        (el) => window.getComputedStyle(el).fontWeight
      )
      expect(['600', '700', 'bold']).toContain(weightInicia)

      const weightContacto = await footer.getByText('Contacto', { exact: true }).evaluate(
        (el) => window.getComputedStyle(el).fontWeight
      )
      expect(['600', '700', 'bold']).toContain(weightContacto)

      // Barra inferior
      await expect(footer).toContainText(/© \d{4} Grupo MLP S\.A\.S\./i)
      await expect(footer).toContainText(/Medellín, Colombia/i)
      await expect(footer.getByRole('button', { name: /modo/i })).toBeVisible()
    })

    test('Sistema de diseño (/sistema-diseno) respeta seminegrita (600) y mailto de Contacto', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/sistema-diseno', { waitUntil: 'domcontentloaded', timeout: 60_000 })

      const footer = page.locator('#site-footer')
      await expect(footer).toBeVisible({ timeout: 15_000 })

      // Contacto mailto
      const contactoLink = footer.locator('a[href^="mailto:"]').first()
      await expect(contactoLink).toBeVisible()
      expect(await contactoLink.getAttribute('href')).toBe('mailto:servicio@calculadoradereuso.com')

      // Pesos tipográficos en 600
      const weightInicia = await footer.getByText('Inicia ahora', { exact: true }).evaluate(
        (el) => window.getComputedStyle(el).fontWeight
      )
      expect(['600', '700', 'bold']).toContain(weightInicia)

      const weightContacto = await footer.getByText('Contacto', { exact: true }).evaluate(
        (el) => window.getComputedStyle(el).fontWeight
      )
      expect(['600', '700', 'bold']).toContain(weightContacto)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. FOOTER LEGAL: /legal y subpáginas (/legal/privacidad, etc.)
  // ─────────────────────────────────────────────────────────────────────────────
  test.describe('Variante 2: Footer Legal (/legal/privacidad)', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('Muestra 4 columnas unificadas, navegación de retorno, Última actualización + Contacto (en negrita 600)', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/legal/privacidad', { waitUntil: 'domcontentloaded', timeout: 60_000 })

      const footer = page.locator('#site-footer')
      await expect(footer).toBeVisible({ timeout: 15_000 })

      // Columna 1: Título con rainbow
      await expect(footer.getByRole('heading', { level: 2 })).toContainText(/Tecnología con propósito/i)

      // Columna 2: Enlaces de retorno exclusivos de Legal
      const inicioLink = footer.getByRole('link', { name: 'Inicio' })
      await expect(inicioLink).toBeVisible()
      expect(await inicioLink.getAttribute('href')).toBe('/')

      const loginLink = footer.getByRole('link', { name: 'Iniciar sesión' })
      await expect(loginLink).toBeVisible()
      expect(await loginLink.getAttribute('href')).toBe('/login')

      const faqLink = footer.getByRole('link', { name: 'Preguntas frecuentes' })
      await expect(faqLink).toBeVisible()
      expect(await faqLink.getAttribute('href')).toBe('#')

      // Columna 3: Redes sociales
      await expect(footer.getByLabel('Instagram')).toBeVisible()
      await expect(footer.getByLabel('LinkedIn')).toBeVisible()

      // Columna 4:
      // Arriba: "Última actualización" (sin hora)
      await expect(footer.getByText('Última actualización', { exact: true })).toBeVisible()

      // Abajo: "Contacto" con mailto:servicio@calculadoradereuso.com
      const contactoLink = footer.locator('a[href^="mailto:"]').first()
      await expect(contactoLink).toBeVisible()
      expect(await contactoLink.getAttribute('href')).toBe('mailto:servicio@calculadoradereuso.com')
      await expect(contactoLink).toContainText('servicio@calculadoradereuso.com')

      // REGLA CRÍTICA DE PESO TIPOGRÁFICO:
      // En el footer de Legales, "Contacto" va en negrita/seminegrita (600), igual que en Home.
      const weightContacto = await footer.getByText('Contacto', { exact: true }).evaluate(
        (el) => window.getComputedStyle(el).fontWeight
      )
      expect(['600', '700', 'bold']).toContain(weightContacto)

      // Barra inferior
      await expect(footer).toContainText(/© \d{4} Grupo MLP S\.A\.S\./i)
      await expect(footer).toContainText(/Medellín, Colombia/i)
      await expect(footer.getByRole('button', { name: /modo/i })).toBeVisible()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. FOOTER SISTEMA INTERNO: /admin y /dashboard (LayoutShell)
  // ─────────────────────────────────────────────────────────────────────────────
  test.describe('Variante 3: Footer Sistema Interno (/admin)', () => {
    test.use({ storageState: 'playwright/.auth/super-admin.json' })

    test('Panel Admin (/admin) muestra 4 columnas, IP arriba, Última visita abajo, peso 500 y sin enlaces falsos', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 60_000 })

      const footer = page.locator('#site-footer')
      await expect(footer).toBeVisible({ timeout: 15_000 })

      // Columna 1: Título con rainbow
      await expect(footer.getByRole('heading', { level: 2 })).toContainText(/Tecnología con propósito/i)

      // Columna 2: Enlaces legales
      await expect(footer.getByRole('link', { name: 'Política de privacidad' })).toBeVisible()
      await expect(footer.getByRole('link', { name: 'Reglamento' })).toBeVisible()
      await expect(footer.getByRole('link', { name: 'Sobre la medición' })).toBeVisible()

      // Columna 3: Redes sociales
      await expect(footer.getByLabel('Instagram')).toBeVisible()
      await expect(footer.getByLabel('LinkedIn')).toBeVisible()

      // Columna 4: Bloque técnico interno
      const ipLabel = footer.getByText('Dirección IP', { exact: true })
      await expect(ipLabel).toBeVisible()

      const lastVisitLabel = footer.getByText('Última visita', { exact: true })
      await expect(lastVisitLabel).toBeVisible()

      // No debe contener "Inicia ahora" ni link de mailto en esta columna
      await expect(footer.getByText('Inicia ahora')).toHaveCount(0)
      await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0)

      // REGLA CRÍTICA DE PESO TIPOGRÁFICO:
      // En el sistema interno, todos los títulos van en peso estándar (500).
      const weightIp = await ipLabel.evaluate(
        (el) => window.getComputedStyle(el).fontWeight
      )
      expect(weightIp).toBe('500')

      const weightLastVisit = await lastVisitLabel.evaluate(
        (el) => window.getComputedStyle(el).fontWeight
      )
      expect(weightLastVisit).toBe('500')

      // Barra inferior
      await expect(footer).toContainText(/© \d{4} Grupo MLP S\.A\.S\./i)
      await expect(footer).toContainText(/Medellín, Colombia/i)
      await expect(footer.getByRole('button', { name: /modo/i })).toBeVisible()
    })
  })
})
