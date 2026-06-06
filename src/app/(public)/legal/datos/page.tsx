'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: 'Tratamiento de Datos Personales',
    breadcrumbLabel: 'Tratamiento de Datos',
    secciones: [
      { id: 'objetivos', label: 'Objetivos' },
      { id: 'alcance', label: 'Alcance' },
      { id: 'destinatarios', label: 'Destinatarios' },
      { id: 'definiciones', label: 'Definiciones' },
      { id: 'finalidades', label: 'Finalidades' },
      { id: 'derechos', label: 'Derechos del titular' },
      { id: 'menores', label: 'Menores de edad' },
      { id: 'peticiones', label: 'Peticiones y reclamos' },
      { id: 'vigencia', label: 'Vigencia' },
    ],
    resumen:
      'Tratamos tus datos para operar la plataforma y prestarte el servicio. No los vendemos ni los compartimos con terceros sin tu autorización. Tienes derecho a conocer, actualizar, rectificar y eliminar tu información en cualquier momento (Ley 1581, Colombia). Si estás en la Unión Europea, también aplica el RGPD y puedes ejercer todos los derechos que este te otorga. Si resides en California (EE. UU.), aplica la CCPA.',
    leeTabien: [
      { href: '/legal/privacidad', label: 'Política de Privacidad' },
      { href: '/legal/terminos', label: 'Términos y Condiciones' },
      { href: '/legal/cookies', label: 'Política de Cookies' },
    ],
    intro:
      'En desarrollo de la Ley 1581 de 2012 y el Decreto 1377 de 2013, Grupo MLP S.A.S., sociedad domiciliada en Medellín, Colombia, reglamenta el tratamiento de los datos personales de sus clientes, usuarios, proveedores y aliados. Al entregar cualquier tipo de información personal, aceptas que Grupo MLP S.A.S. la usa de acuerdo con esta política y solo para los propósitos aquí establecidos. Para usuarios en la Unión Europea, aplica también el Reglamento General de Protección de Datos (RGPD).',
    objetivosTitle: 'Objetivos',
    objetivos:
      'Grupo MLP S.A.S. establece los criterios para el tratamiento de datos personales, que comprende toda operación sobre datos: recolección, almacenamiento, uso, circulación y supresión. La empresa puede actuar como responsable o encargado del tratamiento según el caso.',
    alcanceTitle: 'Alcance',
    alcance:
      'Esta política aplica a los datos de personas naturales almacenados en las bases de datos administradas por Grupo MLP S.A.S. e incluye todas las áreas de la empresa que involucren datos de carácter personal. Grupo MLP S.A.S. ofrece servicios de certificación de impacto ambiental por reúso de objetos a través de la plataforma Calculadora de Reúso.',
    destinatariosTitle: 'Destinatarios',
    destinatariosIntro: 'Esta política aplica a quienes mantienen cualquier relación con Grupo MLP S.A.S.:',
    destinatarios: [
      'Clientes y organizaciones',
      'Empleados de las organizaciones',
      'Usuarios registrados en la plataforma',
      'Aliados, contratistas y proveedores',
      'Clientes potenciales y terceros interesados',
    ],
    definicionesTitle: 'Definiciones',
    definiciones: [
      {
        term: 'Autorización:',
        desc: 'consentimiento previo, expreso e informado del titular para el tratamiento de sus datos.',
      },
      {
        term: 'Base de datos:',
        desc: 'listado organizado con los datos personales objeto de tratamiento.',
      },
      {
        term: 'Dato personal:',
        desc: 'cualquier información vinculada a una persona natural determinada o determinable.',
      },
      {
        term: 'Dato sensible:',
        desc: 'dato que afecta la intimidad del titular o cuyo uso indebido puede generar discriminación (origen racial, orientación política, salud, vida sexual, datos biométricos, entre otros).',
      },
      {
        term: 'Habeas data:',
        desc: 'derecho fundamental de toda persona a conocer, actualizar, rectificar y cancelar la información personal que recibe tratamiento.',
      },
      {
        term: 'Titular del dato:',
        desc: 'persona natural cuyos datos son objeto de tratamiento.',
      },
      {
        term: 'Responsable del tratamiento:',
        desc: 'Grupo MLP S.A.S., quien decide sobre la base de datos y el tratamiento.',
      },
      {
        term: 'Encargado del tratamiento:',
        desc: 'persona natural o jurídica que realiza el tratamiento de datos por cuenta del responsable.',
      },
      {
        term: 'Transferencia:',
        desc: 'envío de datos a un tercero dentro o fuera del territorio nacional para su tratamiento.',
      },
    ],
    finalidadesTitle: 'Finalidades del tratamiento',
    finalidadesIntro:
      'Tratamos los datos para las siguientes finalidades, estrictamente relacionadas con el objeto social:',
    finalidades: [
      'Celebración y ejecución de contratos de servicio.',
      'Creación y gestión de accesos en la plataforma.',
      'Elaboración y envío de facturas y documentos comerciales.',
      'Realización de encuestas y seguimiento de calidad del servicio.',
      'Envío de comunicaciones relacionadas con el servicio contratado.',
      'Actividades de mercadeo y comunicación institucional.',
      'Envío de información a entidades gubernamentales o judiciales cuando la ley lo exija.',
      'Prevención de fraudes y actividades de seguridad.',
      'Capacitación y entrenamiento de usuarios.',
    ],
    finalidadesCierre:
      'No usamos los datos para propósitos diferentes a los aquí establecidos sin contar con tu autorización expresa o sin que medie una excepción legal.',
    derechosTitle: 'Derechos del titular',
    derechosIntro: 'Como titular de datos personales, tienes los siguientes derechos:',
    derechos: [
      {
        term: 'Habeas data:',
        desc: 'conocer, actualizar, rectificar y excluir tu información de nuestras bases de datos.',
      },
      {
        term: 'Revocatoria del consentimiento:',
        desc: 'revocar la autorización otorgada para un tratamiento específico, salvo excepciones legales o contractuales.',
      },
      {
        term: 'Oposición:',
        desc: 'oponerte al tratamiento de tus datos cuando no exista obligación legal que lo impida.',
      },
      {
        term: 'Presentar quejas y reclamos:',
        desc: 'ante Grupo MLP S.A.S. o ante la Superintendencia de Industria y Comercio.',
      },
      {
        term: 'Solicitar prueba de autorización:',
        desc: 'pedir constancia del consentimiento otorgado para el tratamiento.',
      },
    ],
    derechosRGPD:
      'Para usuarios en la Unión Europea, aplican adicionalmente los derechos de portabilidad, supresión ("derecho al olvido") y limitación del tratamiento que establece el RGPD. Para residentes en California (EE. UU.), la CCPA otorga derechos adicionales de acceso, eliminación y no venta de datos personales.',
    menoresTitle: 'Menores de edad',
    menores:
      'Prohibimos el tratamiento de datos personales de menores de edad, salvo los datos de naturaleza pública. Los derechos de los menores los ejercen sus representantes legales. Si la plataforma detecta que un menor de edad se ha registrado, cancela su cuenta y elimina su información de manera inmediata.',
    peticionesTitle: 'Peticiones, quejas y reclamos',
    peticiones1:
      'Tienes derecho a realizar de forma gratuita consultas, solicitudes y reclamos sobre el tratamiento de tus datos. La solicitud debe incluir nombre completo, descripción de la consulta, dirección, teléfono y correo electrónico.',
    peticiones2:
      'Respondemos en un plazo máximo de 10 días hábiles contados desde la fecha de radicación. Cuando no sea posible responder en ese plazo, te informamos los motivos de la demora y la fecha en que atenderemos la solicitud, que no puede superar los cinco días hábiles adicionales.',
    peticiones3a: 'Envía tu solicitud a:',
    peticiones3b: '. También puedes usar el formulario de',
    peticiones3c: 'consultas legales',
    peticiones3d: '.',
    vigenciaTitle: 'Vigencia',
    vigencia:
      'Esta política entra en vigencia desde su publicación. Las bases de datos tienen una vigencia de 10 años, prorrogables por períodos iguales. Podemos revisar y modificar esta política en cualquier momento. Los cambios rigen desde su publicación en la plataforma.',
    transparenciaTexto:
      'En el Tratamiento de Datos Personales garantizamos la máxima protección de tu privacidad. Los modelos de Inteligencia Artificial que operan en la plataforma NO utilizan tus datos personales para entrenarse ni los transfieren a sistemas externos. Procesamos tu información exclusivamente bajo tu autorización y para los fines técnicos del servicio.',
    transparenciaLink: 'Lee nuestra política de uso de IA →',
  },
  ENG: {
    titulo: 'Personal Data Processing',
    breadcrumbLabel: 'Data Processing',
    secciones: [
      { id: 'objetivos', label: 'Objectives' },
      { id: 'alcance', label: 'Scope' },
      { id: 'destinatarios', label: 'Recipients' },
      { id: 'definiciones', label: 'Definitions' },
      { id: 'finalidades', label: 'Purposes' },
      { id: 'derechos', label: 'Data subject rights' },
      { id: 'menores', label: 'Minors' },
      { id: 'peticiones', label: 'Requests and complaints' },
      { id: 'vigencia', label: 'Validity' },
    ],
    resumen:
      "We process your data to operate the platform and provide the service. We do not sell it or share it with third parties without your authorization. You have the right to access, update, rectify and delete your information at any time (Law 1581, Colombia). If you are in the European Union, the GDPR also applies and you may exercise all the rights it grants you. If you reside in California (USA), the CCPA applies.",
    leeTabien: [
      { href: '/legal/privacidad', label: 'Privacy Policy' },
      { href: '/legal/terminos', label: 'Terms and Conditions' },
      { href: '/legal/cookies', label: 'Cookie Policy' },
    ],
    intro:
      'In accordance with Law 1581 of 2012 and Decree 1377 of 2013, Grupo MLP S.A.S., a company domiciled in Medellín, Colombia, regulates the processing of personal data of its customers, users, suppliers and partners. By providing any personal information, you accept that Grupo MLP S.A.S. uses it in accordance with this policy and only for the purposes set out herein. For users in the European Union, the General Data Protection Regulation (GDPR) also applies.',
    objetivosTitle: 'Objectives',
    objetivos:
      'Grupo MLP S.A.S. establishes the criteria for personal data processing, which covers all data operations: collection, storage, use, circulation and deletion. The company may act as data controller or data processor depending on the case.',
    alcanceTitle: 'Scope',
    alcance:
      'This policy applies to personal data stored in the databases managed by Grupo MLP S.A.S. and covers all areas of the company that involve personal data. Grupo MLP S.A.S. offers environmental impact certification services for object reuse through the Reuse Calculator platform.',
    destinatariosTitle: 'Recipients',
    destinatariosIntro: 'This policy applies to anyone who has any relationship with Grupo MLP S.A.S.:',
    destinatarios: [
      'Customers and organizations',
      'Organization employees',
      'Users registered on the platform',
      'Partners, contractors and suppliers',
      'Prospective customers and interested third parties',
    ],
    definicionesTitle: 'Definitions',
    definiciones: [
      {
        term: 'Authorization:',
        desc: 'prior, express and informed consent of the data subject for the processing of their data.',
      },
      {
        term: 'Database:',
        desc: 'organized listing of personal data subject to processing.',
      },
      {
        term: 'Personal data:',
        desc: 'any information linked to a specific or identifiable natural person.',
      },
      {
        term: 'Sensitive data:',
        desc: 'data that affects the privacy of the data subject or whose improper use may generate discrimination (racial origin, political orientation, health, sexual life, biometric data, among others).',
      },
      {
        term: 'Habeas data:',
        desc: 'fundamental right of every person to access, update, rectify and cancel the personal information being processed.',
      },
      {
        term: 'Data subject:',
        desc: 'natural person whose data is being processed.',
      },
      {
        term: 'Data controller:',
        desc: 'Grupo MLP S.A.S., who decides on the database and the processing.',
      },
      {
        term: 'Data processor:',
        desc: 'natural or legal person who processes data on behalf of the controller.',
      },
      {
        term: 'Transfer:',
        desc: 'sending data to a third party within or outside the national territory for processing.',
      },
    ],
    finalidadesTitle: 'Purposes of processing',
    finalidadesIntro:
      'We process data for the following purposes, strictly related to our business activities:',
    finalidades: [
      'Entering into and performing service contracts.',
      'Creating and managing platform access.',
      'Preparing and sending invoices and commercial documents.',
      'Conducting surveys and monitoring service quality.',
      'Sending communications related to the contracted service.',
      'Marketing and institutional communication activities.',
      'Sending information to governmental or judicial entities when required by law.',
      'Fraud prevention and security activities.',
      'User training and onboarding.',
    ],
    finalidadesCierre:
      'We do not use data for purposes other than those stated here without your express authorization or a legal exception.',
    derechosTitle: 'Data subject rights',
    derechosIntro: 'As a data subject, you have the following rights:',
    derechos: [
      {
        term: 'Habeas data:',
        desc: 'access, update, rectify and remove your information from our databases.',
      },
      {
        term: 'Withdrawal of consent:',
        desc: 'revoke the authorization granted for a specific processing purpose, except for legal or contractual exceptions.',
      },
      {
        term: 'Objection:',
        desc: 'object to the processing of your data when there is no legal obligation preventing it.',
      },
      {
        term: 'Submit complaints:',
        desc: 'to Grupo MLP S.A.S. or to the Colombian Superintendence of Industry and Commerce.',
      },
      {
        term: 'Request proof of authorization:',
        desc: 'ask for evidence of the consent granted for the processing.',
      },
    ],
    derechosRGPD:
      'For users in the European Union, the GDPR additionally grants the rights of data portability, erasure ("right to be forgotten") and restriction of processing. For residents of California (USA), the CCPA grants additional rights of access, deletion and the right to opt out of the sale of personal data.',
    menoresTitle: 'Minors',
    menores:
      'We prohibit the processing of personal data of minors, except for data of a public nature. The rights of minors are exercised by their legal representatives. If the platform detects that a minor has registered, it cancels their account and immediately deletes their information.',
    peticionesTitle: 'Requests, complaints and claims',
    peticiones1:
      'You have the right to submit free-of-charge queries, requests and complaints about the processing of your data. The request must include your full name, a description of the query, your address, phone number and email address.',
    peticiones2:
      'We respond within a maximum of 10 business days from the date of receipt. When it is not possible to respond within that period, we will inform you of the reasons for the delay and the date on which we will address the request, which may not exceed five additional business days.',
    peticiones3a: 'Send your request to:',
    peticiones3b: '. You can also use the',
    peticiones3c: 'legal queries form',
    peticiones3d: '.',
    vigenciaTitle: 'Validity',
    vigencia:
      'This policy enters into force upon publication. Databases have a validity of 10 years, renewable for equal periods. We may review and modify this policy at any time. Changes take effect upon publication on the platform.',
    transparenciaTexto:
      'In Personal Data Processing we guarantee maximum protection of your privacy. The Artificial Intelligence models operating on the platform do NOT use your personal data for training purposes, nor do they transfer it to external systems. We process your information exclusively with your authorization and for the technical purposes of the service.',
    transparenciaLink: 'Read our AI use policy →',
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

export default function DatosPage() {
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
      breadcrumbLabel={t.breadcrumbLabel}
      secciones={t.secciones}
      transparenciaTexto={
        <p style={{ margin: 0 }}>
          {t.transparenciaTexto}{' '}
          <Link href="/legal/ia" style={{ color: '#59A6E4', textDecoration: 'underline', fontWeight: 600 }}>
            {t.transparenciaLink}
          </Link>
        </p>
      }
      resumen={t.resumen}
      leeTabien={t.leeTabien}
    >
      <p style={p}>{t.intro}</p>

      <h2 id="objetivos" style={h2}>{t.objetivosTitle}</h2>
      <p style={p}>{t.objetivos}</p>

      <h2 id="alcance" style={h2}>{t.alcanceTitle}</h2>
      <p style={p}>{t.alcance}</p>

      <h2 id="destinatarios" style={h2}>{t.destinatariosTitle}</h2>
      <p style={p}>{t.destinatariosIntro}</p>
      <ul style={ul}>
        {t.destinatarios.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>

      <h2 id="definiciones" style={h2}>{t.definicionesTitle}</h2>
      <ul style={ul}>
        {t.definiciones.map((d) => (
          <li key={d.term} style={li}>
            <strong>{d.term}</strong> {d.desc}
          </li>
        ))}
      </ul>

      <h2 id="finalidades" style={h2}>{t.finalidadesTitle}</h2>
      <p style={p}>{t.finalidadesIntro}</p>
      <ul style={ul}>
        {t.finalidades.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>
      <p style={p}>{t.finalidadesCierre}</p>

      <h2 id="derechos" style={h2}>{t.derechosTitle}</h2>
      <p style={p}>{t.derechosIntro}</p>
      <ul style={ul}>
        {t.derechos.map((d) => (
          <li key={d.term} style={li}>
            <strong>{d.term}</strong> {d.desc}
          </li>
        ))}
      </ul>
      <p style={p}>{t.derechosRGPD}</p>

      <h2 id="menores" style={h2}>{t.menoresTitle}</h2>
      <p style={p}>{t.menores}</p>

      <h2 id="peticiones" style={h2}>{t.peticionesTitle}</h2>
      <p style={p}>{t.peticiones1}</p>
      <p style={p}>{t.peticiones2}</p>
      <p style={p}>
        {t.peticiones3a}{' '}
        <a href="mailto:servicio@lurdes.co" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          servicio@lurdes.co
        </a>
        {t.peticiones3b}{' '}
        <Link href="/legal/dudas" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.peticiones3c}
        </Link>
        {t.peticiones3d}
      </p>

      <h2 id="vigencia" style={h2}>{t.vigenciaTitle}</h2>
      <p style={p}>{t.vigencia}</p>
    </LegalPageLayout>
  )
}
