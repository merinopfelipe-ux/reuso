import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
for (const [n, w] of [['celular', 390], ['tablet', 820], ['computador', 1440]]) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, storageState: 'playwright/.auth/super-admin.json' })
  const p = await c.newPage()
  await p.goto('http://localhost:3000/admin/leads', { waitUntil: 'load' }); await p.waitForTimeout(5000)
  console.log(n, w, JSON.stringify(await p.evaluate(() => {
    const L = 'Interesada en medicion de impacto ambiental para toda la linea de mobiliario corporativo restaurado'
    const tr = document.querySelector('tbody tr')
    // Se escribe texto largo en interés y en evento a la vez (el peor caso)
    const celda = tr.querySelectorAll('td')[4]
    const cont = celda.firstElementChild
    cont.innerHTML = `<span class="font-medium text-(--text-primary) break-words text-sm line-clamp-1">${L}</span><span class="text-(--text-secondary) text-sm break-words mt-0.5 line-clamp-1">Evento: ${L}</span>`
    const lh = parseFloat(getComputedStyle(cont).lineHeight) || 18
    const th = document.querySelector('thead th:nth-child(2)')
    const mail = document.querySelector('tbody a[href^="mailto:"]')
    return {
      interesEvento: Math.round(cont.getBoundingClientRect().height / lh) + ' líneas',
      tituloColumna: getComputedStyle(th).fontSize,
      celdaDatos: getComputedStyle(document.querySelector('tbody td')).fontSize,
      correoCortado: mail ? mail.scrollWidth > mail.clientWidth + 1 : null,
    }
  })))
  await c.close()
}
await b.close()
