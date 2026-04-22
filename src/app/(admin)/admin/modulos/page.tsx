import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ModulosClient } from './components/modulos-client'
import type { ModuloConCategorias } from '@/types'

export default async function ModulosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = await createAdminClient()
  const { data } = await adminClient
    .from('modulos')
    .select(`
      id, nombre, icono_lucide, descripcion, activo, orden, created_at, updated_at,
      categorias(id, nombre),
      modulos_empresas(id)
    `)
    .order('orden', { ascending: true })

  const modulos: ModuloConCategorias[] = (data ?? []).map((m) => ({
    ...m,
    categorias: (m.categorias as { id: string; nombre: string }[]) ?? [],
    total_empresas: (m.modulos_empresas as { id: string }[])?.length ?? 0,
    modulos_empresas: undefined,
  }))

  return (
    <div>
      <AdminPageHeader
        titulo="Módulos"
        subtitulo="Gestiona los módulos comprables y asígnalos a empresas"
        showBack
      />
      <ModulosClient modulos={modulos} />
    </div>
  )
}
