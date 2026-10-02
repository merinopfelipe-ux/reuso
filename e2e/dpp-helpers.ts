import { expect, type Page } from './fixtures'

// WebP de 1x1 px: suficiente para el flujo manual, que exige al menos una foto
// pero no la manda a ninguna IA (directriz del proyecto: no gastar tokens).
export const FOTO_MINIMA = {
  name: 'test.webp',
  mimeType: 'image/webp',
  buffer: Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3QgAAA', 'base64'),
}

// Flujo actual de /empresa/dpp/nuevo: el formulario del activo vive en una
// tarjeta que aparece tras subir foto y pulsar "Generar propuesta". En modo
// Manual la tarjeta sale vacía para llenarla a mano. Devuelve el campo nombre.
export async function abrirTarjetaDppManual(page: Page) {
  await page.goto('/empresa/dpp/nuevo', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.getByRole('button', { name: 'Manual' }).first().click({ timeout: 30_000 })
  await page.locator('input[type="file"]').first().setInputFiles(FOTO_MINIMA)
  await page.getByRole('button', { name: 'Generar propuesta' }).click()
  const campoNombre = page.getByPlaceholder('Silla de madera, Mesa de oficina...')
  await expect(campoNombre).toBeVisible({ timeout: 30_000 })
  return campoNombre
}

// Agrega un material con su peso: el botón de confirmar exige peso total > 0.
export async function agregarMaterial(page: Page, nombre: string, pesoKg: string) {
  await page.getByRole('button', { name: 'Añadir material' }).click()
  await page.getByPlaceholder('Ej: Hierro').last().fill(nombre)
  const peso = page.locator('input[type="number"][step="0.01"]').last()
  await peso.fill(pesoKg)
  return peso
}
