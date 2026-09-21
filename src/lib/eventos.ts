import type { SupabaseClient } from '@supabase/supabase-js'

export interface EventoActual { id: string; nombre: string; fecha: string }

// Fecha de hoy en Colombia (YYYY-MM-DD), sin depender de la zona del servidor.
export function hoyColombia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
}

// El evento de hoy o, si no hay, el próximo programado. null si no hay ninguno.
export async function getEventoActual(admin: SupabaseClient): Promise<EventoActual | null> {
  const { data } = await admin
    .from('eventos')
    .select('id, nombre, fecha')
    .gte('fecha', hoyColombia())
    .order('fecha', { ascending: true })
    .limit(1)
  return (data?.[0] as EventoActual | undefined) ?? null
}

// "juan david pérez" a "Juan": el correo saluda solo por el primer nombre.
export function primerNombre(nombreCompleto: string): string {
  const p = nombreCompleto.trim().split(/\s+/)[0] ?? ''
  return p ? p.charAt(0).toLocaleUpperCase('es') + p.slice(1).toLocaleLowerCase('es') : ''
}
