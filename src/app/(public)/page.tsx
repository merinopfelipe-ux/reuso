import type { Metadata } from 'next'
import LandingClient from './landing-client'

export const metadata: Metadata = {
  title: 'Calculadora de Reúso | Cotizador de Economía Circular, DDP y Huella Ambiental',
  description: 'Calcula el impacto ambiental de reutilizar, genera cotizaciones comerciales B2B y emite el Pasaporte Digital de Producto (DDP). Trazabilidad de CO₂, agua y ahorro económico real sin greenwashing.',
  keywords: [
    'calculadora de reúso',
    'cotizador economia circular',
    'pasaporte digital de producto',
    'DDP circular',
    'DPP industria',
    'calculo huella de carbono',
    'impacto ambiental economia circular',
    'trazabilidad circular',
    'analisis ciclo de vida ACV',
    'anti greenwashing',
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://reuso.lurdes.co' },
  openGraph: {
    title: 'Calculadora de Reúso | Cotizador Circular, DDP y Métricas Ambientales',
    description: 'Convierte la sostenibilidad en un activo comercial. Cuantifica CO₂ evitado, ahorro de agua y genera cotizaciones con Pasaporte Digital de Producto (DDP) trazable.',
    url: 'https://reuso.lurdes.co',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Reúso',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Calculadora de Reúso y Cotizador de Economía Circular' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Calculadora de Reúso | Cotizador de Economía Circular y Pasaporte DDP',
    description: 'Cuantifica el impacto ambiental de reutilizar y genera cotizaciones comerciales con Pasaporte Digital de Producto (DDP).',
  },
}

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Calculadora de Reúso - Cotizador Circular y Pasaporte DDP',
    description: 'Plataforma SaaS de economía circular para empresas y manufactura. Calcula impacto ambiental (CO₂, agua, residuos), genera cotizaciones comerciales de valor circular y emite Pasaportes Digitales de Producto (DDP).',
    url: 'https://reuso.lurdes.co',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: 'es-CO',
    offers: [
      { '@type': 'Offer', name: 'Explora', price: '0', priceCurrency: 'USD', description: '10 cálculos/mes. Diagnóstico básico sin costo.' },
      { '@type': 'Offer', name: 'Circular Lab', price: '12', priceCurrency: 'USD', description: '200 cálculos · 5 informes verificables con QR al mes.' },
      { '@type': 'Offer', name: 'Impulso Sostenible', price: '37', priceCurrency: 'USD', description: 'Motor de cálculo + Cotizador Circular B2B para PYMEs.' },
      { '@type': 'Offer', name: 'Impacto Ilimitado', price: '87', priceCurrency: 'USD', description: 'Cálculos, cotizaciones y emisión de DDP ilimitados.' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Cómo calcular, cotizar y documentar el impacto ambiental de reutilizar con Reúso',
    description: 'Guía paso a paso para pasar del inventario de materiales o productos a la cotización comercial y el Pasaporte Digital de Producto (DDP).',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Carga tus materiales o productos', text: 'Ingresa los lotes de mermas, descartes o insumos recuperados en los flujos optimizados de la plataforma.' },
      { '@type': 'HowToStep', position: 2, name: 'Procesa el cálculo y la cotización', text: 'El algoritmo cruza los datos con factores de emisión internacionales (IPCC, ecoinvent, DEFRA) y calcula el margen de ahorro frente a insumos vírgenes.' },
      { '@type': 'HowToStep', position: 3, name: 'Emite tu cotización comercial y DDP', text: 'Genera propuestas comerciales de alto valor y Pasaportes Digitales de Producto con código QR trazable para clientes y memorias ESG.' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Cómo funciona el cálculo para cotizar en la Calculadora de Reúso?',
        acceptedAnswer: { '@type': 'Answer', text: 'La plataforma analiza los costos de recuperación y reacondicionamiento frente al costo de adquirir materia prima virgen, proyectando el margen comercial y vinculándolo directamente al ahorro cuantificado de agua, CO₂ y residuos en una cotización lista para el cliente.' },
      },
      {
        '@type': 'Question',
        name: '¿Qué es el DDP (Pasaporte Digital de Producto) y por qué evita el greenwashing?',
        acceptedAnswer: { '@type': 'Answer', text: 'El DDP es una ficha técnica y digital inmutable asignada a cada lote o producto que documenta su origen, composición y ahorro ambiental calculado con factores IPCC y ecoinvent. Incluye un código QR para que clientes y consumidores consulten la trazabilidad y datos de respaldo del cálculo.' },
      },
      {
        '@type': 'Question',
        name: '¿Cuál es el diferencial de Reúso frente a un software tradicional de ACV o una hoja de cálculo?',
        acceptedAnswer: { '@type': 'Answer', text: 'Reúso elimina la complejidad técnica de los softwares de Análisis de Ciclo de Vida tradicionales y la ceguera ecológica de las cotizaciones estándar. Une en un solo flujo ágil el cálculo ambiental científico con el generador de propuestas comerciales y el Pasaporte Digital (DDP).' },
      },
    ],
  },
]

export default function LandingPage() {
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <LandingClient />
    </>
  )
}
