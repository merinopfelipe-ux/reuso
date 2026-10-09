import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Apagado a propósito: TikTok Business Messaging requiere aprobación de acceso y
// una revisión de privacidad. El esquema de firma y el payload deben validarse
// contra un evento real antes de aceptar mensajes.
export async function POST() {
  return NextResponse.json(
    { error: 'La integración con TikTok todavía no está activa.' },
    { status: 501 }
  )
}
