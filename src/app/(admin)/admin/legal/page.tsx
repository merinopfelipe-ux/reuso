import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LegalAdminClient } from './legal-client'

export const metadata: Metadata = { title: 'Gestión de Legales' }

export default function AdminLegalPage() {
  return (
    <Suspense fallback={null}>
      <LegalAdminClient />
    </Suspense>
  )
}
