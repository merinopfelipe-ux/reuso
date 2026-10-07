import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
const c = await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: 'playwright/.auth/super-admin.json' })
const p = await c.newPage()
await p.goto('http://localhost:3000/admin/leads', { waitUntil: 'load' }); await p.waitForTimeout(5000)
console.log(JSON.stringify(await p.evaluate(() => {
  const L = 'Interesada en medicion de impacto ambiental para toda la linea de mobiliario corporativo restaurado y certificacion internacional completa'
  const cab = [...document.querySelectorAll('thead th')].map(t => t.innerText.trim().replace(/\n/g, ' ').slice(0, 10) || '·')
  const out = []
  document.querySelector('tbody tr').querySelectorAll('td').forEach((td, j) => {
    // Se escribe el texto largo en el contenedor que realmente lleva el texto
    const cont = td.firstElementChild
    if (!cont || !cont.innerText?.trim()) return
    const prev = cont.innerHTML
    cont.textContent = L
    const lh = parseFloat(getComputedStyle(cont).lineHeight) || 18
    const lineas = Math.round(cont.getBoundingClientRect().height / lh)
    out.push(`${cab[j]}: ${lineas}L${lineas > 2 ? '  ← SE PASA' : ''}`)
    cont.innerHTML = prev
  })
  return out
}), null, 1))
await b.close()
