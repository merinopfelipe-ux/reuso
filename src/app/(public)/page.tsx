import type { Metadata } from 'next'
import LandingClient, { type PlanPrecioReal, type CategoriaComparativa } from './landing-client'
import { createAdminClient } from '@/lib/supabase/admin'

// ISR de 5 minutos — no force-dynamic, esta es una página pública y
// CLAUDE.md pide ISR en públicas (nunca sin caché ahí, a diferencia de un
// panel admin). Sin ningún revalidate, Next.js puede cachear la llamada
// fetch() interna de Supabase indefinidamente y esta página queda mostrando
// precios/FAQ viejos tras publicar un cambio — bug real encontrado
// 2026-09-04 (mismo patrón ya documentado en src/app/api/planes/route.ts).
export const revalidate = 300

// Precios y WhatsApp reales, leídos server-side antes de renderizar — mismos
// datos que administra /admin/contenido. Auditoría de la
// landing 2026-09-03: hasta ahora estos 2 paneles no tenían ningún efecto
// real en la página pública, todo salía de constantes fijas en el código.
async function obtenerDatosReales() {
  const adminClient = await createAdminClient()
  const [{ data: planes }, { data: contenido }, { data: faq }, { data: comparativa }] = await Promise.all([
    adminClient
      .from('config_planes')
      .select('id, precio_cop, precio_usd, precio_eur, precio_anual_cop, precio_anual_usd, precio_anual_eur, limite_empleados, limite_calculos_mes, limite_informes_mes, limite_cotizaciones_mes, limite_dpp_mes, incluye_ia, features_json')
      .order('precio_cop', { ascending: true }),
    adminClient
      .from('contenido_landing')
      .select('valor_json')
      .eq('clave', 'whatsapp')
      .maybeSingle(),
    adminClient
      .from('contenido_landing')
      .select('valor_json')
      .eq('clave', 'faq')
      .maybeSingle(),
    adminClient
      .from('contenido_landing')
      .select('valor_json')
      .eq('clave', 'comparativa_planes')
      .maybeSingle(),
  ])

  // Consulta separada a propósito: equivalente_mensual_anual_* es de una
  // migración más nueva (sql/128) que puede no estar corrida todavía en
  // esta base. Si falla, no debe tumbar los precios reales de arriba —
  // mismo patrón ya usado en /api/cotizador/dashboard-config. Bug real
  // encontrado 2026-09-11: seleccionarlas junto a las demás columnas hacía
  // fallar TODA la consulta de precios si la migración no había corrido,
  // y la landing caía en silencio a los precios fijos de PLANS.
  const equivalentes = new Map<string, { cop: number | null; usd: number | null; eur: number | null }>()
  try {
    const { data: conEquivalente } = await adminClient
      .from('config_planes')
      .select('id, equivalente_mensual_anual_cop, equivalente_mensual_anual_usd, equivalente_mensual_anual_eur')
    for (const p of conEquivalente ?? []) {
      equivalentes.set(p.id, { cop: p.equivalente_mensual_anual_cop, usd: p.equivalente_mensual_anual_usd, eur: p.equivalente_mensual_anual_eur })
    }
  } catch (err) {
    console.error('[landing] equivalente_mensual_anual_* no disponible (posible migración 128 pendiente):', err)
  }

  // Misma protección que equivalente_mensual_anual_* arriba: incluye_mci/
  // incluye_excel_csv son de sql/131, más nueva — si esta base todavía no
  // la corrió, la landing no debe caer, solo mostrar esas 2 capacidades
  // como no incluidas hasta que se corra.
  const capacidades = new Map<string, { mci: boolean; excelCsv: boolean }>()
  try {
    const { data: conCapacidades } = await adminClient
      .from('config_planes')
      .select('id, incluye_mci, incluye_excel_csv')
    for (const p of conCapacidades ?? []) {
      capacidades.set(p.id, { mci: Boolean(p.incluye_mci), excelCsv: Boolean(p.incluye_excel_csv) })
    }
  } catch (err) {
    console.error('[landing] incluye_mci/incluye_excel_csv no disponibles (posible migración 131 pendiente):', err)
  }

  const whatsappNumero = (contenido?.valor_json as { numero?: string } | null)?.numero || undefined
  // FAQ real de /admin/contenido (sql/121 la siembra con el contenido que
  // ya mostraba la landing) — si todavía no hay fila, LandingClient cae a
  // su propio array por defecto, nunca queda vacía.
  const faqItems = (faq?.valor_json as { items?: { pregunta: string; respuesta: string }[] } | null)?.items
  // Cuadro comparativo real de /admin/contenido -> Precios (clave
  // 'comparativa_planes'). Sin fila todavía = sin categorías = el botón
  // "Ver cuadro comparativo" de la landing ni se muestra.
  const comparativaCategorias = (comparativa?.valor_json as { categorias?: CategoriaComparativa[] } | null)?.categorias
  const planesCompletos = (planes ?? []).map(p => {
    const eq = equivalentes.get(p.id)
    const cap = capacidades.get(p.id)
    return {
      ...p,
      equivalente_mensual_anual_cop: eq?.cop ?? null,
      equivalente_mensual_anual_usd: eq?.usd ?? null,
      equivalente_mensual_anual_eur: eq?.eur ?? null,
      incluye_mci: cap?.mci ?? false,
      incluye_excel_csv: cap?.excelCsv ?? false,
    }
  })
  return { planes: planesCompletos as PlanPrecioReal[], whatsappNumero, faqItems, comparativaCategorias }
}

export const metadata: Metadata = {
  metadataBase: new URL('https://calculadoradereuso.com'),
  title: 'Software de RSE y Economía Circular | Medición, Trazabilidad y Reportes',
  description: 'Plataforma para gestionar y medir tu Responsabilidad Social Empresarial (RSE). Realiza estimaciones ambientales documentadas, implementa economía circular y facilita la trazabilidad con el Pasaporte Digital de Producto (DPP) para tus reportes corporativos.',
  keywords: [
    'responsabilidad social empresarial',
    'RSE colombia',
    'software para seguimiento de RSE',
    'medir el impacto de la RSE',
    'herramientas digitales proyectos RSE',
    'plataformas para reportar RSE',
    'reportes RSE',
    'sello empresa responsable',
    'economia circular',
    'trazabilidad de materiales',
    'calculos ambientales',
    'calculadora de reuso',
    'pasaporte digital de producto',
    'estimacion huella de carbono',
    'huella hidrica empresarial',
    'reportes ESG'
  ],
  authors: [{ name: 'Reúso by Grupo MLP', url: 'https://calculadoradereuso.com' }],
  creator: 'Grupo MLP',
  publisher: 'Reúso',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    }
  },
  alternates: { canonical: 'https://calculadoradereuso.com' },
  openGraph: {
    title: 'Software RSE y Economía Circular | Mide tu Impacto Ambiental',
    description: 'Estructura tu Responsabilidad Social Empresarial (RSE). Herramienta digital para estimar impacto, reportar actividades y respaldar tus iniciativas con trazabilidad integral.',
    url: 'https://calculadoradereuso.com',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Calculadora de Reúso',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Software de RSE, Cálculos Ambientales y Trazabilidad de Economía Circular' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Software RSE y Economía Circular | Mide tu Impacto Ambiental',
    description: 'Gestiona la Responsabilidad Social Empresarial (RSE). Trazabilidad y estimaciones ambientales sustentadas con Pasaporte Digital.',
    images: ['/og-image.png'],
  },
}

// Convertido a función (2026-09-03): antes era una lista fija con el
// teléfono y los 4 precios hardcodeados aparte, una tercera copia distinta
// de PLANS y de config_planes. Un motor generativo (GEO) o un buscador que
// lea este JSON-LD cita estos números como un hecho — si están
// desactualizados, el producto queda respondiendo mal en nombre propio.
function construirSchemas(planes: PlanPrecioReal[], whatsappNumero: string | undefined) {
  const numero = whatsappNumero || '573147265212'
  const telefonoFormato = `+${numero.slice(0, 2)}-${numero.slice(2, 5)}-${numero.slice(5, 8)}-${numero.slice(8)}`
  const precioOffer = (id: string, fallback: string) => {
    const p = planes.find(x => x.id === id)
    return p ? String(Math.round(p.precio_usd)) : fallback
  }

  return [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Reúso',
    legalName: 'Grupo MLP',
    description: 'Calculadora de Reúso es una plataforma digital que ayuda a empresas de restauración, diseño interior y producto a estimar el impacto ambiental de reutilizar materiales y objetos, con informes estructurados y códigos de verificación pública.',
    url: 'https://calculadoradereuso.com',
    logo: 'https://calculadoradereuso.com/logo-completo.svg',
    foundingDate: '2025',
    taxID: '901460030',
    numberOfEmployees: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 10
    },
    address: [
      {
        '@type': 'PostalAddress',
        addressLocality: 'Medellín',
        addressCountry: 'CO'
      },
      {
        '@type': 'PostalAddress',
        addressLocality: 'Bogotá',
        addressCountry: 'CO'
      }
    ],
    sameAs: [
      'https://www.linkedin.com/company/calculadoradereuso/',
      'https://www.instagram.com/calculadoradereuso',
      'https://x.com/calreuso',
      'https://www.youtube.com/@calculadoradereuso',
      'https://www.tiktok.com/@calculadorareuso',
      'https://www.facebook.com/calculadoradereuso',
      'https://www.threads.com/@calculadoradereuso'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: telefonoFormato,
      email: 'servicio@calculadoradereuso.com',
      contactType: 'customer support',
      availableLanguage: ['es', 'en']
    }
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Calculadora de Reúso',
    url: 'https://calculadoradereuso.com',
    inLanguage: 'es-CO',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://calculadoradereuso.com/?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Calculadora de Reúso - Software para Seguimiento y Medición de RSE',
    description: 'Plataforma digital para la gestión de la Responsabilidad Social Empresarial (RSE). Facilita estimaciones ambientales, trazabilidad de economía circular y reportes estructurados para respaldar tus memorias ESG.',
    url: 'https://calculadoradereuso.com',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: 'es-CO',
    offers: [
      { '@type': 'Offer', name: 'Explora', price: '0', priceCurrency: 'USD', description: '5 cálculos gratis al mes para evaluar RSE.' },
      { '@type': 'Offer', name: 'Circular Lab', price: precioOffer('lab', '12'), priceCurrency: 'USD', description: 'Hasta 5 Pasaportes Digitales de Producto e informes de impacto al mes.' },
      { '@type': 'Offer', name: 'Impulso Sostenible', price: precioOffer('impulso', '37'), priceCurrency: 'USD', description: 'Trazabilidad y Pasaporte Digital de Producto.' },
      { '@type': 'Offer', name: 'Impacto Ilimitado', price: precioOffer('ilimitado', '87'), priceCurrency: 'USD', description: 'Gestión total de RSE corporativa, sin límites.' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Cómo implementar y medir tu estrategia de RSE con la Calculadora de Reúso',
    description: 'Guía para gestionar proyectos de RSE, estimar impacto ambiental y generar reportes documentados.',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Digitaliza tus proyectos de economía circular', text: 'Ingresa los datos de tus materiales recuperados en el software de RSE.' },
      { '@type': 'HowToStep', position: 2, name: 'Realiza estimaciones ambientales', text: 'Obtén proyecciones documentadas del impacto ambiental (mitigación estimada de CO₂, huella hídrica y desvío de residuos).' },
      { '@type': 'HowToStep', position: 3, name: 'Reporta y respalda tu impacto', text: 'Genera el Pasaporte Digital de Producto y reportes para facilitar la trazabilidad y documentar tus prácticas de Responsabilidad Social.' },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Qué es la RSE y cómo implementarla en empresas colombianas o negocios locales?',
        acceptedAnswer: { '@type': 'Answer', text: 'La Responsabilidad Social Empresarial (RSE) es el compromiso de tu empresa con el impacto ambiental y social. Se implementa usando herramientas digitales como la Calculadora de Reúso para medir el impacto de iniciativas como la economía circular, realizando estimaciones ambientales que sustentan reportes corporativos y beneficios.' },
      },
      {
        '@type': 'Question',
        name: '¿Qué software o herramientas digitales existen para seguimiento de RSE?',
        acceptedAnswer: { '@type': 'Answer', text: 'La Calculadora de Reúso es una plataforma especializada para reportar actividades de RSE. Facilita la estimación del impacto ambiental, la trazabilidad de los materiales y genera cálculos documentados para respaldar tu compromiso responsable en tus reportes corporativos.' },
      },
      {
        '@type': 'Question',
        name: '¿Por qué la trazabilidad y la economía circular son vitales para la RSE?',
        acceptedAnswer: { '@type': 'Answer', text: 'Porque promueven la transparencia. Integrar modelos de economía circular reduce drásticamente las emisiones y el consumo de agua. Usar el Pasaporte Digital de Producto (DPP) de la Calculadora de Reúso sustenta la trazabilidad técnica, evitando el greenwashing en tus reportes.' },
      },
    ],
  },
  ]
}

export default async function LandingPage() {
  const { planes, whatsappNumero, faqItems, comparativaCategorias } = await obtenerDatosReales()
  const schemas = construirSchemas(planes, whatsappNumero)
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <LandingClient planesPrecios={planes} whatsappNumero={whatsappNumero} faqItems={faqItems} comparativaCategorias={comparativaCategorias} />
    </>
  )
}
