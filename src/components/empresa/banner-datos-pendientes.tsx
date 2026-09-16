import Link from 'next/link'
import { Info } from '@/components/ui/icons'

interface Props {
  nit: string | null
  telefono: string | null
  pais: string | null
  ciudad: string | null
  hrefCompletar: string
}

const CAMPO_LABEL: Record<string, string> = {
  nit: 'NIT', telefono: 'teléfono', pais: 'país', ciudad: 'ciudad',
}

export function BannerDatosPendientes({ nit, telefono, pais, ciudad, hrefCompletar }: Props) {
  const valores: Record<string, string | null> = { nit, telefono, pais, ciudad }
  const faltantes = Object.keys(valores).filter(k => !valores[k]?.trim())

  if (faltantes.length === 0) return null

  const lista = faltantes.map(k => CAMPO_LABEL[k]).join(', ')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: '12px 16px', borderRadius: 12, marginBottom: 16,
      background: 'rgba(246,191,62,0.1)', border: '1px solid rgba(246,191,62,0.3)',
    }}>
      <Info size={17} color="var(--color-warning)" sinAnimacion />
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
        Completa {lista} de tu empresa para poder generar Informes y Pasaportes (DPP).
      </p>
      <Link href={hrefCompletar} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-brand)', whiteSpace: 'nowrap' }}>
        Completar ahora
      </Link>
    </div>
  )
}
