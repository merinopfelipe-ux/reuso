import { test as setup, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const AUTH_DIR = 'playwright/.auth'
const EFIMEROS_PATH = path.join(AUTH_DIR, 'efimeros.json')

async function aceptarCookies(page: Page) {
  await page.locator('button', { hasText: /Solo esenciales|Essential only/ }).first().click({ timeout: 5000 }).catch(() => {})
}

// Las 3 cuentas semilla (usuario_libre, empleado, empresa_admin) ya NO son
// permanentes: se crean aquí mismo, con contraseña aleatoria nueva cada vez,
// y e2e/global-teardown.ts las borra al terminar toda la suite. Así nunca
// quedan como puertas fijas abiertas en la base de datos real — solo existen
// durante los minutos que dura la corrida. La cuenta de super_admin sí sigue
// siendo la real (merinop@me.com), porque esa es tu identidad de verdad.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generarPassword(): string {
  const bytes = Array.from({ length: 18 }, () => Math.floor(Math.random() * 256))
  const base = Buffer.from(bytes).toString('base64').replace(/[+/=]/g, '')
  return base.slice(0, 20) + 'Aa1!'
}

async function crearCuentaEfimera(rol: 'usuario_libre' | 'empleado' | 'empresa_admin', nombre: string) {
  const email = `e2e_${rol}_${Date.now()}@calculadoradereuso.com`
  const password = generarPassword()

  const { data: nuevo, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  })
  if (error || !nuevo.user) throw new Error(`No se pudo crear cuenta efímera ${rol}: ${error?.message}`)

  await supabaseAdmin.from('profiles').upsert(
    { user_id: nuevo.user.id, email, nombre, rol },
    { onConflict: 'user_id' }
  )

  return { email, password, userId: nuevo.user.id }
}

// Bug real corregido 2026-09-02: la cuenta efímera de empresa_admin solo
// tenía profiles.rol = 'empresa_admin', sin ninguna fila real en empresas ni
// empresa_id — la página real de /empresa (línea 141) hace
// `if (!perfil?.empresa_id) redirect('/dashboard')`, así que el setup se
// quedaba esperando para siempre una URL con "/empresa" que nunca llegaba.
// Esto bloqueaba TODA la suite (24 pruebas "did not run" tras el timeout).
async function crearEmpresaParaAdmin(userId: string): Promise<string> {
  const slug = `e2e-empresa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  // Bug real corregido 2026-09-02: con plan='free' (Explora, 0 informes
  // permitidos por config_planes), toda prueba que genera un informe real
  // (emp-03) recibia 429 "no incluye generación de informes" en vez del
  // flujo feliz que describe el checklist — usar 'lab' para que la empresa
  // de prueba sí tenga cuota real de informes/cálculos.
  const { data: empresa, error } = await supabaseAdmin
    .from('empresas')
    .insert({ nombre: 'E2E Empresa de Prueba', slug, plan: 'lab', activa: true })
    .select('id')
    .single()
  if (error || !empresa) throw new Error(`No se pudo crear la empresa efímera: ${error?.message}`)

  const { error: errorPerfil } = await supabaseAdmin
    .from('profiles')
    .update({ empresa_id: empresa.id })
    .eq('user_id', userId)
  if (errorPerfil) throw new Error(`No se pudo vincular empresa_id al perfil: ${errorPerfil.message}`)

  // Bug real corregido 2026-09-02: tener un plan pago no basta — el sistema
  // real tiene una capa aparte de módulos (modulos_empresas, 3 capas según
  // CLAUDE.md: software/línea de negocio/insumos). Sin esto, CUALQUIER
  // pantalla de cálculo/cotizador/DPP muestra el modal "no está en tu
  // plan" aunque el plan sí lo incluya — bloqueaba emp-02/03/04 y hubiera
  // bloqueado también las pruebas de Cotizador y DPP. modulos_usuarios no
  // hace falta: sin una fila ahí, el usuario hereda el acceso de la
  // empresa (ver middleware.ts).
  const { data: modulos } = await supabaseAdmin.from('modulos').select('id')
  if (modulos && modulos.length > 0) {
    await supabaseAdmin.from('modulos_empresas').insert(
      modulos.map(m => ({ modulo_id: m.id, empresa_id: empresa.id, activo: true }))
    )
  }

  return empresa.id
}

interface CuentaEfimera { userId: string; email: string; password: string; empresaId?: string }

// Guarda email+password (no solo el id) para que otros archivos de e2e que
// inician sesión por su cuenta (ej. 07-auth.spec.ts) puedan leer las mismas
// credenciales recién creadas, en vez de depender de un valor fijo.
function registrarEfimero(rol: string, cuenta: CuentaEfimera) {
  const actuales: Record<string, CuentaEfimera> = fs.existsSync(EFIMEROS_PATH)
    ? JSON.parse(fs.readFileSync(EFIMEROS_PATH, 'utf-8'))
    : {}
  actuales[rol] = cuenta
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  fs.writeFileSync(EFIMEROS_PATH, JSON.stringify(actuales, null, 2))
}

setup('auth: usuario_libre', async ({ page }) => {
  // Reinicia la lista de efímeros al arrancar la suite, para no arrastrar ids
  // de una corrida anterior que ya se hayan borrado.
  //
  // BUG REAL CORREGIDO 2026-09-02: este borrado estaba en el cuerpo del
  // módulo, o sea que corría cada vez que Playwright IMPORTABA el archivo.
  // Cuando un paso posterior fallaba y se reintentaba (por ejemplo
  // super_admin), el archivo se volvía a importar y borraba las cuentas ya
  // registradas de usuario_libre, empleado y empresa_admin: todas las
  // pruebas que leen efimeros.json morían después con ENOENT sin ninguna
  // relación aparente con el fallo original. Aquí adentro solo corre una vez
  // y en el primer paso, que se registra a sí mismo justo después.
  if (fs.existsSync(EFIMEROS_PATH)) fs.unlinkSync(EFIMEROS_PATH)

  const cuenta = await crearCuentaEfimera('usuario_libre', 'E2E Usuario Libre')
  registrarEfimero('usuario_libre', cuenta)

  await page.goto('/login')
  await aceptarCookies(page)
  await page.locator('#email').fill(cuenta.email)
  await page.locator('#password').fill(cuenta.password)
  await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 75_000 })
  await page.context().storageState({ path: `${AUTH_DIR}/usuario-libre.json` })
})

setup('auth: empleado', async ({ page }) => {
  const cuenta = await crearCuentaEfimera('empleado', 'E2E Empleado')
  registrarEfimero('empleado', cuenta)

  await page.goto('/login')
  await aceptarCookies(page)
  await page.locator('#email').fill(cuenta.email)
  await page.locator('#password').fill(cuenta.password)
  await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 75_000 })
  await page.context().storageState({ path: `${AUTH_DIR}/empleado.json` })
})

setup('auth: empresa_admin', async ({ page }) => {
  const cuenta = await crearCuentaEfimera('empresa_admin', 'E2E Empresa Admin')
  const empresaId = await crearEmpresaParaAdmin(cuenta.userId)
  registrarEfimero('empresa_admin', { ...cuenta, empresaId })

  await page.goto('/login')
  await aceptarCookies(page)
  await page.locator('#email').fill(cuenta.email)
  await page.locator('#password').fill(cuenta.password)
  await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  await page.waitForURL(/\/empresa/, { timeout: 75_000 })
  await page.context().storageState({ path: `${AUTH_DIR}/empresa-admin.json` })
})

setup('auth: super_admin', async ({ page }) => {
  // Esta cuenta SÍ es real y permanente (tu identidad, merinop@me.com) —
  // nunca se crea ni se borra sola. La contraseña vive solo en .env.local.
  const password = process.env.TEST_SUPER_ADMIN_PASSWORD
  if (!password) throw new Error('Falta TEST_SUPER_ADMIN_PASSWORD en .env.local — ver e2e/auth.setup.ts')

  await page.goto('/login')
  await aceptarCookies(page)
  await page.locator('#email').fill(process.env.TEST_SUPER_ADMIN_EMAIL ?? 'merinop@me.com')
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /aceptar términos legales/i }).click()
  await page.getByRole('button', { name: /ingresar|sign in/i }).click()
  await page.waitForURL(/\/admin/, { timeout: 75_000 })
  await page.context().storageState({ path: `${AUTH_DIR}/super-admin.json` })
})
