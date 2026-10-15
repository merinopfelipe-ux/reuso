import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { crearCuentaChat } from '@/lib/chatwoot-plataforma'
import { sincronizarAgentesEmpresa } from '@/lib/chat-agentes'

const schema = z.object({ habilitado: z.boolean() })

// Activa, sincroniza o quita el chat de una empresa.
// - habilitado: true → crea la cuenta si no existe y pone a todos los miembros como agentes.
//   Si el chat ya estaba activo, sirve para sincronizar a quien se haya sumado.
// - habilitado: false → saca a todos los miembros de la cuenta. La cuenta se conserva.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const { data: empresa } = await guard.adminClient
    .from('empresas')
    .select('id, nombre, chat_account_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!empresa) {
    return NextResponse.json({ error: 'Empresa no encontrada.' }, { status: 404 })
  }

  const habilitado = parsed.data.habilitado
  const ip = getIp(request)

  if (!habilitado) {
    const { fallos } = await sincronizarAgentesEmpresa(guard.adminClient, empresa.id, false)
    await guard.adminClient.from('empresas').update({ chat_habilitado: false }).eq('id', empresa.id)
    await logAuditoria(guard.adminClient, {
      user_id: guard.user.id,
      accion: 'quitar_chat_empresa',
      detalle: { empresa_id: empresa.id, chat_account_id: empresa.chat_account_id, fallos },
      ip,
    })
    return NextResponse.json({ chat_habilitado: false, chat_account_id: empresa.chat_account_id, fallos })
  }

  const { data: miembros } = await guard.adminClient
    .from('profiles')
    .select('user_id')
    .eq('empresa_id', empresa.id)
  if (!miembros || miembros.length === 0) {
    return NextResponse.json(
      { error: 'La empresa no tiene miembros. Agrega a alguien antes de activar el chat.' },
      { status: 400 }
    )
  }

  try {
    // La cuenta se guarda en cuanto existe, así un reintento no crea otra.
    let cuentaId = empresa.chat_account_id
    if (cuentaId == null) {
      cuentaId = await crearCuentaChat(empresa.nombre)
      await guard.adminClient.from('empresas').update({ chat_account_id: cuentaId }).eq('id', empresa.id)
    }

    await guard.adminClient.from('empresas').update({ chat_habilitado: true }).eq('id', empresa.id)
    const { total, fallos } = await sincronizarAgentesEmpresa(guard.adminClient, empresa.id, true)
    await logAuditoria(guard.adminClient, {
      user_id: guard.user.id,
      accion: 'activar_chat_empresa',
      detalle: { empresa_id: empresa.id, chat_account_id: cuentaId, agentes: total, fallos },
      ip,
    })
    return NextResponse.json({ chat_habilitado: true, chat_account_id: cuentaId, agentes: total, fallos })
  } catch (err) {
    console.error('[admin/empresas/chat]', empresa.id, err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'No se pudo activar el chat. Revisa la configuración de Chatwoot e inténtalo otra vez.' },
      { status: 502 }
    )
  }
}
