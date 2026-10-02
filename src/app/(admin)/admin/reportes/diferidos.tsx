'use client'

// next/dynamic con ssr:false solo se permite en componentes cliente desde Next 15.
import dynamic from 'next/dynamic'

export const ReportesClient = dynamic(
  () => import('./reportes-client').then(m => ({ default: m.ReportesClient })),
  { ssr: false, loading: () => <div style={{ height: 400, borderRadius: 12, background: '#EBF5F4' }} /> }
)
