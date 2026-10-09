import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { encryptSensitive } from '@/lib/encryption.server'
import { logAuditoria } from '@/lib/audit'

const esquema = z.object({
  empresa_id: z.string().uuid(),
  api_url: z.string().url().max(300),
  account_id: z.string().regex(/^\d{1,12}$/, 'El ID de cuenta debe ser solo números.'),
  api_token: z.string().min(8).max(300),
  webhook_secret: z.string().min(32, 'El secreto del webhook debe tener al menos 32 caracteres.').max(200),
  activa: z.boolean(),
})

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error
  const empresaId = request.nextUrl.searchParams.get('empresa_id')
  if (!empresaId) return NextResponse.json({ error: 'Falta empresa_id.' }, { status: 400 })

  const { data } = await guard.adminClient
    .from('integraciones_empresa')
    .select('account_id, api_url, activa')
    .eq('empresa_id', empresaId)
    .eq('proveedor', 'chatwoot')
    .maybeSingle()

  return NextResponse.json({ configurada: !!data, integracion: data ?? null })
}

export async function PUT(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const parsed = esquema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }
  const d = parsed.data
  const admin = guard.adminClient

  const campos = {
    account_id: d.account_id,
    api_url: d.api_url.replace(/\/$/, ''),
    api_token_cifrado: await encryptSensitive(d.api_token),
    webhook_secret_cifrado: await encryptSensitive(d.webhook_secret),
    activa: d.activa,
  }

  const { data: existente } = await admin
    .from('integraciones_empresa')
    .select('id')
    .eq('empresa_id', d.empresa_id)
    .eq('proveedor', 'chatwoot')
    .maybeSingle()

  const { error } = existente
    ? await admin.from('integraciones_empresa').update(campos).eq('id', existente.id)
    : await admin.from('integraciones_empresa').insert({ ...campos, empresa_id: d.empresa_id, proveedor: 'chatwoot' })

  if (error?.code === '23505') {
    return NextResponse.json({ error: 'Esa cuenta de Chatwoot ya está asignada a otra empresa.' }, { status: 409 })
  }
  if (error) {
    console.error('[PUT /api/admin/integraciones/chatwoot]', error)
    return NextResponse.json({ error: 'No se pudo guardar la integración.' }, { status: 500 })
  }

  await logAuditoria(admin, {
    user_id: guard.user.id,
    ip: getIp(request),
    accion: 'configurar_chatwoot',
    detalle: { empresa_id: d.empresa_id, account_id: d.account_id, activa: d.activa },
  })

  return NextResponse.json({ ok: true })
}
