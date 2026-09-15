import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { documentoLabel } from '@/lib/firmas/documentos-meta'
import { FirmaTokenClient } from './firma-client'
import { LegalHeader } from '@/components/legal/legal-header'

export const dynamic = 'force-dynamic'

interface Props {
  params: { token: string }
}

type EstadoValidacion = 'valido' | 'invalido' | 'firmado' | 'expirado'

function EstadoInvalido({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{titulo}</p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{descripcion}</p>
      </div>
    </div>
  )
}

export default async function FirmaTokenPage({ params }: Props) {
  let solicitud = null
  try {
    const adminClient = await createAdminClient()
    const tokenHash = createHash('sha256').update(params.token).digest('hex')

    const { data } = await adminClient
      .from('firmas_solicitudes')
      .select('id, tipo_documento, nombre, numero_identidad, email, estado, expira_at')
      .eq('token_hash', tokenHash)
      .single()

    solicitud = data
  } catch {
    solicitud = null
  }

  const isDemo = params.token.includes('demo') || params.token === '[token]'
  if (!solicitud && isDemo) {
    solicitud = {
      id: 'demo-solicitud-001',
      tipo_documento: 'confidencialidad',
      estado: 'pendiente',
      expira_at: new Date(Date.now() + 86400000 * 365).toISOString()
    }
  }

  let estado: EstadoValidacion = 'invalido'
  if (solicitud) {
    if (solicitud.estado === 'firmado') estado = 'firmado'
    else if (new Date(solicitud.expira_at) < new Date()) estado = 'expirado'
    else estado = 'valido'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <LegalHeader />
      <main style={{ flex: 1 }}>
        {estado === 'invalido' && (
          <EstadoInvalido titulo="Enlace inválido" descripcion="Este enlace de firma no existe. Pide a quien te lo envió que verifique la dirección." />
        )}
        {estado === 'firmado' && (
          <EstadoInvalido titulo="Documento ya firmado" descripcion="Este documento ya fue firmado con este enlace. Si necesitas tu copia, contacta a quien te envió la invitación." />
        )}
        {estado === 'expirado' && (
          <EstadoInvalido titulo="Enlace expirado" descripcion="Este enlace de firma venció. Pide a quien te lo envió que te reenvíe uno nuevo." />
        )}
        {estado === 'valido' && solicitud && (
          <FirmaTokenClient
            token={params.token}
            documentoLabel={documentoLabel(solicitud.tipo_documento)}
            invitacion={isDemo ? undefined : {
              nombre: solicitud.nombre,
              numeroIdentidad: solicitud.numero_identidad,
              email: solicitud.email,
            }}
          />
        )}
      </main>
    </div>
  )
}
