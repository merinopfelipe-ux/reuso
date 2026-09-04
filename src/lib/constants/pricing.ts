import { Target, FlaskConical as Flask, Zap as Lightning, ShieldCheck, IdCard as IdentificationCard } from '@/components/ui/icons'

export const CURRENCIES = {
  COP: { symbol: '$', code: 'COP', rate: 1, format: (n: number) => n.toLocaleString('es-CO') },
  USD: { symbol: '$', code: 'USD', rate: 0.00025, format: (n: number) => n.toFixed(2) },
  EUR: { symbol: '€', code: 'EUR', rate: 0.00023, format: (n: number) => n.toFixed(2) },
}

export const ANNUAL_DISCOUNT = 10 / 12 // 2 meses gratis

// Precios y límites: deben coincidir siempre con config_planes (fuente real,
// editable desde /admin/planes). Si cambias un precio o límite aquí sin
// cambiarlo también en config_planes, la landing queda mintiendo sobre lo
// que el sistema cobra o permite de verdad — verificado y corregido
// 2026-09-02 tras encontrar precios y límites desincronizados en vivo.
export const PLANS = [
  {
    id: 'free',
    name: 'Explora',
    tagline: 'Empieza a medir sin costo.',
    color: '#8AD0B2',
    bgColor: 'rgba(138,208,178,0.10)',
    borderColor: 'rgba(0,130,124,0.12)',
    cta: 'Empezar gratis',
    popular: false,
    priceMonthlyCOP: 0,
    features: [
      'Dashboard de impacto personal.',
      'Calculadora de CO₂ y agua.',
      'Historial de cálculos.',
      'Soporte por email.',
    ],
    limits: {
      empleados: '1 persona',
      calculos: '10 cálculos al mes',
      informes: 'Sin informes',
    }
  },
  {
    id: 'lab',
    name: 'Circular Lab',
    tagline: 'Mide y reporta tu impacto.',
    color: '#00827C',
    bgColor: 'rgba(0,130,124,0.08)',
    borderColor: 'rgba(0,130,124,0.3)',
    cta: 'Probar Lab',
    popular: true,
    priceMonthlyCOP: 49000,
    features: [
      'Todo lo del plan Explora.',
      'Hasta 5 informes de mitigación al mes.',
      'Código QR de verificación pública.',
      'Logo de tu empresa en documentos.',
      'Soporte prioritario.',
    ],
    limits: {
      empleados: 'Hasta 5 miembros',
      calculos: '200 cálculos al mes',
      informes: '5 informes al mes',
    }
  },
  {
    id: 'impulso',
    name: 'Impulso Sostenible',
    tagline: 'Trazabilidad y Pasaporte Digital (DPP).',
    color: '#59A6E4',
    bgColor: 'rgba(89,166,228,0.1)',
    borderColor: 'rgba(89,166,228,0.4)',
    cta: 'Solicitar acceso',
    popular: false,
    priceMonthlyCOP: 149000,
    isFuture: false,
    features: [
      'Todo lo del plan Circular Lab.',
      'Pasaporte Digital de Producto (DPP).',
      'Módulo de Gestión Circular B2B.',
      'Trazabilidad de ciclo de vida.',
      'Alertas de impacto personalizadas.',
      'Onboarding guiado.',
    ],
    limits: {
      empleados: 'Hasta 10 miembros',
      calculos: '200 cálculos al mes',
      informes: '5 informes al mes + Pasaporte DPP',
    }
  },
  {
    id: 'ilimitado',
    name: 'Impacto Ilimitado',
    tagline: 'Informes + DPP + Gestión B2B.',
    color: '#AD7C43',
    bgColor: 'rgba(173,124,67,0.08)',
    borderColor: 'rgba(173,124,67,0.5)',
    cta: 'Contactar ventas',
    popular: false,
    priceMonthlyCOP: 349000,
    features: [
      'Todo lo del plan Impulso Sostenible, sin límites.',
      'Exportación avanzada (CSV/Excel).',
      'Soporte dedicado con SLA.',
      'Integración con sistemas propios.',
    ],
    limits: {
      empleados: 'Ilimitados',
      calculos: 'Ilimitados',
      informes: 'Todo Ilimitado',
    }
  },
]

export const VALUE_PROPS = [
  {
    Icon: ShieldCheck,
    title: 'Seguridad Digital',
    desc: 'Asignamos una huella digital única a cada cálculo. Si un dato se intenta manipular, la cadena se rompe, lo que promueve la transparencia de tu información.',
  },
  {
    Icon: Flask,
    title: 'Fundamentos Técnicos',
    desc: 'Datos trazables a fuentes internacionales (Ecoinvent, DEFRA). Bases técnicas reconocidas para tus reportes de sostenibilidad.',
  },
  {
    Icon: Target,
    title: 'Foco en Reúso',
    desc: 'No reciclaje clásico. Especializados en el acto de reutilizar objetos existentes (ropa, muebles, electrónicos).',
  },
  {
    Icon: Lightning,
    title: 'Implementación Flash',
    desc: 'Tu equipo midiendo impacto en menos de 24 horas. Interfaz intuitiva diseñada para la facilidad de uso.',
  },
  {
    Icon: IdentificationCard,
    title: 'Pasaporte Digital de Producto',
    desc: 'Cada objeto reutilizado lleva un código QR que tus clientes verifican de forma ágil. Respalda tu circularidad con trazabilidad clara.',
  },
]
