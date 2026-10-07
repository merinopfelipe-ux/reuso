import { defineConfig, devices } from '@playwright/test'

try {
  ;(process as unknown as { loadEnvFile?: (path: string) => void }).loadEnvFile?.('.env.local')
} catch {}

// E2E_BASE_URL permite correr la suite contra otro servidor (ej. un build de
// producción local) sin tocar el de desarrollo del puerto 3000.
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  // `fullyParallel: false` solo serializa las pruebas DENTRO de un archivo:
  // Playwright igual corre varios ARCHIVOS a la vez en workers distintos, y
  // todos golpean el mismo servidor de desarrollo. Eso fue la causa real de
  // los cortes de conexión (ERR_EMPTY_RESPONSE / ERR_CONNECTION_RESET) y de
  // pantallas "Algo salió mal" al azar que parecían bugs de la aplicación
  // (diagnosticado el 2026-09-02). Un solo worker hace la suite más lenta
  // pero confiable, que es justo lo que se necesita para que sirva de símil
  // del QA manual.
  workers: 1,
  // En CI un reintento: una prueba solo cuenta como fallida si falla dos
  // veces seguidas (evita que una inestable frene la fusión automática).
  retries: process.env.CI ? 2 : 0,
  // En CI el servidor compila cada pantalla la primera vez que se abre, así que
  // lo que en local tarda 5 s allá puede tardar más de 60 s. El tope alto solo
  // aplica en CI: en local sigue en 60 s para que un cuelgue real se note.
  timeout: process.env.CI ? 150_000 : 60_000,
  // En CI también genera el reporte HTML que el workflow sube como artefacto.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    locale: 'es-ES',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      retries: process.env.CI ? 2 : 1,
      timeout: process.env.CI ? 200_000 : 90_000,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'SKIP_RATE_LIMIT=true SKIP_TEST_EMAILS=true npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
