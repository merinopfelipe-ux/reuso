# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> auth: super_admin
- Location: e2e/auth.setup.ts:110:6

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
  - main [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - link "Ir al inicio" [ref=e7] [cursor=pointer]:
          - /url: /
          - img "Calculadora de Reúso" [ref=e8]
        - paragraph [ref=e9]:
          - text: ¿Quieres crear una cuenta?
          - link "Regístrate" [ref=e10] [cursor=pointer]:
            - /url: /registro
      - generic [ref=e11]:
        - generic [ref=e12]:
          - img [ref=e14]
          - heading "Bienvenido" [level=1] [ref=e18]
          - paragraph [ref=e19]: Ingresa tus datos para continuar.
        - alert [ref=e20]: Credenciales incorrectas. Verifica tu email y contraseña.
        - generic [ref=e21]:
          - generic [ref=e22]:
            - generic [ref=e23]: "Correo electrónico:"
            - generic [ref=e24]:
              - img [ref=e26]
              - textbox "Correo electrónico:" [ref=e29]:
                - /placeholder: usuario@empresa.com
                - text: merinop@me.com
          - generic [ref=e30]:
            - generic [ref=e31]: "Contraseña:"
            - generic [ref=e32]:
              - img [ref=e34]
              - textbox "Contraseña:" [ref=e37]:
                - /placeholder: ••••••••
                - text: f33N51AnSqcRWsdEsKUeAa1!
              - button "Mostrar contraseña" [ref=e38] [cursor=pointer]:
                - img [ref=e40]
          - generic [ref=e43]:
            - generic [ref=e44] [cursor=pointer]:
              - img [ref=e45]
              - generic [ref=e47]: Recuérdame.
            - link "¿Olvidaste tu contraseña?" [ref=e48] [cursor=pointer]:
              - /url: /recuperar?email=merinop%40me.com
          - generic [ref=e50]:
            - button "Aceptar términos legales" [ref=e51] [cursor=pointer]:
              - img [ref=e52]
            - generic [ref=e55]:
              - text: Al acceder, acepto los
              - link "términos legales" [ref=e56] [cursor=pointer]:
                - /url: /legal
              - text: .
          - button "Ingresar" [ref=e57] [cursor=pointer]
      - generic [ref=e59]:
        - generic [ref=e60]:
          - img "Grupo MLP" [ref=e61]
          - paragraph [ref=e62]: Grupo MLP ©2026. Todos los derechos reservados.
        - generic [ref=e63]:
          - button "ES" [ref=e65] [cursor=pointer]:
            - text: ES
            - img [ref=e66]
          - button "Cambiar a tema oscuro" [ref=e68] [cursor=pointer]:
            - img [ref=e69]
    - generic [ref=e71]:
      - generic:
        - img
      - generic [ref=e72]:
        - generic [ref=e73]:
          - generic [ref=e74]:
            - heading "Medimos nuestro impacto ambiental con total transparencia." [level=2] [ref=e75]
            - paragraph [ref=e76]: “Con Calculadora de Reúso ingresamos el mobiliario recuperado de nuestras oficinas en tiempo récord. Ahora comunicamos un estimado de CO₂ evitado con códigos QR verificables que conectan con nuestros clientes.”
          - generic [ref=e77]:
            - generic [ref=e78]: LM
            - generic [ref=e79]:
              - paragraph [ref=e80]: Laura Méndez
              - paragraph [ref=e81]: Directora de Sostenibilidad
        - generic [ref=e82]:
          - generic [ref=e83]:
            - button "Ir al testimonio 1" [ref=e84] [cursor=pointer]
            - button "Ir al testimonio 2" [ref=e85] [cursor=pointer]
            - button "Ir al testimonio 3" [ref=e86] [cursor=pointer]
          - generic [ref=e87]:
            - button "Testimonio anterior" [ref=e88] [cursor=pointer]:
              - img [ref=e89]
            - button "Testimonio siguiente" [ref=e91] [cursor=pointer]:
              - img [ref=e93]
  - alert [ref=e95]
```

# Test source

```ts
  22  | )
  23  | 
  24  | function generarPassword(): string {
  25  |   const bytes = Array.from({ length: 18 }, () => Math.floor(Math.random() * 256))
  26  |   const base = Buffer.from(bytes).toString('base64').replace(/[+/=]/g, '')
  27  |   return base.slice(0, 20) + 'Aa1!'
  28  | }
  29  | 
  30  | async function crearCuentaEfimera(rol: 'usuario_libre' | 'empleado' | 'empresa_admin', nombre: string) {
  31  |   const email = `e2e_${rol}_${Date.now()}@reuso.lurdes.co`
  32  |   const password = generarPassword()
  33  | 
  34  |   const { data: nuevo, error } = await supabaseAdmin.auth.admin.createUser({
  35  |     email,
  36  |     password,
  37  |     email_confirm: true,
  38  |     user_metadata: { nombre },
  39  |   })
  40  |   if (error || !nuevo.user) throw new Error(`No se pudo crear cuenta efímera ${rol}: ${error?.message}`)
  41  | 
  42  |   await supabaseAdmin.from('profiles').upsert(
  43  |     { user_id: nuevo.user.id, email, nombre, rol },
  44  |     { onConflict: 'user_id' }
  45  |   )
  46  | 
  47  |   return { email, password, userId: nuevo.user.id }
  48  | }
  49  | 
  50  | interface CuentaEfimera { userId: string; email: string; password: string }
  51  | 
  52  | // Guarda email+password (no solo el id) para que otros archivos de e2e que
  53  | // inician sesión por su cuenta (ej. 07-auth.spec.ts) puedan leer las mismas
  54  | // credenciales recién creadas, en vez de depender de un valor fijo.
  55  | function registrarEfimero(rol: string, cuenta: CuentaEfimera) {
  56  |   const actuales: Record<string, CuentaEfimera> = fs.existsSync(EFIMEROS_PATH)
  57  |     ? JSON.parse(fs.readFileSync(EFIMEROS_PATH, 'utf-8'))
  58  |     : {}
  59  |   actuales[rol] = cuenta
  60  |   fs.mkdirSync(AUTH_DIR, { recursive: true })
  61  |   fs.writeFileSync(EFIMEROS_PATH, JSON.stringify(actuales, null, 2))
  62  | }
  63  | 
  64  | // Reinicia la lista de efímeros al arrancar la suite, para no arrastrar ids
  65  | // de una corrida anterior que ya se hayan borrado.
  66  | if (fs.existsSync(EFIMEROS_PATH)) fs.unlinkSync(EFIMEROS_PATH)
  67  | 
  68  | setup('auth: usuario_libre', async ({ page }) => {
  69  |   const cuenta = await crearCuentaEfimera('usuario_libre', 'E2E Usuario Libre')
  70  |   registrarEfimero('usuario_libre', cuenta)
  71  | 
  72  |   await page.goto('/login')
  73  |   await aceptarCookies(page)
  74  |   await page.locator('#email').fill(cuenta.email)
  75  |   await page.locator('#password').fill(cuenta.password)
  76  |   await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  77  |   await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  78  |   await page.waitForURL(/\/dashboard/, { timeout: 75_000 })
  79  |   await page.context().storageState({ path: `${AUTH_DIR}/usuario-libre.json` })
  80  | })
  81  | 
  82  | setup('auth: empleado', async ({ page }) => {
  83  |   const cuenta = await crearCuentaEfimera('empleado', 'E2E Empleado')
  84  |   registrarEfimero('empleado', cuenta)
  85  | 
  86  |   await page.goto('/login')
  87  |   await aceptarCookies(page)
  88  |   await page.locator('#email').fill(cuenta.email)
  89  |   await page.locator('#password').fill(cuenta.password)
  90  |   await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  91  |   await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  92  |   await page.waitForURL(/\/dashboard/, { timeout: 75_000 })
  93  |   await page.context().storageState({ path: `${AUTH_DIR}/empleado.json` })
  94  | })
  95  | 
  96  | setup('auth: empresa_admin', async ({ page }) => {
  97  |   const cuenta = await crearCuentaEfimera('empresa_admin', 'E2E Empresa Admin')
  98  |   registrarEfimero('empresa_admin', cuenta)
  99  | 
  100 |   await page.goto('/login')
  101 |   await aceptarCookies(page)
  102 |   await page.locator('#email').fill(cuenta.email)
  103 |   await page.locator('#password').fill(cuenta.password)
  104 |   await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  105 |   await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  106 |   await page.waitForURL(/\/empresa/, { timeout: 75_000 })
  107 |   await page.context().storageState({ path: `${AUTH_DIR}/empresa-admin.json` })
  108 | })
  109 | 
  110 | setup('auth: super_admin', async ({ page }) => {
  111 |   // Esta cuenta SÍ es real y permanente (tu identidad, merinop@me.com) —
  112 |   // nunca se crea ni se borra sola. La contraseña vive solo en .env.local.
  113 |   const password = process.env.TEST_SUPER_ADMIN_PASSWORD
  114 |   if (!password) throw new Error('Falta TEST_SUPER_ADMIN_PASSWORD en .env.local — ver e2e/auth.setup.ts')
  115 | 
  116 |   await page.goto('/login')
  117 |   await aceptarCookies(page)
  118 |   await page.locator('#email').fill(process.env.TEST_SUPER_ADMIN_EMAIL ?? 'merinop@me.com')
  119 |   await page.locator('#password').fill(password)
  120 |   await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  121 |   await page.getByRole('button', { name: /ingresar|sign in/i }).click()
> 122 |   await page.waitForURL(/\/admin/, { timeout: 75_000 })
      |              ^ TimeoutError: page.waitForURL: Timeout 75000ms exceeded.
  123 |   await page.context().storageState({ path: `${AUTH_DIR}/super-admin.json` })
  124 | })
  125 | 
```