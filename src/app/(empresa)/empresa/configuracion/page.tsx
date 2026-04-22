import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Buildings, CreditCard, Calendar, Info } from '@/components/ui/icons'
import ConfiguracionClient from './components/configuracion-client'
import { AdminPageHeader } from '@/components/admin/admin-page-header'

const PLAN_LABELS: Record<string, string> = {
  free: 'Explora',
  lab: 'Circular Lab',
  impulso: 'Impulso Sostenible',
  ilimitado: 'Impacto Ilimitado',
}

const PLAN_COLORS: Record<string, string> = {
  free: '#4D7C79',
  lab: '#00827C',
  impulso: '#59A6E4',
  ilimitado: '#1A3A38',
}

const BORDER = 'rgba(0,130,124,0.12)'
const TEXT_MED = '#4D7C79'

export default async function EmpresaConfiguracionPage() {
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
    .select('id, nombre, slug, plan, activa, sector, logo_url, created_at')
    .eq('id', perfil.empresa_id)
    .single()

  if (!empresa) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 20px', textAlign: 'center', color: TEXT_MED }}>
        No se encontraron los datos de tu empresa.
      </div>
    )
  }

  const planColor = PLAN_COLORS[empresa.plan] ?? '#4D7C79'
  const planLabel = PLAN_LABELS[empresa.plan] ?? empresa.plan
  const esAdmin = perfil.rol === 'empresa_admin' || perfil.rol === 'super_admin'

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <AdminPageHeader titulo="Configuración" subtitulo={`Información y ajustes de ${empresa.nombre}.`} showBack />

      {/* Datos de solo lectura (plan, estado, slug) */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`,
        overflow: 'hidden', marginBottom: 20,
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          {empresa.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={empresa.logo_url}
              alt={empresa.nombre}
              style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: '#EBF5F4', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Buildings size={26} color="#00827C" />
            </div>
          )}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 3px' }}>
              {empresa.nombre}
            </h2>
            <p style={{ fontSize: 13, color: TEXT_MED, margin: 0 }}>
              slug: <strong>{empresa.slug}</strong>
            </p>
          </div>
        </div>

        {[
          {
            icono: <CreditCard size={17} color={planColor} />,
            label: 'Plan actual',
            valor: (
              <span style={{
                fontSize: 12, fontWeight: 700, borderRadius: 100,
                padding: '3px 12px',
                background: `${planColor}18`, color: planColor,
              }}>
                {planLabel}
              </span>
            ),
          },
          {
            icono: <Calendar size={17} color="#59A6E4" />,
            label: 'Miembro desde',
            valor: new Date(empresa.created_at).toLocaleDateString('es-CO', {
              day: 'numeric', month: 'long', year: 'numeric',
            }),
          },
          {
            icono: <Info size={17} color="#38B98E" />,
            label: 'Estado',
            valor: (
              <span style={{
                fontSize: 12, fontWeight: 700, borderRadius: 100,
                padding: '3px 12px',
                background: empresa.activa ? 'rgba(56,185,142,0.12)' : 'rgba(255,94,75,0.12)',
                color: empresa.activa ? '#38B98E' : '#FF5E4B',
              }}>
                {empresa.activa ? 'Activa' : 'Inactiva'}
              </span>
            ),
          },
        ].map((row, idx) => (
          <div
            key={idx}
            style={{
              padding: '14px 24px',
              borderBottom: idx < 2 ? `1px solid ${BORDER}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {row.icono}
              <span style={{ fontSize: 14, color: TEXT_MED }}>{row.label}</span>
            </div>
            <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
              {row.valor}
            </span>
          </div>
        ))}
      </div>

      {/* Formulario editable — solo empresa_admin */}
      {esAdmin && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 16, border: `1px solid ${BORDER}`,
          padding: '24px',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
            Editar información
          </h3>
          <ConfiguracionClient
            empresaId={empresa.id}
            nombre={empresa.nombre}
            sector={empresa.sector ?? null}
            logoUrl={empresa.logo_url ?? null}
          />
        </div>
      )}
    </div>
  )
}
