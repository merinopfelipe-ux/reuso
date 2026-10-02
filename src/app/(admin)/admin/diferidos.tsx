'use client'

// next/dynamic con ssr:false solo se permite en componentes cliente desde Next 15.
import dynamic from 'next/dynamic'

export const ActivityChart = dynamic(
  () => import('@/components/admin/activity-chart').then(m => ({ default: m.ActivityChart })),
  {
    ssr: false,
    loading: () => <div style={{ height: 300, borderRadius: 16, background: 'var(--color-brand)' }} />,
  }
)
