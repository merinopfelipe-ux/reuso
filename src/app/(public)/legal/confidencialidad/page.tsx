'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: 'Acuerdo de Confidencialidad',
    breadcrumb: 'Confidencialidad',
    secciones: [
      { id: 'objeto', label: 'Objeto' },
      { id: 'definicion', label: 'Información confidencial' },
      { id: 'obligaciones', label: 'Obligaciones' },
      { id: 'exclusiones', label: 'Exclusiones' },
      { id: 'titularidad', label: 'Titularidad' },
      { id: 'uso', label: 'Uso de la información' },
      { id: 'vigencia', label: 'Vigencia' },
      { id: 'ley', label: 'Ley aplicable' },
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
  },
  ENG: {
    titulo: 'Non-Disclosure Agreement',
    breadcrumb: 'Confidentiality',
    secciones: [
      { id: 'objeto', label: 'Purpose' },
      { id: 'definicion', label: 'Confidential information' },
      { id: 'obligaciones', label: 'Obligations' },
      { id: 'exclusiones', label: 'Exclusions' },
      { id: 'titularidad', label: 'Ownership' },
      { id: 'uso', label: 'Use of information' },
      { id: 'vigencia', label: 'Term' },
      { id: 'ley', label: 'Applicable law' },
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
  },
}

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

export default function ConfidencialidadPage() {
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
      transparenciaTexto={
        <p style={{ margin: 0 }}>
          {t.transparencia.texto}{' '}
          <Link href="/legal/ia" style={{ color: '#59A6E4', textDecoration: 'underline', fontWeight: 600 }}>
            {t.transparencia.link}
          </Link>
        </p>
      }
      leeTabien={t.leeTabien}
    >
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
