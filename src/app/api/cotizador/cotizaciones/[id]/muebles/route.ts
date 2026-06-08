import { NextRequest, NextResponse } from 'next/server'
import { dppAuthCheck } from '@/lib/dpp/auth-check'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  // Verificar que la cotización pertenece a la empresa
  const { data: cot } = await adminClient
    .from('crm_cotizaciones')
    .select('id')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .single()

  if (!cot) {
    return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })
  }

  const { data: muebles, error } = await adminClient
    .from('crm_muebles_cotizados')
    .select('id, tipo_mueble, categoria, oficios_json, precio_mueble, co2_evitado_kg, agua_evitada_l, imagen_url')
    .eq('cotizacion_id', params.id)
    .order('created_at')

  if (error) {
    return NextResponse.json({ error: 'Error al cargar los muebles.' }, { status: 500 })
  }

  // Generar signed URLs para imágenes almacenadas como paths de storage
  const mueblesConUrls = await Promise.all(
    (muebles ?? []).map(async (m) => {
      if (m.imagen_url && !m.imagen_url.startsWith('http')) {
        const { data } = await adminClient.storage.from('cotizador').createSignedUrl(m.imagen_url, 3600)
        return { ...m, imagen_url: data?.signedUrl ?? null }
      }
      return m
    })
  )

  return NextResponse.json({ muebles: mueblesConUrls })
}
