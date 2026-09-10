'use client'

import { useEffect, useState } from 'react'
import { LegalPageLayout, h2, p } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: 'Política SAGRILAFT',
    subtitulo: 'Sistema de Autocontrol y Gestión del Riesgo Integral de Lavado de Activos, Financiación del Terrorismo y Financiamiento de la Proliferación de Armas de Destrucción Masiva',
    breadcrumbLabel: 'Política SAGRILAFT',
    secciones: [
      { id: 'objetivo', label: 'Nuestro objetivo' },
      { id: 'alcance', label: 'A quiénes aplica' },
      { id: 'principios', label: 'Nuestros principios' },
      { id: 'identificacion-riesgos', label: 'Factores de riesgo' },
      { id: 'debida-diligencia', label: 'Conozcamos a las partes' },
      { id: 'beneficiario-final', label: 'Beneficiarios reales' },
      { id: 'personas-expuestas', label: 'Personas públicas (PEP)' },
      { id: 'operaciones-inusuales', label: 'Movimientos sospechosos' },
      { id: 'conservacion-documentos', label: 'Guardado de registros' },
      { id: 'canales-reporte', label: 'Canal de alertas' },
    ],
    resumen:
      'En Grupo MLP S.A.S. blindamos la Calculadora de Reúso para garantizar que nuestros servicios, facturación y certificados ambientales nunca se usen para lavar dinero ni financiar actividades ilegales. Ejecutamos al pie de la letra nuestra Política SAGRILAFT conforme al Capítulo X de la Circular Básica Jurídica de la Superintendencia de Sociedades y los estándares internacionales del GAFI.',
    leeTabien: [
      { href: '/legal/ptee', label: 'Programa de Ética (PTEE)' },
      { href: '/legal/terminos', label: 'Términos y Condiciones' },
      { href: '/legal/datos', label: 'Tratamiento de Datos' },
    ],
    intro:
      'Grupo MLP S.A.S., empresa colombiana con sede en Medellín y dueña de la Calculadora de Reúso (calculadoradereuso.com), diseñó este Sistema de Autocontrol y Gestión del Riesgo (SAGRILAFT). Aquí explicamos de forma transparente cómo verificamos el origen lícito de los fondos, prevenimos el lavado de activos y protegemos cada transacción.',
    objetivoTitle: 'Nuestro objetivo: blindar la plataforma contra el delito',
    objetivo1:
      'Protegemos activamente nuestra plataforma, contratos y facturas para evitar que cualquier persona o grupo pretenda usar la Calculadora de Reúso para dar apariencia de legalidad a dinero sucio, financiar el terrorismo o respaldar actividades criminales.',
    objetivo2:
      'Aplicamos rigurosamente el Capítulo X de la Circular Básica Jurídica de la Superintendencia de Sociedades, las 40 Recomendaciones del GAFI (Grupo de Acción Financiera Internacional) y el Código Penal colombiano.',
    alcanceTitle: '¿A quiénes obliga esta política?',
    alcanceIntro: 'Esta política es obligatoria para:',
    alcanceItems: [
      'Empresas y organizaciones que contratan planes o servicios corporativos.',
      'Proveedores de tecnología, hosting, pasarelas de pago y suministros.',
      'Socios, directivos, empleados y asesores de Grupo MLP S.A.S.',
      'Aliados comerciales y representantes.',
    ],
    principiosTitle: 'Nuestros principios de prevención',
    principiosItems: [
      'Legalidad primero: verificamos la identidad de cada empresa y el origen lícito de su dinero.',
      'Cero tolerancia: cerramos la puerta de inmediato a dineros dudosos o sin respaldo transparente.',
      'Reserva legal: guardamos confidencialidad estricta sobre los reportes internos de alerta.',
      'Cooperación activa: informamos a la UIAF y a las autoridades judiciales cuando la ley lo exige.',
    ],
    identificacionTitle: '¿Cómo identificamos los riesgos?',
    identificacion1:
      'Revisamos permanentemente 4 factores clave: (i) Quiénes son nuestros clientes y proveedores, (ii) Qué servicios compran, (iii) Por qué canales pagan (bancos y pasarelas oficiales), y (iv) De qué ciudades o países vienen los fondos.',
    identificacion2:
      'Investigamos de inmediato pagos fraccionados extraños, transferencias no acordes con la actividad de la empresa o intentos de simular mediciones ambientales para mover plata de origen desconocido.',
    debidaTitle: 'Debida diligencia: conocer muy bien a cada parte (KYC / KYB)',
    debida1:
      'Antes de firmar un contrato o activar un plan corporativo, hacemos una verificación exhaustiva:',
    debidaItems: [
      'Revisamos el Certificado de Existencia y Representación Legal de la Cámara de Comercio (o documento equivalente en el exterior).',
      'Verificamos el Registro Único Tributario (RUT) y el NIT directamente con la DIAN.',
      'Cruzamos los datos en listas internacionales vinculantes: ONU, OFAC (Lista Clinton), listas de terrorismo de la Unión Europea e Interpol.',
      'Consultamos antecedentes en la Contraloría, Procuraduría y Policía Nacional.',
    ],
    beneficiarioTitle: 'Identificación de los verdaderos dueños (Beneficiarios finales)',
    beneficiario1:
      'Identificamos a las personas naturales que en última instancia son dueñas del 5% o más de las acciones o que toman las decisiones de control en las empresas clientes.',
    pepTitle: 'Control especial para Personas Expuestas Políticamente (PEP)',
    pep1:
      'Aplicamos controles especiales a Personas Expuestas Políticamente (PEP), como altos funcionarios públicos, magistrados, congresistas o directivos de empresas estatales, así como a sus familiares cercanos.',
    pep2:
      'Cualquier vinculación que involucre a una persona PEP requiere un análisis reforzado y la aprobación previa de la Dirección General de la empresa.',
    operacionesTitle: 'Detección y reporte de movimientos sospechosos (ROS)',
    operaciones1:
      'Si detectamos un pago o solicitud inusual que no cuadra con la actividad normal de la empresa cliente, abrimos un análisis interno inmediato.',
    operaciones2:
      'Si la empresa no logra justificar el origen lícito de la operación, la clasificamos como Operación Sospechosa y la reportamos de forma reservada a la UIAF (Reporte de Operación Sospechosa - ROS), manteniendo la estricta reserva que exige la ley penal.',
    conservacionTitle: 'Guardamos registros por 10 años',
    conservacion1:
      'Guardamos los documentos de verificación, consultas en listas y comprobantes de pago en servidores seguros cifrados por un mínimo de 10 años, listos para cuando las autoridades judiciales o Supersociedades los requieran.',
    canalesTitle: 'Canal seguro para reportar alertas',
    canales1:
      'Si conoces de algún intento de mover fondos ilegales o usar nuestra plataforma para actos ilícitos, reporta con tranquilidad a:',
    canalesCorreo: 'servicio@calculadoradereuso.com',
    canales2:
      'Tratamos cada mensaje con absoluta reserva de tu identidad y bajo amparo legal de confidencialidad.',
  },
  ENG: {
    titulo: 'SAGRILAFT Policy',
    subtitulo: 'Comprehensive Risk Management System for Money Laundering, Terrorist Financing, and Proliferation Financing',
    breadcrumbLabel: 'SAGRILAFT Policy',
    secciones: [
      { id: 'objetivo', label: 'Our objective' },
      { id: 'alcance', label: 'Who it applies to' },
      { id: 'principios', label: 'Our principles' },
      { id: 'identificacion-riesgos', label: 'Risk factors' },
      { id: 'debida-diligencia', label: 'Know your partners' },
      { id: 'beneficiario-final', label: 'Beneficial owners' },
      { id: 'personas-expuestas', label: 'Public figures (PEP)' },
      { id: 'operaciones-inusuales', label: 'Suspicious activity' },
      { id: 'conservacion-documentos', label: 'Record keeping' },
      { id: 'canales-reporte', label: 'Reporting channel' },
    ],
    resumen:
      'At Grupo MLP S.A.S. we safeguard Calculadora de Reúso to guarantee that our services, invoices, and environmental certificates are never used for money laundering or illegal activities. We enforce our SAGRILAFT Policy in strict accordance with Chapter X of the Basic Legal Circular of the Superintendencia de Sociedades and FATF international standards.',
    leeTabien: [
      { href: '/legal/ptee', label: 'Ethics Program (PTEE)' },
      { href: '/legal/terminos', label: 'Terms and Conditions' },
      { href: '/legal/datos', label: 'Data Processing' },
    ],
    intro:
      'Grupo MLP S.A.S., a Colombian company based in Medellín and owner of Calculadora de Reúso (calculadoradereuso.com), created this Risk Management System (SAGRILAFT). Here we explain transparently how we verify fund origins, prevent money laundering, and protect every transaction.',
    objetivoTitle: 'Our objective: protecting our platform against crime',
    objetivo1:
      'We actively protect our platform, contracts, and invoices to prevent anyone from using Calculadora de Reúso to legitimize dirty money or support illegal operations.',
    objetivo2:
      'We strictly apply Chapter X of the Basic Legal Circular of the Superintendencia de Sociedades, FATF 40 Recommendations, and Colombian criminal law.',
    alcanceTitle: 'Who does this policy apply to?',
    alcanceIntro: 'This policy is mandatory for:',
    alcanceItems: [
      'Companies and organizations purchasing corporate plans or services.',
      'Technology, hosting, payment processing, and material suppliers.',
      'Shareholders, executives, employees, and advisors of Grupo MLP S.A.S.',
      'Commercial partners and representatives.',
    ],
    principiosTitle: 'Our prevention principles',
    principiosItems: [
      'Legality first: we verify the identity of every client and the legal origin of their funds.',
      'Zero tolerance: we immediately reject parties with untraceable or suspicious money.',
      'Strict confidentiality: we protect internal compliance alerts with legal secrecy.',
      'Active cooperation: we report suspicious operations to UIAF and judicial authorities when required.',
    ],
    identificacionTitle: 'How do we identify risks?',
    identificacion1:
      'We monitor 4 key factors: (i) Client and vendor reputation, (ii) Services purchased, (iii) Official payment channels used, and (iv) Geographic origin of funds.',
    identificacion2:
      'We investigate unusual split payments, unexpected account transfers, or attempts to fabricate environmental metrics to move unjustified funds.',
    debidaTitle: 'Due diligence: knowing our partners (KYC / KYB)',
    debida1:
      'Before signing agreements or enabling corporate plans, we execute thorough background checks:',
    debidaItems: [
      'We inspect official Chamber of Commerce incorporation certificates.',
      'We validate Tax ID numbers (RUT/NIT) directly with the national tax authority (DIAN).',
      'We screen companies against international watchlists: UN, OFAC (Clinton List), EU terrorism lists, and Interpol.',
      'We check fiscal and criminal background records with national oversight bodies.',
    ],
    beneficiarioTitle: 'Identifying true owners (Ultimate Beneficial Owners)',
    beneficiario1:
      'We identify natural persons who ultimately own 5% or more of client company shares or exercise decisive control over corporate operations.',
    pepTitle: 'Special controls for Politically Exposed Persons (PEP)',
    pep1:
      'We apply enhanced scrutiny to Politically Exposed Persons (PEP), such as senior public officials, magistrates, or state enterprise directors, as well as their immediate family members.',
    pep2:
      'Any partnership involving a PEP requires enhanced due diligence and prior approval from Executive Management.',
    operacionesTitle: 'Detecting and reporting suspicious activity (SAR / ROS)',
    operaciones1:
      'If we notice an unusual transaction that does not fit a client’s normal business profile, we launch an immediate internal review.',
    operaciones2:
      'If the client cannot prove the legal origin of the funds, we classify it as a Suspicious Operation and report it confidentially to UIAF, respecting legal secrecy.',
    conservacionTitle: 'Record retention for 10 years',
    conservacion1:
      'We store due diligence records, screening logs, and payment receipts in secure encrypted servers for at least 10 years.',
    canalesTitle: 'Secure channel for reporting alerts',
    canales1:
      'If you know of any attempt to move illegal funds or misuse our platform, report it safely to:',
    canalesCorreo: 'servicio@calculadoradereuso.com',
    canales2:
      'We process all messages with strict identity protection and legal confidentiality.',
  },
}

const ul: React.CSSProperties = { paddingLeft: 20, marginBottom: 16, listStyleType: 'disc' }
const li: React.CSSProperties = { marginBottom: 8 }

export default function SagrilaftLegalPage() {
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
      subtitulo={t.subtitulo}
      breadcrumbLabel={t.breadcrumbLabel}
      secciones={t.secciones}
      resumen={t.resumen}
      leeTabien={t.leeTabien}
    >
      <p style={{ ...p, fontSize: 16, opacity: 0.9 }}>{t.intro}</p>

      <h2 id="objetivo" style={h2}>{t.objetivoTitle}</h2>
      <p style={p}>{t.objetivo1}</p>
      <p style={p}>{t.objetivo2}</p>

      <h2 id="alcance" style={h2}>{t.alcanceTitle}</h2>
      <p style={p}>{t.alcanceIntro}</p>
      <ul style={ul}>
        {t.alcanceItems.map((item, idx) => (
          <li key={idx} style={li}>{item}</li>
        ))}
      </ul>

      <h2 id="principios" style={h2}>{t.principiosTitle}</h2>
      <ul style={ul}>
        {t.principiosItems.map((item, idx) => (
          <li key={idx} style={li}>{item}</li>
        ))}
      </ul>

      <h2 id="identificacion-riesgos" style={h2}>{t.identificacionTitle}</h2>
      <p style={p}>{t.identificacion1}</p>
      <p style={p}>{t.identificacion2}</p>

      <h2 id="debida-diligencia" style={h2}>{t.debidaTitle}</h2>
      <p style={p}>{t.debida1}</p>
      <ul style={ul}>
        {t.debidaItems.map((item, idx) => (
          <li key={idx} style={li}>{item}</li>
        ))}
      </ul>

      <h2 id="beneficiario-final" style={h2}>{t.beneficiarioTitle}</h2>
      <p style={p}>{t.beneficiario1}</p>

      <h2 id="personas-expuestas" style={h2}>{t.pepTitle}</h2>
      <p style={p}>{t.pep1}</p>
      <p style={p}>{t.pep2}</p>

      <h2 id="operaciones-inusuales" style={h2}>{t.operacionesTitle}</h2>
      <p style={p}>{t.operaciones1}</p>
      <p style={p}>{t.operaciones2}</p>

      <h2 id="conservacion-documentos" style={h2}>{t.conservacionTitle}</h2>
      <p style={p}>{t.conservacion1}</p>

      <h2 id="canales-reporte" style={h2}>{t.canalesTitle}</h2>
      <p style={p}>{t.canales1}</p>
      <p style={p}>
        <a
          href={`mailto:${t.canalesCorreo}`}
          style={{ color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'underline' }}
        >
          {t.canalesCorreo}
        </a>
      </p>
      <p style={p}>{t.canales2}</p>
    </LegalPageLayout>
  )
}
