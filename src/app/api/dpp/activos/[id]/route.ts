import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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

const patchSchema = z.object({
  accion: z.enum(['aplicar', 'descartar']),
})

// Decide la sugerencia de peso por foto (sql/138) — nunca se aplica sola.
// "aplicar" reparte proporcionalmente entre los materiales ya guardados,
// "descartar" solo limpia el campo.
export async function PATCH(
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

  const raw = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const { data: activo, error: fetchError } = await adminClient
    .from('dpp_activos')
    .select('id, empresa_id, peso_total_kg, composicion_json, peso_foto_sugerido_kg')
    .eq('id', id)
    .single()

  if (fetchError || !activo) {
    return NextResponse.json({ error: 'No encontramos este activo.' }, { status: 404 })
  }
  if (rol !== 'super_admin' && activo.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No tienes permiso para editar este activo.' }, { status: 403 })
  }
  if (activo.peso_foto_sugerido_kg == null) {
    return NextResponse.json({ error: 'No hay ninguna sugerencia pendiente para este activo.' }, { status: 400 })
  }

  const updatePayload: { peso_foto_sugerido_kg: null; composicion_json?: unknown; peso_total_kg?: number } = {
    peso_foto_sugerido_kg: null,
  }

  if (parsed.data.accion === 'aplicar' && Array.isArray(activo.composicion_json)) {
    const composicion = activo.composicion_json as { peso_kg: number }[]
    const pesoActual = composicion.reduce((s, m) => s + m.peso_kg, 0)
    if (pesoActual > 0) {
      const factor = activo.peso_foto_sugerido_kg / pesoActual
      updatePayload.composicion_json = composicion.map(m => ({ ...m, peso_kg: m.peso_kg * factor }))
      updatePayload.peso_total_kg = activo.peso_foto_sugerido_kg
    }
  }

  const { data: actualizado, error: updateError } = await adminClient
    .from('dpp_activos')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (updateError || !actualizado) {
    return NextResponse.json({ error: 'Error al actualizar el activo.' }, { status: 500 })
  }

  return NextResponse.json({ data: actualizado })
}
