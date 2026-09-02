import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// e2e/auth.setup.ts guarda email+password reales de cada cuenta efímera acá
// (no solo el id) — hace falta la contraseña real para pasar la validación
// server-side del cambio de contraseña/teléfono, una de prueba inventada no
// sirve (bug real corregido 2026-09-02: con una contraseña falsa, el
// servidor rechaza la solicitud en silencio y el flujo nunca avanza).
function passwordEfimero(rol: string): string {
  const datos = JSON.parse(fs.readFileSync('playwright/.auth/efimeros.json', 'utf-8'))
  return datos[rol].password
}

test.describe('Settings y Perfil', () => {
  test.use({ storageState: 'playwright/.auth/empleado.json' })

  test('set-01 - editar perfil (nombre y apodo) refleja el saludo del dashboard', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('load')
    await page.getByPlaceholder('Ej: Juanis, El Profe...').fill('TesterQA')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText(/actualizado|guardado/i).first()).toBeVisible({ timeout: 10_000 })

    await page.goto('/dashboard')
    await page.waitForLoadState('load')
    await expect(page.getByText(/hola,?\s*testerqa/i)).toBeVisible({ timeout: 10_000 })
  })

  // set-02 solo automatiza hasta "Enviar código de verificación" — el paso
  // siguiente exige leer el código de 6 dígitos del correo real, que este
  // entorno de pruebas no puede automatizar sin acceso a la bandeja.
  test('set-02 - cambiar contraseña pide un código de verificación por correo', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('load')
    await page.getByPlaceholder('Contraseña actual').fill(passwordEfimero('empleado'))
    await page.getByPlaceholder(/Contraseña nueva/).fill('NuevaClaveSegura123')
    const boton = page.getByRole('button', { name: /Enviar código de verificación/ })
    await expect(boton).toBeEnabled()
    await boton.click()
    await expect(page.getByText('Ingresa el código de 6 dígitos que enviamos a tu correo.')).toBeVisible({ timeout: 10_000 })
  })

  test('set-03 - cambiar teléfono exige contraseña (campo sensible)', async ({ page }) => {
    // El campo Teléfono solo aparece si el perfil ya tiene uno — se asigna
    // uno de prueba directo en la base antes de abrir /settings.
    const { data: sesion } = await supabaseAdmin.auth.admin.listUsers()
    const usuario = sesion.users.find(u => u.email?.startsWith('e2e_empleado_'))
    if (usuario) {
      await supabaseAdmin.from('profiles').update({ telefono: '+573001234567' }).eq('user_id', usuario.id)
    }

    await page.goto('/settings')
    await page.waitForLoadState('load')
    const candado = page.locator('button[title="Cambiar teléfono"]')
    await expect(candado).toBeVisible({ timeout: 10_000 })
    await candado.click()

    // "Contraseña actual" también existe en el formulario de "Cambiar
    // contraseña" de la misma página — sin scopear al panel del teléfono,
    // el .last() apuntaba al campo equivocado (bug real corregido
    // 2026-09-02). El campo "Nuevo teléfono" es único, se ubica desde ahí.
    const panelTelefono = page.getByPlaceholder(/Nuevo teléfono/).locator('xpath=..')
    const botonConfirmar = page.getByRole('button', { name: /Verificar y cambiar/ })
    await expect(botonConfirmar).toBeDisabled()
    await panelTelefono.getByPlaceholder('Contraseña actual').fill('contraseña-incorrecta-de-prueba')
    await panelTelefono.getByPlaceholder(/Nuevo teléfono/).fill('+573009876543')
    await expect(botonConfirmar).toBeEnabled()
  })
})

test.describe('Ayuda', () => {
  test.use({ storageState: 'playwright/.auth/empleado.json' })

  test('ayuda-01 - enviar ticket y ver FAQ (sin buscador, /ayuda no tiene uno)', async ({ page }) => {
    await page.goto('/ayuda')
    await page.waitForLoadState('load')

    await page.getByText('Pregunta de uso').click()
    await page.getByPlaceholder('Describe con detalle lo que necesitas...').fill('Prueba automatizada de envío de ticket desde e2e.')
    await page.getByRole('button', { name: 'Enviar ticket' }).click()
    await expect(page.getByText(/enviado|recibido|gracias/i).first()).toBeVisible({ timeout: 10_000 })

    await page.locator('summary', { hasText: '¿Cómo genero un informe?' }).click()
    await expect(page.getByText('Registra objetos en "Mis objetos"')).toBeVisible({ timeout: 5_000 })
  })
})
