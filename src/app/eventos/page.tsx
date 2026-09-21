import { createAdminClient } from '@/lib/supabase/admin'
import { getEventoActual } from '@/lib/eventos'
import { EventosClient } from './eventos-client'

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
