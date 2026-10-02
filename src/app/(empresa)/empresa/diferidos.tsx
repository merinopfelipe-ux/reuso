'use client'

// next/dynamic con ssr:false solo se permite en componentes cliente desde Next 15.
import dynamic from 'next/dynamic'

export const GraficaCO2Mensual = dynamic(() => import('@/components/empresa/grafica-co2-mensual'), {
  ssr: false, loading: () => <div style={{ height: 220, borderRadius: 12, background: '#EBF5F4' }} />, })

export const DonutCategorias = dynamic(() => import('@/components/empresa/donut-categorias'), {
  ssr: false, loading: () => <div style={{ height: 220, borderRadius: 12, background: '#EBF5F4' }} />, })
