import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: 'playwright/.auth/super-admin.json' })
const p = await c.newPage()
await p.goto('http://localhost:3000/admin/leads', { waitUntil: 'load' }); await p.waitForTimeout(5000)
console.log(JSON.stringify(await p.evaluate(() => {
  const cab = [...document.querySelectorAll('thead th')].map(t => t.innerText.trim().replace(/\n/g, ' ').slice(0, 10) || '·')
  const out = []
  document.querySelectorAll('tbody tr').forEach((tr, i) => {
    if (i > 1) return
    tr.querySelectorAll('td').forEach((td, j) => {
      td.querySelectorAll('span,a,div').forEach(el => {
        if (el.querySelector('span,a,div')) return
        const t = el.innerText?.trim(); if (!t) return
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 18
        const l = Math.round(el.getBoundingClientRect().height / lh)
        if (l > 2) out.push(`${cab[j]}: ${l}L "${t.slice(0, 40)}"`)
      })
      const alto = Math.round(td.getBoundingClientRect().height)
      if (j === 4) out.push(`${cab[j]} alto=${alto}px`)
    })
  })
  return { excesos: out, altoFila: Math.round(document.querySelector('tbody tr').getBoundingClientRect().height) }
}), null, 1))
await b.close()
