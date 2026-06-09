import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Cargar variables de entorno desde .env.local
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
        if (match) {
          const key = match[1]
          let val = match[2] || ''
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
          process.env[key] = val
        }
      }
    }
  } catch (e) {
    console.error('No se pudo cargar .env.local', e)
  }
}
loadEnv()

const emailA = `test_security_a_${Date.now()}@reuso.lurdes.co`
const emailB = `test_security_b_${Date.now()}@reuso.lurdes.co`
const password = 'TestSecurity123!'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

const createdUserIds: string[] = []

async function aceptarCookies(page: any) {
  await page.locator('button', { hasText: /Solo esenciales|Essential only/ }).first().click({ timeout: 5000 }).catch(() => {})
}

async function registrarUsuarioConAdmin(email: string, apodo: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre: 'Usuario Prueba',
      apellido: 'Aislado',
      apodo: apodo,
      telefono: '573001234567',
      acepta_terminos_at: new Date().toISOString()
    }
  })
  if (error || !data.user) {
    throw new Error(`Error al registrar usuario de prueba: ${error?.message || 'Usuario nulo'}`)
  }
  createdUserIds.push(data.user.id)
  return data.user
}

async function iniciarSesion(page: any, email: string) {
  await page.goto('/login')
  await page.waitForLoadState('load')
  await aceptarCookies(page)
  
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  
  // Activar "Recuérdame" para evitar que el evento beforeunload cierre la sesión en page.goto()
  await page.getByText(/Recuérdame|Remember me/i).first().click().catch(() => {})
  
  await page.locator('button[type="submit"]').click()
  
  // Dado que es una cuenta libre nueva, debería ir a /dashboard (o /empresa/nueva si redirige directamente)
  await page.waitForURL(/\/(dashboard|empresa\/nueva)/, { timeout: 15_000 })
}

test.describe('Aislamiento de Usuarios (Test A/B)', () => {
  // Limpiar cookies y localStorage para evitar interferencias
  test.use({ storageState: { cookies: [], origins: [] } })

  test.afterAll(async () => {
    console.log('Limpiando usuarios de prueba creados...')
    for (const id of createdUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(id).catch((err) => {
        console.error(`Error al borrar usuario ${id}:`, err)
      })
    }
  })

  test('Debe registrar dos usuarios, crear recurso privado con uno y denegar acceso al otro', async ({ page }) => {
    // 1. Registrar Usuario A y B usando la API admin para evitar límites de envío de correo
    console.log(`Registrando Usuario A: ${emailA}`)
    await registrarUsuarioConAdmin(emailA, 'usuario.a')
    
    console.log(`Registrando Usuario B: ${emailB}`)
    await registrarUsuarioConAdmin(emailB, 'usuario.b')

    // 2. Iniciar sesión con Usuario B
    console.log('Iniciando sesión con Usuario B')
    await iniciarSesion(page, emailB)

    // 3. Crear empresa para Usuario B (requerido para acceder a /empresa y crear DPP)
    console.log('Creando empresa para Usuario B')
    await page.goto('/empresa/nueva')
    await page.waitForLoadState('load')
    await page.locator('input[name="nombre"]').fill(`Empresa Prueba B ${Date.now()}`)
    await page.locator('select[name="sector"]').selectOption('Tecnología')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/empresa$/, { timeout: 15_000 })

    // 4. Crear un recurso privado (Pasaporte Digital - DPP)
    console.log('Creando activo DPP privado')
    await page.goto('/empresa/dpp/nuevo')
    await page.waitForLoadState('load')
    await page.locator('input[placeholder="Silla de madera, Mesa de oficina..."]').fill('Mesa de Seguridad Privada B')
    await page.locator('input[placeholder="8.5"]').fill('15.5')
    await page.locator('textarea[placeholder="Describe brevemente el objeto y su historia..."]').fill('Este es un activo confidencial de la Empresa B')
    
    await page.locator('button[type="submit"]').click()
    
    // Debería redirigir a /empresa/dpp/[id]
    await page.waitForURL(/\/empresa\/dpp\/[0-9a-fA-F-]{36}/, { timeout: 15_000 })
    const urlRecursoPrivado = page.url()
    console.log(`Recurso privado creado en la URL: ${urlRecursoPrivado}`)

    // 5. Cerrar la sesión del Usuario B
    console.log('Cerrando sesión de Usuario B')
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    // 6. Iniciar sesión con Usuario A
    console.log('Iniciando sesión con Usuario A')
    await iniciarSesion(page, emailA)

    // 7. Intentar navegar directamente al recurso privado de Usuario B
    console.log(`Usuario A intentando navegar a: ${urlRecursoPrivado}`)
    await page.goto(urlRecursoPrivado)
    await page.waitForLoadState('load')
    await page.waitForTimeout(2000)

    // 8. Afirmar (Assert) que la aplicación bloquea el acceso.
    console.log(`URL final tras intento de acceso: ${page.url()}`)
    
    const bodyText = await page.locator('body').innerText()
    console.log(`--- CONTENIDO DE LA PÁGINA ---`)
    console.log(bodyText.slice(0, 1000))
    console.log(`-----------------------------`)
    
    const cookies = await page.context().cookies()
    console.log(`Cookies en navegador:`, JSON.stringify(cookies, null, 2))

    expect(page.url()).not.toBe(urlRecursoPrivado)
    
    // Debería haber redirigido a /dashboard (por la validación de empresa_id ausente en el perfil)
    expect(page.url()).toMatch(/\/dashboard/)
  })
})
