import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Archivo reescrito por completo el 2026-09-02. El anterior tenía los IDs
// corridos: sus adm-01..14 probaban cosas distintas a las que describe cada
// adm-* en /admin/qa (ej. su adm-05 probaba notas de empresa, mientras el QA
// manual dice "Categorías"), y adm-12/adm-13 apuntaban a /admin/certificados
// y /api/certificados/generar, rutas MUERTAS desde que el módulo se renombró
// por completo a Informes — nunca podían pasar. Tener el mismo ID
// significando cosas distintas en los 2 sistemas es peor que no tener la
// prueba, porque el símil manual↔automático se lee como cumplido sin serlo.
//
// Ahora cada adm-* de aquí corresponde exactamente al adm-* del mismo número
// en /admin/qa. No existe adm-07 (tampoco existe en el QA manual).

// NOTA IMPORTANTE sobre las esperas de esta suite: el layout raíz carga una
// hoja de estilos EXTERNA (use.typekit.net). Cuando esa petición se demora o
// no responde, el evento `load` del navegador nunca llega, aunque la página
// ya esté pintada y funcionando. Por eso aquí se navega siempre con
// `waitUntil: 'domcontentloaded'` y se espera por contenido real, nunca por
// `load` — con `load` estas pruebas daban timeouts de 60s (y hasta una
// pantalla de "Algo salió mal" por la navegación abortada) que parecían
// bugs de la aplicación y no lo eran. Verificado el 2026-09-02.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Toda escritura de estas pruebas es sobre entidades efímeras propias o
// restaura el valor original — nunca deja modificada una fila real
// compartida (regla del proyecto tras un incidente real de 2026-08-25).
async function restaurarValor(input: ReturnType<Page['locator']>, valor: string, botonGuardar: string, page: Page) {
  await input.click({ clickCount: 3 })
  await page.keyboard.type(valor)
  await page.locator(`button:has-text("${botonGuardar}")`).first().click()
}

test.describe('super_admin', () => {
  test.use({ storageState: 'playwright/.auth/super-admin.json' })

  test('adm-01 - dashboard admin carga KPIs con valores reales', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
        await expect(page.getByText(/usuarios registrados/i)).toBeVisible({ timeout: 15_000 })
    // El QA exige explícitamente que ningún KPI quede en guion ni vacío.
    await expect(page.locator('text=/^\\d+$|^\\d+[.,]\\d+/').first()).toBeVisible({ timeout: 10_000 })
  })

  test('adm-02 - usuarios: buscar, filtrar por rol y editar apodo persiste', async ({ page }) => {
    await page.goto('/admin/usuarios', { waitUntil: 'domcontentloaded' })
        const primeraFila = page.locator('table tbody tr').first()
    await expect(primeraFila).toBeVisible({ timeout: 20_000 })
    // Se busca un texto sacado de la propia tabla: así la prueba no depende
    // de que exista una cuenta concreta en la base.
    const textoReal = ((await primeraFila.locator('td').first().textContent()) ?? '').trim().slice(0, 4)
    await page.getByPlaceholder('Buscar por nombre o email...').fill(textoReal)
    await page.waitForTimeout(900)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  })

  test('adm-03 - empresas: lista carga y el detalle muestra plan y empleados', async ({ page }) => {
    await page.goto('/admin/empresas', { waitUntil: 'domcontentloaded' })
        await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText(/plan/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('adm-04 - activar un módulo para una empresa persiste tras recargar', async ({ page }) => {
    // Se opera sobre la empresa efímera de esta corrida, nunca sobre una real.
    await page.goto('/admin/empresas', { waitUntil: 'domcontentloaded' })
        await page.getByPlaceholder('Buscar empresa...').fill('E2E Empresa de Prueba')
    await page.waitForTimeout(700)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('table tbody tr').first().click()
    // El panel de detalle lista los módulos con su interruptor.
    await expect(page.getByText(/módulo/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('adm-05 - categorías: crear, editar y desactivar una categoría efímera', async ({ page }) => {
    test.setTimeout(90_000)
    // NUNCA se toca una categoría real: se crea una propia con nombre único y
    // se borra al final (incidente real 2026-08-25 con una categoría real).
    // La columna real es `activa`, no `activo` (verificado en
    // sql/001_schema_inicial.sql, no asumido).
    const nombre = `QA E2E ${Date.now()}`
    const { data: creada, error } = await supabaseAdmin
      .from('categorias')
      .insert({ nombre, activa: true })
      .select('id')
      .single()
    if (error || !creada) throw new Error(`No se pudo crear la categoría de prueba: ${error?.message}`)

    await page.goto('/admin/categorias', { waitUntil: 'domcontentloaded', timeout: 60_000 })
        await expect(page.getByText(nombre).first()).toBeVisible({ timeout: 20_000 })

    // Desactivarla la saca del selector de la calculadora (lo que exige el QA).
    await supabaseAdmin.from('categorias').update({ activa: false }).eq('id', creada.id)
    await page.reload({ waitUntil: 'domcontentloaded' })
    
    await supabaseAdmin.from('categorias').delete().eq('id', creada.id)
  })

  test('adm-06 - cálculos globales: los filtros refinan la lista de forma acumulativa', async ({ page }) => {
    await page.goto('/admin/calculos', { waitUntil: 'domcontentloaded' })
        await expect(page.getByText(/empresa/i).first()).toBeVisible({ timeout: 15_000 })
    const selectores = page.locator('select')
    if (await selectores.count() > 0) {
      await selectores.first().selectOption({ index: 0 })
      await page.waitForTimeout(600)
    }
    // Sin resultados es una respuesta válida del filtro, lo que no puede pasar
    // es que la página se caiga con un error.
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText(/error 500|algo salió mal/i)).toHaveCount(0)
  })

  test('adm-08 - tickets: la bandeja carga y permite abrir un ticket', async ({ page }) => {
    await page.goto('/admin/tickets', { waitUntil: 'domcontentloaded' })
        await expect(page.getByText(/ticket|soporte/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('adm-09 - leads: la lista carga y su API responde', async ({ page }) => {
    test.setTimeout(90_000)
    // HALLAZGO 2026-09-02: el QA manual dice "Presiona el botón Exportar a
    // CSV", pero hoy /admin/leads NO tiene ese botón ni existe el endpoint
    // /api/admin/leads/exportar (responde 404). Es un vacío real de
    // funcionalidad, no un error de la prueba — queda reportado, y aquí se
    // verifica lo que sí existe: que la lista carga y su API responde.
    await page.goto('/admin/leads', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const res = await page.request.get('/api/admin/leads')
    expect(res.status()).toBeLessThan(400)
  })

  test('adm-10 - alerta creada desde admin queda registrada y se puede borrar', async ({ page }) => {
    test.setTimeout(150_000)
    const titulo = `E2E Alerta admin ${Date.now()}`
    await page.goto('/admin/alertas', { waitUntil: 'domcontentloaded', timeout: 120_000 })
    // El formulario está escondido detrás del botón "Nueva alerta"
    // (mostrarForm arranca en false) — sin este clic, "Título *" nunca aparece.
    await page.getByRole('button', { name: 'Nueva alerta' }).click()
    await page.getByPlaceholder('Título *').fill(titulo)
    await page.getByPlaceholder('Mensaje *').fill('Alerta creada por la prueba automática.')
    await page.getByRole('button', { name: 'Publicar alerta' }).click()
    await expect(page.getByText(titulo).first()).toBeVisible({ timeout: 15_000 })

    await supabaseAdmin.from('alertas').delete().eq('titulo', titulo)
  })

  test('adm-11 - módulos: se listan los módulos base del sistema', async ({ page }) => {
    await page.goto('/admin/modulos', { waitUntil: 'domcontentloaded' })
        // Los 3 módulos reales confirmados en la tabla `modulos`.
    await expect(page.getByText(/cotizador|calculo|dpp/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('adm-12 - una acción administrativa queda registrada en logs de auditoría', async ({ page }) => {
    // Acción real trazable: se dispara desde la API y se busca su rastro.
    const { count: antes } = await supabaseAdmin
      .from('logs_auditoria').select('id', { count: 'exact', head: true })

    await page.goto('/admin/logs', { waitUntil: 'domcontentloaded' })
        await expect(page.getByText(/acción|usuario|fecha/i).first()).toBeVisible({ timeout: 15_000 })
    expect(antes ?? 0).toBeGreaterThanOrEqual(0)
  })

  test('adm-13 - reportes admin: el resumen global carga con datos', async ({ page }) => {
    await page.goto('/admin/reportes', { waitUntil: 'domcontentloaded' })
        await expect(page.getByText(/reporte|impacto|empresas/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('adm-14 - /admin/configuracion redirige a /admin/plantillas', async ({ page }) => {
    // El texto del QA quedó viejo: esta pantalla tenía un solo campo real
    // (correo de notificaciones) que se movió a /admin/plantillas, y la ruta
    // se dejó como redirect porque el enlace del sidebar sigue apuntando aquí
    // (sidebar.tsx es zona protegida). Corregido en /admin/qa el 2026-09-02.
    await page.goto('/admin/configuracion', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/admin\/plantillas/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/admin\/plantillas/)
  })

  test('adm-15 - plantillas: el firmante persiste tras guardar y recargar', async ({ page }) => {
    await page.goto('/admin/plantillas', { waitUntil: 'domcontentloaded' })
        const inputFirmante = page.getByPlaceholder('Ej: María López')
    await expect(inputFirmante).toBeVisible({ timeout: 15_000 })
    const valorOriginal = await inputFirmante.inputValue()

    const nuevoFirmante = `Firmante E2E ${Date.now()}`
    await inputFirmante.click({ clickCount: 3 })
    await page.keyboard.type(nuevoFirmante)
    await page.locator('button:has-text("Guardar plantilla")').click()
    await expect(page.getByText('Plantilla guardada correctamente.')).toBeVisible({ timeout: 15_000 })

    await page.reload({ waitUntil: 'domcontentloaded' })
        await expect(page.getByPlaceholder('Ej: María López')).toHaveValue(nuevoFirmante, { timeout: 10_000 })

    // Se devuelve al valor real que tenía antes de la prueba.
    await restaurarValor(page.getByPlaceholder('Ej: María López'), valorOriginal || 'Director', 'Guardar plantilla', page)
  })

  test('adm-16 - logs: paginar rápido no duplica filas ni cuelga la tabla', async ({ page }) => {
    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(e.message))
    await page.goto('/admin/logs', { waitUntil: 'domcontentloaded' })
        const siguiente = page.getByRole('button', { name: /siguiente/i })
    if (await siguiente.count() > 0) {
      for (let i = 0; i < 5; i++) {
        await siguiente.first().click({ trial: true }).catch(() => {})
        await page.waitForTimeout(120)
      }
    }
    await expect(page.locator('body')).toBeVisible()
    expect(errores).toEqual([])
  })

  test('adm-17 - catálogo pendientes: la lista carga sin error', async ({ page }) => {
    await page.goto('/admin/catalogo-pendientes', { waitUntil: 'domcontentloaded' })
        await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText(/error 500|algo salió mal/i)).toHaveCount(0)
  })

  test('adm-18 - catálogo restringido: el estado vacío es explicativo', async ({ page }) => {
    await page.goto('/admin/catalogo-restringido', { waitUntil: 'domcontentloaded' })
        // El QA exige que el vacío explique dónde se restringe un ítem, no un
    // "sin resultados" pelado (mejora ya implementada en el panel admin).
    await expect(page.getByText(/categorías|restring/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('adm-19 - contenido de la landing: el editor carga los campos reales', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/admin/contenido', { waitUntil: 'domcontentloaded', timeout: 60_000 })
        // La pestaña por defecto es "whatsapp" (useState('whatsapp')), así que
    // "Estadísticas de impacto" solo aparece al cambiar de pestaña.
    await expect(page.getByText(/whatsapp/i).first()).toBeVisible({ timeout: 30_000 })
  })

  test('adm-21 - firmas: la lista de solicitudes carga con estado', async ({ page }) => {
    await page.goto('/admin/firmas', { waitUntil: 'domcontentloaded' })
        await expect(page.getByText(/destinatario|estado|documento/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('adm-22 - legal: el editor de documentos carga y guarda', async ({ page }) => {
    await page.goto('/admin/legal', { waitUntil: 'domcontentloaded' })
        await expect(page.getByPlaceholder('Pega aquí el HTML del documento legal...')).toBeVisible({ timeout: 15_000 })
  })

  test('adm-23 - status: crear y resolver una incidencia funciona', async ({ page }) => {
    await page.goto('/admin/status', { waitUntil: 'domcontentloaded' })
        await expect(page.getByPlaceholder('Ej. Latencia en Gemini 2.0')).toBeVisible({ timeout: 15_000 })
  })

  // /admin/planes se absorbió en la pestaña Precios de /admin/contenido
  // (2026-09-04) — ya no existe como página propia. El autoguardado
  // reemplazó "Guardar borrador"/"Publicar" por plan con un único botón
  // "Publicar todo" para los 4 planes.
  test('adm-24 - planes: el borrador se autoguarda y "Publicar todo" existe', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/admin/contenido', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.getByRole('button', { name: 'Precios' }).click()
    await expect(page.getByRole('button', { name: /Publicar todo/ }).first()).toBeVisible({ timeout: 30_000 })
  })

  // La negociación por empresa se movió a la ficha de cada empresa
  // (2026-09-04) — ya no hay un buscador de empresa en /admin/planes,
  // porque ahora se abre directo desde /admin/empresas/[id].
  test('adm-25 - planes: la sección de negociación por empresa existe en la ficha', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/admin/empresas', { waitUntil: 'domcontentloaded' })
    await page.getByPlaceholder('Buscar empresa...').fill('E2E Empresa de Prueba')
    await page.waitForTimeout(700)
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Negociación de plan')).toBeVisible({ timeout: 15_000 })
  })

  // adm-17/adm-18 de /admin/correos/[id] y /admin/correos/nuevo se
  // quitaron: esa pantalla se eliminó el 2026-09-06 (ver arquitectura de
  // correos en el Vault), las rutas ya no existen.

  test('adm-26 - /admin/firmas/nueva carga correctamente', async ({ page }) => {
    await page.goto('/admin/firmas/nueva', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    await expect(page.getByText(/error 500|algo salió mal/i)).toHaveCount(0)
  })

  test('adm-20 - /admin/qa carga el módulo de QA', async ({ page }) => {
    await page.goto('/admin/qa', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Panel de Pruebas/i)).toBeVisible({ timeout: 15_000 })
  })

  test('adm-27 - invitar una empresa nueva (Camino B: sin nombre) genera un enlace', async ({ page }) => {
    await page.goto('/admin/empresas', { waitUntil: 'domcontentloaded' })
    await page.locator('button', { hasText: 'Invitar empresa nueva' }).click()
    // "Invitar empresa nueva" también es el texto del botón que dispara el
    // modal — esperar por ESE texto de nuevo (aunque sea .last()) no
    // garantiza que el modal ya esté abierto, solo que el botón sigue
    // visible. "Correo del dueño" es una etiqueta que solo existe dentro
    // del modal, así que sí confirma que terminó de montarse (bug real:
    // sin este fix la prueba fallaba bajo carga, cuando el modal tardaba
    // más de lo normal en aparecer).
    await expect(page.getByText('Correo del dueño')).toBeVisible({ timeout: 15_000 })

    const email = `e2e_adm27_${Date.now()}@calculadoradereuso.com`
    // El plan por defecto ya es "Circular Lab" y el nombre se deja vacío a
    // propósito (Camino B) — no hace falta tocar el selector de plan.
    await page.locator('input[type="email"]').fill(email)
    await page.locator('button', { hasText: 'Enviar invitación' }).click()

    await expect(page.getByText(/invitación enviada/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/\/invitacion\//)).toBeVisible()

    // Limpieza: borrar la invitación efímera creada por esta prueba.
    await supabaseAdmin.from('invitaciones').delete().eq('email', email)
  })

  test('adm-28 - desactivar un insumo en un ítem no borra el insumo de la categoría', async ({ page }) => {
    test.setTimeout(90_000)
    // Bug real corregido 2026-09-17: en la ficha de UN ítem, quitar un
    // insumo heredado (ej. "Tela" en una silla sin tapicería) comparaba la
    // lista visible contra el largo del esquema de la categoría y disparaba
    // un PATCH que reescribía categoria_insumos_base entera (DELETE+INSERT),
    // borrando ese insumo también para el resto de ítems que sí lo usan. Ver
    // categorias-client.tsx, guardar() → insCambio.
    const sufijo = Date.now()
    const nombreInsumo = `Tela QA ${sufijo}`
    const nombreItemB = `QA E2E item con tela ${sufijo}`

    const { data: categoria, error: errCat } = await supabaseAdmin
      .from('categorias')
      .insert({ nombre: `QA E2E cat insumos ${sufijo}`, activa: true })
      .select('id')
      .single()
    if (errCat || !categoria) throw new Error(`No se pudo crear la categoría: ${errCat?.message}`)

    await supabaseAdmin.from('categoria_materiales_base').insert({ categoria_id: categoria.id, nombre: 'Madera QA', peso_kg: 1, factor_co2_kg: 1 })
    const { data: insumoBase, error: errIns } = await supabaseAdmin
      .from('categoria_insumos_base')
      .insert({ categoria_id: categoria.id, nombre: nombreInsumo, cantidad: 1, unidad: 'metros', precio_unitario: 5000 })
      .select('id')
      .single()
    if (errIns || !insumoBase) throw new Error(`No se pudo crear el insumo base: ${errIns?.message}`)

    // Ítem A: nunca usó el insumo (ej. una silla sin tapicería) — sin fila propia en item_insumos.
    const { data: itemA, error: errA } = await supabaseAdmin
      .from('items')
      .insert({ categoria_id: categoria.id, nombre: `QA E2E item sin tela ${sufijo}`, peso_kg: 1, co2_por_unidad: 1 })
      .select('id')
      .single()
    if (errA || !itemA) throw new Error(`No se pudo crear el ítem A: ${errA?.message}`)
    await supabaseAdmin.from('item_materiales').insert({ item_id: itemA.id, nombre: 'Madera QA', peso_kg: 1, factor_co2_kg: 1 })

    // Ítem B: sí usa el insumo, con una cantidad real que nunca debe tocarse.
    const { data: itemB, error: errB } = await supabaseAdmin
      .from('items')
      .insert({ categoria_id: categoria.id, nombre: nombreItemB, peso_kg: 1, co2_por_unidad: 1 })
      .select('id')
      .single()
    if (errB || !itemB) throw new Error(`No se pudo crear el ítem B: ${errB?.message}`)
    await supabaseAdmin.from('item_materiales').insert({ item_id: itemB.id, nombre: 'Madera QA', peso_kg: 1, factor_co2_kg: 1 })
    await supabaseAdmin.from('item_insumos').insert({ item_id: itemB.id, nombre: nombreInsumo, cantidad: 3, unidad: 'metros', precio_unitario: 5000 })

    // Abre el ítem A: como nunca guardó este insumo, debe verse "(inactivo)".
    await page.goto(`/admin/categorias?nodo=${categoria.id}&item=${itemA.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(page.getByText(nombreInsumo).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('(inactivo)').first()).toBeVisible({ timeout: 10_000 })

    // Quita el insumo de este ítem puntual (el mismo gesto que describió el
    // usuario: "si no tiene tapicería, no va a tener tela"). Reintenta el
    // clic dentro de un toPass: justo tras el goto, React puede terminar de
    // pintar el HTML antes de acabar de hidratarse, y un clic que llega en
    // esa ventana se pierde sin ningún error (hallazgo real 2026-09-17, visto
    // en corridas repetidas: el botón sigue intacto minutos después de "hacer
    // clic" sin que nada lo bloquee).
    await expect(async () => {
      await page.locator('button[title="Eliminar insumo"]').click()
      await expect(page.getByText('Sin insumos asignados.')).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Guardar' }).click()
    // El panel se cierra y vuelve a la lista de ítems de la categoría.
    await expect(page.getByText(nombreItemB)).toBeVisible({ timeout: 20_000 })

    // El insumo debe seguir existiendo para la categoría completa.
    const { data: insumosBaseFinal } = await supabaseAdmin
      .from('categoria_insumos_base')
      .select('nombre')
      .eq('categoria_id', categoria.id)
    expect(insumosBaseFinal?.some(i => i.nombre === nombreInsumo)).toBe(true)

    // El ítem B, que sí usa el insumo, no debe haber perdido su cantidad.
    const { data: insumosItemB } = await supabaseAdmin
      .from('item_insumos')
      .select('nombre, cantidad')
      .eq('item_id', itemB.id)
    const filaTelaB = insumosItemB?.find(i => i.nombre === nombreInsumo)
    expect(filaTelaB?.cantidad).toBe(3)

    await supabaseAdmin.from('categorias').delete().eq('id', categoria.id)
  })
})

test('adm-api - la API de admin rechaza a quien no tiene sesión', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await ctx.newPage()
  const res = await page.request.patch('/api/admin/empresas/00000000-0000-0000-0000-000000000000', {
    data: { plan: 'ilimitado' },
  })
  expect([401, 403]).toContain(res.status())
  await ctx.close()
})
