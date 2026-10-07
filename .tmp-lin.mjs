import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
for (const [n, w] of [['celular', 390], ['tablet', 820], ['computador', 1440]]) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, storageState: 'playwright/.auth/super-admin.json' })
  const p = await c.newPage()
  await p.goto('http://localhost:3000/admin/leads', { waitUntil: 'load' }); await p.waitForTimeout(5000)
  const r = await p.evaluate(() => {
    const out = []
    const fila = document.querySelector('tbody tr')
    if (!fila) return 'sin filas'
    document.querySelectorAll('tbody tr').forEach((tr, i) => {
      if (i > 2) return
      tr.querySelectorAll('td').forEach((td, j) => {
        const el = td.querySelector('div,span,a') || td
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 18
        const lineas = Math.round(el.scrollHeight / lh)
        if (lineas > 2) out.push(`fila${i} col${j}: ${lineas} líneas · ${el.innerText.slice(0, 30).replace(/\n/g, ' ')}`)
      })
    })
    const mail = document.querySelector('tbody a[href^="mailto:"]')
    const m = mail ? { cortado: mail.scrollWidth > mail.clientWidth + 1, ancho: Math.round(mail.getBoundingClientRect().width), texto: mail.innerText } : null
    const t = document.querySelector('table')
    return { excesos: out, correo: m, tabla: t.scrollWidth, cont: t.parentElement.clientWidth }
  })
  console.log(n, w, JSON.stringify(r))
  await c.close()
}
await b.close()
