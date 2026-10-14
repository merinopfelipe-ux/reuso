import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import {
  agregarAdministrador,
  crearCuentaChat,
  crearUsuarioChat,
} from '@/lib/chatwoot-plataforma'

const schema = z.object({ habilitado: z.boolean() })

// Activa o quita el chat de una empresa. Quitarlo no borra la cuenta de
// Chatwoot: solo oculta la entrada del menú.
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
    await guard.adminClient.from('empresas').update({ chat_habilitado: false }).eq('id', empresa.id)
    await logAuditoria(guard.adminClient, {
      user_id: guard.user.id,
      accion: 'quitar_chat_empresa',
      detalle: { empresa_id: empresa.id, chat_account_id: empresa.chat_account_id },
      ip,
    })
    return NextResponse.json({ chat_habilitado: false, chat_account_id: empresa.chat_account_id })
  }

  // Quien administra la empresa es quien entra al chat.
  const { data: admin } = await guard.adminClient
    .from('profiles')
    .select('user_id, nombre, apellido')
    .eq('empresa_id', empresa.id)
    .eq('rol', 'empresa_admin')
    .limit(1)
    .maybeSingle()
  // Correo de la cuenta de acceso (verificado), el mismo con el que luego entra al chat.
  const correo = admin ? (await guard.adminClient.auth.admin.getUserById(admin.user_id)).data.user?.email : undefined
  if (!admin || !correo) {
    return NextResponse.json(
      { error: 'La empresa no tiene un administrador con correo. Asígnalo antes de activar el chat.' },
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

    const nombre = [admin.nombre, admin.apellido].filter(Boolean).join(' ') || correo
    const usuarioId = await crearUsuarioChat({ nombre, email: correo })
    await agregarAdministrador(cuentaId, usuarioId)

    await guard.adminClient.from('empresas').update({ chat_habilitado: true }).eq('id', empresa.id)
    await logAuditoria(guard.adminClient, {
      user_id: guard.user.id,
      accion: 'activar_chat_empresa',
      detalle: { empresa_id: empresa.id, chat_account_id: cuentaId },
      ip,
    })
    return NextResponse.json({ chat_habilitado: true, chat_account_id: cuentaId })
  } catch (err) {
    console.error('[admin/empresas/chat]', empresa.id, err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'No se pudo activar el chat. Revisa la configuración de Chatwoot e inténtalo otra vez.' },
      { status: 502 }
    )
  }
}
