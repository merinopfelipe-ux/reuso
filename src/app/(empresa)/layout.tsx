import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LayoutShell } from '@/components/layout-shell'
import { displayName } from '@/lib/display-name'
import type { Rol } from '@/types'

export default async function EmpresaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminClient = await createAdminClient()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apellido, apodo, rol, empresa_id, avatar_color, avatar_text')
    .eq('user_id', user.id)
    .single()

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol

  // super_admin no usa páginas de empresa (tiene /admin para gestión),
  // excepto el Cotizador: ahí puede elegir a qué empresa cotizar (ver layout de cotizador)
  const pathname = headers().get('x-pathname') ?? ''
  const esCotizador = pathname.startsWith('/empresa/cotizador')
  if (rol === 'super_admin' && !esCotizador) redirect('/admin')
  if (rol !== 'empresa_admin' && rol !== 'super_admin') redirect('/dashboard')

  const nombre = displayName(perfil ?? { nombre: user.email })

  // Datos técnicos para Footer
  const head = headers()
  const ip = head.get('x-forwarded-for')?.split(',')[0] || head.get('x-real-ip') || '127.0.0.1'

  // Última visita
  const { data: logs } = await adminClient
    .from('logs_auditoria')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(2)

  const lastVisitRaw = logs && logs.length > 1 ? logs[1].created_at : logs?.[0]?.created_at || new Date().toISOString()
  const lastVisitFormatted = new Date(lastVisitRaw).toLocaleString('es-CO', {
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
      avatarColor={perfil?.avatar_color ?? undefined}
      avatarText={perfil?.avatar_text ?? undefined}
      ip={ip}
      lastVisit={lastVisitFormatted}
    >
      {children}
    </LayoutShell>
  )
}
