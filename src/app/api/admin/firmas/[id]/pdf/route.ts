import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-guard'

// Devuelve una signed URL de corta duración para el PDF consolidado del
// bucket privado 'firmas' — nunca getPublicUrl() (bucket privado).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data: solicitud, error } = await guard.adminClient
    .from('firmas_solicitudes')
    .select('pdf_path')
    .eq('id', params.id)
    .single()

  if (error || !solicitud?.pdf_path) {
    return NextResponse.json({ error: 'No hay PDF disponible para esta solicitud.' }, { status: 404 })
  }

  const { data: signed, error: signError } = await guard.adminClient.storage
    .from('firmas')
    .createSignedUrl(solicitud.pdf_path, 60)

  if (signError || !signed) {
    console.error('[GET /api/admin/firmas/[id]/pdf]', signError)
    return NextResponse.json({ error: 'Error al generar el enlace de descarga.' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}
