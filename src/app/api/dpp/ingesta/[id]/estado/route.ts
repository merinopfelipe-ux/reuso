import { NextRequest, NextResponse } from 'next/server'
import { dppAuthCheck } from '@/lib/dpp/auth-check'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  const { data: doc } = await adminClient
    .from('dpp_documentos_ingesta')
    .select('id, estado_ocr, resultado_json, nombre_archivo, tipo, empresa_id')
    .eq('id', params.id)
    .single()

  if (!doc || doc.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No encontramos este documento.' }, { status: 404 })
  }

  return NextResponse.json({
    data: {
      id: doc.id,
      estado_ocr: doc.estado_ocr,
      resultado_json: doc.resultado_json,
      nombre_archivo: doc.nombre_archivo,
      tipo: doc.tipo,
    },
  })
}
