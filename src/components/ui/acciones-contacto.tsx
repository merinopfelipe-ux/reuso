'use client'

import { Mail as Envelope } from '@/components/ui/icons'
import { WhatsappLogo } from '@/components/ui/whatsapp-logo'
import { enlaceWhatsApp } from '@/lib/telefono'

interface AccionesContactoProps {
  /** Número de teléfono ya normalizado (con indicativo). */
  telefono?: string | null
  /** Usuario de WhatsApp sin @. Si existe, tiene prioridad sobre el teléfono. */
  whatsappUsuario?: string | null
  email?: string | null
}

const CLASE_ACCION = 'inline-flex items-center gap-2 rounded-full border border-(--border) px-4 py-2 text-sm font-semibold text-(--text-primary) hover:border-brand'

/**
 * Fila de botones de contacto rápido: WhatsApp y correo.
 * No muestra nada si no hay datos de contacto disponibles.
 *
 * Uso:
 *   <AccionesContacto
 *     telefono={form.telefono}
 *     whatsappUsuario={form.usuario_whatsapp}
 *     email={form.email}
 *   />
 */
export function AccionesContacto({ telefono, whatsappUsuario, email }: AccionesContactoProps) {
  const wa = enlaceWhatsApp(telefono, whatsappUsuario)

  if (!wa && !email) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={CLASE_ACCION}>
          <WhatsappLogo size={16} /> Escribir por WhatsApp
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className={CLASE_ACCION}>
          <Envelope size={16} /> Enviar correo
        </a>
      )}
    </div>
  )
}
