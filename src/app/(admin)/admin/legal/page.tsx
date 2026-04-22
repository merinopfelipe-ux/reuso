import type { Metadata } from 'next'
import { LegalAdminClient } from './legal-client'

export const metadata: Metadata = { title: 'Gestión de Legales' }

export default function AdminLegalPage() {
  return <LegalAdminClient />
}
