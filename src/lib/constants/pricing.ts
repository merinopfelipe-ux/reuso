import { Target, FlaskConical as Flask, Zap as Lightning, ShieldCheck, IdCard as IdentificationCard } from '@/components/ui/icons'

export function formatearPrecioColombiano(val: number | string | null | undefined, permitirDecimales = true): string {
  if (val === null || val === undefined || val === '') return '0'
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/'/g, '').replace(/\./g, '').replace(',', '.'))
  if (isNaN(num)) return '0'

  const tieneDec = num % 1 !== 0 && permitirDecimales
  const [enteroRaw, decRaw] = num.toFixed(tieneDec ? 2 : 0).split('.')
  let entero = enteroRaw

  // En Colombia el millón se separa con apóstrofe (') y los miles con punto (.)
  if (entero.length > 6) {
    const millonesRaw = entero.slice(0, -6)
    const millones = millonesRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    const miles = entero.slice(-6, -3)
    const unidades = entero.slice(-3)
    entero = `${millones}'${miles}.${unidades}`
  } else if (entero.length > 3) {
    const miles = entero.slice(0, -3)
    const unidades = entero.slice(-3)
    entero = `${miles}.${unidades}`
  }

  return decRaw ? `${entero},${decRaw}` : entero
}

export const CURRENCIES = {
  COP: { symbol: '$', code: 'COP', rate: 1, format: (n: number) => formatearPrecioColombiano(n, false) },
  // toFixed(2) no separaba los miles ("2415.00") — toLocaleString con 2
  // decimales fijos sí los separa ("2,415.00" en inglés/USD, "2.415,00"
  // en euro), bug real encontrado 2026-09-11.
  USD: { symbol: '$', code: 'USD', rate: 0.00025, format: (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  EUR: { symbol: '€', code: 'EUR', rate: 0.00023, format: (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
}

export const ANNUAL_DISCOUNT = 10 / 12 // 2 meses gratis

// Paleta fija para el color de cada categoría del cuadro comparativo de
// planes (popup "Compara" de la landing + su editor en /admin/contenido ->
// Precios). Compartida entre los dos archivos para que nunca puedan
// desincronizarse — son acentos ya aprobados del sistema (constantes, no
// cambian entre temas), nunca un hex nuevo sin aprobar.
export const PALETA_COMPARATIVA = ['#38B98E', '#59A6E4', '#F6BF3E', '#985fa1', '#F3BBD3', '#8AD0B2', '#AD7C43']

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
      'Calculadora de huella de CO2 y agua',
      'Historial de todos tus cálculos',
      'Puesta en marcha guiada, gratis',
      'Soporte por email',
    ],
    limits: {
      empleados: '1 persona',
      calculos: '10 por mes',
      informes: 'No incluye',
      cotizaciones: 'No incluye',
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
      'Todo lo de Explora',
      'Informes de impacto con código QR de verificación pública',
      'Tu logo de empresa en los informes',
      'Catálogo de materiales con factores de referencia',
      'Puesta en marcha guiada, gratis',
      'Soporte por email',
    ],
    limits: {
      empleados: '5 personas',
      calculos: '200 por mes',
      informes: '5 por mes',
      cotizaciones: 'No incluye',
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
      'Todo lo de Circular Lab',
      'Asistente de IA: sube una foto o un documento y el sistema lo interpreta',
      'Pasaporte Digital de Producto con página pública y QR',
      'Cotizador con CRM de clientes y embudo de ventas',
      'Crea tus propias categorías y materiales',
      'Puesta en marcha guiada, gratis',
      'Soporte por email',
    ],
    limits: {
      empleados: '10 personas',
      calculos: '200 por mes',
      informes: '5 por mes',
      cotizaciones: '200 por mes',
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
      'Todo lo de Impulso Sostenible, sin límites de uso',
      'Circularidad de Materiales',
      'Exportación a Excel y CSV',
      'Integración con tus sistemas',
      'Soporte prioritario',
    ],
    limits: {
      empleados: 'Ilimitado',
      calculos: 'Ilimitado',
      informes: 'Ilimitado',
      cotizaciones: 'Ilimitado',
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
