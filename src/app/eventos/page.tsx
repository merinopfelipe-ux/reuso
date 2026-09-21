import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEventoActual } from '@/lib/eventos'
import { EventosClient } from './eventos-client'

export const metadata: Metadata = {
  title: 'Eventos de Sostenibilidad | Calculadora de Reúso',
  description: 'Nos encontramos en eventos de sostenibilidad, economía circular y responsabilidad ambiental en Colombia. Déjanos tus datos y te mostramos cómo medir el impacto ambiental de tu empresa.',
  alternates: { canonical: 'https://calculadoradereuso.com/eventos' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Eventos de Sostenibilidad | Calculadora de Reúso',
    description: 'Nos encontramos en eventos de sostenibilidad, economía circular y RSE en Colombia. Regístrate y te contactamos.',
    url: 'https://calculadoradereuso.com/eventos',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Calculadora de Reúso',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Calculadora de Reúso en eventos de sostenibilidad' }],
  },
}

// El nombre del evento cambia cuando el equipo programa uno nuevo.
export const revalidate = 300

export default async function EventosPage() {
  let evento: string | null = null
  try {
    evento = (await getEventoActual(await createAdminClient()))?.nombre ?? null
  } catch {
    evento = null
  }
  return <EventosClient evento={evento} />
}
