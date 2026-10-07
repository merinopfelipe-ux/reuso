import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
for (const [n, w] of [['celular', 390], ['tablet', 820], ['computador', 1440]]) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, storageState: 'playwright/.auth/super-admin.json' })
  const p = await c.newPage()
  await p.goto('http://localhost:3000/admin/leads', { waitUntil: 'load' }); await p.waitForTimeout(5000)
  console.log(n, w, JSON.stringify(await p.evaluate(() => {
    const cab = [...document.querySelectorAll('thead th')].map(t => t.innerText.trim().replace(/\n/g, ' ').slice(0, 12) || '·')
    const out = []
    document.querySelectorAll('tbody tr').forEach((tr, i) => {
      if (i > 1) return
      tr.querySelectorAll('td').forEach((td, j) => {
        const txt = td.innerText.trim(); if (!txt) return
        const lh = parseFloat(getComputedStyle(td).lineHeight) || 18
        const lineas = Math.round(td.getBoundingClientRect().height / lh)
        if (lineas > 2) out.push(`${cab[j]}=${lineas}L "${txt.replace(/\n/g, '⏎').slice(0, 36)}"`)
      })
    })
    const th = document.querySelector('thead th:nth-child(2)')
    return { excesos: out, fuenteTitulo: th ? getComputedStyle(th).fontSize : null }
  })))
  await c.close()
}
await b.close()
