import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data: perfil } = await guard.adminClient
    .from('profiles')
    .select('email')
    .eq('user_id', params.id)
    .single()

  if (!perfil?.email) {
    return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
  }

  const { error } = await guard.supabase.auth.resetPasswordForEmail(perfil.email)
  if (error) {
    return NextResponse.json({ error: 'No se pudo enviar el correo de restablecimiento.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'restablecer_password_usuario',
    detalle: { user_id: params.id, email: perfil.email },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
