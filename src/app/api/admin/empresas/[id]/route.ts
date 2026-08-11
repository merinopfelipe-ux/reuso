import { NextRequest, NextResponse } from 'next/server'
import DOMPurify from 'isomorphic-dompurify'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { patchEmpresaSchema } from '@/lib/schemas/empresa.schema'
import { NOTA_SANITIZE_CONFIG } from '@/lib/sanitize-notas'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = patchEmpresaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const datos = { ...parsed.data }
  if (typeof datos.notas_admin === 'string') {
    try {
      const feed = JSON.parse(datos.notas_admin)
      if (Array.isArray(feed)) {
        datos.notas_admin = JSON.stringify(
          feed.map((n) => ({ ...n, nota: DOMPurify.sanitize(String(n?.nota ?? ''), NOTA_SANITIZE_CONFIG) }))
        )
      }
    } catch {
      // No es un feed JSON válido (nota legada en texto plano) — se guarda tal cual, sin HTML que sanitizar.
    }
  }

  const { data, error } = await guard.supabase
    .from('empresas')
    .update(datos)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al actualizar la empresa.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'actualizar_empresa',
    detalle: { id: params.id, cambios: parsed.data },
    ip: getIp(request),
  })

  return NextResponse.json(data)
}
