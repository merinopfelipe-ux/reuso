import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { documentoLabel } from '@/lib/firmas/documentos-meta'
import { FirmaTokenClient } from './firma-client'

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

// Validación server-side del token (nunca desde el navegador con anon key):
// si no existe, ya se firmó o expiró, no se carga el documento en ningún caso.
export default async function FirmaTokenPage({ params }: Props) {
  const adminClient = await createAdminClient()
  const tokenHash = createHash('sha256').update(params.token).digest('hex')

  const { data: solicitud } = await adminClient
    .from('firmas_solicitudes')
    .select('id, tipo_documento, nombre, estado, expira_at')
    .eq('token_hash', tokenHash)
    .single()

  let estado: EstadoValidacion = 'invalido'
  if (solicitud) {
    if (solicitud.estado === 'firmado') estado = 'firmado'
    else if (new Date(solicitud.expira_at) < new Date()) estado = 'expirado'
    else estado = 'valido'
  }

  if (estado === 'invalido') {
    return <EstadoInvalido titulo="Enlace inválido" descripcion="Este enlace de firma no existe. Pide a quien te lo envió que verifique la dirección." />
  }
  if (estado === 'firmado') {
    return <EstadoInvalido titulo="Documento ya firmado" descripcion="Este documento ya fue firmado con este enlace. Si necesitas tu copia, contacta a quien te envió la invitación." />
  }
  if (estado === 'expirado') {
    return <EstadoInvalido titulo="Enlace expirado" descripcion="Este enlace de firma venció. Pide a quien te lo envió que te reenvíe uno nuevo." />
  }

  return (
    <FirmaTokenClient
      token={params.token}
      documentoLabel={documentoLabel(solicitud!.tipo_documento)}
      nombre={solicitud!.nombre}
    />
  )
}
