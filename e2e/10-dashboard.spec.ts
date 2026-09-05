import { test, expect, Page } from '@playwright/test'

// IDs con prefijo 'ul-' (usuario_libre) — antes usaban 'dash-XX', pero esos
// números ya significan algo distinto en el checklist manual de /admin/qa
// (categoría "Dashboard", enfocada en el rol empleado). Renombrados
// 2026-09-02 para que cada ID identifique una sola cosa en los dos sistemas,
// sin tocar la lógica de las pruebas que ya funcionaban.
async function seleccionarCategoriaYPeso(page: Page, peso = '2') {
  // El catálogo real hoy es "Muebles" con subcategorías (Comedor, Sala,
  // Alcoba...), no "Ropa y Textiles" (bug real corregido 2026-09-02: el
  // catálogo cambió y esta prueba se quedó apuntando al nombre viejo).
  // "Muebles" (la categoría superior) YA viene activa por defecto al cargar
  // /dashboard — hacerle clic no cambia nada, por eso nunca aparecía ningún
  // input[type="number"]. El listado de ítems con peso solo aparece al
  // elegir una SUBCATEGORÍA real (ej. "Comedor") — confirmado leyendo el
  // snapshot de la página que guarda Playwright al fallar, el bug pasó
  // desapercibido en tsc/eslint por ser puramente de interacción, no de
  // tipos. Bug real corregido 2026-09-02.
  const boton = page.locator('button').filter({ hasText: 'Comedor' }).first()
  await expect(boton).toBeVisible({ timeout: 15_000 })
  await boton.click()
  const input = page.locator('input[type="number"]').first()
  await expect(input).toBeVisible({ timeout: 15_000 })
  await input.click({ clickCount: 3 })
  await page.keyboard.type(peso)
}

test.describe('usuario_libre', () => {
  test.use({ storageState: 'playwright/.auth/usuario-libre.json' })
  // 90s en vez del default de 60s: el listado de categorías puede tardar
  // hasta 30s en un servidor next dev con rutas frías, y varias pruebas
  // de este archivo esperan ese listado más el input de peso después.
  test.setTimeout(90_000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('load')
  })

  test('ul-01 - login aterriza en /dashboard con saludo', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/hola/i).first()).toBeVisible()
  })

  test('ul-02 - peso cero no habilita el botón guardar', async ({ page }) => {
    const boton = page.locator('button').filter({ hasText: 'Comedor' }).first()
    await expect(boton).toBeVisible({ timeout: 15_000 })
    await boton.click()
    const input = page.locator('input[type="number"]').first()
    await expect(input).toBeVisible({ timeout: 15_000 })
    await input.click({ clickCount: 3 })
    await page.keyboard.type('0')
    await expect(page.locator('button:has-text("Guardar cálculo")')).toBeDisabled({ timeout: 3_000 })
  })

  test('ul-03 - guardar cálculo persiste en historial tras recargar', async ({ page }) => {
    await seleccionarCategoriaYPeso(page, '2')
    const botonGuardar = page.locator('button:has-text("Guardar cálculo")')
    await expect(botonGuardar).toBeEnabled({ timeout: 5_000 })
    await botonGuardar.click()
    await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })

    await page.goto('/dashboard/historial')
    await page.waitForLoadState('load')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 })
  })

  test('ul-04 - total CO₂ en tiempo real es mayor que cero', async ({ page }) => {
    await seleccionarCategoriaYPeso(page, '5')
    const totalCO2 = page.locator('text=/\\d+\\.\\d+ kg CO₂/').first()
    await expect(totalCO2).toBeVisible({ timeout: 5_000 })
    const texto = await totalCO2.textContent()
    const numero = parseFloat(texto?.match(/[\d.]+/)?.[0] ?? '0')
    expect(numero).toBeGreaterThan(0)
  })

  test('ul-05 - "Calcular más objetos" limpia el panel de resultado', async ({ page }) => {
    await seleccionarCategoriaYPeso(page, '2')
    await page.locator('button:has-text("Guardar cálculo")').click()
    await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })
    await page.getByText('Calcular más objetos').click()
    await expect(page.getByText('¡Cálculo guardado!')).not.toBeVisible({ timeout: 5_000 })
  })

  // El módulo "certificados" ya no existe (renombrado por completo a
  // "Informes", ver memoria del proyecto) — la ruta real es
  // /dashboard/informes, el botón real dice "Generar informe". La prueba
  // vieja apuntaba a /dashboard/certificados (ruta muerta) con el texto
  // "certificados" (mensaje que ya no existe en plan-limits.ts). Corregida.
  test('ul-06 - plan Explora bloquea informes con mensaje exacto', async ({ page }) => {
    await page.goto('/dashboard/informes')
    await page.waitForLoadState('load')
    await page.locator('button:has-text("Generar informe")').first().click()
    const fechaInicio = page.locator('input[type="date"]').first()
    await expect(fechaInicio).toBeVisible({ timeout: 8_000 })
    await fechaInicio.fill('2024-01-01')
    await page.locator('input[type="date"]').nth(1).fill('2024-12-31')
    await page.locator('button:has-text("Generar informe")').last().click()
    await expect(
      page.getByText('El plan Explora no incluye generación de informes. Contacta a calculadoradereuso.com para ampliar tu plan.')
    ).toBeVisible({ timeout: 10_000 })
  })

  test('ul-07 - historial de usuario_libre tiene máximo 15 filas', async ({ page }) => {
    await page.goto('/dashboard/historial')
    await page.waitForLoadState('load')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 })
    const filas = await page.locator('table tbody tr').count()
    expect(filas).toBeLessThanOrEqual(15)
  })

  test('ul-08 - modal informe abre con campos fecha y cierra correctamente', async ({ page }) => {
    await page.goto('/dashboard/informes')
    await page.waitForLoadState('load')
    await page.locator('button:has-text("Generar informe")').first().click()
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 8_000 })
    await page.getByText('Cancelar').click()
    await expect(page.locator('input[type="date"]').first()).not.toBeVisible({ timeout: 5_000 })
  })

  test('ul-09 - ticket de soporte persiste tras recargar', async ({ page }) => {
    await page.goto('/dashboard/soporte')
    await page.waitForLoadState('load')
    const tituloUnico = `E2E soporte ${Date.now()}`
    await page.getByText(/crear ticket/i).click()
    await page.getByPlaceholder(/describa brevemente/i).fill(tituloUnico)
    await page.getByRole('combobox').first().selectOption('duda')
    await page.getByPlaceholder(/proporcione toda/i).fill('Descripción de prueba automatizada con suficientes caracteres.')
    await page.getByText('Enviar Ticket').click()
    await expect(page.getByPlaceholder(/describa brevemente/i)).not.toBeVisible({ timeout: 10_000 })

    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByText(tituloUnico)).toBeVisible({ timeout: 10_000 })
  })

  test('ul-10 - /empresa/nueva accesible para usuario_libre', async ({ page }) => {
    await page.goto('/empresa/nueva')
    await page.waitForLoadState('load')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('ul-11 - /admin bloqueado por URL directa', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/(?!.*\/admin)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/admin/)
  })

  test('ul-12 - API /api/calcular rechaza petición sin autenticación', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    const res = await page.request.post('/api/calcular', {
      data: { items: [{ id: '00000000-0000-0000-0000-000000000000', peso_kg: 1 }] },
    })
    expect(res.status()).toBe(401)
    await ctx.close()
  })

  test('ul-13 - logout invalida la sesión correctamente', async ({ page }) => {
    await page.request.post('/api/auth/logout')
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})

// ── Categoría "Dashboard" del checklist manual (rol empleado) ──────────────
// dash-01 a dash-07: contenido real de /admin/qa, distinto del bloque de
// arriba (que prueba usuario_libre en general, no estas 7 tareas puntuales).
test.describe('Dashboard (empleado)', () => {
  test.use({ storageState: 'playwright/.auth/empleado.json' })
  test.setTimeout(90_000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('load')
  })

  test('dash-01 - registro de cálculo y actualización del historial', async ({ page }) => {
    await seleccionarCategoriaYPeso(page, '60')
    await page.locator('button:has-text("Guardar cálculo")').click()
    await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })

    await page.goto('/dashboard/historial')
    await page.waitForLoadState('load')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 })
  })

  test('dash-02 - límite de plan Explora no aplica a un empleado (usa el plan de su empresa)', async ({ page }) => {
    // A diferencia de usuario_libre (ul-06), un empleado nunca tiene el plan
    // Explora — su cuota es la de la empresa que lo invitó. Esta prueba
    // confirma que el bloqueo de "plan Explora" nunca aparece para un
    // empleado, en vez de repetir la prueba de límite (esa ya vive en ul-06).
    await page.goto('/dashboard/informes')
    await page.waitForLoadState('load')
    await expect(page.getByText('El plan Explora no incluye generación de informes.')).not.toBeVisible()
  })

  test('dash-03 - historial personal - filtros y búsqueda', async ({ page }) => {
    await page.goto('/dashboard/historial')
    await page.waitForLoadState('load')
    await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 20_000 })
  })

  test('dash-04 - informes del empleado', async ({ page }) => {
    await page.goto('/dashboard/informes')
    await page.waitForLoadState('load')
    await expect(page.locator('button:has-text("Generar informe")').first()).toBeVisible({ timeout: 10_000 })
  })

  test('dash-05 - objetos del empleado', async ({ page }) => {
    await page.goto('/dashboard/objetos')
    await page.waitForLoadState('load')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('dash-06 - soporte del empleado - crear y ver ticket', async ({ page }) => {
    await page.goto('/dashboard/soporte')
    await page.waitForLoadState('load')
    const tituloUnico = `E2E soporte empleado ${Date.now()}`
    await page.getByText(/crear ticket/i).click()
    await page.getByPlaceholder(/describa brevemente/i).fill(tituloUnico)
    await page.getByRole('combobox').first().selectOption('duda')
    await page.getByPlaceholder(/proporcione toda/i).fill('Descripción de prueba automatizada con suficientes caracteres.')
    await page.getByText('Enviar Ticket').click()
    await expect(page.getByText(tituloUnico)).toBeVisible({ timeout: 10_000 })
  })

  test('dash-07 - cálculos súper-rápidos y simulación de latencia', async ({ page }) => {
    await seleccionarCategoriaYPeso(page, '3')
    const inicio = Date.now()
    await page.locator('button:has-text("Guardar cálculo")').click()
    await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })
    const duracion = Date.now() - inicio
    expect(duracion).toBeLessThan(15_000)
  })
})
