import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
for (let i = 0; i < 2; i++) {
  const c = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true })
  const p = await c.newPage()
  const cdp = await c.newCDPSession(p)
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await p.addInitScript(() => {
    // Como en los servidores de Google: sin Seravek
    window.__cambios = []
    const poner = () => { const s = document.createElement('style'); s.textContent = 'h1,h2,h3,.footer-rainbow-title{font-family:"Open Sans","Open Sans Fallback",sans-serif !important}'; document.documentElement.appendChild(s) }
    if (document.documentElement) poner(); else new MutationObserver((_, o) => { if (document.documentElement) { o.disconnect(); poner() } }).observe(document, { childList: true })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cambios.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: e.sources.map((s) => (s.node?.nodeName || '?') + ' ' + (s.node?.textContent || '').trim().slice(0, 30) + ` [${Math.round(s.previousRect.y)}→${Math.round(s.currentRect.y)}, h ${Math.round(s.previousRect.height)}→${Math.round(s.currentRect.height)}, w ${Math.round(s.previousRect.width)}→${Math.round(s.currentRect.width)}]`) }) }).observe({ type: 'layout-shift', buffered: true })
  })
  await p.goto('https://calculadoradereuso.com/', { waitUntil: 'load' }); await p.waitForTimeout(4000)
  const r = await p.evaluate(() => ({ cambios: window.__cambios, fuentes: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight) }))
  console.log(`corrida ${i + 1}: CLS ${r.cambios.reduce((a, x) => a + x.v, 0).toFixed(3)}`); r.cambios.forEach((x) => console.log('  ', x.v, '@', x.t, 'ms', JSON.stringify(x.src)))
  await c.close()
}
await b.close()
