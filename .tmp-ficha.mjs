import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('leads').select('id').limit(1)
const b = await chromium.launch({ channel: 'chrome' })
const c = await b.newContext({ viewport: { width: 1280, height: 900 }, storageState: 'playwright/.auth/super-admin.json' })
const p = await c.newPage()
const err = []
p.on('console', m => { if (m.type() === 'error') err.push(m.text().slice(0, 120)) })
await p.goto(`http://localhost:3000/admin/leads/${data[0].id}`, { waitUntil: 'load' }); await p.waitForTimeout(4000)
console.log('título:', await p.locator('h1').first().innerText().catch(() => 'sin h1'))
console.log('campos:', await p.locator('input, textarea').count(), '| notas:', await p.getByPlaceholder(/Qué se habló/).count(), '| errores:', JSON.stringify(err.slice(0, 2)))
await b.close()
