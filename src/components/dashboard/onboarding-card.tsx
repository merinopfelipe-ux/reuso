import { Calculator, FloppyDisk, Medal } from '@/components/ui/icons'

const PASOS = [
  {
    icono: Calculator,
    numero: '01',
    titulo: 'Calcula tu impacto',
    descripcion: 'Usa la calculadora para registrar los objetos que reutilizas.',
  },
  {
    icono: FloppyDisk,
    numero: '02',
    titulo: 'Guarda tu cálculo',
    descripcion: 'Guarda tu registro para acumular tu huella de CO₂ evitado.',
  },
  {
    icono: Medal,
    numero: '03',
    titulo: 'Obtén tu certificado',
    descripcion: 'Genera y descarga tu certificado PDF verificable.',
  },
]

export function OnboardingCard() {
  return (
    <div
      style={{
        background: 'var(--color-brand-light)',
        border: '1.5px solid var(--color-brand)',
        borderRadius: 16,
        padding: '24px',
        marginBottom: 24,
        userSelect: 'none',
      }}
    >
      <p
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--color-brand)',
          margin: '0 0 6px',
        }}
      >
        ¡Bienvenido a Calculadora de Reúso!
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Comienza a medir tu impacto ambiental en 3 pasos.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        {PASOS.map(({ icono: Icono, numero, titulo, descripcion }) => (
          <div
            key={numero}
            style={{
              background: 'var(--bg-card)',
              borderRadius: 12,
              padding: '16px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--color-brand-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icono size={16} color="var(--color-brand)" weight="duotone" />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-brand)',
                  letterSpacing: '0.05em',
                }}
              >
                PASO {numero}
              </span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              {titulo}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {descripcion}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
