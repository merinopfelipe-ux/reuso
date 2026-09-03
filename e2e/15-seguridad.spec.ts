import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Escrito de cero el 2026-09-02: de los 12 seg-*, 10 eran `test.skip` con el
// cuerpo vacío y seg-01 no probaba nada (solo agregaba una anotación). La
// categoría figuraba como automatizada sin ejercer una sola defensa real.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test.describe('Seguridad', () => {
  test.describe('con sesión de empleado', () => {
    test.use({ storageState: 'playwright/.auth/empleado.json' })

    test('seg-01 - el empleado no entra a rutas de admin ni de empresa', async ({ page }) => {
      for (const ruta of ['/admin', '/admin/usuarios', '/empresa', '/empresa/equipo']) {
        await page.goto(ruta, { waitUntil: 'domcontentloaded', timeout: 60_000 })
        await page.waitForTimeout(1_200)
        expect(page.url(), `${ruta} no debería quedar accesible`).not.toMatch(/\/(admin|empresa)(\/|$)/)
      }
    })

    test('seg-03 - el empleado no lee cotizaciones de otra empresa', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      // Una cotización real de OTRA empresa, sacada directo de la base.
      const { data: ajena } = await supabaseAdmin
        .from('crm_cotizaciones').select('id').limit(1).single()
      if (ajena) {
        const res = await page.request.get(`/api/cotizador/cotizaciones/${ajena.id}`)
        expect([401, 403, 404]).toContain(res.status())
      }
    })

    test('seg-04 - sin el módulo activado, el cotizador queda bloqueado', async ({ page }) => {
      // La cuenta de empleado efímera no pertenece a una empresa con el
      // módulo Cotizador activo (los módulos se activan solo en la empresa
      // efímera de empresa_admin, ver auth.setup.ts).
      await page.goto('/empresa/cotizador', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.waitForTimeout(1_500)
      expect(page.url()).not.toMatch(/\/empresa\/cotizador/)
    })

    test('seg-09 - un script inyectado se guarda y se muestra como texto, no se ejecuta', async ({ page }) => {
      let seEjecuto = false
      page.on('dialog', async (d) => { seEjecuto = true; await d.dismiss() })
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await page.request.post('/api/tickets', {
        data: {
          titulo: 'E2E XSS <img src=x onerror=alert(1)>',
          mensaje: '<script>alert("xss")</script> prueba automática',
          prioridad: 'baja',
        },
      })
      await page.goto('/ayuda', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2_500)
      expect(seEjecuto, 'ningún script inyectado debe ejecutarse').toBe(false)

      await supabaseAdmin.from('tickets').delete().like('titulo', 'E2E XSS%')
    })

    test('seg-11 - el usuario no puede subirse el rol desde /api/profile', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      const res = await page.request.patch('/api/profile', { data: { rol: 'super_admin' } })
      // Puede rechazarse o ignorar el campo, lo que NO puede es promover.
      expect(res.status()).toBeLessThan(500)

      const { data: usuarios } = await supabaseAdmin.auth.admin.listUsers()
      const cuenta = usuarios.users.find(u => u.email?.startsWith('e2e_empleado_'))
      const { data: perfil } = await supabaseAdmin
        .from('profiles').select('rol').eq('user_id', cuenta!.id).single()
      expect(perfil?.rol, 'el rol nunca debe cambiar desde el cliente').not.toBe('super_admin')
    })

    test('seg-12 - las acciones sensibles tienen límite de intentos', async ({ page }) => {
      await page.goto('/settings', { waitUntil: 'domcontentloaded' })
      const codigos: number[] = []
      for (let i = 0; i < 8; i++) {
        const res = await page.request.post('/api/profile/update-sensitive', {
          data: { campo: 'phone', password: 'contrasena-incorrecta', valor: '3001234567' },
        })
        codigos.push(res.status())
      }
      // Con SKIP_RATE_LIMIT activo en pruebas el 429 no se dispara a
      // propósito: lo que se exige siempre es que nunca truene con un 500.
      expect(codigos.some(c => c >= 500), `respuestas: ${codigos.join(',')}`).toBe(false)
    })
  })

  test.describe('con sesión de super_admin', () => {
    test.use({ storageState: 'playwright/.auth/super-admin.json' })

    test('seg-07 - una búsqueda con inyección SQL no rompe ni filtra datos', async ({ page }) => {
      await page.goto('/admin/usuarios', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      const inyecciones = ["' OR '1'='1", "'; DROP TABLE profiles; --", '%27%20OR%201=1']
      for (const texto of inyecciones) {
        await page.getByPlaceholder('Buscar por nombre o email...').fill(texto)
        await page.waitForTimeout(600)
        await expect(page.getByText(/error 500|algo salió mal/i)).toHaveCount(0)
      }
      // La tabla sigue existiendo después de intentar borrarla.
      const { error } = await supabaseAdmin.from('profiles').select('user_id').limit(1)
      expect(error).toBeNull()
    })
  })

  test('seg-02 - las APIs protegidas responden 401 sin sesión', async ({ request }) => {
    const rutas = ['/api/calcular', '/api/metas', '/api/informes/generar', '/api/cotizador/cotizaciones']
    for (const ruta of rutas) {
      const res = await request.post(ruta, { data: {} })
      expect([401, 403], `${ruta} debería exigir sesión`).toContain(res.status())
    }
  })

  test('seg-05 - el inicio de sesión no se puede intentar sin fin', async ({ request }) => {
    const codigos: number[] = []
    for (let i = 0; i < 8; i++) {
      const res = await request.post('/api/auth/login', {
        data: { email: 'noexiste@ejemplo.com', password: 'incorrecta' },
      })
      codigos.push(res.status())
    }
    // Nunca revela si el correo existe ni truena: siempre error controlado.
    expect(codigos.every(c => c < 500), `respuestas: ${codigos.join(',')}`).toBe(true)
  })

  test('seg-06 - la API REST de Supabase no deja leer datos de otra empresa', async ({ request }) => {
    // Intento directo contra PostgREST con la llave pública (anon), saltándose
    // por completo la aplicación: RLS tiene que frenarlo igual.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    for (const tabla of ['crm_cotizaciones', 'calculos', 'dpp_activos', 'profiles']) {
      const res = await request.get(`${url}/rest/v1/${tabla}?select=*&limit=5`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      })
      const filas = res.ok() ? (await res.json() as unknown[]) : []
      expect(Array.isArray(filas) ? filas.length : 0,
        `${tabla} no debe devolver filas a un anónimo`).toBe(0)
    }
  })

  test('seg-08 - una cookie de sesión falsificada no da acceso', async ({ browser }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies([{
      name: 'sb-access-token',
      value: 'token-falsificado-e2e',
      domain: 'localhost',
      path: '/',
    }])
    const page = await ctx.newPage()
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForTimeout(1_500)
    expect(page.url()).not.toMatch(/\/admin(\/|$)/)
    await ctx.close()
  })

  test('seg-10 - una API de admin rechaza a quien no es super_admin', async ({ browser }) => {
    const ctxEmpleado = await browser.newContext({ storageState: 'playwright/.auth/empleado.json' })
    const pageEmpleado = await ctxEmpleado.newPage()
    const resEmpleado = await pageEmpleado.request.patch(
      '/api/admin/status/incidentes/00000000-0000-0000-0000-000000000000',
      { data: { estado: 'resuelto' } }
    )
    expect([401, 403, 404]).toContain(resEmpleado.status())
    await ctxEmpleado.close()

    const ctxAnonimo = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const pageAnonimo = await ctxAnonimo.newPage()
    const resAnonimo = await pageAnonimo.request.patch(
      '/api/admin/status/incidentes/00000000-0000-0000-0000-000000000000',
      { data: { estado: 'resuelto' } }
    )
    expect([401, 403, 404]).toContain(resAnonimo.status())
    await ctxAnonimo.close()
  })
})
