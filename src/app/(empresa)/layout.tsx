import '../globals.css'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { obtenerUsuario } from '@/lib/supabase/usuario'
import { createAdminClient } from '@/lib/supabase/admin'
import { LayoutShell } from '@/components/layout-shell'
import { ModuloBloqueadoBanner } from '@/components/modulo-bloqueado-banner'
import { displayName } from '@/lib/display-name'
import { URL_CHAT_EMPRESA } from '@/lib/navegacion'
import type { Rol } from '@/types'

export default async function EmpresaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { supabase, user } = await obtenerUsuario()

  if (!user) redirect('/login')

  const adminClient = await createAdminClient()

  // Perfil y última visita no dependen entre sí: se piden a la vez.
  const [{ data: perfil }, { data: logs }] = await Promise.all([
    supabase
      .from('profiles')
      .select('nombre, apellido, apodo, rol, empresa_id, avatar_color, avatar_text, empresas(chat_habilitado, chat_account_id)')
      .eq('user_id', user.id)
      .single(),
    adminClient
      .from('logs_auditoria')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2),
  ])

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol

  // Chat propio de la empresa, si el super admin lo activó (ficha de la empresa).
  const empresaPerfil = Array.isArray(perfil?.empresas) ? perfil?.empresas[0] : perfil?.empresas
  const chatUrl = empresaPerfil?.chat_habilitado && empresaPerfil.chat_account_id != null
    ? URL_CHAT_EMPRESA
    : null

  // Se ha eliminado la restricción (whitelist) que bloqueaba al super_admin.
  // Ahora puede navegar libremente por cualquier ruta operativa de /empresa
  // (la protección estricta de rutas prohibidas se delega al middleware central).
  // El empleado entra solo a Cotizador, Clientes y DPP. Los módulos de cada
  // uno los revisa src/proxy.ts: sin plan, lo manda al aviso de "pasar de plan".
  const head = await headers()
  const ruta = head.get('x-pathname') ?? ''
  const RUTAS_EMPLEADO = ['/empresa/cotizador', '/empresa/clientes', '/empresa/dpp']
  const entraEmpleado = rol === 'empleado' && RUTAS_EMPLEADO.some((r) => ruta === r || ruta.startsWith(r + '/'))
  if (rol !== 'empresa_admin' && rol !== 'super_admin' && !entraEmpleado) redirect('/dashboard')

  const nombre = displayName(perfil ?? { nombre: user.email })

  // Datos técnicos para Footer
  const ip = head.get('x-forwarded-for')?.split(',')[0] || head.get('x-real-ip') || '127.0.0.1'

  // Última visita (logs ya viene de la consulta en paralelo de arriba)
  const lastVisitRaw = logs && logs.length > 1 ? logs[1].created_at : logs?.[0]?.created_at || new Date().toISOString()
  const lastVisitFormatted = new Date(lastVisitRaw).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(' p. m.', ' p.m.').replace(' a. m.', ' a.m.')

  return (
    <LayoutShell
      nombre={nombre}
      rol={rol}
      chatUrl={chatUrl}
      avatarColor={perfil?.avatar_color ?? undefined}
      avatarText={perfil?.avatar_text ?? undefined}
      ip={ip}
      lastVisit={lastVisitFormatted}
    >
      {children}
      <ModuloBloqueadoBanner />
    </LayoutShell>
  )
}
