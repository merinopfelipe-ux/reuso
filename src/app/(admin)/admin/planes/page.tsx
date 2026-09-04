import { PlanesClient } from './components/planes-client'

// El grupo (admin) ya exige super_admin a nivel de layout — ver
// src/app/(admin)/layout.tsx. La negociación por empresa se movió a la
// ficha de cada empresa (2026-09-04), esta página ya no necesita cargar
// la lista de empresas.
export default function PlanesPage() {
  return <PlanesClient />
}
