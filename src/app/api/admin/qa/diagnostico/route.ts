import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { correrDiagnostico, comoTexto } from '@/lib/qa/diagnostico'

// Diagnóstico automático del sistema, complemento de las pruebas manuales de
// /admin/qa: comprueba contra la base y el almacenamiento reales lo que una
// persona no puede revisar a ojo (columnas que faltan por una migración sin
// correr, buckets que quedaron públicos, consultas con relación que la base
// rechaza entera).
//
// `?formato=txt` devuelve el informe como archivo descargable.
//
// Sin caché: un diagnóstico guardado es peor que ninguno, porque afirma sobre
// un estado que ya cambió.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const adminClient = await createAdminClient()
  const diagnostico = await correrDiagnostico(adminClient)

  if (request.nextUrl.searchParams.get('formato') === 'txt') {
    const fecha = new Date(diagnostico.generado).toISOString().slice(0, 10)
    return new NextResponse(comoTexto(diagnostico), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="diagnostico-reuso-${fecha}.txt"`,
      },
    })
  }

  return NextResponse.json(diagnostico)
}
