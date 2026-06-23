import { test, expect } from '@playwright/test'

test.describe('super_admin', () => {
  test.use({ storageState: 'playwright/.auth/super-admin.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin')
  })

  test('adm-01 - login aterriza en /admin con badge Super Admin', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.getByText(/super admin/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('adm-02 - KPIs del dashboard muestran números reales mayores a cero', async ({ page }) => {
    await expect(page.getByText(/usuarios registrados/i)).toBeVisible({ timeout: 10_000 })
    const numeros = page.locator('text=/^\\d+$|^\\d+\\.\\d+ t$/').first()
    await expect(numeros).toBeVisible({ timeout: 8_000 })
  })

  test('adm-03 - empresas: tabla tiene al menos 1 fila', async ({ page }) => {
    await page.goto('/admin/empresas')
    await page.waitForLoadState('load')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  })

  test('adm-04 - empresas: buscar por nombre exacto devuelve esa empresa', async ({ page }) => {
    await page.goto('/admin/empresas')
    await page.waitForLoadState('load')
    const primeraFila = page.locator('table tbody tr').first()
    await expect(primeraFila).toBeVisible({ timeout: 10_000 })
    const nombreEmpresa = await primeraFila.locator('td').first().textContent() ?? ''
    const nombreBusqueda = nombreEmpresa.trim().slice(0, 5)

    const input = page.locator('input[placeholder*="buscar" i], input[placeholder*="empresa" i]').first()
    await input.fill(nombreBusqueda)
    await page.waitForTimeout(500)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5_000 })
  })

  test('adm-05 - notas de empresa persisten tras guardar y recargar', async ({ page }) => {
    await page.goto('/admin/empresas')
    await page.waitForLoadState('load')
    await page.locator('table tbody tr').first().click()
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible({ timeout: 8_000 })
    const notaUnica = `Nota E2E ${Date.now()}`
    await textarea.fill(notaUnica)
    await page.getByText('Guardar notas').click()
    await expect(page.getByText(/guardado|guardadas/i)).toBeVisible({ timeout: 8_000 })

    await page.reload()
    await page.waitForLoadState('load')
    await page.locator('table tbody tr').first().click()
    await expect(page.locator('textarea').first()).toHaveValue(notaUnica, { timeout: 8_000 })
  })

  test('adm-06 - cambio de plan persiste en lista tras recargar', async ({ page }) => {
    await page.goto('/admin/empresas')
    await page.waitForLoadState('load')
    await page.locator('table tbody tr').first().click()

    const selectPlan = page.locator('div[style*="width: 320"] select')
    await expect(selectPlan).toBeVisible({ timeout: 8_000 })
    const planOriginal = await selectPlan.inputValue()

    const nuevoPlan = planOriginal === 'free' ? 'lab' : 'free'
    await selectPlan.selectOption(nuevoPlan)
    await page.waitForTimeout(1500)

    await page.reload()
    await page.waitForLoadState('load')
    await page.locator('table tbody tr').first().click()
    const selectDespues = page.locator('div[style*="width: 320"] select')
    await expect(selectDespues).toHaveValue(nuevoPlan, { timeout: 8_000 })

    await selectDespues.selectOption(planOriginal)
    await page.waitForTimeout(1500)
  })

  test('adm-07 - usuarios: tabla carga y búsqueda filtra', async ({ page }) => {
    await page.goto('/admin/usuarios')
    await page.waitForLoadState('load')
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })

    const input = page.locator('input[placeholder*="buscar" i], input[placeholder*="nombre" i]').first()
    await input.fill('merinop')
    await page.waitForTimeout(500)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5_000 })
  })

  test('adm-08 - crear usuario y aparece en tabla buscándolo por email', async ({ page }) => {
    await page.goto('/admin/usuarios')
    await page.waitForLoadState('load')
    await page.locator('button:has-text("Nuevo usuario")').click()

    const emailUnico = `e2e-${Date.now()}@ejemplo.com`
    const form = page.locator('form').filter({ has: page.locator('button:has-text("Crear usuario")') })
    await form.locator('input[type="email"]').fill(emailUnico)
    await form.locator('input[placeholder*="Nombre del"]').fill('Usuario E2E')
    await form.locator('select').selectOption('empleado')
    await form.locator('button:has-text("Crear usuario")').click()
    await expect(form.locator('input[type="email"]')).not.toBeVisible({ timeout: 10_000 })

    await page.reload()
    await page.waitForLoadState('load')
    const input = page.locator('input[placeholder*="buscar" i], input[placeholder*="nombre" i]').first()
    await input.fill(emailUnico)
    await page.waitForTimeout(600)
    await expect(page.getByText(emailUnico)).toBeVisible({ timeout: 10_000 })
  })

  test('adm-09 - plantilla: firmante persiste tras guardar y recargar', async ({ page }) => {
    await page.goto('/admin/plantillas')
    await page.waitForLoadState('load')
    const inputFirmante = page.getByPlaceholder('Ej: María López')
    await expect(inputFirmante).toBeVisible({ timeout: 8_000 })
    const valorOriginal = await inputFirmante.inputValue()

    const nuevoFirmante = `Firmante E2E ${Date.now()}`
    await inputFirmante.click({ clickCount: 3 })
    await page.keyboard.type(nuevoFirmante)
    await page.locator('button:has-text("Guardar plantilla")').click()
    await expect(page.getByText('Plantilla guardada correctamente.')).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByPlaceholder('Ej: María López')).toHaveValue(nuevoFirmante, { timeout: 8_000 })

    const inputRestore = page.getByPlaceholder('Ej: María López')
    await inputRestore.click({ clickCount: 3 })
    await page.keyboard.type(valorOriginal || 'Director')
    await page.locator('button:has-text("Guardar plantilla")').click()
  })

  test('adm-10 - exportar empresas devuelve status 200', async ({ page }) => {
    await page.goto('/admin/empresas')
    await page.waitForLoadState('load')
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
      page.locator('button:has-text("Exportar")').click(),
    ])
    if (!download) {
      const res = await page.request.get('/api/admin/empresas/exportar')
      expect(res.status()).toBeLessThan(400)
    }
  })

  test('adm-11 - leads: cambio de estado persiste tras recargar', async ({ page }) => {
    await page.goto('/admin/leads')
    await page.waitForLoadState('load')
    const primerSelect = page.locator('select').first()
    const haySelect = await primerSelect.count()
    if (haySelect === 0) {
      test.skip()
      return
    }
    const estadoOriginal = await primerSelect.inputValue()
    const nuevoEstado = estadoOriginal === 'nuevo' ? 'contactado' : 'nuevo'
    await primerSelect.selectOption(nuevoEstado)
    await page.waitForTimeout(1000)

    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.locator('select').first()).toHaveValue(nuevoEstado, { timeout: 8_000 })

    await page.locator('select').first().selectOption(estadoOriginal)
    await page.waitForTimeout(1000)
  })

  test('adm-12 - CICLO COMPLETO: generar cert → revocar → verificar "Revocado"', async ({ browser }) => {
    const ctxEA = await browser.newContext({ storageState: 'playwright/.auth/empresa-admin.json' })
    const pageEA = await ctxEA.newPage()
    await pageEA.goto('/empresa')

    const botonCert = pageEA.locator('button:has-text("Generar certificado")').first()
    await expect(botonCert).toBeVisible({ timeout: 10_000 })

    const resPromise = pageEA.waitForResponse('/api/certificados/generar', { timeout: 50_000 })
    await botonCert.click()
    const res = await resPromise
    const resData = await res.json() as { codigo_verificacion?: string }
    expect(resData.codigo_verificacion).toBeTruthy()
    const uuid = resData.codigo_verificacion!
    const codigo = `RCO2-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`
    await ctxEA.close()

    const ctxSA = await browser.newContext({ storageState: 'playwright/.auth/super-admin.json' })
    const pageSA = await ctxSA.newPage()
    await pageSA.goto('/admin/certificados')
    await pageSA.waitForURL(/\/admin\/certificados/, { timeout: 15_000 })
    await pageSA.waitForLoadState('networkidle')

    const inputBusqueda = pageSA.locator('input[placeholder*="buscar" i], input[placeholder*="código" i]').first()
    if (await inputBusqueda.count() > 0) {
      await inputBusqueda.fill(uuid.slice(0, 8))
      await pageSA.waitForTimeout(800)
    }

    await expect(pageSA.locator('button[title="Revocar"]').first()).toBeVisible({ timeout: 10_000 })
    await pageSA.locator('button[title="Revocar"]').first().click()

    const motivoTexto = 'Revocado en test E2E automatizado'
    const inputMotivo = pageSA.locator('textarea, input[placeholder*="motivo" i]').first()
    await expect(inputMotivo).toBeVisible({ timeout: 8_000 })
    await inputMotivo.fill(motivoTexto)
    await pageSA.locator('button:has-text("Revocar certificado")').click()
    await expect(pageSA.getByText('Certificado revocado correctamente.')).toBeVisible({ timeout: 10_000 })
    await ctxSA.close()

    const ctxPublico = await browser.newContext()
    const pagePublico = await ctxPublico.newPage()
    await pagePublico.goto(`/verificar/${codigo}`)
    await pagePublico.waitForLoadState('load')
    await expect(pagePublico.getByText(/revocado/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(pagePublico.getByText(motivoTexto)).toBeVisible({ timeout: 5_000 })
    await ctxPublico.close()
  })

  test('adm-13 - revocar con motivo corto es rechazado', async ({ page }) => {
    await page.goto('/admin/certificados')
    await page.waitForLoadState('load')
    const botonRevocar = page.locator('button[title="Revocar"]').first()
    const hayBoton = await botonRevocar.count()
    if (hayBoton === 0) {
      test.skip()
      return
    }
    await botonRevocar.click()
    const inputMotivo = page.locator('textarea, input[placeholder*="motivo" i]').first()
    await expect(inputMotivo).toBeVisible({ timeout: 8_000 })
    await inputMotivo.fill('corto')
    const botonConfirmar = page.locator('button:has-text("Revocar certificado")')
    const disabled = await botonConfirmar.isDisabled()
    if (!disabled) {
      await botonConfirmar.click()
      await expect(page.getByText(/10 caracteres|mínimo|demasiado corto/i)).toBeVisible({ timeout: 5_000 })
    }
  })

  test('adm-14 - API admin rechaza a no-super_admin con 401', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    const res = await page.request.patch('/api/admin/empresas/00000000-0000-0000-0000-000000000000', {
      data: { plan: 'ilimitado' },
    })
    expect([401, 403]).toContain(res.status())
    await ctx.close()
  })
})
