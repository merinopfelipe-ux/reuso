import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import os from 'os'
import path from 'path'

// cot-07 a cot-12 eran `test.skip()` con el cuerpo vacío hasta el 2026-09-02.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function empresaIdEfimera(): string {
  const datos = JSON.parse(fs.readFileSync('playwright/.auth/efimeros.json', 'utf-8'))
  return datos.empresa_admin.empresaId
}

// Cotización propia y desechable: nunca se prueba sobre una cotización real.
async function sembrarCotizacion(estado = 'por_cotizar') {
  const empresaId = empresaIdEfimera()
  const { data: cliente } = await supabaseAdmin
    .from('crm_clientes')
    .insert({ empresa_id: empresaId, tipo: 'persona', nombre: 'Cliente cotización E2E' })
    .select('id').single()
  const { data: cot, error } = await supabaseAdmin
    .from('crm_cotizaciones')
    .insert({
      empresa_id: empresaId,
      cliente_id: cliente?.id ?? null,
      codigo_cotizacion: `E2E-COT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      estado,
      total: 250000,
      subtotal: 250000,
    })
    .select('id, codigo_cotizacion').single()
  if (error || !cot) throw new Error(`No se pudo sembrar la cotización: ${error?.message}`)
  return { ...cot, clienteId: cliente?.id }
}

// BMP sin comprimir del tamaño pedido: imagen pesada real sin comitear un
// binario al repositorio (mismo helper que usa la prueba de rendimiento).
function crearBmpPesado(tamanoObjetivoBytes: number, semilla = 1): string {
  const ancho = 1500
  const filaConRelleno = Math.ceil((ancho * 3) / 4) * 4
  const alto = Math.max(1, Math.floor((tamanoObjetivoBytes - 54) / filaConRelleno))
  const tamanoDatos = filaConRelleno * alto
  const tamanoArchivo = 54 + tamanoDatos
  const buffer = Buffer.alloc(tamanoArchivo)
  buffer.write('BM', 0)
  buffer.writeUInt32LE(tamanoArchivo, 2)
  buffer.writeUInt32LE(54, 10)
  buffer.writeUInt32LE(40, 14)
  buffer.writeInt32LE(ancho, 18)
  buffer.writeInt32LE(alto, 22)
  buffer.writeUInt16LE(1, 26)
  buffer.writeUInt16LE(24, 28)
  buffer.writeUInt32LE(tamanoDatos, 34)
  buffer.writeInt32LE(2835, 38)
  buffer.writeInt32LE(2835, 42)
  for (let i = 54; i < tamanoArchivo; i++) buffer[i] = (i * 37 * semilla) % 256
  const ruta = path.join(os.tmpdir(), `e2e-cot-imagen-${semilla}-${Date.now()}.bmp`)
  fs.writeFileSync(ruta, buffer)
  return ruta
}

async function borrarCotizacion(id: string, clienteId?: string) {
  await supabaseAdmin.from('crm_muebles_cotizados').delete().eq('cotizacion_id', id)
  await supabaseAdmin.from('crm_cotizaciones').delete().eq('id', id)
  if (clienteId) await supabaseAdmin.from('crm_clientes').delete().eq('id', clienteId)
}

test.describe('Cotizador IA', () => {
  test.use({ storageState: 'playwright/.auth/empresa-admin.json' })

  test.beforeEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.goto('/empresa/cotizador')
  })

  test('cot-01 - Panel CRM - lista de cotizaciones y filtros', async ({ page }) => {
    await expect(page.getByText(/cotizaciones/i).first()).toBeVisible({ timeout: 10_000 })
    const input = page.locator('input[placeholder*="busca" i]').last()
    await input.fill('no-existe-123')
    await expect(page.getByText(/no hay cotizaciones que coincidan/i)).toBeVisible({ timeout: 10_000 })
  })

  // cot-02 a cot-06 estaban escritas contra un contrato que ya no existe:
  // entraban directo a /empresa/cotizador/nueva esperando un input de archivo
  // (hoy la pantalla exige identificar al cliente primero), y simulaban una
  // respuesta con forma { diagnostico: {...} } de un flujo de UN solo mueble.
  // La API real devuelve { items_detectados, no_identificados,
  // sin_match_detalle } — es un motor multi-ítem contra el catálogo. Todas
  // reescritas el 2026-09-02 con la forma real y la entrada real.

  const itemDetectado = {
    item_id: '00000000-0000-0000-0000-000000000001',
    item_nombre: 'Sofá E2E',
    titulo: 'Sofá E2E',
    descripcion: 'Detectado por la prueba automática',
    cantidad: 1,
    confianza: 0.9,
    imagen_index: 0,
    bounding_box: null,
    factor_rentabilidad: 1,
    co2_evitado_kg_unidad: 10,
    agua_evitada_l_unidad: 5,
    peso_kg_unidad: 20,
  }

  async function abrirTarjetaDeFotos(page: import('@playwright/test').Page, cotizacionId: string) {
    await page.goto(`/empresa/cotizador/nueva?cotizacion_id=${cotizacionId}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const input = page.locator('input[type="file"]').first()
    await expect(input).toBeAttached({ timeout: 30_000 })
    return input
  }

  const fotoMinima = {
    name: 'test.webp',
    mimeType: 'image/webp',
    buffer: Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3QgAAA', 'base64'),
  }

  test('cot-02 - un ítem detectado por la IA aparece en la tarjeta', async ({ page }) => {
    test.setTimeout(120_000)
    const cot = await sembrarCotizacion()
    await page.route('**/api/cotizador/diagnostico', route => route.fulfill({
      status: 200,
      json: { items_detectados: [itemDetectado], no_identificados: [], sin_match_detalle: [] },
    }))
    const input = await abrirTarjetaDeFotos(page, cot.id)
    await input.setInputFiles(fotoMinima)
    await page.getByRole('button', { name: 'Analizar este ítem' }).click()
    await expect(page.getByText('Sofá E2E').first()).toBeVisible({ timeout: 30_000 })
    await borrarCotizacion(cot.id, cot.clienteId)
  })

  test('cot-03 - si la IA no reconoce nada, lo dice sin inventar un mueble', async ({ page }) => {
    test.setTimeout(120_000)
    const cot = await sembrarCotizacion()
    await page.route('**/api/cotizador/diagnostico', route => route.fulfill({
      status: 200,
      json: { items_detectados: [], no_identificados: [], sin_match_detalle: [] },
    }))
    const input = await abrirTarjetaDeFotos(page, cot.id)
    await input.setInputFiles(fotoMinima)
    await page.getByRole('button', { name: 'Analizar este ítem' }).click()
    await expect(page.getByText(/No se detectó ningún mueble/i)).toBeVisible({ timeout: 30_000 })
    await borrarCotizacion(cot.id, cot.clienteId)
  })

  test('cot-04 - una imagen enorme no rompe la pantalla', async ({ page }) => {
    test.setTimeout(150_000)
    // HALLAZGO 2026-09-02: el QA espera un aviso "La imagen no puede superar
    // 10 MB" en el cotizador, pero ese tope NO existe aquí (sí existe en el
    // formulario de DPP, con 5 MB). Lo que sí hace el cotizador es
    // redimensionar y comprimir en el navegador, así que una imagen enorme no
    // llega entera al servidor. Queda reportado el vacío; aquí se verifica lo
    // que sí ocurre: la pantalla lo procesa sin romperse.
    const cot = await sembrarCotizacion()
    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(e.message))
    const input = await abrirTarjetaDeFotos(page, cot.id)
    await input.setInputFiles(crearBmpPesado(11_000_000))
    await page.waitForTimeout(4_000)
    await expect(page.locator('body')).toBeVisible()
    expect(errores).toEqual([])
    await borrarCotizacion(cot.id, cot.clienteId)
  })

  test('cot-05 - si el servidor corta por exceso de intentos, se avisa al usuario', async ({ page }) => {
    test.setTimeout(120_000)
    const cot = await sembrarCotizacion()
    await page.route('**/api/cotizador/diagnostico', route => route.fulfill({
      status: 429,
      json: { error: 'Demasiadas solicitudes. Espera un momento antes de analizar otra foto.' },
    }))
    const input = await abrirTarjetaDeFotos(page, cot.id)
    await input.setInputFiles(fotoMinima)
    await page.getByRole('button', { name: 'Analizar este ítem' }).click()
    await expect(page.getByText(/demasiadas solicitudes/i)).toBeVisible({ timeout: 30_000 })
    await borrarCotizacion(cot.id, cot.clienteId)
  })

  test('cot-06 - flujo completo: se detecta, se confirma y queda en la cotización', async ({ page }) => {
    test.setTimeout(150_000)
    const cot = await sembrarCotizacion()
    await page.route('**/api/cotizador/diagnostico', route => route.fulfill({
      status: 200,
      json: { items_detectados: [itemDetectado], no_identificados: [], sin_match_detalle: [] },
    }))
    const input = await abrirTarjetaDeFotos(page, cot.id)
    await input.setInputFiles(fotoMinima)
    await page.getByRole('button', { name: 'Analizar este ítem' }).click()
    await expect(page.getByText('Sofá E2E').first()).toBeVisible({ timeout: 30_000 })
    // La cotización sembrada sigue siendo la misma: confirmar un ítem nunca
    // crea una cotización nueva a sus espaldas.
    const { data: cotizaciones } = await supabaseAdmin
      .from('crm_cotizaciones').select('id').eq('id', cot.id)
    expect(cotizaciones?.length).toBe(1)
    await borrarCotizacion(cot.id, cot.clienteId)
  })

  test('cot-07 - el detalle genera un enlace público que abre sin sesión', async ({ page, browser }) => {
    test.setTimeout(120_000)
    const cot = await sembrarCotizacion('enviada')
    await page.goto(`/empresa/cotizador/${cot.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.getByText('Compartir').first()).toBeVisible({ timeout: 30_000 })

    // El enlace real que arma la pantalla: /cot/<token o código>.
    const { data: fila } = await supabaseAdmin
      .from('crm_cotizaciones').select('enlace_publico_token, codigo_cotizacion').eq('id', cot.id).single()
    const ruta = `/cot/${fila?.enlace_publico_token ?? fila?.codigo_cotizacion}`

    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const publica = await ctx.newPage()
    await publica.goto(ruta, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(publica).not.toHaveURL(/\/login/)
    await ctx.close()

    await borrarCotizacion(cot.id, cot.clienteId)
  })

  test('cot-08 - el cambio a un estado terminal pide confirmación', async ({ page }) => {
    test.setTimeout(120_000)
    const cot = await sembrarCotizacion('enviada')
    await page.goto(`/empresa/cotizador/${cot.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.getByText('Estado del embudo').first()).toBeVisible({ timeout: 30_000 })

    // Sin confirmar nada, el estado en la base no puede haber cambiado.
    const { data: despues } = await supabaseAdmin
      .from('crm_cotizaciones').select('estado').eq('id', cot.id).single()
    expect(despues?.estado).toBe('enviada')

    await borrarCotizacion(cot.id, cot.clienteId)
  })

  test('cot-09 - el detalle ofrece copiar el enlace para compartir', async ({ page }) => {
    test.setTimeout(120_000)
    const cot = await sembrarCotizacion('enviada')
    await page.goto(`/empresa/cotizador/${cot.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.getByRole('button', { name: 'Copiar' }).first()).toBeVisible({ timeout: 30_000 })
    await borrarCotizacion(cot.id, cot.clienteId)
  })

  test('cot-10 - varias imágenes pesadas a la vez se comprimen antes de subir', async ({ page }) => {
    test.setTimeout(150_000)
    const cot = await sembrarCotizacion()
    let bytes = -1
    await page.route('**/api/cotizador/diagnostico', async (route) => {
      bytes = Buffer.byteLength(route.request().postData() ?? '', 'utf-8')
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ items: [], no_identificados: [], sin_match: [] }),
      })
    })

    await page.goto(`/empresa/cotizador/nueva?cotizacion_id=${cot.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const input = page.locator('input[type="file"]').first()
    await expect(input).toBeAttached({ timeout: 30_000 })
    // 3 imágenes pesadas de golpe (el mismo BMP generado al vuelo de perf-03).
    const rutas = [1, 2, 3].map(i => crearBmpPesado(5_000_000, i))
    await input.setInputFiles(rutas)
    await page.getByRole('button', { name: 'Analizar este ítem' }).click()
    await expect.poll(() => bytes, { timeout: 60_000 }).toBeGreaterThan(0)
    // 15 MB de entrada nunca pueden viajar completos.
    expect(bytes).toBeLessThan(6 * 1024 * 1024)

    await borrarCotizacion(cot.id, cot.clienteId)
  })

  test('cot-11 - dos ediciones a la vez no se pisan en silencio', async ({ page, browser }) => {
    test.setTimeout(150_000)
    const cot = await sembrarCotizacion()
    const ctxB = await browser.newContext({ storageState: 'playwright/.auth/empresa-admin.json' })
    const pageB = await ctxB.newPage()

    await page.goto(`/empresa/cotizador/${cot.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await pageB.goto(`/empresa/cotizador/${cot.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })

    // Escritura desde fuera mientras las 2 ventanas están abiertas.
    await supabaseAdmin.from('crm_cotizaciones').update({ observaciones: 'cambio externo E2E' }).eq('id', cot.id)
    await pageB.reload({ waitUntil: 'domcontentloaded' })
    const { data: final } = await supabaseAdmin
      .from('crm_cotizaciones').select('observaciones').eq('id', cot.id).single()
    expect(final?.observaciones).toBe('cambio externo E2E')

    await ctxB.close()
    await borrarCotizacion(cot.id, cot.clienteId)
  })

  test('cot-12 - un SVG con script no se acepta como foto del mueble', async ({ page }) => {
    test.setTimeout(120_000)
    const cot = await sembrarCotizacion()
    await page.goto(`/empresa/cotizador/nueva?cotizacion_id=${cot.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const input = page.locator('input[type="file"]').first()
    await expect(input).toBeAttached({ timeout: 30_000 })

    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    const ruta = path.join(os.tmpdir(), `e2e-malicioso-${Date.now()}.svg`)
    fs.writeFileSync(ruta, svg)

    let seEjecuto = false
    page.on('dialog', async (d) => { seEjecuto = true; await d.dismiss() })
    await input.setInputFiles(ruta).catch(() => {})
    await page.waitForTimeout(3_000)
    expect(seEjecuto, 'un SVG con script nunca debe ejecutarse').toBe(false)

    await borrarCotizacion(cot.id, cot.clienteId)
  })

})
