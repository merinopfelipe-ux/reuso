import { createAdminClient } from '@/lib/supabase/admin'
import { PlanesClient } from './components/planes-client'

// El grupo (admin) ya exige super_admin a nivel de layout — ver
// src/app/(admin)/layout.tsx. Esta página solo carga la lista de empresas
// server-side (para el selector de negociaciones) y delega el resto al
// cliente.
export default async function PlanesPage() {
  const adminClient = await createAdminClient()
  const { data: empresas } = await adminClient
    .from('empresas')
    .select('id, nombre')
    .order('nombre', { ascending: true })

  return <PlanesClient empresasIniciales={empresas ?? []} />
}
