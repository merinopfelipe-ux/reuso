import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LayoutShell } from '@/components/layout-shell'
import { displayName } from '@/lib/display-name'
import type { Metadata } from 'next'
import type { Rol } from '@/types'

export const metadata: Metadata = { title: 'Ayuda' }

export default async function AyudaLayout({ children }: { children: React.ReactNode }) {
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
  const nombre = displayName(perfil ?? { nombre: user.email?.split('@')[0] })

  const head = headers()
  const ip = head.get('x-forwarded-for')?.split(',')[0] || head.get('x-real-ip') || '127.0.0.1'

  const { data: logs } = await adminClient
    .from('logs_auditoria')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(2)

  const lastVisitRaw = logs && logs.length > 1 ? logs[1].created_at : logs?.[0]?.created_at || new Date().toISOString()
  const lastVisitFormatted = new Date(lastVisitRaw).toLocaleString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).replace(' p. m.', ' p.m.').replace(' a. m.', ' a.m.')

  return (
    <LayoutShell
      nombre={nombre}
      rol={rol}
      empresaId={perfil?.empresa_id ?? null}
      avatarColor={perfil?.avatar_color ?? undefined}
      avatarText={perfil?.avatar_text ?? undefined}
      ip={ip}
      lastVisit={lastVisitFormatted}
    >
      {children}
    </LayoutShell>
  )
}
