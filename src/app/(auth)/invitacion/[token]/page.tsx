import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'
import { ShieldWarning, Leaf } from '@/components/ui/icons'
import InvitacionForm from './components/invitacion-form'

interface Props {
  params: { token: string }
}

const BRAND = '#00827C'

export default async function InvitacionPage({ params }: Props) {
  const { token } = params
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const adminClient = await createAdminClient()

  const { data: invitacion } = await adminClient
    .from('invitaciones')
    .select('id, email, empresa_id, rol_asignado, estado, expires_at')
    .eq('token_hash', tokenHash)
    .single()

  const esInvalida =
    !invitacion ||
    invitacion.estado !== 'pendiente' ||
    new Date(invitacion.expires_at) < new Date()

  if (esInvalida) {
    const mensaje = !invitacion
      ? 'No encontramos ninguna invitación con este enlace.'
      : invitacion.estado !== 'pendiente'
      ? 'Esta invitación ya fue utilizada.'
      : 'Esta invitación ha expirado.'

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--background)',
      }}>
        <div style={{
          background: 'var(--surface)',
          borderRadius: 16,
          padding: '40px 32px',
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          <ShieldWarning size={56} color="#e53e3e" style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
            Enlace inválido
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 15 }}>
            {mensaje}
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              color: BRAND,
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            Volver al inicio
          </a>
          <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
            <Leaf size={12} style={{ verticalAlign: 'middle', marginRight: 3, color: BRAND }} />
            © Grupo MLP S.A.S.
          </p>
        </div>
      </div>
    )
  }

  // Obtener nombre de empresa
  const { data: empresa } = await adminClient
    .from('empresas')
    .select('nombre')
    .eq('id', invitacion.empresa_id)
    .single()

  const empresaNombre = empresa?.nombre ?? 'tu empresa'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'var(--background)',
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 16,
        padding: '40px 32px',
        maxWidth: 440,
        width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: `${BRAND}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Leaf size={28} color={BRAND} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
            Únete a {empresaNombre}
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>
            Crea tu cuenta para empezar a medir tu impacto ambiental
          </p>
        </div>

        <InvitacionForm
          token={token}
          email={invitacion.email}
          empresaNombre={empresaNombre}
          rolAsignado={invitacion.rol_asignado}
        />
      </div>
    </div>
  )
}
