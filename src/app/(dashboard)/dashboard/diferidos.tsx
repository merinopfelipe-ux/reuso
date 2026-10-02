'use client'

// next/dynamic con ssr:false solo se permite en componentes cliente desde Next 15.
import dynamic from 'next/dynamic'

export const GraficaLineaPersonal = dynamic(() => import('@/components/dashboard/grafica-linea-personal'), {
  ssr: false, loading: () => <div style={{ height: 200, borderRadius: 12, background: 'var(--border)' }} />, })

export const DonutCategorias = dynamic(() => import('@/components/empresa/donut-categorias'), {
  ssr: false, loading: () => <div style={{ height: 220, borderRadius: 12, background: 'var(--border)' }} />, })
