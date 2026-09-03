import { defineConfig, devices } from '@playwright/test'

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
  retries: 0,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    locale: 'es-ES',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      retries: 1,
      timeout: 90_000,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'SKIP_RATE_LIMIT=true SKIP_TEST_EMAILS=true npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
