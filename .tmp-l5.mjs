import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
for (const [n, w] of [['celular', 390], ['tablet', 820], ['computador', 1440]]) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, storageState: 'playwright/.auth/super-admin.json' })
  const p = await c.newPage()
  await p.goto('http://localhost:3000/admin/leads', { waitUntil: 'load' }); await p.waitForTimeout(5000)
  console.log(n, w, JSON.stringify(await p.evaluate(() => {
    const L = 'Interesada en medición de impacto ambiental para toda la línea de mobiliario corporativo restaurado y certificación'
    const cab = [...document.querySelectorAll('thead th')].map(t => t.innerText.trim().replace(/\n/g, ' ').slice(0, 10) || '·')
    const tr = document.querySelector('tbody tr')
    const res = []
    tr.querySelectorAll('td').forEach((td, j) => {
      td.querySelectorAll('span,a,div').forEach(el => {
        if (el.querySelector('span,a,div') || !el.innerText?.trim()) return
        const prev = el.innerText
        el.textContent = L
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 18
        const l = Math.round(el.getBoundingClientRect().height / lh)
        if (l > 2) res.push(`${cab[j]}: ${l} líneas`)
        el.textContent = prev
      })
    })
    return res
  })))
  await c.close()
}
await b.close()
