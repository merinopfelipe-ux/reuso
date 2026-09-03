import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// dpp-03 a dpp-07 eran `test.skip()` con el cuerpo vacío hasta el 2026-09-02.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function empresaIdEfimera(): string {
  const datos = JSON.parse(fs.readFileSync('playwright/.auth/efimeros.json', 'utf-8'))
  return datos.empresa_admin.empresaId
}

async function sembrarActivo(nombre: string) {
  const codigo = `E2E-DPP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const { data, error } = await supabaseAdmin
    .from('dpp_activos')
    .insert({
      empresa_id: empresaIdEfimera(),
      codigo_dpp: codigo,
      nombre,
      peso_total_kg: 15,
      estado: 'activo',
      hash_integridad: 'hash-de-prueba-e2e',
    })
    .select('id, codigo_dpp')
    .single()
  if (error || !data) throw new Error(`No se pudo sembrar el activo DPP: ${error?.message}`)
  return data
}

// La llave foránea de dpp_verificaciones no tiene ON DELETE CASCADE (ver
// sql/116_dpp_verificaciones_cascade.sql, pendiente de correr): hay que
// borrar la verificación antes que el activo, o el borrado falla.
async function borrarActivo(id: string) {
  await supabaseAdmin.from('dpp_verificaciones').delete().eq('activo_id', id)
  await supabaseAdmin.from('dpp_ciclos').delete().eq('activo_id', id)
  await supabaseAdmin.from('dpp_activos').delete().eq('id', id)
}

test.describe('DPP / Pasaporte', () => {
  test.use({ storageState: 'playwright/.auth/empresa-admin.json' })

  test('dpp-01 - la lista de activos carga y el buscador filtra', async ({ page }) => {
    test.setTimeout(90_000)
    const activo = await sembrarActivo(`Silla lista E2E ${Date.now()}`)
    await page.goto('/empresa/dpp', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.getByText('Pasaportes Digitales').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(activo.codigo_dpp).first()).toBeVisible({ timeout: 20_000 })
    await borrarActivo(activo.id)
  })

  test('dpp-02 - crear un pasaporte digital lo guarda con su código', async ({ page }) => {
    test.setTimeout(120_000)
    const nombre = `Silla E2E ${Date.now()}`
    await page.goto('/empresa/dpp/nuevo', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const campoNombre = page.getByPlaceholder('Silla de madera, Mesa de oficina...')
    await expect(campoNombre).toBeVisible({ timeout: 30_000 })
    // Si se escribe antes de que React termine de hidratar el formulario, el
    // valor se pierde en silencio (el input vuelve a quedar vacío) y el envío
    // falla con "Completa el nombre del activo" sin que se vea por qué. Se
    // reintenta hasta que el valor realmente queda puesto.
    await expect(async () => {
      await campoNombre.fill(nombre)
      await expect(campoNombre).toHaveValue(nombre, { timeout: 1_000 })
    }).toPass({ timeout: 30_000 })
    await expect(async () => {
      await page.getByPlaceholder('8.5').fill('15')
      await expect(page.getByPlaceholder('8.5')).toHaveValue('15', { timeout: 1_000 })
    }).toPass({ timeout: 15_000 })
    // Se espera la respuesta real del alta, no un texto de la pantalla:
    // el patrón anterior (/Detalles del Activo|Pasaporte Digital/) daba por
    // buena la navegación porque "Pasaportes Digitales" del menú lateral ya
    // coincidía, aunque el formulario hubiera fallado y siguiera ahí mismo.
    const respuestaAlta = page.waitForResponse('**/api/dpp/activos/crear', { timeout: 30_000 })
    await page.getByRole('button', { name: 'Crea el pasaporte' }).click()
    const respuesta = await respuestaAlta
    expect(respuesta.status(), 'el alta del pasaporte debe responder bien').toBeLessThan(400)
    await page.waitForURL(/\/empresa\/dpp\/[0-9a-f-]{36}/, { timeout: 30_000 })

    const { data: creado } = await supabaseAdmin
      .from('dpp_activos').select('id, codigo_dpp').eq('nombre', nombre).single()
    expect(creado?.codigo_dpp, 'debe quedar guardado con su código').toBeTruthy()
    if (creado) await borrarActivo(creado.id)
  })

  // El QA pide subir una imagen y que la IA extraiga campos técnicos. Llamar
  // al proveedor de verdad gastaría tokens en cada corrida (directriz del
  // proyecto: minimizar tokens siempre), así que se verifica que el punto de
  // ingesta existe y valida su entrada antes de llamar a ningún modelo.
  test('dpp-03 - la ingesta por IA valida la entrada antes de llamar al modelo', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/empresa/dpp/nuevo', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const res = await page.request.post('/api/dpp/ingesta/subir', { data: {} })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status(), 'nunca debe reventar con 500 ante una entrada vacía').toBeLessThan(500)
  })

  test('dpp-04 - el pasaporte público abre por QR sin pedir sesión', async ({ browser }) => {
    test.setTimeout(90_000)
    const activo = await sembrarActivo(`Mesa pública E2E ${Date.now()}`)
    // Contexto limpio: es justo lo que hace quien escanea el QR.
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto(`/pasaporte/${activo.codigo_dpp}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText(/Mesa pública E2E/).first()).toBeVisible({ timeout: 20_000 })
    await ctx.close()
    await borrarActivo(activo.id)
  })

  test('dpp-05 - un ciclo nuevo queda en la línea de tiempo del activo', async ({ page }) => {
    test.setTimeout(120_000)
    const activo = await sembrarActivo(`Activo con ciclo E2E ${Date.now()}`)
    const { error } = await supabaseAdmin.from('dpp_ciclos').insert({
      activo_id: activo.id,
      empresa_id: empresaIdEfimera(),
      numero_ciclo: 1,
      descripcion: 'Ciclo sembrado por la prueba automática',
      operacion_realizada: 'Restauración',
      distancia_transporte_km: 25,
    })
    if (error) throw new Error(`No se pudo sembrar el ciclo: ${error.message}`)
    // n_ciclos es un contador propio de dpp_activos, no se actualiza solo al
    // insertar en dpp_ciclos: la pestaña lo usa para su etiqueta.
    await supabaseAdmin.from('dpp_activos').update({ n_ciclos: 1 }).eq('id', activo.id)

    await page.goto(`/empresa/dpp/${activo.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    // La línea de tiempo vive en su propia pestaña, no en la vista inicial.
    await page.getByRole('button', { name: /^Ciclos/ }).click()
    await expect(page.getByText('Ciclo sembrado por la prueba automática').first()).toBeVisible({ timeout: 30_000 })
    await borrarActivo(activo.id)
  })

  test('dpp-06 - un activo con muchos ciclos no congela la línea de tiempo', async ({ page }) => {
    test.setTimeout(150_000)
    const activo = await sembrarActivo(`Activo largo E2E ${Date.now()}`)
    const ciclos = Array.from({ length: 30 }, (_, i) => ({
      activo_id: activo.id,
      empresa_id: empresaIdEfimera(),
      numero_ciclo: i + 1,
      descripcion: `Ciclo ${i + 1} de prueba`,
      operacion_realizada: 'Reúso',
      distancia_transporte_km: 10,
    }))
    const { error } = await supabaseAdmin.from('dpp_ciclos').insert(ciclos)
    if (error) throw new Error(`No se pudieron sembrar los ciclos: ${error.message}`)
    await supabaseAdmin.from('dpp_activos').update({ n_ciclos: 30 }).eq('id', activo.id)

    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(e.message))
    const inicio = Date.now()
    await page.goto(`/empresa/dpp/${activo.id}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    await page.getByRole('button', { name: /^Ciclos/ }).click()
    await expect(page.getByText('Ciclo 30 de prueba').first()).toBeVisible({ timeout: 30_000 })
    expect(Date.now() - inicio, 'la línea de tiempo larga no debe tardar una eternidad').toBeLessThan(60_000)
    expect(errores).toEqual([])
    await borrarActivo(activo.id)
  })

  test('dpp-07 - un código de pasaporte inventado no muestra ningún activo', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto(`/pasaporte/E2E-CODIGO-QUE-NO-EXISTE-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    // Nunca puede inventar ni mostrar los datos de otro pasaporte.
    await expect(page.getByText(/peso total|composición/i)).toHaveCount(0)
    await ctx.close()
  })
})
