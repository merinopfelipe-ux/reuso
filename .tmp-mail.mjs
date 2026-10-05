import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
const c = await b.newContext({ viewport: { width: 1280, height: 900 }, storageState: 'playwright/.auth/super-admin.json' })
const p = await c.newPage()
await p.goto('http://localhost:3000/admin/leads', { waitUntil: 'load' }); await p.waitForTimeout(6000)
const r = await p.evaluate(() => {
  const a = document.querySelector('tbody a[href^="mailto:"]')
  if (!a) return 'sin correo'
  const cs = getComputedStyle(a); const rr = a.getBoundingClientRect()
  return { display: cs.display, overflow: cs.textOverflow, userSelect: cs.userSelect, ancho: Math.round(rr.width), cortado: a.scrollWidth > a.clientWidth + 1, title: a.getAttribute('title')?.slice(0, 30) }
})
console.log(JSON.stringify(r))
console.log('desborde tabla:', await p.evaluate(() => { const t = document.querySelector('table'); return { tabla: t.scrollWidth, cont: t.parentElement.clientWidth, pagina: document.documentElement.scrollWidth - window.innerWidth } }))
await b.close()
