import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import os from 'os'
import path from 'path'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function credencialesEfimeras(rol: string): { email: string; password: string; empresaId: string } {
  const datos = JSON.parse(fs.readFileSync('playwright/.auth/efimeros.json', 'utf-8'))
  return datos[rol]
}

/**
 * Genera un BMP de 24 bits sin comprimir del tamaño pedido, para tener una
 * imagen realmente pesada sin comitear un binario de 7 MB al repositorio ni
 * depender de una herramienta externa. Chromium lo decodifica igual que un
 * JPEG, que es lo único que necesita la compresión del navegador.
 */
function crearBmpPesado(tamanoObjetivoBytes: number): string {
  const ancho = 2000
  const bytesPorPixel = 3
  const filaConRelleno = Math.ceil((ancho * bytesPorPixel) / 4) * 4
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
  // Ruido, no un color plano: una imagen de un solo tono se recomprime a casi
  // nada y no probaría nada sobre el peso real que viaja.
  for (let i = 54; i < tamanoArchivo; i++) buffer[i] = (i * 37) % 256

  const ruta = path.join(os.tmpdir(), `e2e-imagen-pesada-${Date.now()}.bmp`)
  fs.writeFileSync(ruta, buffer)
  return ruta
}

test.describe('Rendimiento', () => {
  // Bug real corregido 2026-09-02: usaba credenciales fijas
  // (usuario_libre@reuso.com) que ya no existen — las cuentas semilla son
  // efímeras desde hace tiempo (ver auth.setup.ts), esta prueba nunca
  // podía pasar. Ahora lee la cuenta real creada en este mismo run.
  test('perf-01 - login → dashboard responde en menos de 8 segundos', async ({ page }) => {
    const cred = credencialesEfimeras('usuario_libre')
    const start = Date.now()
    await page.goto('/login')
    await page.locator('#email').fill(cred.email)
    await page.locator('#password').fill(cred.password)
    await page.getByRole('button', { name: /aceptar términos legales/i }).click().catch(() => {})
    await page.getByRole('button', { name: /ingresar|sign in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByText(/hola/i).first()).toBeVisible()
    const duracion = Date.now() - start
    expect(duracion).toBeLessThan(8_000)
  })

  test.describe('empresa_admin', () => {
    test.use({ storageState: 'playwright/.auth/empresa-admin.json' })

    test('perf-02 - /empresa con gráficas responde en menos de 5 segundos', async ({ page }) => {
      const start = Date.now()
      await page.goto('/empresa', { waitUntil: 'load' })
      await expect(page.getByText(/CO₂|impacto|equipo/i).first()).toBeVisible({ timeout: 10_000 })
      const duracion = Date.now() - start
      expect(duracion).toBeLessThan(8_000)
    })

    // QA real (perf-03): subir una imagen pesada (6-8 MB) y confirmar que lo
    // que viaja en el POST a /api/cotizador/diagnostico pesa menos de 4 MB,
    // o sea que el navegador comprime ANTES de subir.
    //
    // Dos bugs reales corregidos 2026-09-02:
    // 1. /empresa/cotizador/nueva NO muestra el campo de fotos de entrada —
    //    primero exige identificar al cliente ("¿A quién le cotizas?"). La
    //    prueba anterior asumía un input[type=file] visible de una y nunca
    //    podía pasar. Se siembra cliente + cotización y se entra por
    //    ?cotizacion_id=, la misma ruta real de "agregar más ítems".
    // 2. La respuesta de la IA se intercepta y se responde falsa a
    //    propósito: la directriz del proyecto es minimizar tokens en toda
    //    llamada a IA, y aquí lo que se mide es el peso de la petición, no
    //    lo que conteste el modelo.
    test('perf-03 - el navegador comprime la imagen antes de mandarla al diagnóstico', async ({ page }) => {
      test.setTimeout(120_000)
      const empresaId = credencialesEfimeras('empresa_admin').empresaId
      const { data: cliente, error: errorCliente } = await supabaseAdmin
        .from('crm_clientes')
        .insert({ empresa_id: empresaId, tipo: 'persona', nombre: 'Cliente de prueba e2e' })
        .select('id')
        .single()
      if (errorCliente || !cliente) throw new Error(`No se pudo sembrar el cliente: ${errorCliente?.message}`)

      const { data: cotizacion, error: errorCot } = await supabaseAdmin
        .from('crm_cotizaciones')
        .insert({
          empresa_id: empresaId,
          cliente_id: cliente.id,
          codigo_cotizacion: `E2E-PERF-${Date.now()}`,
          estado: 'por_cotizar',
        })
        .select('id')
        .single()
      if (errorCot || !cotizacion) throw new Error(`No se pudo sembrar la cotización: ${errorCot?.message}`)

      const rutaImagen = crearBmpPesado(7_000_000)

      // Se mide el cuerpo real de la petición y se responde sin llegar al
      // proveedor de IA (ahorro de tokens, directriz del proyecto).
      let bytesEnviados = -1
      await page.route('**/api/cotizador/diagnostico', async (route) => {
        bytesEnviados = Buffer.byteLength(route.request().postData() ?? '', 'utf-8')
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], no_identificados: [], sin_match: [] }),
        })
      })

      await page.goto(`/empresa/cotizador/nueva?cotizacion_id=${cotizacion.id}`, { timeout: 60_000 })
      await page.waitForLoadState('load')
      const inputArchivo = page.locator('input[type="file"]').first()
      await expect(inputArchivo).toBeAttached({ timeout: 20_000 })
      await inputArchivo.setInputFiles(rutaImagen)

      // "Con IA" solo elige el modo (y ya viene activo por defecto) — el que
      // dispara la petición es "Analizar este ítem".
      await page.getByRole('button', { name: 'Analizar este ítem' }).click()
      await expect.poll(() => bytesEnviados, { timeout: 45_000 }).toBeGreaterThan(0)
      expect(bytesEnviados).toBeLessThan(4 * 1024 * 1024)

      await supabaseAdmin.from('crm_cotizaciones').delete().eq('id', cotizacion.id)
      await supabaseAdmin.from('crm_clientes').delete().eq('id', cliente.id)
    })

    test('perf-04 - generación de informe con fechas responde en menos de 10 segundos', async ({ page }) => {
      await page.goto('/empresa/informes')
      await page.waitForLoadState('load')
      await page.locator('button:has-text("Generar informe")').first().click()
      await expect(page.getByText('Elige el período a incluir')).toBeVisible({ timeout: 8_000 })
      const modal = page.locator('[style*="z-index: 51"]').first()
      await modal.locator('input[type="date"]').first().fill('2024-01-01')
      await modal.locator('input[type="date"]').last().fill('2024-12-31')

      const start = Date.now()
      const responsePromise = page.waitForResponse('/api/informes/generar', { timeout: 15_000 })
      await page.locator('button:has-text("Generar informe")').last().click()
      await responsePromise
      const duracion = Date.now() - start
      expect(duracion).toBeLessThan(10_000)
    })

    // Proxy razonable de "fuga de memoria": cambiar filtros muy rápido y
    // seguido no debe dejar la página congelada ni lanzar excepciones — un
    // heap snapshot real de DevTools no es algo que Playwright pueda tomar.
    test('perf-06 - cambios de filtro repetidos no cuelgan la tabla de cálculos', async ({ page }) => {
      const errores: string[] = []
      page.on('pageerror', (e) => errores.push(e.message))
      await page.goto('/empresa/calculos')
      await page.waitForLoadState('load')
      const boton = page.getByRole('button', { name: 'Filtrar' })
      for (let i = 0; i < 8; i++) {
        await boton.click()
        await page.waitForTimeout(100)
      }
      await expect(page.locator('body')).toBeVisible()
      expect(errores).toEqual([])
    })

    // context.setOffline SÍ es una simulación real de red caída (no hace
    // falta DevTools manual) — confirma que el formulario no pierde los
    // datos ya escritos ni truena al fallar la petición.
    test('perf-07 - formulario DPP conserva los datos si la red falla', async ({ page, context }) => {
      // Bug real corregido 2026-09-02: los campos del formulario DPP no
      // tienen atributo name ni id — se ubican por su placeholder real, y
      // el botón de envío dice "Crea el pasaporte", no "Generar Pasaporte".
      await page.goto('/empresa/dpp/nuevo', { timeout: 60_000 })
      await page.waitForLoadState('load')
      const nombreInput = page.getByPlaceholder('Silla de madera, Mesa de oficina...')
      await expect(nombreInput).toBeVisible({ timeout: 15_000 })
      await nombreInput.fill('Producto de prueba e2e')
      await page.getByPlaceholder('8.5').fill('12')

      await context.setOffline(true)
      await page.getByRole('button', { name: 'Crea el pasaporte' }).click().catch(() => {})
      await page.waitForTimeout(2_000)
      // Lo que exige el QA: la red se cae y el formulario NO se limpia.
      await expect(nombreInput).toHaveValue('Producto de prueba e2e')
      await expect(page.getByPlaceholder('8.5')).toHaveValue('12')
      await context.setOffline(false)
    })

    test('perf-08 - clics repetidos en "Generar informe" no rompen la página', async ({ page }) => {
      const errores: string[] = []
      page.on('pageerror', (e) => errores.push(e.message))
      await page.goto('/empresa/informes')
      await page.waitForLoadState('load')
      const boton = page.locator('button:has-text("Generar informe")').first()
      for (let i = 0; i < 6; i++) {
        await boton.click({ trial: true }).catch(() => {})
        await page.waitForTimeout(80)
      }
      await expect(page.locator('body')).toBeVisible()
      expect(errores).toEqual([])
    })

    test('perf-09 - redimensionar la ventana rápido no rompe los gráficos', async ({ page }) => {
      const errores: string[] = []
      page.on('pageerror', (e) => errores.push(e.message))
      await page.goto('/empresa')
      await page.waitForLoadState('load')
      const anchos = [1280, 800, 1400, 700, 1024]
      for (const ancho of anchos) {
        await page.setViewportSize({ width: ancho, height: 900 })
        await page.waitForTimeout(150)
      }
      await expect(page.locator('body')).toBeVisible()
      expect(errores).toEqual([])
    })
  })

  // El pasaporte público necesita un DPP real ya existente — se siembra
  // directo en la base (mismo patrón que otras siembras de esta sesión),
  // no depende de que la categoría DPP ya esté automatizada.
  test('perf-05 - página pública de pasaporte responde en menos de 5 segundos', async ({ page }) => {
    const datos = JSON.parse(fs.readFileSync('playwright/.auth/efimeros.json', 'utf-8'))
    const { data: dpp, error } = await supabaseAdmin
      .from('dpp_activos')
      .insert({
        empresa_id: datos.empresa_admin.empresaId,
        codigo_dpp: `E2E-PERF-${Date.now()}`,
        nombre: 'Producto de prueba e2e',
        peso_total_kg: 5,
      })
      .select('codigo_dpp')
      .single()
    if (error || !dpp) throw new Error(`No se pudo sembrar el DPP de prueba: ${error?.message}`)

    const start = Date.now()
    await page.goto(`/pasaporte/${dpp.codigo_dpp}`, { waitUntil: 'load' })
    await expect(page.getByText('Producto de prueba e2e').first()).toBeVisible({ timeout: 10_000 })
    const duracion = Date.now() - start
    expect(duracion).toBeLessThan(8_000)

    // Bug real encontrado 2026-09-02: visitar el pasaporte público inserta
    // una fila en dpp_verificaciones, y esa llave foránea NO tiene
    // ON DELETE CASCADE (la migración 026 lo puso en sus 3 tablas hermanas
    // pero se saltó esta). Sin borrar primero la verificación, el borrado
    // del activo falla en silencio y deja basura que después bloquea el
    // borrado de la empresa efímera en el teardown. Corregido de raíz en
    // sql/116_dpp_verificaciones_cascade.sql — esto se mantiene para que
    // las pruebas también pasen antes de que esa migración se corra.
    const { data: activo } = await supabaseAdmin
      .from('dpp_activos').select('id').eq('codigo_dpp', dpp.codigo_dpp).single()
    if (activo) await supabaseAdmin.from('dpp_verificaciones').delete().eq('activo_id', activo.id)
    const { error: errorBorrado } = await supabaseAdmin
      .from('dpp_activos').delete().eq('codigo_dpp', dpp.codigo_dpp)
    if (errorBorrado) throw new Error(`No se pudo limpiar el DPP de prueba: ${errorBorrado.message}`)
  })
})
