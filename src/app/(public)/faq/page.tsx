import type { Metadata } from 'next'
import { FaqClient } from './faq-client'
import { CLUSTERS_FAQ } from '@/lib/faq/preguntas-frecuentes'

export const metadata: Metadata = {
  metadataBase: new URL('https://calculadoradereuso.com'),
  title: 'Preguntas Frecuentes de Sostenibilidad e Impacto Ambiental | Calculadora de Reúso',
  description: 'Respuestas honestas sobre sostenibilidad, impacto ambiental, responsabilidad social, huella de carbono y economía circular en Colombia — incluido lo que la Calculadora de Reúso no ofrece.',
  alternates: { canonical: 'https://calculadoradereuso.com/faq' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Preguntas Frecuentes de Sostenibilidad e Impacto Ambiental',
    description: 'Respuestas honestas sobre sostenibilidad, impacto ambiental, responsabilidad social, huella de carbono y economía circular.',
    url: 'https://calculadoradereuso.com/faq',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Calculadora de Reúso',
  },
}

// Un solo FAQPage con las preguntas de los 3 clusters — ayuda a que
// motores generativos (GEO) y buscadores puedan citar la respuesta exacta
// de la Calculadora de Reúso para cada pregunta real de búsqueda, sin que
// el titular de la pregunta se altere respecto a como la gente la escribe.
function construirSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: CLUSTERS_FAQ.flatMap(cluster =>
      cluster.items.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      }))
    ),
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
