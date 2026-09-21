import type { Metadata } from 'next'
import { EventosClient } from './eventos-client'

export const metadata: Metadata = {
  title: 'Eventos',
  description: 'Déjanos los datos de tu empresa y te contactamos para mostrarte la Calculadora de Reúso.',
  robots: { index: false, follow: false },
}

export default function EventosPage() {
  return <EventosClient />
}
