import type { Metadata } from 'next'
import { FaqClient } from './faq-client'
import { CLUSTERS_FAQ } from '@/lib/faq/preguntas-frecuentes'

export const metadata: Metadata = {
  metadataBase: new URL('https://calculadoradereuso.com'),
  title: 'Preguntas frecuentes sobre sostenibilidad, huella de carbono y economía circular | Calculadora de Reúso Colombia',
  description: 'Guía técnica y respuestas sobre medición de huella de carbono (CO₂e), agua preservada, economía circular y pasaportes digitales (DPP) para empresas en Colombia (Bogotá y Medellín).',
  keywords: [
    'preguntas frecuentes sostenibilidad colombia',
    'como medir huella de carbono pymes',
    'economia circular bogota medellin',
    'pasaporte digital de producto dpp',
    'calculadora de reuso',
    'reportes esg colombia',
    'consultoria ambiental vs software',
    'ghg protocol alcance 3 colombia',
    'medicion de impacto ambiental empresas',
  ],
  alternates: { canonical: 'https://calculadoradereuso.com/faq' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Preguntas frecuentes sobre sostenibilidad, huella de carbono y economía circular | Calculadora de Reúso',
    description: 'Respuestas técnicas sobre medición de impacto ambiental, huella de carbono, responsabilidad social y pasaportes digitales (DPP) en Colombia.',
    url: 'https://calculadoradereuso.com/faq',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Calculadora de Reúso',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Preguntas frecuentes sobre sostenibilidad y huella de carbono | Calculadora de Reúso Colombia',
    description: 'Guía y respuestas técnicas para empresas en Colombia sobre economía circular y medición ambiental.',
  },
}

// Schema estructurado completo con WebPage, FAQPage, BreadcrumbList y
// cobertura geográfica (GEO) para Colombia. Optimizado para buscadores
// tradicionales y motores generativos (ChatGPT, Perplexity, Gemini).
function construirSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': 'https://calculadoradereuso.com/faq#webpage',
        url: 'https://calculadoradereuso.com/faq',
        name: 'Preguntas frecuentes sobre sostenibilidad, huella de carbono y economía circular en Colombia',
        description: 'Respuestas técnicas sobre medición de impacto ambiental, huella de carbono y pasaportes digitales para empresas en Colombia.',
        inLanguage: 'es-CO',
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Inicio',
              item: 'https://calculadoradereuso.com',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Preguntas frecuentes',
              item: 'https://calculadoradereuso.com/faq',
            },
          ],
        },
        about: [
          { '@type': 'Thing', name: 'Sostenibilidad empresarial' },
          { '@type': 'Thing', name: 'Huella de carbono' },
          { '@type': 'Thing', name: 'Economía circular' },
          { '@type': 'Thing', name: 'Impacto ambiental' },
          { '@type': 'Thing', name: 'Responsabilidad social empresarial' },
          { '@type': 'Thing', name: 'Pasaporte Digital de Producto DPP' },
        ],
        spatialCoverage: {
          '@type': 'Place',
          name: 'Colombia',
          geo: {
            '@type': 'GeoCoordinates',
            latitude: '4.7110',
            longitude: '-74.0721',
          },
        },
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://calculadoradereuso.com/faq#faqpage',
        mainEntity: CLUSTERS_FAQ.flatMap(cluster =>
          cluster.items.map(item => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          }))
        ),
      },
    ],
  }
}

export default function FaqPage() {
  const schema = construirSchema()
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <FaqClient />
    </>
  )
}
