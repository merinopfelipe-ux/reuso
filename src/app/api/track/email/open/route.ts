import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

// 1x1 transparent GIF en base64
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const trackToken = searchParams.get('t')

    if (trackToken) {
      const head = headers()
      const ip = head.get('x-forwarded-for')?.split(',')[0] || head.get('x-real-ip') || '127.0.0.1'
      const userAgent = head.get('user-agent') || ''

      const adminClient = await createAdminClient()

      // Buscar destinatario por token
      const { data: dest } = await adminClient
        .from('admin_correos_destinatarios')
        .select('id, correo_id, aperturas_count, estado')
        .eq('track_token', trackToken)
        .single()

      if (dest) {
        const nuevoEstado = dest.estado === 'entregado' ? 'abierto' : dest.estado

        // Actualizar estadísticas del destinatario
        await adminClient
          .from('admin_correos_destinatarios')
          .update({
            estado: nuevoEstado,
            aperturas_count: (dest.aperturas_count || 0) + 1,
            primera_apertura_at: dest.aperturas_count === 0 ? new Date().toISOString() : undefined,
            ultima_apertura_at: new Date().toISOString(),
            ip_address: ip,
            user_agent: userAgent.slice(0, 500),
          })
          .eq('id', dest.id)

        // Incrementar contador global en admin_correos_enviados
        try {
          const { data: correo } = await adminClient
            .from('admin_correos_enviados')
            .select('total_aperturas')
            .eq('id', dest.correo_id)
            .single()

          if (correo) {
            await adminClient
              .from('admin_correos_enviados')
              .update({ total_aperturas: (correo.total_aperturas || 0) + 1 })
              .eq('id', dest.correo_id)
          }
        } catch (e) {
          console.warn('No se pudo actualizar total_aperturas global:', e)
        }
      }
    }
  } catch (err) {
    console.error('Error en tracking de apertura de correo:', err)
  }

  // Siempre retornar el GIF transparente de 1x1 con cabeceras de no-cache
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(TRANSPARENT_GIF.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
