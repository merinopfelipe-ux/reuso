import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { HistorialCalculos } from '@/components/calculadora/historial-calculos'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import type { Rol } from '@/types'

export default async function DashboardObjetosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('user_id', user.id)
    .single()

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol
  const adminClient = await createAdminClient()

  const [historialRes, { data: categoriasData }] = await Promise.all([
    adminClient
      .from('calculos')
      .select('id, user_id, fecha, total_co2, total_agua, detalle_json, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .range(0, 14),
    adminClient.from('categorias').select('nombre').eq('activa', true),
  ])

  const historialData = historialRes.data ?? []
  const nombresCategorias = (categoriasData ?? []).map((c) => c.nombre)

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader titulo="Mis objetos reutilizados" subtitulo="Historial de todos tus cálculos registrados y el impacto ambiental generado." showBack />

      <HistorialCalculos
        calculos={historialData as Parameters<typeof HistorialCalculos>[0]['calculos']}
        total={historialRes.count ?? 0}
        rol={rol}
        categorias={nombresCategorias}
      />
    </div>
  )
}
