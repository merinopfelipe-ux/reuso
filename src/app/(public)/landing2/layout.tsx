import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ahorra dinero reutilizando. Mide tu impacto circular | Reúso',
  description: 'Convierte ropa, muebles y equipos reutilizados en CO₂ evitado, agua ahorrada y ahorro económico real. Certificación ambiental en 3 pasos. Empieza gratis.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://reuso.lurdes.co/landing2' },
  openGraph: {
    title: 'Calcula el ahorro real de tu economía circular | Reúso',
    description: 'Mide el CO₂ evitado y el ahorro al planeta y al bolsillo de reutilizar productos. Certificados verificables para ESG, clientes e inversores.',
    url: 'https://reuso.lurdes.co/landing2',
    type: 'website',
    locale: 'es_CO',
    siteName: 'reuso.lurdes.co',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Calcula cuánto ahorras al planeta y al bolsillo reutilizando | Reúso',
    description: 'Mide el CO₂ evitado y el ahorro económico de tu inventario circular. Gratis.',
  },
}

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Calculadora de Reúso — CO₂ y Ahorro Circular',
    description: 'Plataforma SaaS que mide, certifica y comunica el CO₂ evitado y el ahorro económico al reutilizar productos.',
    url: 'https://reuso.lurdes.co',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: 'es-CO',
    offers: [
      { '@type': 'Offer', name: 'Explora', price: '0', priceCurrency: 'USD', description: '10 cálculos/mes. Gratis.' },
      { '@type': 'Offer', name: 'Circular Lab', price: '12', priceCurrency: 'USD', description: '200 cálculos · 2 certificados · 5 informes al mes.' },
      { '@type': 'Offer', name: 'Impulso Sostenible', price: '37', priceCurrency: 'USD', description: 'Circular Lab + Cotizador Circular para PYMEs.' },
      { '@type': 'Offer', name: 'Impacto Ilimitado', price: '87', priceCurrency: 'USD', description: 'Cálculos, certificados e informes ilimitados.' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Cómo certificar el impacto ambiental de tus productos reutilizados',
    description: 'Mide el ahorro al planeta y al bolsillo de tu economía circular en tres pasos.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Sube tus datos', text: 'Ingresa los ítems recuperados o reacondicionados en la plataforma.' },
      { '@type': 'HowToStep', position: 2, name: 'El algoritmo calcula', text: 'Cruzamos tus datos con factores de emisión del IPCC para obtener métricas de carbono y agua.' },
      { '@type': 'HowToStep', position: 3, name: 'Exporta y demuestra', text: 'Genera reportes listos para inversores, clientes o entidades reguladoras.' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Qué es la economía circular y cómo ahorra dinero?',
        acceptedAnswer: { '@type': 'Answer', text: 'La economía circular es un modelo donde los productos se reutilizan, reparan o reacondicionan en lugar de desecharse. Reduce costos de reposición hasta un 40% y genera ingresos por reventa certificada, mientras elimina la huella ambiental de fabricar productos nuevos.' },
      },
      {
        '@type': 'Question',
        name: '¿Cómo se calcula el CO₂ evitado al reutilizar un producto?',
        acceptedAnswer: { '@type': 'Answer', text: 'Usamos factores de emisión del IPCC y bases de datos internacionales como ecoinvent y DEFRA para estimar el CO₂ que se habría emitido fabricando un producto nuevo, comparado con reutilizar el existente. Cada cálculo queda registrado con hash criptográfico para verificación.' },
      },
      {
        '@type': 'Question',
        name: '¿El diagnóstico circular sirve para informes ESG?',
        acceptedAnswer: { '@type': 'Answer', text: 'Nuestros diagnósticos incluyen código QR verificable y metodología basada en estándares GHG Protocol. Son una fuente de datos válida para informes ESG, licitaciones públicas y comunicación a clientes e inversores — sin afirmar que el diagnóstico en sí es una certificación ambiental.' },
      },
    ],
  },
]

export default function Landing2Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  )
}
