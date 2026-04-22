import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { CategoriasClient } from './components/categorias-client'
import type { CategoriaConItems, Modulo } from '@/types'

export default async function CategoriasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = await createAdminClient()
  const [{ data: categorias }, { data: modulos }] = await Promise.all([
    adminClient
      .from('categorias')
      .select('*, items(*)')
      .order('orden', { ascending: true })
      .order('orden', { ascending: true, referencedTable: 'items' }),
    adminClient
      .from('modulos')
      .select('id, nombre, icono_lucide, descripcion, activo, orden, created_at, updated_at')
      .eq('activo', true)
      .order('orden', { ascending: true }),
  ])

  return (
    <div>
      <AdminPageHeader
        titulo="Categorías e items"
        subtitulo="Gestiona las categorías de objetos y sus factores de CO₂"
        showBack
      />
      <CategoriasClient
        categorias={(categorias ?? []) as CategoriaConItems[]}
        modulos={(modulos ?? []) as Modulo[]}
      />
    </div>
  )
}
