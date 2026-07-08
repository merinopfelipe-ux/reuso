import { Target, FlaskConical as Flask, Zap as Lightning, ShieldCheck, IdCard as IdentificationCard } from '@/components/ui/icons'

export const CURRENCIES = {
  COP: { symbol: '$', code: 'COP', rate: 1, format: (n: number) => n.toLocaleString('es-CO') },
  USD: { symbol: '$', code: 'USD', rate: 0.00025, format: (n: number) => n.toFixed(2) },
  EUR: { symbol: '€', code: 'EUR', rate: 0.00023, format: (n: number) => n.toFixed(2) },
}

export const ANNUAL_DISCOUNT = 10 / 12 // 2 meses gratis

export const PLANS = [
  {
    id: 'free',
    name: 'Explora',
    tagline: 'Empieza a medir sin costo',
    color: '#4D7C79',
    bgColor: 'rgba(77,124,121,0.08)',
    borderColor: 'rgba(0,130,124,0.12)',
    cta: 'Empezar gratis',
    popular: false,
    priceMonthlyCOP: 0,
    features: [
      'Dashboard de impacto personal',
      'Calculadora de CO₂ básica',
      'Historial de cálculos',
      'Soporte por email',
    ],
    limits: {
      empleados: '1 persona',
      calculos: '10 cálculos/mes',
      certificados: 'Sin certificados ni informes',
    }
  },
  {
    id: 'lab',
    name: 'Circular Lab',
    tagline: 'Certifica tu impacto con rigor científico',
    color: '#00827C',
    bgColor: 'rgba(0,130,124,0.08)',
    borderColor: 'rgba(0,130,124,0.3)',
    cta: 'Probar Lab',
    popular: true,
    priceMonthlyCOP: 49000,
    features: [
      'Todo lo del plan Explora',
      'Certificados verificables con QR (2/mes)',
      'Informes descargables (5/mes)',
      'Logo de tu empresa en documentos',
      'Soporte prioritario',
    ],
    limits: {
      empleados: 'Hasta 5 miembros',
      calculos: '200 cálculos/mes',
      certificados: '2 certificados · 5 informes/mes',
    }
  },
  {
    id: 'impulso',
    name: 'Impulso Sostenible',
    tagline: 'Cálculo + Cotizador para PYMEs líderes',
    color: '#59A6E4',
    bgColor: 'rgba(89,166,228,0.1)',
    borderColor: 'rgba(89,166,228,0.4)',
    cta: 'Solicitar acceso',
    popular: false,
    priceMonthlyCOP: 149000,
    isFuture: true,
    features: [
      'Todo lo del plan Circular Lab',
      'Módulo Cotizador Circular (Próximamente)',
      'Reportes ESG listos para auditoría',
      'Alertas de impacto personalizadas',
      'Onboarding guiado',
    ],
    limits: {
      empleados: 'Hasta 10 miembros',
      calculos: '200 cálculos/mes',
      certificados: '2 certificados · 5 informes/mes',
    }
  },
  {
    id: 'ilimitado',
    name: 'Impacto Ilimitado',
    tagline: 'Gestión masiva para grandes organizaciones',
    color: '#1A3A38',
    bgColor: 'rgba(26,58,56,0.08)',
    borderColor: 'rgba(26,58,56,0.5)',
    cta: 'Contactar ventas',
    popular: false,
    priceMonthlyCOP: 349000,
    features: [
      'Todo lo del plan Impulso Sostenible',
      'Cálculos, certificados e informes ilimitados',
      'Exportación avanzada (CSV/Excel)',
      'Soporte dedicado con SLA',
      'Integración con sistemas propios',
    ],
    limits: {
      empleados: 'Ilimitados',
      calculos: 'Ilimitados',
      certificados: 'Ilimitados',
    }
  },
]

export const VALUE_PROPS = [
  {
    Icon: ShieldCheck,
    title: 'Seguridad Digital',
    desc: 'Asignamos una huella digital única a cada cálculo. Si un dato se intenta manipular, la cadena se rompe, garantizando transparencia absoluta.',
  },
  {
    Icon: Flask,
    title: 'Factores Científicos',
    desc: 'Datos trazables a fuentes internacionales (ecoinvent, DEFRA). Rigor técnico para tus reportes de sostenibilidad.',
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
    desc: 'Cada objeto reutilizado lleva un código QR que tus clientes verifican en segundos. Demuestra tu circularidad sin asomo de duda.',
  },
]
