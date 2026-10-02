import { test as base, expect, type Page } from '@playwright/test'

// El banner de cookies aparece en la primera interacción (o a los 12 s) para
// no afectar la medición de rendimiento. Si una prueba intenta cerrarlo al
// cargar, todavía no existe, y luego aparece encima de los botones al escribir.
// Por eso cada página arranca con el consentimiento "solo esenciales" guardado.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      try {
        if (!localStorage.getItem('reuso_cookies_consent')) {
          localStorage.setItem('reuso_cookies_consent', JSON.stringify({ v: 1, ts: Date.now(), e: true, f: false, a: false }))
        }
      } catch {}
    })
    await use(context)
  },
})

export { expect, type Page }
