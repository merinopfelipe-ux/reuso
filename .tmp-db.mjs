import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
for (const a of ['.env.local','.env.production.local']) {
  const e = Object.fromEntries(readFileSync(a,'utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
  const sb=createClient(e.NEXT_PUBLIC_SUPABASE_URL,e.SUPABASE_SERVICE_ROLE_KEY)
  const {data}=await sb.from('config_planes').select('id,precio_cop').order('id')
  const {count}=await sb.from('leads').select('*',{count:'exact',head:true})
  console.log(a.replace('.env.',''), new URL(e.NEXT_PUBLIC_SUPABASE_URL).host.split('.')[0], '| leads:', count, '| precios:', JSON.stringify((data||[]).map(p=>`${p.id}:${p.precio_cop}`)))
}
