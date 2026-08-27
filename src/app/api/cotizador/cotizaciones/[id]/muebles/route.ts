import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Try/catch general: mismo criterio que el endpoint base de la cotización
  // — nunca dejar que una excepción no prevista devuelva algo que no sea
  // JSON, o el frontend no puede ni mostrar el error real ni reintentar.
  try {
    const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
    if (!auth.ok) {
      return NextResponse.json(
        {
          error: auth.status === 401
            ? 'Inicia sesión para continuar.'
            : auth.status === 400
              ? 'Selecciona una empresa para continuar.'
              : 'Sin permiso.',
        },
        { status: auth.status }
      )
    }
    const { empresa_id, adminClient } = auth

    // Verificar que la cotización pertenece a la empresa
    const { data: cot, error: fetchError } = await adminClient
      .from('crm_cotizaciones')
      .select('id')
      .eq('id', params.id)
      .eq('empresa_id', empresa_id)
      .maybeSingle()

    if (fetchError) {
      console.error('[GET /api/cotizador/cotizaciones/[id]/muebles]', fetchError)
      return NextResponse.json({ error: 'Error al verificar la cotización.' }, { status: 500 })
    }

    if (!cot) {
      return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })
    }

    const { data: muebles, error } = await adminClient
      .from('crm_muebles_cotizados')
      .select('id, item_id, titulo, descripcion, tipo_mueble, categoria, oficios_json, cantidad, servicios_json, insumos_json, factor_rentabilidad, materiales_json, ajustes_humanos_json, precio_mueble, co2_evitado_kg, agua_evitada_l, imagen_url, diagnostico_ia_json, precio_mercado_nuevo, precio_mercado_fuente_url, precio_mercado_estado, oculto')
      .eq('cotizacion_id', params.id)
      .order('created_at')

    if (error) {
      return NextResponse.json({ error: 'Error al cargar los muebles.' }, { status: 500 })
    }

    // Generar signed URLs masivo para imágenes de muebles
    const pathsToSign: string[] = []
    const mueblesArray = muebles ?? []
    mueblesArray.forEach(m => {
      if (m.imagen_url && !m.imagen_url.startsWith('http')) {
        pathsToSign.push(m.imagen_url)
      }
    })

    const signedUrlsMap: Record<string, string> = {}
    if (pathsToSign.length > 0) {
      const { data: signedData, error: signError } = await adminClient.storage
        .from('cotizador')
        .createSignedUrls(pathsToSign, 3600)

      if (signError) {
        console.error(`[GET /api/cotizador/cotizaciones/[id]/muebles] signed URLs masivo falló:`, signError.message)
      } else if (signedData) {
        signedData.forEach((item) => {
          if (!item.error && item.signedUrl && item.path) {
            signedUrlsMap[item.path] = item.signedUrl
          }
        })
      }
    }

    const mueblesConUrls = mueblesArray.map((m) => {
      if (m.imagen_url && !m.imagen_url.startsWith('http')) {
        return { ...m, imagen_url: signedUrlsMap[m.imagen_url] ?? null }
      }
      return m
    })

    return NextResponse.json({ muebles: mueblesConUrls })
  } catch (e) {
    console.error('[GET /api/cotizador/cotizaciones/[id]/muebles] excepción no prevista', e)
    return NextResponse.json({ error: 'Error al cargar los muebles. Intenta de nuevo.' }, { status: 500 })
  }
}
