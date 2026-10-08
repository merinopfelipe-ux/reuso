// Notas internas de un contacto (leads.notas). Se guardan como texto JSON: un
// arreglo de notas con fecha y autor. Una nota vieja en texto plano se lee como
// una sola nota ("legacy"). El autor y la fecha los pone siempre el servidor.
export interface NotaLead {
  id: string
  texto: string
  fecha: string
  autor?: string
  editadoEl?: string
}

export function parsearNotasLead(raw: string | null | undefined): NotaLead[] {
  if (!raw || !raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, idx) => ({
          id: String(item.id || `nota-${idx}`),
          texto: String(item.texto || item.nota || ''),
          fecha: String(item.fecha || item.created_at || new Date().toISOString()),
          ...(item.autor ? { autor: String(item.autor) } : {}),
          ...(item.editadoEl ? { editadoEl: String(item.editadoEl) } : {}),
        }))
        .filter(n => Boolean(n.texto.trim()))
    }
  } catch {
    return [{ id: 'legacy', texto: raw.trim(), fecha: new Date().toISOString() }]
  }
  return []
}

export function formatearFechaNota(iso: string): { dia: string; hora: string } {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return { dia: '-', hora: '' }
  return {
    dia: d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric' }),
    hora: d.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true }),
  }
}
