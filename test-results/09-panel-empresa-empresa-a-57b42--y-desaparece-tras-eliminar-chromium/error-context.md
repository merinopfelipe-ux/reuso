# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 09-panel-empresa.spec.ts >> empresa_admin >> emp-07 - meta persiste tras crear y desaparece tras eliminar
- Location: e2e/09-panel-empresa.spec.ts:108:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.reload: Test timeout of 60000ms exceeded.
Call log:
  - waiting for navigation until "load"
    - navigated to "https://reuso.lurdes.co/empresa"

```

# Page snapshot

```yaml
- generic [active]:
  - generic [ref=e2]:
    - img [ref=e3]
    - img [ref=e5]
    - img [ref=e7]
    - img "Calculadora de Reúso" [ref=e11]
  - alert [ref=e12]
```

# Test source

```ts
  24  | 
  25  |     await page.goto('/empresa/calculos')
  26  |     await page.waitForLoadState('load')
  27  |     await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  28  |   })
  29  | 
  30  |   test('emp-03 - certificado generado es verificable en /verificar', async ({ page }) => {
  31  |     const botonCert = page.locator('button:has-text("Generar certificado")').first()
  32  |     await expect(botonCert).toBeVisible({ timeout: 10_000 })
  33  | 
  34  |     const responsePromise = page.waitForResponse('/api/certificados/generar', { timeout: 50_000 })
  35  |     await botonCert.click()
  36  |     const response = await responsePromise
  37  |     const data = await response.json() as { codigo_verificacion?: string }
  38  |     expect(data.codigo_verificacion).toBeTruthy()
  39  |     const uuid = data.codigo_verificacion!
  40  |     const codigo = `RCO2-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`
  41  | 
  42  |     await page.goto(`/verificar/${codigo}`)
  43  |     await page.waitForLoadState('load')
  44  |     await expect(page.getByText(codigo)).toBeVisible({ timeout: 15_000 })
  45  |     await expect(page.getByText(/kilogramos CO₂-eq/i).first()).toBeVisible({ timeout: 5_000 })
  46  |   })
  47  | 
  48  |   test('emp-04 - informe generado con fechas es verificable en /verificar', async ({ page }) => {
  49  |     const botonInforme = page.locator('button:has-text("Generar informe")').first()
  50  |     await expect(botonInforme).toBeVisible({ timeout: 10_000 })
  51  |     await botonInforme.click()
  52  |     await expect(page.getByText('Elige el período a incluir')).toBeVisible({ timeout: 8_000 })
  53  |     const modal = page.locator('[style*="z-index: 51"]').first()
  54  |     await modal.locator('input[type="date"]').first().fill('2024-01-01')
  55  |     await modal.locator('input[type="date"]').last().fill('2024-12-31')
  56  | 
  57  |     const responsePromise = page.waitForResponse('/api/certificados/generar', { timeout: 50_000 })
  58  |     await page.locator('button:has-text("Generar informe")').last().click()
  59  |     const response = await responsePromise
  60  |     const data = await response.json() as { codigo_verificacion?: string }
  61  |     expect(data.codigo_verificacion).toBeTruthy()
  62  |     const uuid = data.codigo_verificacion!
  63  |     const codigo = `RCO2-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`
  64  | 
  65  |     await page.goto(`/verificar/${codigo}`)
  66  |     await page.waitForLoadState('load')
  67  |     await expect(page.getByText(/Informe de Impacto/i).first()).toBeVisible({ timeout: 10_000 })
  68  |   })
  69  | 
  70  |   test('emp-05 - invitación persiste en lista de equipo', async ({ page }) => {
  71  |     await page.goto('/empresa/equipo')
  72  |     await page.waitForLoadState('load')
  73  |     await page.locator('button:has-text("Invitar")').click()
  74  |     const emailInvitado = `e2e-invitado-${Date.now()}@ejemplo.com`
  75  |     await page.locator('input[type="email"]').fill(emailInvitado)
  76  |     await page.locator('select').selectOption('empleado')
  77  |     await page.locator('button:has-text("Generar invitación")').click()
  78  |     await expect(page.getByText(/copiar|copiado/i)).toBeVisible({ timeout: 15_000 })
  79  | 
  80  |     await page.reload()
  81  |     await page.waitForLoadState('load')
  82  |     await expect(page.getByText(emailInvitado)).toBeVisible({ timeout: 10_000 })
  83  |   })
  84  | 
  85  |   test('emp-06 - nombre de empresa persiste tras guardar y recargar', async ({ page }) => {
  86  |     await page.goto('/empresa/configuracion')
  87  |     await page.waitForLoadState('load')
  88  |     const inputNombre = page.locator('input[name="nombre"]')
  89  |     await expect(inputNombre).toBeVisible({ timeout: 10_000 })
  90  |     const nombreOriginal = await inputNombre.inputValue()
  91  | 
  92  |     const nombreTest = `Empresa Test ${Date.now()}`
  93  |     await inputNombre.click({ clickCount: 3 })
  94  |     await page.keyboard.type(nombreTest)
  95  |     await page.locator('button:has-text("Guardar cambios")').click()
  96  |     await expect(page.getByText(/guardado|éxito/i)).toBeVisible({ timeout: 10_000 })
  97  | 
  98  |     await page.reload()
  99  |     await page.waitForLoadState('load')
  100 |     const inputDespues = page.locator('input[name="nombre"]')
  101 |     await expect(inputDespues).toHaveValue(nombreTest, { timeout: 8_000 })
  102 | 
  103 |     await inputDespues.click({ clickCount: 3 })
  104 |     await page.keyboard.type(nombreOriginal)
  105 |     await page.locator('button:has-text("Guardar cambios")').click()
  106 |   })
  107 | 
  108 |   test('emp-07 - meta persiste tras crear y desaparece tras eliminar', async ({ page }) => {
  109 |     await page.goto('/empresa')
  110 |     await page.waitForLoadState('load')
  111 | 
  112 |     const tituloMeta = `Meta E2E ${Date.now()}`
  113 |     await page.locator('button:has-text("Crear Meta")').click()
  114 |     await page.getByPlaceholder(/título|meta|reducción/i).fill(tituloMeta)
  115 |     await page.locator('select').first().selectOption('co2_kg')
  116 |     await page.getByPlaceholder(/500|objetivo|numeral/i).fill('100')
  117 |     const hoy = new Date().toISOString().slice(0, 10)
  118 |     const fin = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10)
  119 |     await page.locator('input[type="date"]').first().fill(hoy)
  120 |     await page.locator('input[type="date"]').nth(1).fill(fin)
  121 |     await page.locator('button[type="submit"]').filter({ hasText: /^Guardar$/ }).click()
  122 | 
  123 |     await expect(page.getByText(tituloMeta)).toBeVisible({ timeout: 10_000 })
> 124 |     await page.reload()
      |                ^ Error: page.reload: Test timeout of 60000ms exceeded.
  125 |     await page.waitForLoadState('load')
  126 |     await expect(page.getByText(tituloMeta)).toBeVisible({ timeout: 10_000 })
  127 | 
  128 |     page.on('dialog', d => d.accept())
  129 |     await page.locator('h4').filter({ hasText: tituloMeta })
  130 |       .locator('xpath=../../../button')
  131 |       .click()
  132 |     await expect(page.getByText(tituloMeta)).not.toBeVisible({ timeout: 10_000 })
  133 |     await page.reload()
  134 |     await page.waitForLoadState('load')
  135 |     await expect(page.getByText(tituloMeta)).not.toBeVisible()
  136 |   })
  137 | 
  138 |   test('emp-08 - reportes muestran datos numéricos reales', async ({ page }) => {
  139 |     await page.goto('/empresa/reportes')
  140 |     await page.waitForLoadState('load')
  141 |     await expect(page.locator('text=/\\d+\\.\\d+|\\d+ kg/').first()).toBeVisible({ timeout: 15_000 })
  142 |   })
  143 | 
  144 |   test('emp-09 - /admin bloqueado para empresa_admin', async ({ page }) => {
  145 |     await page.goto('/admin/empresas')
  146 |     await page.waitForURL(/(?!.*\/admin)/, { timeout: 8_000 })
  147 |     expect(page.url()).not.toMatch(/\/admin/)
  148 |   })
  149 | 
  150 |   test('emp-10 - API admin rechaza a empresa_admin con 401 o 403', async ({ page }) => {
  151 |     const res = await page.request.patch('/api/admin/empresas/00000000-0000-0000-0000-000000000000', {
  152 |       data: { plan: 'ilimitado' },
  153 |     })
  154 |     expect([401, 403]).toContain(res.status())
  155 |   })
  156 | })
  157 | 
```