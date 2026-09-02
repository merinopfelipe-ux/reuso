import { test, expect, Page } from '@playwright/test'

// Los 4 tipos reales son Info/Promo/Estado/Urgente (Selector custom, nunca
// <select> nativo) — no existen "warning"/"critical". Prioridad real
// (banner-alerta.tsx): Urgente > Estado > Promo > Info, y solo se muestra
// UNA alerta a la vez (la de mayor prioridad entre las no leídas), nunca
// varias apiladas. Corregido junto con /admin/qa el 2026-09-02.
async function elegirSelector(page: Page, labelTexto: string, opcionTexto: string) {
  // El botón del Selector es el div hermano inmediato del <label> (no un
  // ancestro compartido — ese filtro amplio matcheaba 11 botones de toda
  // la página, bug real corregido 2026-09-02 al verificar en vivo).
  const contenedorSelector = page.locator('label', { hasText: labelTexto })
    .locator('xpath=following-sibling::div[1]')
  await contenedorSelector.getByRole('button').click()
  // El botón disparador puede mostrar como texto la misma opción que se
  // quiere elegir (ej. "Info" ya viene seleccionado por defecto) — sin
  // scopear al panel desplegado, getByRole matchea los dos y falla en
  // modo estricto (bug real corregido 2026-09-02). El panel es el último
  // <div> dentro del mismo contenedor del Selector.
  await contenedorSelector.locator('div').last().getByRole('button', { name: opcionTexto, exact: true }).click()
}

async function crearAlerta(page: Page, { titulo, mensaje, tipo }: { titulo: string; mensaje: string; tipo: string }) {
  await page.goto('/admin/alertas')
  await page.waitForLoadState('load')
  await page.getByText('Nueva alerta', { exact: true }).click()
  await page.getByPlaceholder('Título *').fill(titulo)
  await page.getByPlaceholder('Mensaje *').fill(mensaje)
  await elegirSelector(page, 'Tipo', tipo)
  await page.getByText('Publicar alerta').click()
  await expect(page.getByPlaceholder('Título *')).not.toBeVisible({ timeout: 10_000 })
}

test.describe('Alertas', () => {
  test('alerta-01 - crear alerta global de tipo Urgente', async ({ browser }) => {
    const empleadoCtx = await browser.newContext({ storageState: 'playwright/.auth/empleado.json' })
    const paginaEmpleado = await empleadoCtx.newPage()
    // Limpieza defensiva: una alerta Urgente vieja sin leer (de una
    // corrida anterior fallida) podría mostrarse en vez de la nueva.
    await paginaEmpleado.request.post('/api/alertas/marcar-todas-leidas')

    const admin = await browser.newContext({ storageState: 'playwright/.auth/super-admin.json' })
    const paginaAdmin = await admin.newPage()
    const titulo = `E2E alerta urgente ${Date.now()}`
    await crearAlerta(paginaAdmin, { titulo, mensaje: 'Corte programado el sábado a las 22:00.', tipo: 'Urgente' })
    await admin.close()

    await paginaEmpleado.goto('/dashboard')
    await paginaEmpleado.waitForLoadState('load')
    const banner = paginaEmpleado.getByText(titulo)
    await expect(banner).toBeVisible({ timeout: 10_000 })
    // banner-alerta.tsx: <span título> -> div columna texto -> div ícono+texto -> div raíz con el fondo de color (3 niveles, no 2).
    const fondo = await banner.locator('xpath=ancestor::div[3]').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(fondo).toBe('rgb(204, 60, 42)') // #CC3C2A, color real de "Urgente"

    // Limpieza: marca como leída para no contaminar otras pruebas de alertas.
    await paginaEmpleado.getByLabel('Cerrar alerta').click()
    await empleadoCtx.close()
  })

  test('alerta-02 - marcar alerta como leída persiste en el servidor', async ({ browser }) => {
    const empleadoCtx = await browser.newContext({ storageState: 'playwright/.auth/empleado.json' })
    const page = await empleadoCtx.newPage()
    // Limpieza defensiva: una alerta vieja sin leer (de una corrida
    // anterior fallida) puede tener más prioridad y tapar la nueva.
    await page.request.post('/api/alertas/marcar-todas-leidas')

    const admin = await browser.newContext({ storageState: 'playwright/.auth/super-admin.json' })
    const paginaAdmin = await admin.newPage()
    const titulo = `E2E alerta leida ${Date.now()}`
    await crearAlerta(paginaAdmin, { titulo, mensaje: 'Prueba de persistencia de lectura.', tipo: 'Info' })
    await admin.close()

    await page.goto('/dashboard')
    await page.waitForLoadState('load')
    await expect(page.getByText(titulo)).toBeVisible({ timeout: 10_000 })

    await page.getByLabel('Cerrar alerta').click()
    await expect(page.getByText(titulo)).not.toBeVisible({ timeout: 5_000 })

    // La prueba real: recargar (no localStorage — si el servidor no
    // recordara la lectura, la alerta volvería a aparecer aquí).
    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.getByText(titulo)).not.toBeVisible({ timeout: 5_000 })
    await empleadoCtx.close()
  })

  test('alerta-03 - solo se muestra la alerta de mayor prioridad', async ({ browser }) => {
    const empleadoCtx = await browser.newContext({ storageState: 'playwright/.auth/empleado.json' })
    const page = await empleadoCtx.newPage()
    // Limpieza defensiva: una alerta vieja sin leer (de una corrida
    // anterior fallida) puede tener más prioridad y tapar la nueva.
    await page.request.post('/api/alertas/marcar-todas-leidas')

    const admin = await browser.newContext({ storageState: 'playwright/.auth/super-admin.json' })
    const paginaAdmin = await admin.newPage()
    const tituloInfo = `E2E alerta info ${Date.now()}`
    const tituloUrgente = `E2E alerta urgente prioridad ${Date.now()}`
    await crearAlerta(paginaAdmin, { titulo: tituloInfo, mensaje: 'Alerta de baja prioridad.', tipo: 'Info' })
    await crearAlerta(paginaAdmin, { titulo: tituloUrgente, mensaje: 'Alerta de alta prioridad.', tipo: 'Urgente' })
    await admin.close()

    await page.goto('/dashboard')
    await page.waitForLoadState('load')

    // Solo la Urgente se muestra, nunca las dos a la vez.
    await expect(page.getByText(tituloUrgente)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(tituloInfo)).not.toBeVisible()

    // Al marcar la Urgente como leída, debe aparecer la de Info.
    await page.getByLabel('Cerrar alerta').click()
    await expect(page.getByText(tituloInfo)).toBeVisible({ timeout: 10_000 })

    // Limpieza.
    await page.getByLabel('Cerrar alerta').click()
    await empleadoCtx.close()
  })
})
