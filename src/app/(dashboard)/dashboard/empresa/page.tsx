import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ConfiguracionClient from '@/app/(empresa)/empresa/configuracion/components/configuracion-client'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

export default async function DashboardEmpresaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  if (!perfil?.empresa_id) redirect('/dashboard')

  const adminClient = await createAdminClient()
  const { data: empresa } = await adminClient
    .from('empresas')
    .select('id, nombre, sector, logo_url, plan, nit, telefono, pais, region, ciudad, direccion, sitio_web, sector_ciiu_principal, sector_ciiu_secundarios')
    .eq('id', perfil.empresa_id)
    .single()

  if (!empresa) redirect('/dashboard')

  const nitBloqueado = Boolean(empresa.nit?.trim()) && perfil.rol !== 'super_admin'

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <AdminPageHeader
        titulo="Datos de tu empresa"
        subtitulo="Completa esta información para poder generar Informes y Pasaportes (DPP)."
        showBack
      />
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
        <ConfiguracionClient
          empresaId={empresa.id}
          nombre={empresa.nombre}
          sector={empresa.sector ?? null}
          logoUrl={empresa.logo_url ?? null}
          plan={empresa.plan}
          nit={empresa.nit ?? null}
          telefono={empresa.telefono ?? null}
          pais={empresa.pais ?? null}
          region={empresa.region ?? null}
          ciudad={empresa.ciudad ?? null}
          direccion={empresa.direccion ?? null}
          sitioWeb={empresa.sitio_web ?? null}
          sectorCiiuPrincipal={empresa.sector_ciiu_principal ?? null}
          sectorCiiuSecundarios={empresa.sector_ciiu_secundarios ?? []}
          nitBloqueado={nitBloqueado}
        />
      </div>
    </div>
  )
}
