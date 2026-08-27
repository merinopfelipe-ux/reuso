import { NextRequest, NextResponse } from 'next/server'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { construirPdfCotizacion } from '@/lib/pdf/construir-pdf-cotizacion'

// Descarga autenticada desde /empresa (tarjeta "Compartir") — a diferencia
// de /api/cotizador/propuesta/[token]/pdf, esta no cuenta contra el límite
// de descargas del cliente ni se registra como trazabilidad de apertura:
// es una acción del equipo, no del cliente.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' },
      { status: auth.status === 400 ? 401 : auth.status }
    )
  }
  const { empresa_id, adminClient } = auth

  const { data: cot } = await adminClient
    .from('crm_cotizaciones')
    .select('id, codigo_cotizacion')
    .eq('id', params.id)
    .eq('empresa_id', empresa_id)
    .maybeSingle()

  if (!cot) return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })

  const pdf = await construirPdfCotizacion(cot.id, adminClient)
  if (!pdf) return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 })

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cotizacion-${cot.codigo_cotizacion.replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
