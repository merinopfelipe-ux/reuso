import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoriasClient } from './components/categorias-client'
import type { CategoriaConEsquemaBase, ItemConDimensiones, Modulo } from '@/types'

// Se pasan las listas PLANAS (no un árbol pre-armado): la navegación por
// niveles del cliente arma la vista de cada nodo al vuelo a partir de
// parent_id/categoria_id, lo que soporta profundidad ilimitada sin cambios.
export default async function CategoriasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = await createAdminClient()
  const [{ data: categorias }, { data: items }, { data: modulos }] = await Promise.all([
    adminClient
      .from('categorias')
      .select('*, categoria_materiales_base(*), categoria_servicios_base(*), categoria_insumos_base(*)')
      .order('orden', { ascending: true }),
    adminClient
      .from('items')
      .select('*, item_materiales(*), item_servicios(*), item_insumos(*)')
      .order('orden', { ascending: true }),
    adminClient
      .from('modulos')
      .select('id, nombre, icono_lucide, descripcion, activo, orden, created_at, updated_at')
      .eq('activo', true)
      .order('orden', { ascending: true }),
  ])

  return (
    <CategoriasClient
      categorias={(categorias ?? []) as unknown as CategoriaConEsquemaBase[]}
      items={(items ?? []) as unknown as ItemConDimensiones[]}
      modulos={(modulos ?? []) as Modulo[]}
    />
  )
}
