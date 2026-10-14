import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { agregarAdministrador, crearUsuarioChat, enlaceDeAcceso } from '@/lib/chatwoot-plataforma'

// Entrada al chat de la empresa con un clic. Quien administra una empresa con
// chat activo pulsa Chat en su menú, esta ruta pide a Chatwoot un enlace de
// acceso directo y lo redirige ahí: sin segunda contraseña ni correo.
//
// Seguridad: la identidad sale SOLO de la sesión verificada (getUser) y del
// correo de la cuenta de acceso, nunca de datos que la persona pueda editar
// (el correo del perfil se puede cambiar, el de la cuenta no sin confirmarlo).

function pagina(mensaje: string, estado: number) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Chat</title></head><body style="font-family:system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:0 16px;color:#474747"><p style="font-size:16px">${mensaje}</p><p><a href="/empresa" style="color:#00827C">Volver al panel</a></p></body></html>`
  return new NextResponse(html, { status: estado, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.redirect(new URL('/login', request.url))

  const adminClient = await createAdminClient()
  const { data: perfil } = await adminClient
    .from('profiles')
    .select('rol, empresa_id, nombre, apellido')
    .eq('user_id', user.id)
    .maybeSingle()

  if (perfil?.rol !== 'empresa_admin' || !perfil.empresa_id) {
    return pagina('Tu empresa no tiene el chat activo.', 403)
  }

  const { data: empresa } = await adminClient
    .from('empresas')
    .select('chat_habilitado, chat_account_id')
    .eq('id', perfil.empresa_id)
    .maybeSingle()

  if (!empresa?.chat_habilitado || empresa.chat_account_id == null) {
    return pagina('Tu empresa no tiene el chat activo.', 403)
  }

  if (!(await rateLimit(`chat_entrar:${user.id}`, 10, 60_000))) {
    return pagina('Demasiados intentos. Espera un minuto e inténtalo de nuevo.', 429)
  }

  try {
    const nombre = [perfil.nombre, perfil.apellido].filter(Boolean).join(' ') || user.email
    // Si la persona ya existe en Chatwoot se reutiliza, y si es nueva se crea:
    // así, si cambia quien administra la empresa, el nuevo entra sin pasos extra.
    const usuarioId = await crearUsuarioChat({ nombre, email: user.email })
    await agregarAdministrador(empresa.chat_account_id, usuarioId)
    return NextResponse.redirect(await enlaceDeAcceso(usuarioId))
  } catch (err) {
    console.error('[chat/entrar]', err instanceof Error ? err.message : err)
    return pagina('No pudimos abrir el chat. Inténtalo de nuevo en unos minutos.', 502)
  }
}
