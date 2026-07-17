'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PenLine as PencilSimpleLine, ChevronDown as CaretDown } from '@/components/ui/icons'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

/* ── Traducciones ─────────────────────────────────────────────────── */
const T = {
  ES: {
    titulo: 'Acuerdo de Confidencialidad',
    breadcrumb: 'Confidencialidad - Firma',
    secciones: [
      { id: 'objeto', label: 'Objeto' },
      { id: 'definicion', label: 'Información confidencial' },
      { id: 'obligaciones', label: 'Obligaciones' },
      { id: 'exclusiones', label: 'Exclusiones' },
      { id: 'titularidad', label: 'Titularidad' },
      { id: 'uso', label: 'Uso de la información' },
      { id: 'vigencia', label: 'Vigencia' },
      { id: 'ley', label: 'Ley aplicable' },
      { id: 'firma', label: 'Firmar acuerdo' },
    ],
    transparencia: {
      texto: 'El presente Acuerdo de Confidencialidad integra plenamente el uso de Inteligencia Artificial. Operamos modelos de IA avanzados para optimizar la gestión de información confidencial. Estas herramientas cumplen rigurosamente con nuestros estándares de seguridad, complementando los controles establecidos para resguardar tus datos estratégicos en cada fase del servicio.',
      link: 'Lee nuestra política de uso de IA →',
    },
    resumen: 'Al usar la Calculadora de Reúso aceptas no reproducir, distribuir ni replicar la metodología de cálculo, los factores de emisión ni el diseño de la plataforma. La información que obtienes en la plataforma es confidencial y solo puedes usarla para los fines del servicio. El incumplimiento puede generar responsabilidad legal.',
    intro: 'Usar la Calculadora de Reúso implica la aceptación de este acuerdo de confidencialidad. Compartimos contigo información técnica, metodológica y de negocio que tiene carácter confidencial. Te comprometes a conservarla en reserva y a no revelarla a terceros.',
    objeto: {
      titulo: 'Objeto',
      texto: 'Compartimos contigo información relacionada con la metodología de cálculo, factores de emisión, diseño de la plataforma y conocimiento técnico asociado. Te comprometes a conservar y mantener esa información de forma estrictamente confidencial y a no revelarla a terceros.',
    },
    definicion: {
      titulo: 'Qué es la información confidencial',
      intro: 'Reconoces y aceptas que toda la información impresa, visual, verbal o digital que te suministremos directa o indirectamente a través de la plataforma constituye información reservada y confidencial. Esto incluye:',
      items: [
        'La metodología de cálculo de CO₂ equivalente evitado.',
        'Los factores de emisión usados en los cálculos.',
        'El diseño, código fuente y arquitectura de la plataforma.',
        'Los contenidos generados por la plataforma (certificados, informes).',
        'Cualquier información técnica, comercial o de negocio que proporcionemos en el contexto del servicio.',
      ],
      cierre: 'Tu acceso a esta información no implica la transferencia de ningún derecho sobre ella, incluyendo derechos de propiedad intelectual, know-how o patentes. Para más detalles sobre los derechos de propiedad, consulta los',
      cierreLink: 'términos y condiciones',
    },
    obligaciones: {
      titulo: 'Tus obligaciones',
      intro: 'Te obligas a:',
      items: [
        'Proteger y mantener en secreto la información confidencial con el mismo grado de precaución que usas para proteger tu propia información confidencial.',
        'Abstenerte de usar la información confidencial total o parcialmente sin nuestro consentimiento escrito previo.',
        'Abstenerte de revelar la información confidencial a terceros no autorizados expresamente por nosotros.',
        'Abstenerte de copiar, reproducir, distribuir o elaborar resúmenes o extractos de la información confidencial sin autorización escrita.',
        'No utilizar la información para fines comerciales propios ni para construir productos o servicios competidores o similares a la Calculadora de Reúso.',
        'Cumplir con el análisis de tráfico, detección de intrusos y medidas de seguridad cuando uses medios electrónicos en el contexto del servicio.',
      ],
      cierre: 'El tratamiento de los datos personales que recopilamos en el marco de estas obligaciones se rige por nuestra',
      cierreLinkPrivacidad: 'Política de Privacidad',
      cierreMid: 'y por la',
      cierreLinkCookies: 'Política de Cookies',
      cierrePost: ', que detalla qué información técnica se almacena durante tu sesión.',
    },
    exclusiones: {
      titulo: 'Exclusiones',
      intro: 'Este acuerdo no aplica sobre la siguiente información:',
      items: [
        'Información que sea del dominio público al momento de recibirla, o que pase a ser pública sin negligencia tuya.',
        'Información desarrollada de forma autónoma e independiente por ti, sin aprovechamiento de la información recibida.',
        'Información que debas revelar por requerimiento legal o de autoridad competente. En ese caso, nos informas antes de la divulgación para que podamos tomar las medidas de protección pertinentes.',
        'Información revelada con nuestra aprobación escrita previa.',
      ],
    },
    titularidad: {
      titulo: 'Titularidad de la información',
      texto: 'Reconoces nuestra titularidad sobre la información confidencial y la usas exclusivamente para los fines del servicio contratado. Tu acceso a la información no crea ninguna relación de sociedad, agencia ni mandato entre tú y nosotros.',
    },
    uso: {
      titulo: 'Uso de la información confidencial',
      parrafo1: 'No puedes utilizar la información confidencial con fines comerciales propios ni para obtener beneficio de un tercero, aunque ese acto no nos cause perjuicio directo. Solo puedes usar la información en el contexto de los fines para los cuales se te proporciona el servicio.',
      parrafo2: 'El incumplimiento de este acuerdo constituye violación de secreto comercial y genera responsabilidad legal. El perjuicio causado por cada violación lo determina la parte afectada conforme a la legislación colombiana y a la normativa de la Comunidad Andina de Naciones (CAN) sobre propiedad industrial.',
      parrafo3Intro: 'Los cálculos y reportes generados en la plataforma están sujetos además al',
      parrafo3LinkReglamento: 'Reglamento de Uso',
      parrafo3Mid: ', que establece las condiciones técnicas y los límites de responsabilidad. La recopilación y almacenamiento de los datos que procesas está regulada por nuestra',
      parrafo3LinkDatos: 'Política de Tratamiento de Datos',
      parrafo3Post: ', en cumplimiento de la Ley 1581 de 2012, el RGPD y la CCPA.',
    },
    vigencia: {
      titulo: 'Vigencia',
      texto: 'Las obligaciones de confidencialidad establecidas en este acuerdo tienen vigencia indefinida. No expiran al terminar la relación con la plataforma, en especial sobre los secretos comerciales y el conocimiento técnico cuya revelación pudiera afectar nuestra posición competitiva.',
    },
    ley: {
      titulo: 'Ley aplicable y resolución de controversias',
      texto: 'Este acuerdo se rige por las leyes de la República de Colombia y por la normativa de la Comunidad Andina de Naciones sobre información confidencial y secretos industriales (artículos 260 a 266 de la Decisión 486 de la Comisión de la CAN). Ante cualquier controversia, las partes intentan primero una solución directa y, de no prosperar, acuden al Centro de Conciliación, Arbitraje y Amigable Composición de Medellín.',
    },
    leeTabien: [
      { href: '/legal/terminos', label: 'Términos y Condiciones' },
      { href: '/legal/privacidad', label: 'Política de Privacidad' },
      { href: '/legal/datos', label: 'Tratamiento de Datos' },
      { href: '/legal/cookies', label: 'Política de Cookies' },
      { href: '/legal/reglamento', label: 'Reglamento de Uso' },
      { href: '/legal/ia', label: 'Uso de Inteligencia Artificial' },
    ],
    firma: {
      titulo: 'Firmar el acuerdo',
      checkboxLabel: 'He leído y entiendo este acuerdo y todos los documentos legales de Grupo MLP S.A.S.',
      modalTexto: '¿Aceptas los términos del Acuerdo de Confidencialidad de Calculadora de Reúso?',
      btnAcepto: 'Acepto',
      btnNoAcepto: 'No acepto',
      labelNombre: 'Nombre completo',
      labelTipo: 'Tipo de identificación',
      labelNumero: 'Número de identificación',
      labelEmail: 'Correo electrónico',
      labelIndicativo: 'Indicativo',
      labelTelefono: 'Teléfono',
      labelFirma: 'Tu firma digital',
      firmaDesc: 'Dibuja tu firma con el mouse o el dedo',
      btnBorrar: 'Borrar',
      btnEnviar: 'Firmar y enviar copia',
      enviando: 'Enviando...',
      exitoTitulo: 'Acuerdo firmado',
      exitoDesc: 'Te enviamos una copia del documento firmado a tu correo electrónico. Podrás verificar su autenticidad con el código del certificado en reuso.lurdes.co/verificar.',
      errorFirma: 'Dibuja tu firma antes de enviar.',
      tiposId: [
        { value: 'CC', label: 'Cédula de ciudadanía' },
        { value: 'CE', label: 'Cédula de extranjería' },
        { value: 'TI', label: 'Tarjeta de identidad' },
        { value: 'PA', label: 'Pasaporte' },
        { value: 'DNI', label: 'DNI (España/Otros)' },
        { value: 'NIE', label: 'NIE (Extranjeros España)' },
        { value: 'SSN', label: 'SSN (Seguro Social EE.UU.)' },
        { value: 'Otro', label: 'Otro' },
      ],
    },
  },
  ENG: {
    titulo: 'Non-Disclosure Agreement',
    breadcrumb: 'Confidentiality - Sign',
    secciones: [
      { id: 'objeto', label: 'Purpose' },
      { id: 'definicion', label: 'Confidential information' },
      { id: 'obligaciones', label: 'Obligations' },
      { id: 'exclusiones', label: 'Exclusions' },
      { id: 'titularidad', label: 'Ownership' },
      { id: 'uso', label: 'Use of information' },
      { id: 'vigencia', label: 'Term' },
      { id: 'ley', label: 'Applicable law' },
      { id: 'firma', label: 'Sign agreement' },
    ],
    transparencia: {
      texto: 'This Non-Disclosure Agreement fully integrates the use of Artificial Intelligence. We operate advanced AI models to optimize the management of confidential information. These tools strictly comply with our security standards, complementing the established controls to safeguard your strategic data at every stage of the service.',
      link: 'Read our AI usage policy →',
    },
    resumen: 'By using Calculadora de Reúso you agree not to reproduce, distribute or replicate the calculation methodology, emission factors or platform design. The information you access on the platform is confidential and may only be used for the purposes of the service. Non-compliance may result in legal liability.',
    intro: 'Using Calculadora de Reúso implies acceptance of this non-disclosure agreement. We share with you technical, methodological and business information of a confidential nature. You agree to keep it confidential and not to disclose it to third parties.',
    objeto: {
      titulo: 'Purpose',
      texto: 'We share with you information related to the calculation methodology, emission factors, platform design and associated technical knowledge. You agree to keep and maintain that information strictly confidential and not to disclose it to third parties.',
    },
    definicion: {
      titulo: 'What constitutes confidential information',
      intro: 'You acknowledge and agree that all printed, visual, verbal or digital information that we provide you directly or indirectly through the platform constitutes reserved and confidential information. This includes:',
      items: [
        'The methodology for calculating equivalent CO₂ avoided.',
        'The emission factors used in the calculations.',
        'The design, source code and architecture of the platform.',
        'Content generated by the platform (certificates, reports).',
        'Any technical, commercial or business information we provide in the context of the service.',
      ],
      cierre: 'Your access to this information does not imply the transfer of any rights over it, including intellectual property rights, know-how or patents. For more details on ownership rights, see the',
      cierreLink: 'terms and conditions',
    },
    obligaciones: {
      titulo: 'Your obligations',
      intro: 'You agree to:',
      items: [
        'Protect and keep the confidential information secret with the same degree of care you use to protect your own confidential information.',
        'Refrain from using the confidential information in whole or in part without our prior written consent.',
        'Refrain from disclosing the confidential information to third parties not expressly authorized by us.',
        'Refrain from copying, reproducing, distributing or creating summaries or extracts of the confidential information without written authorization.',
        'Not use the information for your own commercial purposes or to build products or services that compete with or are similar to Calculadora de Reúso.',
        'Comply with traffic analysis, intrusion detection and security measures when using electronic means in the context of the service.',
      ],
      cierre: 'The handling of personal data we collect under these obligations is governed by our',
      cierreLinkPrivacidad: 'Privacy Policy',
      cierreMid: 'and the',
      cierreLinkCookies: 'Cookie Policy',
      cierrePost: ', which details what technical information is stored during your session.',
    },
    exclusiones: {
      titulo: 'Exclusions',
      intro: 'This agreement does not apply to the following information:',
      items: [
        'Information that is in the public domain at the time of receipt, or that becomes public without any negligence on your part.',
        'Information independently developed by you without making use of the information received.',
        'Information you are required to disclose by law or competent authority. In that case, you notify us before disclosure so we can take appropriate protective measures.',
        'Information disclosed with our prior written approval.',
      ],
    },
    titularidad: {
      titulo: 'Ownership of information',
      texto: 'You acknowledge our ownership of the confidential information and use it exclusively for the purposes of the contracted service. Your access to the information does not create any partnership, agency or mandate relationship between you and us.',
    },
    uso: {
      titulo: 'Use of confidential information',
      parrafo1: 'You may not use the confidential information for your own commercial purposes or to obtain benefit for a third party, even if that act does not directly harm us. You may only use the information in the context of the purposes for which the service is provided.',
      parrafo2: 'Breach of this agreement constitutes a violation of trade secrets and gives rise to legal liability. The harm caused by each violation shall be determined by the affected party in accordance with Colombian law and the Andean Community of Nations (CAN) regulations on industrial property.',
      parrafo3Intro: 'The calculations and reports generated on the platform are also subject to the',
      parrafo3LinkReglamento: 'Usage Rules',
      parrafo3Mid: ', which establish the technical conditions and liability limits. The collection and storage of the data you process is governed by our',
      parrafo3LinkDatos: 'Data Processing Policy',
      parrafo3Post: ', in compliance with Law 1581 of 2012, the GDPR and the CCPA.',
    },
    vigencia: {
      titulo: 'Term',
      texto: 'The confidentiality obligations established in this agreement have indefinite validity. They do not expire upon termination of the relationship with the platform, especially regarding trade secrets and technical knowledge whose disclosure could affect our competitive position.',
    },
    ley: {
      titulo: 'Applicable law and dispute resolution',
      texto: 'This agreement is governed by the laws of the Republic of Colombia and the Andean Community of Nations regulations on confidential information and industrial secrets (articles 260 to 266 of Decision 486 of the CAN Commission). In the event of any dispute, the parties shall first attempt a direct resolution and, if unsuccessful, shall resort to the Medellín Center for Conciliation, Arbitration and Mediation.',
    },
    leeTabien: [
      { href: '/legal/terminos', label: 'Terms and Conditions' },
      { href: '/legal/privacidad', label: 'Privacy Policy' },
      { href: '/legal/datos', label: 'Data Processing' },
      { href: '/legal/cookies', label: 'Cookie Policy' },
      { href: '/legal/reglamento', label: 'Usage Rules' },
      { href: '/legal/ia', label: 'Artificial Intelligence Use' },
    ],
    firma: {
      titulo: 'Sign the agreement',
      checkboxLabel: 'I have read and understand this agreement and all legal documents of Grupo MLP S.A.S.',
      modalTexto: 'Do you accept the terms of the Calculadora de Reúso Non-Disclosure Agreement?',
      btnAcepto: 'I accept',
      btnNoAcepto: 'I do not accept',
      labelNombre: 'Full name',
      labelTipo: 'ID type',
      labelNumero: 'ID number',
      labelEmail: 'Email address',
      labelIndicativo: 'Country code',
      labelTelefono: 'Phone number',
      labelFirma: 'Your digital signature',
      firmaDesc: 'Draw your signature with the mouse or your finger',
      btnBorrar: 'Clear',
      btnEnviar: 'Sign and send copy',
      enviando: 'Sending...',
      exitoTitulo: 'Agreement signed',
      exitoDesc: 'We have sent a signed copy of the document to your email address. You can verify its authenticity using the certificate code at reuso.lurdes.co/verificar.',
      errorFirma: 'Please draw your signature before submitting.',
      tiposId: [
        { value: 'CC', label: 'Cédula de ciudadanía' },
        { value: 'CE', label: 'Cédula de extranjería' },
        { value: 'TI', label: 'Tarjeta de identidad' },
        { value: 'PA', label: 'Passport' },
        { value: 'DNI', label: 'DNI (Spain/Other)' },
        { value: 'NIE', label: 'NIE (Foreigners Spain)' },
        { value: 'SSN', label: 'SSN (U.S. Social Security)' },
        { value: 'Otro', label: 'Other' },
      ],
    },
  },
}

const INDICATIVOS = [
  { code: '+57', iso: 'co', label: 'Colombia', full: 'Colombia (+57)' },
  { code: '+1', iso: 'us', label: 'Estados Unidos / EE.UU.', full: 'Estados Unidos (+1)' },
  { code: '+52', iso: 'mx', label: 'México', full: 'México (+52)' },
  { code: '+34', iso: 'es', label: 'España', full: 'España (+34)' },
  { code: '+54', iso: 'ar', label: 'Argentina', full: 'Argentina (+54)' },
  { code: '+55', iso: 'br', label: 'Brasil', full: 'Brasil (+55)' },
  { code: '+56', iso: 'cl', label: 'Chile', full: 'Chile (+56)' },
  { code: '+51', iso: 'pe', label: 'Perú', full: 'Perú (+51)' },
  { code: '+593', iso: 'ec', label: 'Ecuador', full: 'Ecuador (+593)' },
  { code: '+58', iso: 've', label: 'Venezuela', full: 'Venezuela (+58)' },
  { code: '+507', iso: 'pa', label: 'Panamá', full: 'Panamá (+507)' },
  { code: '+506', iso: 'cr', label: 'Costa Rica', full: 'Costa Rica (+506)' },
  { code: '+591', iso: 'bo', label: 'Bolivia', full: 'Bolivia (+591)' },
  { code: '+502', iso: 'gt', label: 'Guatemala', full: 'Guatemala (+502)' },
  { code: '+503', iso: 'sv', label: 'El Salvador', full: 'El Salvador (+503)' },
  { code: '+504', iso: 'hn', label: 'Honduras', full: 'Honduras (+504)' },
  { code: '+505', iso: 'ni', label: 'Nicaragua', full: 'Nicaragua (+505)' },
  { code: '+595', iso: 'py', label: 'Paraguay', full: 'Paraguay (+595)' },
  { code: '+598', iso: 'uy', label: 'Uruguay', full: 'Uruguay (+598)' },
  { code: '+1', iso: 'ca', label: 'Canadá', full: 'Canadá (+1)' },
  { code: '+44', iso: 'gb', label: 'Reino Unido', full: 'Reino Unido (+44)' },
  { code: '+33', iso: 'fr', label: 'Francia', full: 'Francia (+33)' },
  { code: '+49', iso: 'de', label: 'Alemania', full: 'Alemania (+49)' },
  { code: '+39', iso: 'it', label: 'Italia', full: 'Italia (+39)' },
  { code: '+31', iso: 'nl', label: 'Países Bajos', full: 'Países Bajos (+31)' },
  { code: '+351', iso: 'pt', label: 'Portugal', full: 'Portugal (+351)' },
]

/* ── Canvas de firma ─────────────────────────────────────────────── */
function FirmaCanvas({ onChange, disabled = false }: { onChange: (v: string | null) => void; disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width || 480
    canvas.height = rect.height || 150
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    let drawing = false

    const rel = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect()
      return { x: clientX - r.left, y: clientY - r.top }
    }

    const md = (e: MouseEvent) => {
      if (disabledRef.current) return
      drawing = true
      const { x, y } = rel(e.clientX, e.clientY)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
    const mm = (e: MouseEvent) => {
      if (disabledRef.current) return
      if (!drawing) return
      const { x, y } = rel(e.clientX, e.clientY)
      ctx.lineTo(x, y)
      ctx.stroke()
      onChangeRef.current(canvas.toDataURL('image/png'))
    }
    const mu = () => { drawing = false }

    const ts = (e: TouchEvent) => {
      if (disabledRef.current) return
      e.preventDefault()
      drawing = true
      const { x, y } = rel(e.touches[0].clientX, e.touches[0].clientY)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
    const tm = (e: TouchEvent) => {
      if (disabledRef.current) return
      e.preventDefault()
      if (!drawing) return
      const { x, y } = rel(e.touches[0].clientX, e.touches[0].clientY)
      ctx.lineTo(x, y)
      ctx.stroke()
      onChangeRef.current(canvas.toDataURL('image/png'))
    }
    const te = () => { drawing = false }

    canvas.addEventListener('mousedown', md)
    canvas.addEventListener('mousemove', mm)
    canvas.addEventListener('mouseup', mu)
    canvas.addEventListener('mouseleave', mu)
    canvas.addEventListener('touchstart', ts, { passive: false })
    canvas.addEventListener('touchmove', tm, { passive: false })
    canvas.addEventListener('touchend', te)

    return () => {
      canvas.removeEventListener('mousedown', md)
      canvas.removeEventListener('mousemove', mm)
      canvas.removeEventListener('mouseup', mu)
      canvas.removeEventListener('mouseleave', mu)
      canvas.removeEventListener('touchstart', ts)
      canvas.removeEventListener('touchmove', tm)
      canvas.removeEventListener('touchend', te)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const clear = () => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChangeRef.current(null)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: 150,
          borderRadius: 10,
          border: disabled ? '1.5px solid rgba(0,0,0,0.10)' : '1.5px solid rgba(0,130,124,0.30)',
          cursor: disabled ? 'not-allowed' : 'crosshair',
          touchAction: 'none',
          background: disabled ? 'rgba(0,0,0,0.02)' : 'rgba(0,130,124,0.02)',
          opacity: disabled ? 0.6 : 1,
        }}
      />
      <button
        type="button"
        onClick={clear}
        disabled={disabled}
        style={{
          marginTop: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        Borrar
      </button>
    </div>
  )
}

/* ── Sección de firma ─────────────────────────────────────────────── */
function FirmaSection({ tf }: { tf: typeof T['ES']['firma'] }) {
  const [modalVisible, setModalVisible] = useState(false)
  const [aceptado, setAceptado] = useState(false)
  const [checkboxChecked, setCheckboxChecked] = useState(false)

  const [nombre, setNombre] = useState('')
  const [tipoIdentidad, setTipoIdentidad] = useState('Cédula de ciudadanía')
  const [numeroIdentidad, setNumeroIdentidad] = useState('')
  const [email, setEmail] = useState('')
  const [indicativo, setIndicativo] = useState('+57')
  const [selectedIso, setSelectedIso] = useState('co')
  const [telefono, setTelefono] = useState('')
  const [firma, setFirma] = useState<string | null>(null)

  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [idDropdownOpen, setIdDropdownOpen] = useState(false)
  const idDropdownRef = useRef<HTMLDivElement>(null)
  const idInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (idDropdownRef.current && !idDropdownRef.current.contains(e.target as Node)) {
        setIdDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleCheckboxChange = () => {
    if (!checkboxChecked) {
      setModalVisible(true)
    } else {
      setCheckboxChecked(false)
      setAceptado(false)
    }
  }

  const handleAcepto = () => {
    setCheckboxChecked(true)
    setAceptado(true)
    setModalVisible(false)
  }

  const handleNoAcepto = () => {
    setCheckboxChecked(false)
    setAceptado(false)
    setModalVisible(false)
  }

  const handleFirmaChange = useCallback((v: string | null) => {
    setFirma(v)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!firma) {
      setError(tf.errorFirma)
      return
    }
    setEnviando(true)
    try {
      const res = await fetch('/api/legal/firma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          tipoIdentidad,
          numeroIdentidad,
          email,
          indicativo,
          telefono,
          firma,
        }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Error al enviar')
      setEnviado(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1.5px solid rgba(0,130,124,0.20)',
    background: 'var(--bg-card)',
    fontSize: 14,
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    marginBottom: 6,
  }

  return (
    <div id="firma" style={{ marginTop: 0 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>
        {tf.titulo}
      </h2>

      {/* Checkbox de lectura */}
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          cursor: 'pointer',
          padding: '16px 20px',
          borderRadius: 12,
          border: aceptado
            ? '1.5px solid rgba(0,130,124,0.30)'
            : '1.5px solid rgba(0,0,0,0.10)',
          background: aceptado ? 'rgba(0,130,124,0.04)' : 'var(--bg-card)',
          transition: 'border-color 0.2s, background 0.2s',
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={checkboxChecked}
          onChange={handleCheckboxChange}
          style={{ marginTop: 2, width: 16, height: 16, accentColor: '#00827C', flexShrink: 0 }}
        />
        <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
          {tf.checkboxLabel}
        </span>
      </label>

      {/* Modal de confirmación */}
      {modalVisible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            background: 'rgba(71,71,71,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 20,
              padding: '32px 28px',
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.20)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(0,130,124,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                color: '#00827C',
              }}
            >
              <PencilSimpleLine size={24} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.4 }}>
              {tf.modalTexto}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              Al aceptar, podrás completar el formulario y firmar digitalmente el acuerdo. Te enviaremos una copia en PDF a tu correo.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleNoAcepto}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  background: 'transparent',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {tf.btnNoAcepto}
              </button>
              <button
                onClick={handleAcepto}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#00827C',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,130,124,0.30)',
                }}
              >
                {tf.btnAcepto}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario - siempre visible pero congelado si no ha aceptado */}
      {!enviado && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            padding: '28px 24px',
            borderRadius: 16,
            border: '1px solid rgba(0,130,124,0.15)',
            background: 'var(--bg-card)',
            opacity: aceptado ? 1 : 0.5,
            transition: 'opacity 0.4s ease, filter 0.4s ease',
            filter: aceptado ? 'none' : 'grayscale(20%)',
          }}
        >
          {/* Nombre */}
          <div>
            <label style={labelStyle}>
              {tf.labelNombre}
              <span style={{ color: '#cc3300', marginLeft: 4 }}>*</span>
            </label>
            <input
              type="text"
              required
              disabled={!aceptado}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={{ ...inputStyle, cursor: aceptado ? 'text' : 'not-allowed' }}
              placeholder="Nombre y apellidos"
              autoComplete="name"
            />
          </div>

          {/* Tipo + Número de identificación */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div ref={idDropdownRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>
                {tf.labelTipo}
                <span style={{ color: '#cc3300', marginLeft: 4 }}>*</span>
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  ref={idInputRef}
                  type="text"
                  required
                  disabled={!aceptado}
                  value={tipoIdentidad}
                  onFocus={() => { if (aceptado) setIdDropdownOpen(true); }}
                  onChange={(e) => setTipoIdentidad(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingRight: '32px',
                    cursor: aceptado ? 'text' : 'not-allowed',
                  }}
                  placeholder="Selecciona o escribe..."
                />
                <button
                  type="button"
                  disabled={!aceptado}
                  onClick={() => { if (aceptado) setIdDropdownOpen((o) => !o); }}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 4,
                    cursor: aceptado ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CaretDown size={14} style={{ color: 'var(--text-secondary)', transform: idDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
              </div>

              {idDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    width: '100%',
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(0,130,124,0.25)',
                    borderRadius: 8,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    maxHeight: 180,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: 6,
                  }}
                >
                  {['Cédula de ciudadanía', 'Cédula de extranjería', 'Tarjeta de identidad', 'Pasaporte', 'DNI', 'NIE', 'SSN', 'Otro (Escribir personalizado)...'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (option === 'Otro (Escribir personalizado)...') {
                          setTipoIdentidad('')
                          setIdDropdownOpen(false)
                          setTimeout(() => idInputRef.current?.focus(), 50)
                        } else {
                          setTipoIdentidad(option)
                          setIdDropdownOpen(false)
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '8px 10px',
                        border: 'none',
                        background: (tipoIdentidad === option || (option === 'Otro (Escribir personalizado)...' && !['Cédula de ciudadanía', 'Cédula de extranjería', 'Tarjeta de identidad', 'Pasaporte', 'DNI', 'NIE', 'SSN'].includes(tipoIdentidad) && tipoIdentidad !== '')) ? 'rgba(0,130,124,0.08)' : 'transparent',
                        borderRadius: 6,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: 13,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {!['Cédula de ciudadanía', 'Cédula de extranjería', 'Tarjeta de identidad', 'Pasaporte', 'DNI', 'NIE', 'SSN'].includes(tipoIdentidad) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 6,
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'rgba(0, 130, 124, 0.05)',
                  border: '1px dashed rgba(0, 130, 124, 0.3)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                }}>
                  <PencilSimpleLine size={14} style={{ color: '#00827C', flexShrink: 0 }} />
                  <span>Escribe tu tipo de documento directamente en la casilla superior.</span>
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>
                {tf.labelNumero}
                <span style={{ color: '#cc3300', marginLeft: 4 }}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                disabled={!aceptado}
                value={numeroIdentidad}
                onChange={(e) => setNumeroIdentidad(e.target.value.replace(/\D/g, ''))}
                style={{ ...inputStyle, cursor: aceptado ? 'text' : 'not-allowed' }}
                placeholder="Ej. 1234567890"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>
              {tf.labelEmail}
              <span style={{ color: '#cc3300', marginLeft: 4 }}>*</span>
            </label>
            <input
              type="email"
              required
              disabled={!aceptado}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, cursor: aceptado ? 'text' : 'not-allowed' }}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label style={labelStyle}>
              {tf.labelTelefono}
              <span style={{ color: '#cc3300', marginLeft: 4 }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              {/* Selector de Indicativo / País Personalizado */}
              <div ref={dropdownRef} style={{ position: 'relative', width: 'auto', minWidth: 160, flexShrink: 0 }}>
                <button
                  type="button"
                  disabled={!aceptado}
                  onClick={() => setDropdownOpen((o) => !o)}
                  style={{
                    ...inputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    cursor: aceptado ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${selectedIso}.svg`}
                      alt=""
                      style={{
                        width: 20,
                        height: 14,
                        borderRadius: '3px',
                        objectFit: 'cover',
                        border: '1px solid rgba(0,0,0,0.15)',
                      }}
                    />
                    <span>{indicativo}</span>
                  </div>
                  <CaretDown size={14} style={{ color: 'var(--text-secondary)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {dropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      width: 260,
                      background: 'var(--bg-card)',
                      border: '1px solid rgba(0,130,124,0.25)',
                      borderRadius: 8,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                      zIndex: 100,
                      padding: 8,
                    }}
                  >
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar país o indicativo..."
                      style={{
                        ...inputStyle,
                        padding: '6px 10px',
                        fontSize: 13,
                        marginBottom: 8,
                        borderRadius: 6,
                        border: '1px solid rgba(0,130,124,0.30)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      {INDICATIVOS.filter(
                        (i) =>
                          i.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          i.code.includes(searchQuery)
                      ).map((item) => (
                        <button
                          key={item.iso}
                          type="button"
                          onClick={() => {
                            setIndicativo(item.code)
                            setSelectedIso(item.iso)
                            setDropdownOpen(false)
                            setSearchQuery('')
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '8px 10px',
                            border: 'none',
                            background: indicativo === item.code ? 'rgba(0,130,124,0.08)' : 'transparent',
                            borderRadius: 6,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: 13,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${item.iso}.svg`}
                            alt=""
                            style={{
                              width: 20,
                              height: 14,
                              borderRadius: '3px',
                              objectFit: 'cover',
                              border: '1px solid rgba(0,0,0,0.15)',
                            }}
                          />
                          <span style={{ fontWeight: indicativo === item.code ? 600 : 400, flex: 1 }}>
                            {item.label}
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                            {item.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input
                type="tel"
                required
                disabled={!aceptado}
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                style={{ ...inputStyle, flex: 1, cursor: aceptado ? 'text' : 'not-allowed' }}
                placeholder="300 123 4567"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Canvas de firma */}
          <div>
            <label style={labelStyle}>
              {tf.labelFirma}
              <span style={{ color: '#cc3300', marginLeft: 4 }}>*</span>
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 0 }}>
              {tf.firmaDesc}
            </p>
            <div className="firma-canvas-container">
              <FirmaCanvas onChange={handleFirmaChange} disabled={!aceptado} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{ fontSize: 13, color: '#cc3300', margin: 0, lineHeight: 1.5 }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={enviando || !aceptado}
            style={{
              padding: '12px 24px',
              borderRadius: 10,
              border: 'none',
              background: (enviando || !aceptado) ? '#9dbdba' : '#00827C',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: (enviando || !aceptado) ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              boxShadow: (enviando || !aceptado) ? 'none' : '0 2px 10px rgba(0,130,124,0.28)',
              alignSelf: 'flex-start',
            }}
          >
            {enviando ? tf.enviando : tf.btnEnviar}
          </button>
        </form>
      )}

      {/* Confirmación de éxito */}
      {enviado && (
        <div
          style={{
            marginTop: 24,
            padding: '24px 20px',
            borderRadius: 14,
            background: 'rgba(0,130,124,0.05)',
            border: '1px solid rgba(0,130,124,0.20)',
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-brand)', marginBottom: 6 }}>
            {tf.exitoTitulo}
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            {tf.exitoDesc}
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Estilos compartidos ─────────────────────────────────────────── */
const h2: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginTop: 40,
  marginBottom: 12,
  color: 'var(--text-primary)',
}
const p: React.CSSProperties = { marginBottom: 16, lineHeight: 1.85 }
const ul: React.CSSProperties = { paddingLeft: 20, marginBottom: 16, listStyleType: 'disc' }
const li: React.CSSProperties = { marginBottom: 8 }

/* ── Página ──────────────────────────────────────────────────────── */
export default function ConfidencialidadFirmaPage() {
  const [lang, setLang] = useState<'ES' | 'ENG'>('ES')

  useEffect(() => {
    const checkIdioma = () => {
      const saved = localStorage.getItem('reuso_idioma')
      if (saved === 'ENG') setLang('ENG')
      else if (saved === 'ES') setLang('ES')
      else setLang(navigator.language.startsWith('es') ? 'ES' : 'ENG')
    }
    checkIdioma()
    window.addEventListener('reuso_idioma_change', checkIdioma)
    return () => window.removeEventListener('reuso_idioma_change', checkIdioma)
  }, [])

  const t = T[lang]

  return (
    <LegalPageLayout
      titulo={t.titulo}
      breadcrumbLabel={t.breadcrumb}
      secciones={t.secciones}
      resumen={t.resumen}
      transparenciaTexto={null}
      hideResumen={true}
      hideLeeTambien={true}
      leeTabien={t.leeTabien}
      requiresAccept={<FirmaSection tf={t.firma} />}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .firma-canvas-container {
          width: 50%;
        }
        @media (max-width: 767px) {
          .firma-canvas-container {
            width: 100%;
          }
        }
      `}} />
      <p style={p}>{t.intro}</p>

      <h2 id="objeto" style={h2}>{t.objeto.titulo}</h2>
      <p style={p}>{t.objeto.texto}</p>

      <h2 id="definicion" style={h2}>{t.definicion.titulo}</h2>
      <p style={p}>{t.definicion.intro}</p>
      <ul style={ul}>
        {t.definicion.items.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>
      <p style={p}>
        {t.definicion.cierre}{' '}
        <Link href="/legal/terminos" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.definicion.cierreLink}
        </Link>
        .
      </p>

      <h2 id="obligaciones" style={h2}>{t.obligaciones.titulo}</h2>
      <p style={p}>{t.obligaciones.intro}</p>
      <ul style={ul}>
        {t.obligaciones.items.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>
      <p style={p}>
        {t.obligaciones.cierre}{' '}
        <Link href="/legal/privacidad" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.obligaciones.cierreLinkPrivacidad}
        </Link>
        {' '}{t.obligaciones.cierreMid}{' '}
        <Link href="/legal/cookies" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.obligaciones.cierreLinkCookies}
        </Link>
        {t.obligaciones.cierrePost}
      </p>

      <h2 id="exclusiones" style={h2}>{t.exclusiones.titulo}</h2>
      <p style={p}>{t.exclusiones.intro}</p>
      <ul style={ul}>
        {t.exclusiones.items.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>

      <h2 id="titularidad" style={h2}>{t.titularidad.titulo}</h2>
      <p style={p}>{t.titularidad.texto}</p>

      <h2 id="uso" style={h2}>{t.uso.titulo}</h2>
      <p style={p}>{t.uso.parrafo1}</p>
      <p style={p}>{t.uso.parrafo2}</p>
      <p style={p}>
        {t.uso.parrafo3Intro}{' '}
        <Link href="/legal/reglamento" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.uso.parrafo3LinkReglamento}
        </Link>
        {t.uso.parrafo3Mid}{' '}
        <Link href="/legal/datos" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.uso.parrafo3LinkDatos}
        </Link>
        {t.uso.parrafo3Post}
      </p>

      <h2 id="vigencia" style={h2}>{t.vigencia.titulo}</h2>
      <p style={p}>{t.vigencia.texto}</p>

      <h2 id="ley" style={h2}>{t.ley.titulo}</h2>
      <p style={p}>{t.ley.texto}</p>
    </LegalPageLayout>
  )
}
