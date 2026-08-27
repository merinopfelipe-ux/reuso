import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const adminClient = await createAdminClient()
  const { data: muebles } = await adminClient.from('crm_muebles_cotizados').select('imagen_url').not('imagen_url', 'is', null).limit(1)
  if (!muebles || muebles.length === 0) return NextResponse.json({ error: 'No muebles' })
  
  const path = muebles[0].imagen_url
  const { data, error } = await adminClient.storage.from('cotizador').createSignedUrls([path], 3600)
  
  return NextResponse.json({ originalPath: path, data, error })
}
