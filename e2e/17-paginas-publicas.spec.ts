import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

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

  test('pub-02 - la página de estado del sistema carga con sus servicios', async ({ page }) => {
    test.setTimeout(90_000)
    await cargaSinError(page, '/status')
    await expect(page.getByText(/estado|servicio|operativo/i).first()).toBeVisible({ timeout: 20_000 })
  })

  test('pub-03 - verificación de autenticidad de informes en /verificar y /verificar/[codigo]', async ({ page }) => {
    await cargaSinError(page, '/verificar')
    await expect(page.locator('input').first()).toBeVisible({ timeout: 15_000 })
    // No puede listar informes de nadie, ni mostrar el informe de demostración público.
    await expect(page.getByText(/RCO2-[A-Z0-9]{4}-[A-Z0-9]{4}/)).toHaveCount(0)
    await expect(page.getByText('RCO2-DEMO-0001')).toHaveCount(0)
    await expect(page.getByText(/Código de ejemplo/i)).toHaveCount(0)

    // Siembra de informe de prueba para verificar ruta dinámica
    const uuid = crypto.randomUUID()
    const { data: empresa } = await supabaseAdmin
      .from('empresas').select('id').limit(1).single()
    const { data: informe, error } = await supabaseAdmin
      .from('informes')
      .insert({
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
    await expect(page.getByText(codigo).first()).toBeVisible({ timeout: 20_000 })

    await supabaseAdmin.from('informes').delete().eq('codigo_verificacion', uuid)
  })

  test('pub-04 - la propuesta pública abre con su token, sin pedir sesión', async ({ page }) => {
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

  test('pub-05 - /empresa/nueva exige sesión y manda a login sin ella', async ({ page }) => {
    await page.goto('/empresa/nueva', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForURL(/\/login/, { timeout: 20_000 })
    expect(page.url()).toMatch(/\/login/)
  })

  test('pub-06 - /sistema-diseno carga sin errores de React', async ({ page }) => {
    await cargaSinError(page, '/sistema-diseno')
  })

  test('pub-07 - el índice legal carga y enlaza sus documentos', async ({ page }) => {
    await cargaSinError(page, '/legal')
    await expect(page.locator('a[href^="/legal/"]').first()).toBeVisible({ timeout: 15_000 })
  })

  test('pub-08 - términos y condiciones carga como documento público', async ({ page }) => {
    await cargaSinError(page, '/legal/terminos')
  })

  test('pub-09 - política de privacidad carga como documento público con principios', async ({ page }) => {
    await cargaSinError(page, '/legal/privacidad')
  })

  test('pub-10 - tratamiento de datos carga como documento público', async ({ page }) => {
    await cargaSinError(page, '/legal/datos')
  })

  test('pub-11 - política de cookies carga y enlaza sus preferencias', async ({ page }) => {
    await cargaSinError(page, '/legal/cookies')
    await expect(page.getByText('Cambiar mis preferencias de cookies')).toBeVisible({ timeout: 15_000 })
  })

  test('pub-12 - transparencia de IA carga como documento público', async ({ page }) => {
    await cargaSinError(page, '/legal/ia')
  })

  test('pub-13 - metodología de cálculo carga con lenguaje objetivo', async ({ page }) => {
    await cargaSinError(page, '/legal/medicion')
    // Regla legal del proyecto: nunca prometer exactitud absoluta.
    await expect(page.getByText(/\b(exacto|preciso|100%|garantiza|irrefutable)\b/i)).toHaveCount(0)
  })

  test('pub-14 - reglamento carga como documento público', async ({ page }) => {
    await cargaSinError(page, '/legal/reglamento')
  })

  test('pub-15 - confidencialidad muestra el texto sin formulario abierto', async ({ page }) => {
    await cargaSinError(page, '/legal/confidencialidad')
    // El QA exige que aquí NO haya un formulario de firma abierto al público.
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('pub-16 - firma por invitación: los 4 estados responden correctamente', async ({ page }) => {
    test.setTimeout(120_000)
    const base = Date.now()
    const hash = (t: string) => createHash('sha256').update(t).digest('hex')
    const enUnaSemana = new Date(Date.now() + 7 * 86400_000).toISOString()
    const ayer = new Date(Date.now() - 86400_000).toISOString()

    const tokenValido = `e2e-firma-valido-${base}`
    const tokenFirmado = `e2e-firma-firmado-${base}`
    const tokenExpirado = `e2e-firma-expirado-${base}`
    const comun = { tipo_documento: 'confidencialidad', nombre: 'Ana Prueba', numero_identidad: 'CC 123', email: 'e2e@ejemplo.com' }

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

    // Solo se completan los datos que estaban explícitamente en la invitación.
    await expect(page.getByPlaceholder('Ej. Ana')).toHaveValue('Ana')
    await expect(page.getByPlaceholder('Ej. Gómez')).toHaveValue('Prueba')
    await expect(page.locator('select')).toHaveValue('CC')
    await expect(page.getByPlaceholder('Ej. 1020304050')).toHaveValue('123')
    await expect(page.getByRole('button', { name: 'Seleccionar' })).toBeVisible()

    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Represento una empresa' }).click()
    await expect(page.getByText('Razón social')).toBeVisible()
    await expect(page.getByText('Nombre del representante')).toBeVisible()
    await expect(page.getByText('Apellido del representante')).toBeVisible()
    await expect(page.getByText('Cargo').first()).toBeVisible()

    // El navegador dibuja en el canvas y la petición contiene la firma y los
    // datos empresariales completos. Se intercepta para no consumir el token
    // de prueba ni enviar un correo durante esta verificación de interfaz.
    await page.route(`**/api/legal/firma/${tokenValido}`, async route => {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      expect(payload).toMatchObject({
        esEmpresa: true,
        razonSocial: 'Empresa E2E S.A.S.',
        nit: '900123456-7',
        nombre: 'Lucía',
        apellido: 'Prueba',
        cargo: 'Representante legal',
        tipoDocumento: 'CC',
        numeroIdentidad: '1020304050',
        indicativo: '+57',
        telefono: '3001234567',
      })
      expect(payload.firma).toEqual(expect.stringMatching(/^data:image\/png;base64,/))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    })

    await page.getByPlaceholder('Ej. Empresa Circular S.A.S.').fill('Empresa E2E S.A.S.')
    await page.getByPlaceholder('Ej. 900123456-7').fill('900123456-7')
    await page.getByPlaceholder('Ej. Ana').fill('Lucía')
    await page.getByPlaceholder('Ej. Gómez').fill('Prueba')
    await page.getByPlaceholder('Cargo del representante').fill('Representante legal')
    await page.locator('select').selectOption('CC')
    await page.getByPlaceholder('Ej. 1020304050').fill('1020304050')
    await page.getByRole('button', { name: 'Seleccionar' }).click()
    await page.getByRole('button', { name: /Colombia/ }).click()
    await page.getByPlaceholder('Número de celular').fill('3001234567')

    const firma = page.locator('canvas')
    const box = await firma.boundingBox()
    if (!box) throw new Error('No se encontró el lienzo de firma')
    await page.mouse.move(box.x + 30, box.y + 70)
    await page.mouse.down()
    await page.mouse.move(box.x + 120, box.y + 45)
    await page.mouse.move(box.x + 210, box.y + 85)
    await page.mouse.up()
    await page.getByRole('button', { name: 'Firmar y recibir mi copia' }).click()
    await expect(page.getByText('Tu documento quedó firmado')).toBeVisible()

    for (const t of [tokenValido, tokenFirmado, tokenExpirado]) {
      await supabaseAdmin.from('firmas_solicitudes').delete().eq('token_hash', hash(t))
    }
  })

  test('pub-17 - el formulario de dudas legales existe y es público', async ({ page }) => {
    await cargaSinError(page, '/legal/dudas')
    await expect(page.locator('form, input, textarea').first()).toBeVisible({ timeout: 15_000 })
  })
})
