# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 10-dashboard.spec.ts >> usuario_libre >> dash-10 - ticket de soporte persiste tras recargar
- Location: e2e/10-dashboard.spec.ts:105:7

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByPlaceholder(/describa brevemente/i)
Expected: not visible
Received: visible
Timeout:  10000ms

Call log:
  - Expect "not toBeVisible" with timeout 10000ms
  - waiting for getByPlaceholder(/describa brevemente/i)
    14 × locator resolved to <input value="E2E soporte 1781937296651" placeholder="Describa brevemente el problema"/>
       - unexpected value "visible"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - button "Menú" [ref=e6] [cursor=pointer]:
          - img [ref=e8]
          - generic [ref=e10]: Menú
        - img "Calculadora de Reúso" [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]:
          - img [ref=e15]
          - textbox "Buscar..." [ref=e17]
          - generic: ⌘K
        - generic [ref=e18]:
          - button "Cambiar a tema oscuro" [ref=e19] [cursor=pointer]:
            - img [ref=e20]
          - button "Centro de ayuda" [ref=e22] [cursor=pointer]:
            - img [ref=e23]
          - button "Alertas" [ref=e26] [cursor=pointer]:
            - img [ref=e27]
            - generic [ref=e29]: "1"
        - button "Menú de usuario" [ref=e32] [cursor=pointer]:
          - generic [ref=e33]:
            - paragraph [ref=e34]: test
            - paragraph [ref=e35]: Usuario
          - generic [ref=e36]: T
    - generic [ref=e37]:
      - complementary [ref=e38]:
        - navigation [ref=e40]:
          - img [ref=e44] [cursor=pointer]
          - img [ref=e49] [cursor=pointer]
          - img [ref=e54] [cursor=pointer]
          - img [ref=e59] [cursor=pointer]
          - img [ref=e64] [cursor=pointer]
          - img [ref=e70] [cursor=pointer]
          - img [ref=e75] [cursor=pointer]
        - button "Cerrar sesión" [ref=e78] [cursor=pointer]:
          - img [ref=e79]
          - generic: Cerrar sesión
      - generic [ref=e81]:
        - generic [ref=e82]:
          - generic [ref=e83]:
            - img [ref=e84]
            - generic [ref=e86]:
              - generic [ref=e87]: BBBB
              - generic [ref=e88]: jhlkhgjfjgff
          - button "Cerrar alerta" [ref=e89] [cursor=pointer]:
            - img [ref=e90]
        - main [ref=e92]:
          - generic [ref=e94]:
            - generic [ref=e95]:
              - generic [ref=e96]:
                - generic [ref=e97]:
                  - heading "Incidencias y Soporte" [level=2] [ref=e98]
                  - paragraph [ref=e99]: Registra casos de ayuda, preguntas o sugerencias y nuestro equipo te asistirá.
                - button "Crear Ticket" [ref=e100] [cursor=pointer]:
                  - img [ref=e101]
                  - text: Crear Ticket
              - generic [ref=e104]:
                - img [ref=e105]
                - paragraph [ref=e107]: No hay tickets que mostrar.
            - generic [ref=e109]:
              - heading "Nuevo Ticket" [level=3] [ref=e110]
              - generic [ref=e111]:
                - generic [ref=e112]:
                  - generic [ref=e113]: Asunto
                  - textbox "Describa brevemente el problema" [ref=e114]: E2E soporte 1781937296651
                - generic [ref=e115]:
                  - generic [ref=e116]: Motivo / Tipo
                  - combobox [ref=e117]:
                    - option "Duda General" [selected]
                    - option "Problema Técnico"
                    - option "Solicitud"
                    - option "Queja"
                - generic [ref=e118]:
                  - generic [ref=e119]: Detalles (opcional)
                  - textbox "Proporcione toda la información que considere relevante..." [ref=e120]: Descripción de prueba automatizada con suficientes caracteres.
              - generic [ref=e121]:
                - button "Cancelar" [ref=e122] [cursor=pointer]
                - button [disabled] [ref=e123]:
                  - img [ref=e124]
        - contentinfo [ref=e127]:
          - generic [ref=e128]:
            - generic [ref=e129]:
              - img "Grupo MLP" [ref=e130]
              - generic [ref=e132]:
                - paragraph [ref=e133]: © 2026 · Todos los derechos reservados.
                - paragraph [ref=e134]: Tecnología con propósito para un futuro sostenible.
            - generic [ref=e135]:
              - generic [ref=e136]:
                - link "Sobre la medición" [ref=e137] [cursor=pointer]:
                  - /url: /legal/medicion
                - generic [ref=e138]: •
                - link "Reglamento" [ref=e139] [cursor=pointer]:
                  - /url: /legal/reglamento
                - generic [ref=e140]: •
                - link "Política de privacidad" [ref=e141] [cursor=pointer]:
                  - /url: /legal/privacidad
              - generic [ref=e142]:
                - generic [ref=e143]:
                  - generic "186.121.98.145" [ref=e144]: "Dirección IP: 186.121.98.145"
                  - generic [ref=e145]: "|"
                  - generic [ref=e146]: "Última visita: sábado, 20 de junio de 2026, 6:34 a.m."
                - button "ES" [ref=e148] [cursor=pointer]:
                  - text: ES
                  - img [ref=e149]
  - alert [ref=e151]
```

# Test source

```ts
  14  |   test.use({ storageState: 'playwright/.auth/usuario-libre.json' })
  15  | 
  16  |   test.beforeEach(async ({ page }) => {
  17  |     await page.goto('/dashboard')
  18  |     await page.waitForLoadState('load')
  19  |   })
  20  | 
  21  |   test('dash-01 - login aterriza en /dashboard con saludo', async ({ page }) => {
  22  |     await expect(page).toHaveURL(/\/dashboard/)
  23  |     await expect(page.getByText(/hola/i).first()).toBeVisible()
  24  |   })
  25  | 
  26  |   test('dash-02 - peso cero no habilita el botón guardar', async ({ page }) => {
  27  |     const boton = page.locator('button').filter({ hasText: /Ropa y Textiles|Muebles/i }).first()
  28  |     await expect(boton).toBeVisible({ timeout: 10_000 })
  29  |     await boton.click()
  30  |     const input = page.locator('input[type="number"]').first()
  31  |     await input.click({ clickCount: 3 })
  32  |     await page.keyboard.type('0')
  33  |     await expect(page.locator('button:has-text("Guardar cálculo")')).toBeDisabled({ timeout: 3_000 })
  34  |   })
  35  | 
  36  |   test('dash-03 - guardar cálculo persiste en historial tras recargar', async ({ page }) => {
  37  |     await seleccionarCategoriaYPeso(page, '2')
  38  |     const botonGuardar = page.locator('button:has-text("Guardar cálculo")')
  39  |     await expect(botonGuardar).toBeEnabled({ timeout: 5_000 })
  40  |     await botonGuardar.click()
  41  |     await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })
  42  | 
  43  |     await page.goto('/dashboard/historial')
  44  |     await page.waitForLoadState('load')
  45  |     await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  46  |   })
  47  | 
  48  |   test('dash-04 - total CO₂ en tiempo real es mayor que cero', async ({ page }) => {
  49  |     await seleccionarCategoriaYPeso(page, '5')
  50  |     const totalCO2 = page.locator('text=/\\d+\\.\\d+ kg CO₂/').first()
  51  |     await expect(totalCO2).toBeVisible({ timeout: 5_000 })
  52  |     const texto = await totalCO2.textContent()
  53  |     const numero = parseFloat(texto?.match(/[\d.]+/)?.[0] ?? '0')
  54  |     expect(numero).toBeGreaterThan(0)
  55  |   })
  56  | 
  57  |   test('dash-05 - "Calcular más objetos" limpia el panel de resultado', async ({ page }) => {
  58  |     await seleccionarCategoriaYPeso(page, '2')
  59  |     await page.locator('button:has-text("Guardar cálculo")').click()
  60  |     await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })
  61  |     await page.getByText('Calcular más objetos').click()
  62  |     await expect(page.getByText('¡Cálculo guardado!')).not.toBeVisible({ timeout: 5_000 })
  63  |   })
  64  | 
  65  |   test('dash-06 - plan Explora bloquea certificados con mensaje exacto', async ({ page }) => {
  66  |     await page.goto('/dashboard/certificados')
  67  |     await page.waitForLoadState('load')
  68  |     await page.locator('button:has-text("Generar certificado")').click()
  69  |     await expect(
  70  |       page.getByText('El plan Explora no incluye generación de certificados. Contacta a reuso.lurdes.co para ampliar tu plan.')
  71  |     ).toBeVisible({ timeout: 10_000 })
  72  |   })
  73  | 
  74  |   test('dash-07 - plan Explora bloquea informes con mensaje exacto', async ({ page }) => {
  75  |     await page.goto('/dashboard/certificados')
  76  |     await page.waitForLoadState('load')
  77  |     await page.locator('button:has-text("Generar informe")').click()
  78  |     const fechaInicio = page.locator('input[type="date"]').first()
  79  |     await expect(fechaInicio).toBeVisible({ timeout: 8_000 })
  80  |     await fechaInicio.fill('2024-01-01')
  81  |     await page.locator('input[type="date"]').nth(1).fill('2024-12-31')
  82  |     await page.locator('button:has-text("Generar informe")').last().click()
  83  |     await expect(
  84  |       page.getByText('El plan Explora no incluye generación de informes. Contacta a reuso.lurdes.co para ampliar tu plan.')
  85  |     ).toBeVisible({ timeout: 10_000 })
  86  |   })
  87  | 
  88  |   test('dash-08 - historial de usuario_libre tiene máximo 15 filas', async ({ page }) => {
  89  |     await page.goto('/dashboard/historial')
  90  |     await page.waitForLoadState('load')
  91  |     await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  92  |     const filas = await page.locator('table tbody tr').count()
  93  |     expect(filas).toBeLessThanOrEqual(15)
  94  |   })
  95  | 
  96  |   test('dash-09 - modal informe abre con campos fecha y cierra correctamente', async ({ page }) => {
  97  |     await page.goto('/dashboard/certificados')
  98  |     await page.waitForLoadState('load')
  99  |     await page.locator('button:has-text("Generar informe")').click()
  100 |     await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 8_000 })
  101 |     await page.getByText('Cancelar').click()
  102 |     await expect(page.locator('input[type="date"]').first()).not.toBeVisible({ timeout: 5_000 })
  103 |   })
  104 | 
  105 |   test('dash-10 - ticket de soporte persiste tras recargar', async ({ page }) => {
  106 |     await page.goto('/dashboard/soporte')
  107 |     await page.waitForLoadState('load')
  108 |     const tituloUnico = `E2E soporte ${Date.now()}`
  109 |     await page.getByText(/crear ticket/i).click()
  110 |     await page.getByPlaceholder(/describa brevemente/i).fill(tituloUnico)
  111 |     await page.getByRole('combobox').first().selectOption('duda')
  112 |     await page.getByPlaceholder(/proporcione toda/i).fill('Descripción de prueba automatizada con suficientes caracteres.')
  113 |     await page.getByText('Enviar Ticket').click()
> 114 |     await expect(page.getByPlaceholder(/describa brevemente/i)).not.toBeVisible({ timeout: 10_000 })
      |                                                                     ^ Error: expect(locator).not.toBeVisible() failed
  115 | 
  116 |     await page.reload()
  117 |     await page.waitForLoadState('load')
  118 |     await expect(page.getByText(tituloUnico)).toBeVisible({ timeout: 10_000 })
  119 |   })
  120 | 
  121 |   test('dash-11 - /empresa/nueva accesible para usuario_libre', async ({ page }) => {
  122 |     await page.goto('/empresa/nueva')
  123 |     await page.waitForLoadState('load')
  124 |     await expect(page).not.toHaveURL(/\/login/)
  125 |   })
  126 | 
  127 |   test('dash-12 - /admin bloqueado por URL directa', async ({ page }) => {
  128 |     await page.goto('/admin')
  129 |     await page.waitForURL(/(?!.*\/admin)/, { timeout: 8_000 })
  130 |     expect(page.url()).not.toMatch(/\/admin/)
  131 |   })
  132 | 
  133 |   test('dash-13 - API /api/calcular rechaza petición sin autenticación', async ({ browser }) => {
  134 |     const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  135 |     const page = await ctx.newPage()
  136 |     const res = await page.request.post('/api/calcular', {
  137 |       data: { items: [{ id: '00000000-0000-0000-0000-000000000000', peso_kg: 1 }] },
  138 |     })
  139 |     expect(res.status()).toBe(401)
  140 |     await ctx.close()
  141 |   })
  142 | 
  143 |   test('dash-14 - logout invalida la sesión correctamente', async ({ page }) => {
  144 |     await page.request.post('/api/auth/logout')
  145 |     await page.goto('/dashboard')
  146 |     await page.waitForURL(/\/login/, { timeout: 10_000 })
  147 |     await expect(page).toHaveURL(/\/login/)
  148 |   })
  149 | })
  150 | 
```