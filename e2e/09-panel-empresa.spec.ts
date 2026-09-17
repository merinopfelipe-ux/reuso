import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function empresaIdEfimera(): string {
  const datos = JSON.parse(fs.readFileSync('playwright/.auth/efimeros.json', 'utf-8'))
  return datos.empresa_admin.empresaId
}

test.describe('empresa_admin', () => {
  test.use({ storageState: 'playwright/.auth/empresa-admin.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/empresa', { waitUntil: 'domcontentloaded' })
  })

  test('emp-01 - login aterriza en /empresa con KPI visible', async ({ page }) => {
    await expect(page).toHaveURL(/\/empresa/)
    await expect(page.locator('text=/CO₂|impacto|equipo/i').first()).toBeVisible({ timeout: 10_000 })
  })

  // QA real (emp-02): /empresa (y /empresa/calculos) NO tienen formulario
  // para registrar un cálculo — solo HistorialCalculos (vista). Tampoco
  // existe un "filtro de empleados", los filtros reales son fecha y
  // categoría. Bug real corregido 2026-09-02, la prueba vieja asumía un
  // flujo de "calcular" que no existe en este rol/ruta.
  // La exportación en Excel/CSV ahora depende de la "Personalización de
  // capacidades" real del plan de la empresa (2026-09-13, commit 35d6a10)
  // — la empresa efímera de este test usa el plan 'lab', que no la incluye,
  // así que /api/calculos/exportar responde 403 a propósito para csv/xlsx.
  // PDF nunca está gateado por esa capacidad, así que sigue sirviendo para
  // probar el filtro de fechas + descarga real sin chocar con esa regla.
  test('emp-02 - filtro de fechas y descarga PDF del historial de la empresa', async ({ page }) => {
    await page.goto('/empresa/calculos')
    await page.waitForLoadState('load')

    // Los campos de fecha no tienen <label for> asociado (solo texto suelto)
    // — se ubican por el hermano inmediato del label, mismo patrón que el
    // Selector de alertas.
    const hoy = new Date().toISOString().slice(0, 10)
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
    await page.locator('label', { hasText: 'Desde' }).locator('xpath=following-sibling::div[1]//input').fill(inicioMes)
    await page.locator('label', { hasText: 'Hasta' }).locator('xpath=following-sibling::div[1]//input').fill(hoy)
    await page.getByRole('button', { name: 'Filtrar' }).click()
    await page.waitForLoadState('load')

    await page.getByRole('button', { name: 'Descargar' }).click()
    const responsePromise = page.waitForResponse(/\/api\/calculos\/exportar/, { timeout: 15_000 })
    await page.getByText('PDF (.pdf)').click()
    const response = await responsePromise
    expect(response.status()).toBe(200)
  })

  test('emp-02b - la exportación CSV respeta la personalización de capacidades del plan', async ({ page }) => {
    await page.goto('/empresa/calculos')
    await page.waitForLoadState('load')

    await page.getByRole('button', { name: 'Descargar' }).click()
    const responsePromise = page.waitForResponse(/\/api\/calculos\/exportar/, { timeout: 15_000 })
    await page.getByText('CSV (.csv)').click()
    const response = await responsePromise
    expect(response.status()).toBe(403)
  })

  // El módulo "certificados" ya no existe (renombrado por completo a
  // "Informes") y el endpoint real es /api/informes/generar, no
  // /api/certificados/generar — bug real corregido 2026-09-02, la prueba
  // vieja apuntaba a una ruta muerta y nunca podía pasar. La ruta real de
  // /admin/qa (emp-03) es /empresa/informes, no /empresa.
  test('emp-03 - informe generado con fechas es verificable en /verificar', async ({ page }) => {
    await page.goto('/empresa/informes')
    await page.waitForLoadState('load')
    const botonInforme = page.locator('button:has-text("Generar informe")').first()
    await expect(botonInforme).toBeVisible({ timeout: 10_000 })
    await botonInforme.click()
    await expect(page.getByText('Elige el período a incluir')).toBeVisible({ timeout: 8_000 })
    const modal = page.locator('[style*="z-index: 51"]').first()
    await modal.locator('input[type="date"]').first().fill('2024-01-01')
    await modal.locator('input[type="date"]').last().fill('2024-12-31')

    const responsePromise = page.waitForResponse('/api/informes/generar', { timeout: 50_000 })
    await page.locator('button:has-text("Generar informe")').last().click()
    const response = await responsePromise
    const data = await response.json() as { codigo_verificacion?: string }
    expect(data.codigo_verificacion).toBeTruthy()
    const uuid = data.codigo_verificacion!
    const codigo = `RCO2-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`

    await page.goto(`/verificar/${codigo}`)
    await page.waitForLoadState('load')
    await expect(page.getByText(codigo)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/kilogramos CO₂-eq|Informe de Impacto/i).first()).toBeVisible({ timeout: 5_000 })
  })

  // La ruta real de /admin/qa (emp-04) es /empresa/reportes, no /empresa —
  // ahí el botón de descarga ofrece Excel/CSV/PDF (BotonDescargarCliente),
  // sin texto visible, solo el ícono de descarga (bug real corregido
  // 2026-09-02: la prueba vieja repetía la misma ruta/flujo que emp-03).
  test('emp-04 - descarga de reporte en PDF responde 200', async ({ page }) => {
    test.setTimeout(120_000)
    // El botón de descarga queda deshabilitado si csvData.length === 0 — una
    // empresa efímera recién creada no tiene ningún cálculo real todavía.
    // /api/reportes/mitigacion (la pestaña por defecto) lee
    // factor_snapshot_json.items[x].materiales[], no basta un detalle_json
    // cualquiera (bug real corregido 2026-09-02, confirmado leyendo el
    // shape real que exige route.ts).
    const { data: usuario } = await supabaseAdmin.auth.admin.listUsers()
    const cuentaAdmin = usuario.users.find(u => u.email?.startsWith('e2e_empresa_admin_'))
    const { error: errorSiembra } = await supabaseAdmin.from('calculos').insert({
      user_id: cuentaAdmin!.id,
      empresa_id: empresaIdEfimera(),
      total_co2: 42.5,
      total_agua: 120,
      detalle_json: { origen: 'e2e' },
      factor_snapshot_json: {
        items: {
          e2e_item: {
            materiales: [
              { categoria_material: 'madera', peso_kg: 12, factor_co2_kg: 3.5, factor_agua_l_kg: 8, nivel_confianza: 'media' },
            ],
          },
        },
      },
    })
    if (errorSiembra) throw new Error(`No se pudo sembrar el cálculo de prueba: ${errorSiembra.message}`)

    // /empresa/reportes es una página pesada (4 pestañas de reportes) —
    // en next dev, la primera compilación en caliente de esta ruta puede
    // tardar más que el timeout global cuando corre después de muchas
    // otras pruebas en la misma corrida (flakiness ambiental confirmada:
    // esta misma prueba pasa siempre sola, solo falla intermitente dentro
    // del archivo completo). Timeout de navegación explícito más generoso.
    // Bug real corregido 2026-09-02: 'load' solo espera el documento, no el
    // fetch de /api/reportes/mitigacion que corre en un useEffect del
    // cliente y es lo que realmente habilita el botón — sin esperarlo, el
    // clic llega mientras csvData todavía está vacío y el botón deshabilitado.
    const respuestaMitigacion = page.waitForResponse(/\/api\/reportes\/mitigacion/, { timeout: 30_000 })
    await page.goto('/empresa/reportes', { timeout: 90_000 })
    await page.waitForLoadState('load')
    await respuestaMitigacion
    // BotonDescargarCliente no tiene texto ni aria-label visible (solo un
    // ícono) — se ubica por su wrapper con estilo inline distintivo
    // (position: relative; display: inline-block), único en la página.
    const botonDescargar = page.locator('div[style*="position: relative"][style*="inline-block"]').locator('button').first()
    await expect(botonDescargar).toBeEnabled({ timeout: 10_000 })
    await botonDescargar.click()
    const responsePromise = page.waitForResponse(/\/api\/reportes\/.+\/pdf/, { timeout: 20_000 })
    await page.getByText('PDF (.pdf)').click()
    const response = await responsePromise
    expect(response.status()).toBe(200)
  })

  test('emp-05 - invitación persiste en lista de equipo', async ({ page }) => {
    // "Rol asignado" es el Selector custom del sistema de diseño (nunca un
    // <select> nativo, bug real corregido 2026-09-02) y ya viene en
    // "Empleado" por defecto (rolInvitado inicial), no hace falta tocarlo.
    await page.goto('/empresa/equipo')
    await page.waitForLoadState('load')
    await page.locator('button:has-text("Invitar")').click()
    const emailInvitado = `e2e-invitado-${Date.now()}@ejemplo.com`
    await page.locator('input[type="email"]').fill(emailInvitado)
    await page.locator('button:has-text("Generar invitación")').click()
    await expect(page.getByText(/copiar|copiado/i)).toBeVisible({ timeout: 15_000 })

    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByText(emailInvitado)).toBeVisible({ timeout: 10_000 })
  })

  test('emp-06 - nombre de empresa persiste tras guardar y recargar', async ({ page }) => {
    await page.goto('/empresa/configuracion')
    await page.waitForLoadState('load')
    const inputNombre = page.locator('input[name="nombre"]')
    await expect(inputNombre).toBeVisible({ timeout: 10_000 })
    const nombreOriginal = await inputNombre.inputValue()

    const nombreTest = `Empresa Test ${Date.now()}`
    await inputNombre.click({ clickCount: 3 })
    await page.keyboard.type(nombreTest)
    await page.locator('button:has-text("Guardar cambios")').click()
    await expect(page.getByText(/guardado|éxito/i)).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await page.waitForLoadState('load')
    const inputDespues = page.locator('input[name="nombre"]')
    await expect(inputDespues).toHaveValue(nombreTest, { timeout: 8_000 })

    await inputDespues.click({ clickCount: 3 })
    await page.keyboard.type(nombreOriginal)
    await page.locator('button:has-text("Guardar cambios")').click()
  })

  test('emp-07 - meta persiste tras crear y desaparece tras eliminar', async ({ page }) => {
    await page.goto('/empresa')
    await page.waitForLoadState('load')

    const tituloMeta = `Meta E2E ${Date.now()}`
    await page.locator('button:has-text("Crear Meta")').click()
    await page.getByPlaceholder(/título|meta|reducción/i).fill(tituloMeta)
    await page.locator('select').first().selectOption('co2_kg')
    await page.getByPlaceholder(/500|objetivo|numeral/i).fill('100')
    const hoy = new Date().toISOString().slice(0, 10)
    const fin = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10)
    await page.locator('input[type="date"]').first().fill(hoy)
    await page.locator('input[type="date"]').nth(1).fill(fin)
    await page.locator('button[type="submit"]').filter({ hasText: /^Guardar$/ }).click()

    await expect(page.getByText(tituloMeta)).toBeVisible({ timeout: 10_000 })
    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByText(tituloMeta)).toBeVisible({ timeout: 10_000 })

    page.on('dialog', d => d.accept())
    await page.locator('h4').filter({ hasText: tituloMeta })
      .locator('xpath=../../../button')
      .click()
    await expect(page.getByText(tituloMeta)).not.toBeVisible({ timeout: 10_000 })
    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByText(tituloMeta)).not.toBeVisible()
  })

  test('emp-08 - reportes muestran datos numéricos reales', async ({ page }) => {
    await page.goto('/empresa/reportes')
    await page.waitForLoadState('load')
    await expect(page.locator('text=/\\d+\\.\\d+|\\d+ kg/').first()).toBeVisible({ timeout: 15_000 })
  })

  test('emp-09 - /admin bloqueado para empresa_admin', async ({ page }) => {
    await page.goto('/admin/empresas')
    await page.waitForURL(/(?!.*\/admin)/, { timeout: 8_000 })
    expect(page.url()).not.toMatch(/\/admin/)
  })

  test('emp-10 - API admin rechaza a empresa_admin con 401 o 403', async ({ page }) => {
    const res = await page.request.patch('/api/admin/empresas/00000000-0000-0000-0000-000000000000', {
      data: { plan: 'ilimitado' },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('emp-11 - subir logo + WhatsApp en la marca persiste tras recargar', async ({ page }) => {
    await page.goto('/empresa/configuracion/marca', { waitUntil: 'domcontentloaded' })

    // PNG real de 120x120 generado con pngjs (no un buffer vacío) —
    // comprimirLogoWebP() decodifica la imagen con new Image() y exige al
    // menos 50x50 px, un archivo falso nunca pasaría de la validación.
    const { PNG } = await import('pngjs')
    const png = new PNG({ width: 120, height: 120 })
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 0; png.data[i + 1] = 130; png.data[i + 2] = 124; png.data[i + 3] = 255
    }
    const logoBuffer = PNG.sync.write(png)

    await page.locator('input[type="file"]').setInputFiles({ name: 'logo-e2e.png', mimeType: 'image/png', buffer: logoBuffer })
    await expect(page.locator('img[alt="Logo"]').first()).toBeVisible({ timeout: 10_000 })

    const whatsapp = '573001234567'
    await page.locator('input[type="tel"]').fill(whatsapp)
    await expect(page.getByText('Número válido')).toBeVisible()

    await page.locator('button:has-text("Guarda tu marca")').click()
    await expect(page.getByText('Marca guardada')).toBeVisible({ timeout: 15_000 })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('input[type="tel"]')).toHaveValue(whatsapp)
    // Tras recargar, el logo ya no viene del preview local (data:) sino de
    // la URL real guardada en Storage — confirma que el guardado sí llegó.
    const src = await page.locator('img[alt="Logo"]').first().getAttribute('src')
    expect(src).not.toBeNull()
    expect(src).not.toMatch(/^data:/)
  })

  test('emp-12b - invitar un correo con invitación pendiente muestra el aviso, sin duplicar', async ({ page }) => {
    const email = `e2e_emp12_${Date.now()}@calculadoradereuso.com`

    await page.goto('/empresa/equipo', { waitUntil: 'domcontentloaded' })
    await page.locator('button:has-text("Invitar")').click()
    await page.locator('input[type="email"]').fill(email)
    await page.locator('button:has-text("Generar invitación")').click()
    await expect(page.getByText(/copiar|copiado/i)).toBeVisible({ timeout: 15_000 })
    await page.locator('button:has-text("Listo")').click()

    // Mismo correo otra vez: antes no había ningún control y se creaba una
    // segunda invitación en silencio (bug real, corregido hoy en
    // /api/empresa/invitar — ahora responde 409).
    await page.locator('button:has-text("Invitar")').click()
    await page.locator('input[type="email"]').fill(email)
    await page.locator('button:has-text("Generar invitación")').click()
    // El mismo mensaje se muestra 2 veces a propósito: un banner persistente
    // arriba de la página y el párrafo dentro del propio modal (mismo
    // estado `error`, mismo patrón que el aviso de límite de plan) —
    // escopar al párrafo evita el "strict mode violation".
    await expect(page.getByRole('paragraph').filter({ hasText: 'Ya existe una invitación pendiente' })).toBeVisible({ timeout: 10_000 })

    const { count } = await supabaseAdmin.from('invitaciones').select('id', { count: 'exact', head: true }).eq('email', email)
    expect(count).toBe(1)

    await supabaseAdmin.from('invitaciones').delete().eq('email', email)
  })

  test('emp-13 - un logo apaisado no se deforma en la vista previa', async ({ page }) => {
    await page.goto('/empresa/configuracion/marca', { waitUntil: 'domcontentloaded' })

    const { PNG } = await import('pngjs')
    const png = new PNG({ width: 320, height: 64 })
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 214; png.data[i + 1] = 243; png.data[i + 2] = 145; png.data[i + 3] = 255
    }
    const logoApaisado = PNG.sync.write(png)

    await page.locator('input[type="file"]').setInputFiles({ name: 'logo-apaisado-e2e.png', mimeType: 'image/png', buffer: logoApaisado })

    // La tarjeta "Vista previa de la propuesta" tiene su propio contenedor
    // fijo (w-10 h-10, esquina redondeada) con object-contain — el logo
    // apaisado 5:1 debe encajar sin estirar el contenedor.
    await expect(page.getByText('Vista previa de la propuesta')).toBeVisible()
    const contenedorPreview = page.locator('img[alt="Logo"]').last().locator('..')
    const box = await contenedorPreview.boundingBox()
    expect(box).not.toBeNull()
    // El contenedor es cuadrado (w-10 h-10 = 40x40px) sin importar la
    // proporción real de la imagen subida — si se deformara, dejaría de
    // ser cuadrado.
    expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThan(2)

    const clasesImg = await page.locator('img[alt="Logo"]').last().getAttribute('class')
    expect(clasesImg).toContain('object-contain')
  })

  test('emp-14 - directorio de clientes lista y filtra por búsqueda', async ({ page }) => {
    const empresaId = empresaIdEfimera()
    const nombreUnico = `E2E Cliente Directorio ${Date.now()}`
    const { data: cliente, error } = await supabaseAdmin
      .from('crm_clientes')
      .insert({ empresa_id: empresaId, tipo: 'persona', nombre: nombreUnico, telefono: '3001234567', es_contacto_real: true })
      .select('id')
      .single()
    if (error || !cliente) throw new Error(`No se pudo sembrar el cliente de emp-14: ${error?.message}`)

    try {
      await page.goto('/empresa/clientes', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText(nombreUnico)).toBeVisible({ timeout: 15_000 })

      await page.locator('input[placeholder="Busca por nombre, celular o NIT"]').fill('nombre-que-no-existe-en-ningun-lado')
      await expect(page.getByText(nombreUnico)).not.toBeVisible()

      await page.locator('input[placeholder="Busca por nombre, celular o NIT"]').fill(nombreUnico)
      await expect(page.getByText(nombreUnico)).toBeVisible({ timeout: 10_000 })

      await page.getByText(nombreUnico).click()
      await expect(page).toHaveURL(new RegExp(`/empresa/clientes/${cliente.id}`))
    } finally {
      await supabaseAdmin.from('crm_clientes').delete().eq('id', cliente.id)
    }
  })

  test('emp-15 - /empresa/clientes/[id] responde sin errores 500', async ({ page }) => {
    // Es una ruta dinámica, así que con un fake ID devolverá 404 pero la UI de shell no crashea
    const res = await page.goto('/empresa/clientes/fake-id', { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBeLessThan(500)
  })
})
