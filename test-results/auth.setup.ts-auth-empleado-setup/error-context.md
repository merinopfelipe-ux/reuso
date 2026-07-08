# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> auth: empleado
- Location: e2e/auth.setup.ts:20:6

# Error details

```
TimeoutError: page.waitForURL: Timeout 75000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - img "Reúso" [ref=e6]
        - paragraph [ref=e7]:
          - text: ¿Quieres crear una cuenta?
          - link "Regístrate" [ref=e8] [cursor=pointer]:
            - /url: /registro
      - generic [ref=e9]:
        - generic [ref=e10]:
          - img [ref=e12]
          - heading "Bienvenido" [level=1] [ref=e16]
          - paragraph [ref=e17]: Ingresa tus datos para continuar.
        - alert [ref=e18]: Credenciales incorrectas. Verifica tu email y contraseña.
        - generic [ref=e19]:
          - generic [ref=e20]:
            - generic [ref=e21]: "Correo electrónico:"
            - generic [ref=e22]:
              - img [ref=e24]
              - textbox "Correo electrónico:" [ref=e27]:
                - /placeholder: usuario@empresa.com
                - text: empleado@reuso.lurdes.co
          - generic [ref=e28]:
            - generic [ref=e29]: "Contraseña:"
            - generic [ref=e30]:
              - img [ref=e32]
              - textbox "Contraseña:" [ref=e35]:
                - /placeholder: ••••••••
                - text: TestReuso2024!
              - button "Mostrar contraseña" [ref=e36] [cursor=pointer]:
                - img [ref=e37]
          - generic [ref=e40]:
            - generic [ref=e41] [cursor=pointer]:
              - img [ref=e42]
              - generic [ref=e44]: Recuérdame.
            - link "¿Olvidaste tu contraseña?" [ref=e45] [cursor=pointer]:
              - /url: /recuperar?email=empleado%40reuso.lurdes.co
          - generic [ref=e47]:
            - button "Aceptar términos legales" [ref=e48] [cursor=pointer]:
              - img [ref=e49]
            - generic [ref=e52]:
              - text: Al acceder, acepto los
              - link "términos legales" [ref=e53] [cursor=pointer]:
                - /url: /legal
              - text: .
          - button "Ingresar" [ref=e54] [cursor=pointer]
      - generic [ref=e56]:
        - generic [ref=e57]:
          - img "Grupo MLP" [ref=e58]
          - paragraph [ref=e59]: Grupo MLP ©2026. Todos los derechos reservados.
        - generic [ref=e60]:
          - button "ES" [ref=e62] [cursor=pointer]:
            - text: ES
            - img [ref=e63]
          - button "Cambiar a tema oscuro" [ref=e65] [cursor=pointer]:
            - img [ref=e66]
    - generic [ref=e68]:
      - generic:
        - img
      - generic [ref=e69]:
        - generic [ref=e70]:
          - img [ref=e72]
          - generic [ref=e75]:
            - heading "Certificamos nuestro impacto ambiental con total transparencia." [level=2] [ref=e76]
            - paragraph [ref=e77]: “Con Calculadora de Reúso certificamos todo el mobiliario recuperado de nuestras oficinas en tiempo récord. Ahora comunicamos el CO₂ evitado con códigos QR verificables que generan confianza real en nuestros clientes.”
          - generic [ref=e78]:
            - generic [ref=e79]: LM
            - generic [ref=e80]:
              - paragraph [ref=e81]: Laura Méndez
              - paragraph [ref=e82]: Directora de Sostenibilidad
        - generic [ref=e83]:
          - generic [ref=e84]:
            - button "Ir al testimonio 1" [ref=e85] [cursor=pointer]
            - button "Ir al testimonio 2" [ref=e86] [cursor=pointer]
            - button "Ir al testimonio 3" [ref=e87] [cursor=pointer]
          - generic [ref=e88]:
            - button "Testimonio anterior" [ref=e89] [cursor=pointer]:
              - img [ref=e90]
            - button "Testimonio siguiente" [ref=e92] [cursor=pointer]:
              - img [ref=e93]
  - alert [ref=e95]
```

# Test source

```ts
  1  | import { test as setup, expect } from '@playwright/test'
  2  | 
  3  | const AUTH_DIR = 'playwright/.auth'
  4  | 
  5  | async function aceptarCookies(page: any) {
  6  |   await page.locator('button', { hasText: /Solo esenciales|Essential only/ }).first().click({ timeout: 5000 }).catch(() => {})
  7  | }
  8  | 
  9  | setup('auth: usuario_libre', async ({ page }) => {
  10 |   await page.goto('/login')
  11 |   await aceptarCookies(page)
  12 |   await page.locator('#email').fill(process.env.TEST_USER_EMAIL ?? 'test@reuso.lurdes.co')
  13 |   await page.locator('#password').fill(process.env.TEST_USER_PASSWORD ?? 'TestReuso2024!')
  14 |   await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  15 |   await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  16 |   await page.waitForURL(/\/dashboard/, { timeout: 75_000 })
  17 |   await page.context().storageState({ path: `${AUTH_DIR}/usuario-libre.json` })
  18 | })
  19 | 
  20 | setup('auth: empleado', async ({ page }) => {
  21 |   await page.goto('/login')
  22 |   await aceptarCookies(page)
  23 |   await page.locator('#email').fill(process.env.TEST_EMPLEADO_EMAIL ?? 'empleado@reuso.lurdes.co')
  24 |   await page.locator('#password').fill(process.env.TEST_EMPLEADO_PASSWORD ?? 'TestReuso2024!')
  25 |   await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  26 |   await page.getByRole('button', { name: /ingresar|sign in/i }).click()
> 27 |   await page.waitForURL(/\/dashboard/, { timeout: 75_000 })
     |              ^ TimeoutError: page.waitForURL: Timeout 75000ms exceeded.
  28 |   await page.context().storageState({ path: `${AUTH_DIR}/empleado.json` })
  29 | })
  30 | 
  31 | setup('auth: empresa_admin', async ({ page }) => {
  32 |   await page.goto('/login')
  33 |   await aceptarCookies(page)
  34 |   await page.locator('#email').fill(process.env.TEST_ADMIN_EMPRESA_EMAIL ?? 'admin@reuso.lurdes.co')
  35 |   await page.locator('#password').fill(process.env.TEST_ADMIN_EMPRESA_PASSWORD ?? 'TestReuso2024!')
  36 |   await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  37 |   await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  38 |   await page.waitForURL(/\/empresa/, { timeout: 75_000 })
  39 |   await page.context().storageState({ path: `${AUTH_DIR}/empresa-admin.json` })
  40 | })
  41 | 
  42 | setup('auth: super_admin', async ({ page }) => {
  43 |   await page.goto('/login')
  44 |   await aceptarCookies(page)
  45 |   await page.locator('#email').fill(process.env.TEST_SUPER_ADMIN_EMAIL ?? 'merinop@me.com')
  46 |   await page.locator('#password').fill(process.env.TEST_SUPER_ADMIN_PASSWORD ?? 'Ejemplo123*')
  47 |   await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  48 |   await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  49 |   await page.waitForURL(/\/admin/, { timeout: 75_000 })
  50 |   await page.context().storageState({ path: `${AUTH_DIR}/super-admin.json` })
  51 | })
  52 | 
```