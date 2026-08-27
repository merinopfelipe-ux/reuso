export type EstadoFirmaEfectivo = 'pendiente' | 'firmado' | 'expirado'

const ESTILOS: Record<EstadoFirmaEfectivo, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'text-[#F6BF3E] bg-[#F6BF3E]/10' },
  firmado: { label: 'Firmado', className: 'text-[#38B98E] bg-[#38B98E]/10' },
  expirado: { label: 'Expirado', className: 'text-[#FF5E4B] bg-[#FF5E4B]/10' },
}

/** Calcula el estado visible (pendiente/firmado/expirado) sin persistirlo — el estado real en BD solo transiciona pendiente→firmado. */
export function estadoFirmaEfectivo(estado: string, expiraAt: string): EstadoFirmaEfectivo {
  if (estado === 'firmado') return 'firmado'
  return new Date(expiraAt) < new Date() ? 'expirado' : 'pendiente'
}

export function EstadoFirmaBadge({ estado, expiraAt }: { estado: string; expiraAt: string }) {
  const efectivo = estadoFirmaEfectivo(estado, expiraAt)
  const { label, className } = ESTILOS[efectivo]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${className}`}>
      {label}
    </span>
  )
}
