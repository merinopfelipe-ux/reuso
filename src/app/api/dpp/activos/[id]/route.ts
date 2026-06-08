import { NextRequest, NextResponse } from 'next/server'
import { dppAuthCheck } from '@/lib/dpp/auth-check'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado', 'super_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, rol, adminClient } = auth
  const { id } = params

  const { data: activo, error: activoError } = await adminClient
    .from('dpp_activos')
    .select('*')
    .eq('id', id)
    .single()

  if (activoError || !activo) {
    return NextResponse.json({ error: 'No encontramos este activo.' }, { status: 404 })
  }

  // Verificar pertenencia (super_admin salta el check)
  if (rol !== 'super_admin' && activo.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No tienes permiso para ver este activo.' }, { status: 403 })
  }

  const [ciclosRes, metricasRes, documentosRes] = await Promise.all([
    adminClient
      .from('dpp_ciclos')
      .select('*')
      .eq('activo_id', id)
      .order('numero_ciclo'),
    adminClient
      .from('dpp_metricas_financieras')
      .select('*')
      .eq('activo_id', id)
      .order('calculado_at', { ascending: false })
      .limit(1)
      .single(),
    adminClient
      .from('dpp_documentos_ingesta')
      .select('id, tipo, nombre_archivo, estado_ocr, created_at')
      .eq('activo_id', id),
  ])

  // Generar signed URL para imagen del activo si está almacenada como path de storage
  let activoConUrl = activo
  if (activo.imagen_url && !activo.imagen_url.startsWith('http')) {
    const { data: imgUrl } = await adminClient.storage.from('dpp').createSignedUrl(activo.imagen_url, 3600)
    activoConUrl = { ...activo, imagen_url: imgUrl?.signedUrl ?? activo.imagen_url }
  }

  return NextResponse.json({
    data: {
      activo: activoConUrl,
      ciclos: ciclosRes.data ?? [],
      metricas_recientes: metricasRes.data ?? null,
      documentos: documentosRes.data ?? [],
    },
  })
}
