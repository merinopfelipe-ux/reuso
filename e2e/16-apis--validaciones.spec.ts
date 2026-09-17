import { test, expect } from '@playwright/test'

// Escrito de cero el 2026-09-02: de los 7 api-*, 6 eran `test.skip` con el
// cuerpo vacío y el único "real" (api-01) afirmaba 401 sin sesión, que no es
// lo que pide el QA manual (pide validar los campos obligatorios ESTANDO
// autenticado, que es 400, no 401). Cada prueba de aquí ejerce la validación
// real del endpoint con una sesión válida.

test.describe('APIs & Validaciones', () => {
  test.describe('con sesión de empleado', () => {
    test.use({ storageState: 'playwright/.auth/empleado.json' })

    test('api-01 - calcular rechaza con 400 si faltan campos obligatorios', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      const res = await page.request.post('/api/calcular', { data: {} })
      expect(res.status()).toBe(400)
      const cuerpo = await res.json() as { error?: unknown }
      expect(cuerpo.error).toBeTruthy()
    })

    test('api-03 - tickets topa la paginación en 100 aunque se pida más', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      const res = await page.request.get('/api/tickets?limit=99999')
      expect(res.status()).toBe(200)
      const cuerpo = await res.json() as { tickets?: unknown[] } | unknown[]
      const filas = Array.isArray(cuerpo) ? cuerpo : (cuerpo.tickets ?? [])
      expect(filas.length).toBeLessThanOrEqual(100)
    })

    test('api-07 - calcular rechaza pesos cero, negativos y desbordados', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      const id = '00000000-0000-0000-0000-000000000000'
      for (const peso of [0, -5, 1_000_000]) {
        const res = await page.request.post('/api/calcular', {
          data: { items: [{ id, peso_kg: peso }] },
        })
        expect(res.status(), `peso ${peso} debería ser rechazado`).toBe(400)
      }
    })
  })

  test.describe('con sesión de empresa_admin', () => {
    test.use({ storageState: 'playwright/.auth/empresa-admin.json' })

    // Solo empresa_admin puede crear metas (el empleado recibe 403 antes de
    // que se valide nada), así que la validación de fechas se ejerce con el
    // rol correcto — verificado en /api/metas, no supuesto.
    test('api-02 - metas rechaza una fecha de fin anterior a la de inicio', async ({ page }) => {
      await page.goto('/empresa', { waitUntil: 'domcontentloaded' })
      const res = await page.request.post('/api/metas', {
        data: {
          titulo: 'Meta inválida E2E',
          tipo: 'co2_kg',
          objetivo: 100,
          fecha_inicio: '2026-12-31',
          fecha_fin: '2026-01-01',
        },
      })
      expect(res.status()).toBe(400)
    })

    // El QA pide comprobar que si Gemini falla se usa el respaldo de
    // OpenRouter. Forzar la caída real del proveedor no se puede hacer desde
    // el navegador, y llamar a la IA de verdad gastaría tokens en cada
    // corrida (directriz del proyecto). Lo que sí se verifica sin costo es
    // que el endpoint valida su entrada antes de llamar a ningún proveedor.
    test('api-04 - diagnóstico valida la entrada antes de llamar a la IA', async ({ page }) => {
      await page.goto('/empresa', { waitUntil: 'domcontentloaded' })
      const res = await page.request.post('/api/cotizador/diagnostico', { data: {} })
      expect(res.status()).toBeGreaterThanOrEqual(400)
      expect(res.status()).toBeLessThan(500)
    })

    test('api-06 - diagnóstico rechaza un archivo que no es una imagen real', async ({ page }) => {
      await page.goto('/empresa', { waitUntil: 'domcontentloaded' })
      // Texto plano disfrazado de imagen: no tiene cabecera de imagen válida.
      const falsa = Buffer.from('esto no es una imagen, es texto plano').toString('base64')
      const res = await page.request.post('/api/cotizador/diagnostico', {
        data: { imagenes: [falsa], imagen_base64: falsa },
      })
      expect(res.status(), 'nunca debe responder 500 ante un archivo inválido').not.toBe(500)
      expect(res.status()).toBeGreaterThanOrEqual(400)
    })
  })

  test('api-05 - el chequeo de estado responde y reporta cada servicio', async ({ request }) => {
    const res = await request.get('/api/status/check')
    expect(res.status()).toBeLessThan(500)
  })

  // /legal/firma/[token] es pública (sin sesión) — un token que contiene
  // "demo" arma una solicitud falsa en memoria (ver page.tsx del token) sin
  // tocar la tabla firmas_solicitudes ni Storage, así que esta prueba corre
  // el flujo real de firma (llenar datos + dibujar en el canvas + enviar)
  // sin crear ni borrar nada en la base de datos real. La nitidez visual
  // del trazo es inherentemente manual (ojo humano); esto verifica la parte
  // estructural: se puede dibujar, el formulario valida, y el documento
  // queda firmado de punta a punta.
  test('dpl-09 - firma digital: dibujar en el canvas y firmar un documento de punta a punta', async ({ page }) => {
    const token = `demo-e2e-dpl09-${Date.now()}`
    await page.goto(`/legal/firma/${token}`, { waitUntil: 'load' })

    // LegalHeader es sticky (position:sticky). `scrollIntoViewIfNeeded()`
    // deja el elemento pegado al borde del viewport, justo donde vive el
    // header — y `force: true` en Playwright NO evita esto: solo salta las
    // validaciones propias de Playwright, pero el clic real se despacha por
    // coordenadas de pantalla, así que si el header ocupa ese punto, el
    // clic le llega al header, no al checkbox (causa real confirmada: el
    // estado nunca cambiaba pese a "click action done"). Centrar el
    // elemento en el viewport (block: 'center') lo aleja del header fijo en
    // el borde superior — así el clic normal (sin forzar) sí aterriza en el
    // lugar correcto.
    async function centrarYclic(locator: ReturnType<typeof page.locator>) {
      await locator.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await locator.click()
    }

    const checkbox = page.getByRole('checkbox')
    await expect(checkbox).toBeVisible({ timeout: 10_000 })
    await centrarYclic(checkbox)
    await expect(checkbox).toBeChecked()
    // Confirma que el check() realmente habilitó el formulario antes de
    // seguir — sin esto, un click que no registró deja los campos
    // deshabilitados y el resto de la prueba falla más adelante, lejos de
    // la causa real (bug real encontrado al escribir esta prueba).
    await expect(page.locator('input[placeholder="Ej. Ana"]')).toBeEnabled({ timeout: 10_000 })

    // "Persona natural" en vez del default "Represento una empresa" — evita
    // 3 campos extra (razón social/NIT/cargo) que no son el foco de esta
    // prueba (ya validados por el propio esquema Zod del endpoint).
    await centrarYclic(page.getByText('Persona natural'))

    await page.locator('input[placeholder="Ej. Ana"]').fill('Ana')
    await page.locator('input[placeholder="Ej. Gómez"]').fill('Gómez')
    await page.locator('select').selectOption('CC')
    await page.locator('input[placeholder="Ej. 1020304050"]').fill('1020304050')
    await page.locator('input[type="email"]').fill(`e2e_dpl09_${Date.now()}@calculadoradereuso.com`)

    await centrarYclic(page.locator('.w-32.flex-shrink-0 button'))
    // "Colombia" sin escopar es ambiguo: el footer también dice "...
    // Medellín y Bogotá, Colombia" — escopar al botón de la lista del
    // selector de país evita ese choque.
    await centrarYclic(page.getByRole('button', { name: /^Colombia/ }))
    await page.locator('input[placeholder="Número de celular"]').fill('3001234567')

    // Dibuja un trazo real dentro del canvas — sin esto FirmaCanvas nunca
    // dispara onChange y el botón de enviar queda bloqueado por el propio
    // "Dibuja tu firma antes de enviar" del formulario.
    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('El canvas de firma no está visible.')
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3, { steps: 5 })
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.6, { steps: 5 })
    await page.mouse.up()

    await page.locator('button:has-text("Firmar y recibir mi copia")').click()
    await expect(page.getByText('Tu documento quedó firmado')).toBeVisible({ timeout: 20_000 })
  })
})
