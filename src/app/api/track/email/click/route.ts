import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const trackToken = searchParams.get('t')
  const targetUrl = searchParams.get('url')

  const fallbackUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://calculadoradereuso.com'
  let destination = fallbackUrl

  if (targetUrl) {
    try {
      const decoded = decodeURIComponent(targetUrl)
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        destination = decoded
      }
    } catch {
      destination = fallbackUrl
    }
  }

  if (trackToken) {
    try {
      const adminClient = await createAdminClient()
      const { data: dest } = await adminClient
        .from('admin_correos_destinatarios')
        .select('id, correo_id, clics_count')
        .eq('track_token', trackToken)
        .single()

      if (dest) {
        await adminClient
          .from('admin_correos_destinatarios')
          .update({
            estado: 'clic',
            clics_count: (dest.clics_count || 0) + 1,
            primer_clic_at: dest.clics_count === 0 ? new Date().toISOString() : undefined,
            ultimo_clic_at: new Date().toISOString(),
          })
          .eq('id', dest.id)

        try {
          const { data: correo } = await adminClient
            .from('admin_correos_enviados')
            .select('total_clics')
            .eq('id', dest.correo_id)
            .single()

          if (correo) {
            await adminClient
              .from('admin_correos_enviados')
              .update({ total_clics: (correo.total_clics || 0) + 1 })
              .eq('id', dest.correo_id)
          }
        } catch (e) {
          console.warn('No se pudo actualizar total_clics global:', e)
        }
      }
    } catch (err) {
      console.error('Error en tracking de clic de correo:', err)
    }
  }

  return NextResponse.redirect(destination, 302)
}
