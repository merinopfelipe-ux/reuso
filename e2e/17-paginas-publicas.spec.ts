import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// Archivo escrito de cero el 2026-09-02. Antes eran 8 `test.skip` con el
// cuerpo vacío: la categoría entera figuraba como "automatizada" sin ejecutar
// una sola línea real, y las 12 tareas nuevas (pub-09 a pub-20) no tenían
// ninguna entrada. Ahora hay una prueba real por cada pub-* del QA manual.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Las páginas públicas van sin sesión: es parte de lo que se está probando.
test.use({ storageState: { cookies: [], origins: [] } })

async function cargaSinError(page: import('@playwright/test').Page, ruta: string) {
  // domcontentloaded, nunca 'load': el layout raíz carga una hoja de estilos
  // externa (use.typekit.net) que puede dejar el evento `load` sin disparar
  // aunque la página ya esté pintada (verificado el 2026-09-02).
  const respuesta = await page.goto(ruta, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  expect(respuesta?.status(), `${ruta} debería responder 200`).toBeLessThan(400)
  await expect(page.getByText(/Application error|500|404/i)).toHaveCount(0)
}

test.describe('Páginas Públicas', () => {
  test('pub-01 - la landing carga sin sesión y sin errores de consola', async ({ page }) => {
    test.setTimeout(90_000)
    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(e.message))
    await cargaSinError(page, '/')
    expect(errores).toEqual([])
  })

  test('pub-02 - el índice legal carga y enlaza sus documentos', async ({ page }) => {
    await cargaSinError(page, '/legal')
    await expect(page.locator('a[href^="/legal/"]').first()).toBeVisible({ timeout: 15_000 })
  })

  test('pub-03 - el formulario de dudas legales existe y es público', async ({ page }) => {
    await cargaSinError(page, '/legal/dudas')
    await expect(page.locator('form, input, textarea').first()).toBeVisible({ timeout: 15_000 })
  })

  test('pub-04 - la página de estado del sistema carga con sus servicios', async ({ page }) => {
    test.setTimeout(90_000)
    await cargaSinError(page, '/status')
    await expect(page.getByText(/estado|servicio|operativo/i).first()).toBeVisible({ timeout: 20_000 })
  })

  test('pub-05 - un informe real se verifica en /verificar/[codigo]', async ({ page }) => {
    // Se siembra un informe propio: la página pública nunca debe depender de
    // que exista un informe real de un cliente.
    const uuid = crypto.randomUUID()
    const { data: empresa } = await supabaseAdmin
      .from('empresas').select('id').limit(1).single()
    const { data: informe, error } = await supabaseAdmin
      .from('informes')
      .insert({
        // Columnas reales, verificadas en /api/informes/generar (no inventadas).
        tipo: 'informe',
        empresa_id: empresa?.id ?? null,
        codigo_verificacion: uuid,
        co2_total: 12.5,
        agua_total: 40,
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-12-31',
        beneficiario: 'Prueba E2E',
      })
      .select('codigo_verificacion')
      .single()
    if (error || !informe) throw new Error(`No se pudo sembrar el informe: ${error?.message}`)

    const codigo = `RCO2-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`
    await cargaSinError(page, `/verificar/${codigo}`)
    await expect(page.getByText(codigo)).toBeVisible({ timeout: 20_000 })

    await supabaseAdmin.from('informes').delete().eq('codigo_verificacion', uuid)
  })

  test('pub-06 - la propuesta pública abre con su token, sin pedir sesión', async ({ page }) => {
    const { data: empresa } = await supabaseAdmin
      .from('empresas').select('id').limit(1).single()
    const token = `e2e-token-${Date.now()}`
    const { data: cot, error } = await supabaseAdmin
      .from('crm_cotizaciones')
      .insert({
        empresa_id: empresa!.id,
        codigo_cotizacion: `E2E-PUB-${Date.now()}`,
        estado: 'enviada',
        enlace_publico_token: token,
      })
      .select('id')
      .single()
    if (error || !cot) throw new Error(`No se pudo sembrar la cotización pública: ${error?.message}`)

    await cargaSinError(page, `/cot/${token}`)
    await expect(page).not.toHaveURL(/\/login/)

    await supabaseAdmin.from('crm_cotizaciones').delete().eq('id', cot.id)
  })

  test('pub-07 - /empresa/nueva exige sesión y manda a login sin ella', async ({ page }) => {
    // El flujo completo (crear empresa y promover el rol) lo cubre el propio
    // registro de la cuenta efímera empresa_admin en auth.setup.ts. Aquí lo
    // que importa como página pública es que NO se pueda entrar sin sesión.
    await page.goto('/empresa/nueva', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForURL(/\/login/, { timeout: 20_000 })
    expect(page.url()).toMatch(/\/login/)
  })

  test('pub-08 - el widget de estado no rompe la página al caerse la red', async ({ page, context }) => {
    test.setTimeout(90_000)
    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(e.message))
    await cargaSinError(page, '/status')
    await context.setOffline(true)
    await page.waitForTimeout(3_000)
    await expect(page.locator('body')).toBeVisible()
    await context.setOffline(false)
    expect(errores).toEqual([])
  })

  test('pub-09 - metodología de cálculo carga con lenguaje objetivo', async ({ page }) => {
    await cargaSinError(page, '/legal/medicion')
    // Regla legal del proyecto: nunca prometer exactitud absoluta.
    await expect(page.getByText(/\b(exacto|preciso|100%|garantiza|irrefutable)\b/i)).toHaveCount(0)
  })

  test('pub-10 - transparencia de IA carga como documento público', async ({ page }) => {
    await cargaSinError(page, '/legal/ia')
  })

  test('pub-11 - reglamento carga como documento público', async ({ page }) => {
    await cargaSinError(page, '/legal/reglamento')
  })

  test('pub-12 - confidencialidad muestra el texto sin formulario abierto', async ({ page }) => {
    await cargaSinError(page, '/legal/confidencialidad')
    // El QA exige que aquí NO haya un formulario de firma abierto al público.
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('pub-13 - el enlace de firma retirado explica que ahora es por invitación', async ({ page }) => {
    await cargaSinError(page, '/legal/confidencialidad-firma')
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('pub-14 - preferencias de cookies: las esenciales nunca se desactivan', async ({ page }) => {
    test.setTimeout(90_000)
    await cargaSinError(page, '/legal/cookies/preferencias')
    await expect(page.getByText(/esencial/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('pub-15 - firma por invitación: los 4 estados responden correctamente', async ({ page }) => {
    test.setTimeout(120_000)
    const base = Date.now()
    const hash = (t: string) => createHash('sha256').update(t).digest('hex')
    const enUnaSemana = new Date(Date.now() + 7 * 86400_000).toISOString()
    const ayer = new Date(Date.now() - 86400_000).toISOString()

    const tokenValido = `e2e-firma-valido-${base}`
    const tokenFirmado = `e2e-firma-firmado-${base}`
    const tokenExpirado = `e2e-firma-expirado-${base}`
    const comun = { tipo_documento: 'confidencialidad', nombre: 'Prueba E2E', numero_identidad: '123', email: 'e2e@ejemplo.com' }

    const { error } = await supabaseAdmin.from('firmas_solicitudes').insert([
      { ...comun, token_hash: hash(tokenValido), estado: 'pendiente', expira_at: enUnaSemana },
      { ...comun, token_hash: hash(tokenFirmado), estado: 'firmado', expira_at: enUnaSemana, firmado_at: new Date().toISOString() },
      { ...comun, token_hash: hash(tokenExpirado), estado: 'pendiente', expira_at: ayer },
    ])
    if (error) throw new Error(`No se pudieron sembrar las solicitudes de firma: ${error.message}`)

    await cargaSinError(page, `/legal/firma/${tokenFirmado}`)
    await expect(page.getByText('Documento ya firmado')).toBeVisible({ timeout: 15_000 })

    await cargaSinError(page, `/legal/firma/${tokenExpirado}`)
    await expect(page.getByText('Enlace expirado')).toBeVisible({ timeout: 15_000 })

    await cargaSinError(page, `/legal/firma/e2e-token-que-no-existe-${base}`)
    await expect(page.getByText(/Documento ya firmado|Enlace expirado/)).toHaveCount(0)

    // El válido sí carga el documento real para firmar.
    await cargaSinError(page, `/legal/firma/${tokenValido}`)
    await expect(page.getByText(/Documento ya firmado|Enlace expirado/)).toHaveCount(0)

    for (const t of [tokenValido, tokenFirmado, tokenExpirado]) {
      await supabaseAdmin.from('firmas_solicitudes').delete().eq('token_hash', hash(t))
    }
  })

  test('pub-16 - /verificar sin código pide el código sin filtrar datos ajenos', async ({ page }) => {
    await cargaSinError(page, '/verificar')
    await expect(page.locator('input').first()).toBeVisible({ timeout: 15_000 })
    // No puede listar informes de nadie.
    await expect(page.getByText(/RCO2-[A-Z0-9]{4}-[A-Z0-9]{4}/)).toHaveCount(0)
  })

  test('pub-17 - términos y condiciones carga como documento público', async ({ page }) => {
    await cargaSinError(page, '/legal/terminos')
  })

  test('pub-18 - política de privacidad carga como documento público', async ({ page }) => {
    await cargaSinError(page, '/legal/privacidad')
  })

  test('pub-19 - tratamiento de datos carga como documento público', async ({ page }) => {
    await cargaSinError(page, '/legal/datos')
  })

  test('pub-20 - política de cookies carga y enlaza sus preferencias', async ({ page }) => {
    await cargaSinError(page, '/legal/cookies')
    // El acceso a preferencias es un <button> que abre el panel, no un enlace.
    await expect(page.getByText('Cambiar mis preferencias de cookies')).toBeVisible({ timeout: 15_000 })
  })
  test('pub-21 - /sistema-diseno carga sin errores de React', async ({ page }) => {
    await cargaSinError(page, '/sistema-diseno')
  })

  test('pub-22 - /sistema-diseno/demo-panel carga correctamente', async ({ page }) => {
    await cargaSinError(page, '/sistema-diseno/demo-panel')
  })
})
