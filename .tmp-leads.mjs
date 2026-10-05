import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
for (const [n, w] of [['tableta', 768], ['escritorio', 1280], ['grande', 1680]]) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, storageState: 'playwright/.auth/super-admin.json' })
  const p = await c.newPage()
  await p.goto("http://localhost:3000/admin/leads", { waitUntil: "load" }); await p.waitForTimeout(6000)
  const r = await p.evaluate(() => {
    const t = document.querySelector('table'); const cont = t?.parentElement
    const td = document.querySelector('tbody td')
    return { tabla: t ? Math.round(t.scrollWidth) : null, visible: cont ? Math.round(cont.clientWidth) : null, desbordePagina: document.documentElement.scrollWidth - window.innerWidth, fuenteCelda: td ? getComputedStyle(td).fontSize : null, filas: document.querySelectorAll("tbody tr").length, url: location.pathname, texto: document.body.innerText.slice(0,80) }
  })
  console.log(n, w, JSON.stringify(r))
  if (w === 1280) await p.screenshot({ path: '/tmp/claude-501/leads.png' })
  await c.close()
}
await b.close()
