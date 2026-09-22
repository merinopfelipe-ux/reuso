import type { SupabaseClient } from '@supabase/supabase-js'

export interface EventoActual { id: string; nombre: string; fecha_inicio: string; fecha_fin: string | null }

// Fecha de hoy en Colombia (YYYY-MM-DD), sin depender de la zona del servidor.
export function hoyColombia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
}

// Prioridad: evento activo hoy (fecha_inicio ≤ hoy ≤ fecha_fin). Si no hay,
// el próximo programado (fecha_inicio > hoy). null si no hay ninguno.
export async function getEventoActual(admin: SupabaseClient): Promise<EventoActual | null> {
  const hoy = hoyColombia()
  const { data } = await admin
    .from('eventos')
    .select('id, nombre, fecha_inicio, fecha_fin')
    .lte('fecha_inicio', hoy)
    .order('fecha_inicio', { ascending: false })
    .limit(10)

  // Entre los que ya empezaron, elige el que todavía no terminó
  const activo = (data ?? []).find(ev => {
    const fin = ev.fecha_fin ?? ev.fecha_inicio
    return fin >= hoy
  })
  if (activo) return activo as EventoActual

  // Si no hay activo, devuelve el próximo
  const { data: proximos } = await admin
    .from('eventos')
    .select('id, nombre, fecha_inicio, fecha_fin')
    .gt('fecha_inicio', hoy)
    .order('fecha_inicio', { ascending: true })
    .limit(1)
  return (proximos?.[0] as EventoActual | undefined) ?? null
}

// "juan david pérez" a "Juan": el correo saluda solo por el primer nombre.
export function primerNombre(nombreCompleto: string): string {
  const p = nombreCompleto.trim().split(/\s+/)[0] ?? ''
  return p ? p.charAt(0).toLocaleUpperCase('es') + p.slice(1).toLocaleLowerCase('es') : ''
}
