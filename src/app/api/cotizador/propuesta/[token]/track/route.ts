import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { buscarUbicacionPorIp } from '@/lib/geo-ip'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const adminClient = await createAdminClient()
    
    // Extraer IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') ?? null
    const referrer = request.headers.get('referer') || null

    // Verificar si existe la cotización
    const { data: cot } = await adminClient
      .from('crm_cotizaciones')
      .select('id, veces_abierta, fecha_apertura_cliente, asesor_id, codigo_cotizacion, crm_clientes(nombre)')
      .or(`enlace_publico_token.eq.${params.token},codigo_cotizacion.eq.${params.token}`)
      .single()

    if (!cot) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const ahora = new Date().toISOString()
    
    // 1. Actualizar el contador básico en crm_cotizaciones (fire and forget
    // optimizado). Dos fechas con propósitos distintos, no una sola:
    // fecha_apertura_cliente = SOLO la primera vez (`?? ahora`) — la usa
    // sales-dashboard.tsx para "horas promedio hasta la apertura" (tiempo de
    // respuesta del cliente), que dejaría de tener sentido si se
    // sobrescribiera con cada apertura repetida. fecha_ultima_apertura_cliente
    // (migración 093) SIEMPRE se pisa — esa es la que se muestra en la lista
    // de cotizaciones como "más reciente" (pedido explícito del usuario).
    await adminClient
      .from('crm_cotizaciones')
      .update({
        veces_abierta: (cot.veces_abierta ?? 0) + 1,
        fecha_apertura_cliente: cot.fecha_apertura_cliente ?? ahora,
        fecha_ultima_apertura_cliente: ahora,
        updated_at: ahora,
      })
      .eq('id', cot.id)

    // 2. Registro de trazabilidad y alertas (con rate limit)
    let aperturaId: string | null = null
    const permitido = await rateLimit(`cotizacion_apertura:${ip}`, 20, 60_000)
    
    if (permitido) {
      // Esta es la llamada lenta (hasta 3s) que antes bloqueaba el servidor web
      const { ciudad, pais } = await buscarUbicacionPorIp(ip)
      
      const { data: apertura } = await adminClient
        .from('crm_cotizaciones_aperturas')
        .insert({
          cotizacion_id: cot.id,
          ip_address: ip,
          user_agent: userAgent,
          referrer,
          ciudad,
          pais,
        })
        .select('id')
        .single()
        
      aperturaId = apertura?.id ?? null

      // Alertar al asesor (evitando spam)
      if (cot.asesor_id) {
        const hace30min = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        const { count } = await adminClient
          .from('crm_cotizaciones_aperturas')
          .select('id', { count: 'exact', head: true })
          .eq('cotizacion_id', cot.id)
          .gte('created_at', hace30min)
          .neq('id', aperturaId ?? '')

        if (!count) {
          const clienteRaw = Array.isArray(cot.crm_clientes) ? cot.crm_clientes[0] : cot.crm_clientes
          const primerNombre = clienteRaw?.nombre?.trim().split(/\s+/)[0] || 'Tu cliente'
          
          await adminClient.from('alertas').insert({
            titulo: `${primerNombre} abrió la propuesta`,
            mensaje: `${primerNombre} abrió la propuesta ${cot.codigo_cotizacion}.`,
            tipo: 'info',
            origen: 'sistema',
            destinatario_tipo: 'usuario',
            destinatario_id: cot.asesor_id,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            enlace: `/empresa/cotizador/${cot.id}`,
          })
        }
      }
    }

    return NextResponse.json({ aperturaId })
  } catch (err) {
    console.error('[API /track]', err)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
