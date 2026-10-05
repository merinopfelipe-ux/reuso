import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' })
const c = await b.newContext({ viewport: { width: 1280, height: 900 }, storageState: 'playwright/.auth/super-admin.json' })
const p = await c.newPage()
const err = []
p.on('pageerror', e => err.push(e.message.slice(0, 160)))
p.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400) err.push(`${r.status()} ${r.url().split('/api/')[1]}`) })
await p.goto('http://localhost:3000/admin/leads', { waitUntil: 'load' }); await p.waitForTimeout(8000)
console.log('tablas:', await p.locator('table').count(), '| errores:', JSON.stringify(err.slice(0, 3)))
console.log(await p.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(200, 700)))
await b.close()
