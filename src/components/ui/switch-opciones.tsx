'use client'

export interface OpcionSwitch<T extends string> {
  valor: T
  label: string
  icon?: React.ReactNode
}

interface SwitchOpcionesProps<T extends string> {
  opciones: OpcionSwitch<T>[]
  valor: T
  onChange: (val: T) => void
  className?: string
}

/**
 * Switch segmentado canónico del sistema (fondo con borde + píldora
 * deslizante detrás de la opción activa). Único componente permitido para
 * elegir entre 2-3 opciones excluyentes con apariencia de switch — no crear
 * uno nuevo ad-hoc por pantalla, extender este si falta algo.
 */
export function SwitchOpciones<T extends string>({ opciones, valor, onChange, className = '' }: SwitchOpcionesProps<T>) {
  const idx = Math.max(0, opciones.findIndex(o => o.valor === valor))
  const n = opciones.length

  return (
    <div className={`relative flex p-1 rounded-full bg-[var(--bg-input)] border border-[var(--border)] ${className}`}>
      <div
        className="absolute inset-y-1 rounded-full bg-[var(--color-brand)] shadow-sm transition-[left] duration-300 ease-out"
        style={{
          width: `calc((100% - 8px) / ${n})`,
          left: `calc(4px + ${idx} * (100% - 8px) / ${n})`,
        }}
      />
      {opciones.map(o => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            valor === o.valor ? 'text-[var(--text-on-brand)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}
