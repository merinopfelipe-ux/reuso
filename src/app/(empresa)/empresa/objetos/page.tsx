import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { HistorialCalculos } from '@/components/calculadora/historial-calculos'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import type { Rol } from '@/types'

export default async function EmpresaObjetosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/dashboard')

  const rol = (perfil.rol ?? 'empresa_admin') as Rol
  const adminClient = await createAdminClient()
  const empresaId = perfil.empresa_id

  const [historialRes, { data: categoriasData }] = await Promise.all([
    adminClient
      .from('calculos')
      .select('id, user_id, empresa_id, fecha, total_co2, total_agua, detalle_json, created_at', { count: 'exact' })
      .eq('empresa_id', empresaId)
      .order('fecha', { ascending: false })
      .range(0, 19),
    adminClient.from('categorias').select('nombre').eq('activa', true),
  ])

  const historialRaw = historialRes.data ?? []
  const userIds = Array.from(new Set(historialRaw.map((c) => c.user_id).filter(Boolean)))
  let historialData = historialRaw
  if (userIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('user_id, nombre')
      .in('user_id', userIds)
    const usuariosMap = new Map((profiles ?? []).map((p) => [p.user_id, p.nombre]))
    historialData = historialRaw.map((c) => ({ ...c, usuario_nombre: usuariosMap.get(c.user_id) ?? null }))
  }

  const nombresCategorias = (categoriasData ?? []).map((c) => c.nombre)

  return (
    <div style={{ width: '100%' }}>
      <AdminPageHeader titulo="Objetos reutilizados" subtitulo="Historial completo de todos los cálculos registrados por tu equipo." showBack />

      <Suspense fallback={
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Cargando historial...</p>
        </div>
      }>
        <HistorialCalculos
          calculos={historialData as Parameters<typeof HistorialCalculos>[0]['calculos']}
          total={historialRes.count ?? 0}
          rol={rol}
          categorias={nombresCategorias}
        />
      </Suspense>
    </div>
  )
}
