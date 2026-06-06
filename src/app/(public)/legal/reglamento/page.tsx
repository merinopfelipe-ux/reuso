'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: 'Reglamento de Uso',
    breadcrumbLabel: 'Reglamento de Uso',
    resumen:
      'Al usar la calculadora aceptas este reglamento. Lo más importante: solo puedes usar la plataforma para calcular y certificar el CO₂ que evitas al reutilizar objetos. No puedes copiar, replicar ni extraer la metodología. Tus datos están protegidos. Si incumples, Grupo MLP S.A.S. puede suspender tu acceso de forma inmediata.',
    secciones: [
      { id: 'definiciones', label: 'Definiciones' },
      { id: 'aceptacion', label: 'Aceptación' },
      { id: 'servicio', label: 'Servicio' },
      { id: 'cuenta', label: 'Cuenta' },
      { id: 'obligaciones', label: 'Obligaciones' },
      { id: 'restricciones', label: 'Restricciones' },
      { id: 'licencia', label: 'Licencia' },
      { id: 'propiedad', label: 'Propiedad intelectual' },
      { id: 'responsabilidad', label: 'Responsabilidad' },
      { id: 'ley', label: 'Ley aplicable' },
      { id: 'seguridad-inalterable', label: 'Seguridad Inalterable' },
    ],
    leeTabien: [
      { href: '/legal/terminos', label: 'Términos y Condiciones' },
      { href: '/legal/confidencialidad', label: 'Confidencialidad' },
      { href: '/legal/privacidad', label: 'Política de Privacidad' },
    ],
    intro:
      'La Calculadora de Reúso, ubicada en reuso.lurdes.co, es propiedad de Grupo MLP S.A.S., empresa constituida bajo las leyes de la República de Colombia, con domicilio en Medellín, Antioquia. Al registrarte o acceder a la plataforma confirmas que aceptas este reglamento en su totalidad y que celebras un contrato legalmente vinculante con Grupo MLP S.A.S.',
    h_definiciones: 'Definiciones',
    def_servicio_label: 'Servicio:',
    def_servicio:
      'la calculadora estima y certifica el CO₂ evitado al mantener objetos en uso en lugar de descartarlos.',
    def_usuario_label: 'Usuario:',
    def_usuario: 'toda persona natural o jurídica que accede o usa la plataforma.',
    def_plataforma_label: 'Plataforma:',
    def_plataforma:
      'el sitio web y sus aplicaciones, bajo la marca Calculadora de Reúso, propiedad de Grupo MLP S.A.S.',
    def_grupo_label: 'Grupo MLP S.A.S.:',
    def_grupo:
      'empresa titular y responsable de la plataforma, del tratamiento de datos y de la propiedad intelectual de todos los desarrollos asociados.',
    h_aceptacion: 'Aceptación',
    aceptacion_texto: 'Al usar la calculadora aceptas este reglamento, los',
    aceptacion_terminos: 'términos y condiciones',
    aceptacion_y1: ', la',
    aceptacion_privacidad: 'política de privacidad',
    aceptacion_y2: 'y el',
    aceptacion_confidencialidad: 'acuerdo de confidencialidad',
    aceptacion_fin:
      '. Si decides no aceptarlos, debes cesar de inmediato el uso de la plataforma.',
    h_servicio: 'Servicio y funcionamiento',
    servicio_p1:
      'La Calculadora de Reúso es una plataforma en línea que te permite registrar objetos reutilizados y obtener una estimación certificada del CO₂ equivalente evitado. Puedes generar certificados individuales e informes por rango de fecha, cada uno con código de verificación único y QR verificable en la plataforma.',
    servicio_p2:
      'Las estimaciones se basan en factores de emisión reconocidos internacionalmente y se expresan en kilogramos de CO₂ equivalente (kg CO₂e). Constituyen una herramienta de comunicación ambiental y difieren de una auditoría ambiental oficial.',
    h_cuenta: 'Creación de cuenta',
    cuenta_p:
      'Puedes registrarte como persona natural o como organización. Las organizaciones designan un administrador que puede invitar a otros usuarios mediante enlace de invitación. Asumes la responsabilidad sobre la veracidad de la información suministrada y sobre la confidencialidad de tus credenciales.',
    h_obligaciones: 'Obligaciones',
    oblig_1:
      'Mantener la confidencialidad de tus credenciales y abstenerte de compartirlas con terceros.',
    oblig_2:
      'Proporcionar información veraz, completa y actualizada durante el registro y el uso de la plataforma.',
    oblig_3: 'Usar la plataforma conforme a las leyes colombianas vigentes y a este reglamento.',
    oblig_4: 'Informar a Grupo MLP S.A.S. sobre cualquier uso no autorizado de tu cuenta.',
    oblig_5_pre: 'Respetar el',
    oblig_5_link: 'acuerdo de confidencialidad',
    oblig_5_post: 'y abstenerte de replicar o extraer la metodología de cálculo.',
    h_restricciones: 'Restricciones de uso',
    restricciones_intro: 'Te comprometes a abstenerte de:',
    restriccion_1: 'Utilizar la plataforma para fines ilícitos o contrarios al orden público.',
    restriccion_2: 'Publicar contenido abusivo, amenazante, obsceno, difamatorio o discriminatorio.',
    restriccion_3: 'Suplantar la identidad de otra persona, organización o entidad.',
    restriccion_4:
      'Aplicar técnicas de ingeniería inversa, descompilación o extracción de datos sobre el software de la plataforma.',
    restriccion_5:
      'Emplear scripts automatizados, bots o rastreadores para extraer información de la plataforma.',
    restriccion_6: 'Interferir, obstaculizar o interrumpir el funcionamiento de la plataforma o sus servidores.',
    restriccion_7: 'Vender, ceder o transferir tu cuenta a terceros.',
    restriccion_8:
      'Realizar capturas de pantalla masivas, enlazamiento (linking) o reproducción de contenidos sin autorización escrita de Grupo MLP S.A.S.',
    h_licencia: 'Licencia de uso',
    licencia_p:
      'Grupo MLP S.A.S. te otorga una licencia limitada, personal, intransferible y revocable para acceder y usar la plataforma conforme a este reglamento. No adquieres ningún derecho sobre el código fuente, diseño, metodología de cálculo, marcas ni ningún otro elemento de la plataforma.',
    h_propiedad: 'Propiedad intelectual',
    propiedad_p_pre:
      'Todos los derechos de propiedad intelectual sobre la plataforma, su diseño, código fuente, metodología de cálculo, factores de emisión, marcas y contenidos pertenecen a Grupo MLP S.A.S. Queda absolutamente prohibida su reproducción, distribución, modificación o extracción sin autorización escrita. Para conocer el alcance completo de las restricciones de confidencialidad, consulta el',
    propiedad_link: 'acuerdo de confidencialidad',
    propiedad_p_post: '.',
    h_responsabilidad: 'Limitación de responsabilidad',
    responsabilidad_p:
      'Grupo MLP S.A.S. declina toda responsabilidad por daños directos, indirectos o consecuentes derivados del uso o la imposibilidad de uso de la plataforma. Los valores de CO₂e son estimados con base en factores reconocidos internacionalmente y difieren de una auditoría ambiental oficial. Asumes de forma exclusiva el riesgo de tu uso.',
    h_ley: 'Ley aplicable y resolución de controversias',
    ley_p1:
      'Este reglamento se rige por las leyes de la República de Colombia. Cumple también con el Reglamento General de Protección de Datos (RGPD) de la Unión Europea, la Ley de Privacidad del Consumidor de California (CCPA) y la Ley 1581 de 2012 de Colombia. Ante cualquier controversia, las partes agotan primero una instancia de negociación directa y, de persistir la controversia, se someten al Tribunal de Arbitramento del Centro de Conciliación, Arbitraje y Amigable Composición de Medellín.',
    ley_p2_pre: 'Ante cualquier duda, comunícate con Grupo MLP S.A.S. en',
    ley_p2_o: 'o usa el formulario de',
    ley_p2_link: 'consultas legales',
    ley_p2_post: '.',
    h_seguridad: 'Seguridad Inalterable y Protección de Datos',
    seguridad_p1_pre: 'Grupo MLP S.A.S. protege los datos de la plataforma con una tecnología de',
    seguridad_notaria: 'Notaría Digital Permanente',
    seguridad_p1_post:
      '. El sistema crea un sello de seguridad único para cada cálculo y lo conecta con el registro inmediatamente anterior. Si alguien intentara alterar un registro del pasado, el sello se rompe de inmediato y el sistema alerta sobre la falta de integridad.',
    seguridad_p2:
      'Para los planes Impulso Sostenible e Impacto Ilimitado, la plataforma ofrece un respaldo adicional en redes de registro públicas externas (Blockchain). Este proceso funciona como un sello notarial externo que demuestra la existencia de los ahorros ambientales de forma independiente y permanente, incluso por fuera de la plataforma.',
    transparencia: {
      texto: 'La plataforma usa inteligencia artificial como asistente en la construcción del código, la estructuración de los factores de cálculo y la generación de certificados. La IA no toma decisiones autónomas, no entrena con tus datos y todo output pasa por revisión humana antes de producción.',
      link: 'Lee nuestra política de uso de IA →',
    },
  },
  ENG: {
    titulo: 'Terms of Use',
    breadcrumbLabel: 'Terms of Use',
    resumen:
      'By using the calculator you accept these terms. Most importantly: you may only use the platform to calculate and certify the CO₂ you avoid by reusing objects. You may not copy, replicate, or extract the methodology. Your data is protected. If you violate these terms, Grupo MLP S.A.S. may suspend your access immediately.',
    secciones: [
      { id: 'definiciones', label: 'Definitions' },
      { id: 'aceptacion', label: 'Acceptance' },
      { id: 'servicio', label: 'Service' },
      { id: 'cuenta', label: 'Account' },
      { id: 'obligaciones', label: 'Obligations' },
      { id: 'restricciones', label: 'Restrictions' },
      { id: 'licencia', label: 'License' },
      { id: 'propiedad', label: 'Intellectual Property' },
      { id: 'responsabilidad', label: 'Liability' },
      { id: 'ley', label: 'Applicable Law' },
      { id: 'seguridad-inalterable', label: 'Immutable Security' },
    ],
    leeTabien: [
      { href: '/legal/terminos', label: 'Terms & Conditions' },
      { href: '/legal/confidencialidad', label: 'Confidentiality' },
      { href: '/legal/privacidad', label: 'Privacy Policy' },
    ],
    intro:
      'The Reuse Calculator, located at reuso.lurdes.co, is owned by Grupo MLP S.A.S., a company incorporated under the laws of the Republic of Colombia, headquartered in Medellín, Antioquia. By registering or accessing the platform you confirm that you accept these terms in full and that you enter into a legally binding contract with Grupo MLP S.A.S.',
    h_definiciones: 'Definitions',
    def_servicio_label: 'Service:',
    def_servicio:
      'the calculator estimates and certifies the CO₂ avoided by keeping objects in use instead of discarding them.',
    def_usuario_label: 'User:',
    def_usuario: 'any natural or legal person who accesses or uses the platform.',
    def_plataforma_label: 'Platform:',
    def_plataforma:
      'the website and its applications, under the Reuse Calculator brand, owned by Grupo MLP S.A.S.',
    def_grupo_label: 'Grupo MLP S.A.S.:',
    def_grupo:
      'the company that owns and is responsible for the platform, data processing, and intellectual property of all associated developments.',
    h_aceptacion: 'Acceptance',
    aceptacion_texto: 'By using the calculator you accept these terms, the',
    aceptacion_terminos: 'terms and conditions',
    aceptacion_y1: ', the',
    aceptacion_privacidad: 'privacy policy',
    aceptacion_y2: 'and the',
    aceptacion_confidencialidad: 'confidentiality agreement',
    aceptacion_fin:
      '. If you choose not to accept them, you must immediately stop using the platform.',
    h_servicio: 'Service and operation',
    servicio_p1:
      'The Reuse Calculator is an online platform that lets you register reused objects and obtain a certified estimate of the equivalent CO₂ avoided. You can generate individual certificates and date-range reports, each with a unique verification code and a QR verifiable on the platform.',
    servicio_p2:
      'Estimates are based on internationally recognised emission factors and expressed in kilograms of CO₂ equivalent (kg CO₂e). They serve as an environmental communication tool and differ from an official environmental audit.',
    h_cuenta: 'Account creation',
    cuenta_p:
      'You can register as an individual or as an organisation. Organisations designate an administrator who can invite other users via an invitation link. You are responsible for the accuracy of the information you provide and for keeping your credentials confidential.',
    h_obligaciones: 'User obligations',
    oblig_1: 'Keep your credentials confidential and refrain from sharing them with third parties.',
    oblig_2:
      'Provide truthful, complete, and up-to-date information during registration and platform use.',
    oblig_3: 'Use the platform in accordance with applicable Colombian law and these terms.',
    oblig_4: 'Notify Grupo MLP S.A.S. of any unauthorised use of your account.',
    oblig_5_pre: 'Respect the',
    oblig_5_link: 'confidentiality agreement',
    oblig_5_post: 'and refrain from replicating or extracting the calculation methodology.',
    h_restricciones: 'Use restrictions',
    restricciones_intro: 'You agree to refrain from:',
    restriccion_1: 'Using the platform for unlawful purposes or purposes contrary to public order.',
    restriccion_2: 'Publishing abusive, threatening, obscene, defamatory, or discriminatory content.',
    restriccion_3: 'Impersonating another person, organisation, or entity.',
    restriccion_4:
      'Applying reverse engineering, decompilation, or data extraction techniques to the platform software.',
    restriccion_5:
      'Using automated scripts, bots, or crawlers to extract information from the platform.',
    restriccion_6: 'Interfering with, hindering, or disrupting the operation of the platform or its servers.',
    restriccion_7: 'Selling, assigning, or transferring your account to third parties.',
    restriccion_8:
      'Taking mass screenshots, linking, or reproducing content without written authorisation from Grupo MLP S.A.S.',
    h_licencia: 'Use license',
    licencia_p:
      'Grupo MLP S.A.S. grants you a limited, personal, non-transferable, and revocable licence to access and use the platform in accordance with these terms. You do not acquire any rights over the source code, design, calculation methodology, trademarks, or any other element of the platform.',
    h_propiedad: 'Intellectual property',
    propiedad_p_pre:
      'All intellectual property rights over the platform, its design, source code, calculation methodology, emission factors, trademarks, and content belong to Grupo MLP S.A.S. Reproduction, distribution, modification, or extraction without written authorisation is strictly prohibited. To learn the full scope of confidentiality restrictions, see the',
    propiedad_link: 'confidentiality agreement',
    propiedad_p_post: '.',
    h_responsabilidad: 'Limitation of liability',
    responsabilidad_p:
      'Grupo MLP S.A.S. disclaims all liability for direct, indirect, or consequential damages arising from the use or inability to use the platform. CO₂e values are estimates based on internationally recognised factors and differ from an official environmental audit. You assume sole risk of your use.',
    h_ley: 'Applicable law and dispute resolution',
    ley_p1:
      'These terms are governed by the laws of the Republic of Colombia. They also comply with the General Data Protection Regulation (GDPR) of the European Union, the California Consumer Privacy Act (CCPA), and Law 1581 of 2012 of Colombia. In the event of a dispute, the parties shall first attempt direct negotiation and, if unresolved, submit to the Arbitration Tribunal of the Medellín Conciliation, Arbitration and Mediation Centre.',
    ley_p2_pre: 'For any questions, contact Grupo MLP S.A.S. at',
    ley_p2_o: 'or use the',
    ley_p2_link: 'legal enquiry form',
    ley_p2_post: '.',
    h_seguridad: 'Immutable Security and Data Protection',
    seguridad_p1_pre: 'Grupo MLP S.A.S. protects platform data with a',
    seguridad_notaria: 'Permanent Digital Notary',
    seguridad_p1_post:
      ' technology. The system creates a unique security seal for each calculation and links it to the immediately preceding record. If anyone attempted to alter a past record, the seal would break immediately and the system would flag the integrity failure.',
    seguridad_p2:
      'For the Impulso Sostenible and Impacto Ilimitado plans, the platform offers additional backup on external public ledger networks (Blockchain). This process acts as an external notarial seal that proves the existence of environmental savings independently and permanently, even outside the platform.',
    transparencia: {
      texto: 'The platform uses artificial intelligence as an assistant in code development, structuring calculation factors and generating certificates. AI makes no autonomous decisions, does not train on your data, and all output goes through human review before production.',
      link: 'Read our AI usage policy →',
    },
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

export default function ReglamentoPage() {
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

  const transparenciaTexto = (
    <>
      {t.transparencia.texto}{' '}
      <Link href="/legal/ia" style={{ color: '#59A6E4', textDecoration: 'underline', fontWeight: 600 }}>
        {t.transparencia.link}
      </Link>
    </>
  )

  return (
    <LegalPageLayout
      titulo={t.titulo}
      breadcrumbLabel={t.breadcrumbLabel}
      secciones={t.secciones}
      resumen={t.resumen}
      leeTabien={t.leeTabien}
      transparenciaTexto={transparenciaTexto}
    >
      <p style={p}>{t.intro}</p>

      <h2 id="definiciones" style={h2}>{t.h_definiciones}</h2>
      <ul style={ul}>
        <li style={li}>
          <strong>{t.def_servicio_label}</strong> {t.def_servicio}
        </li>
        <li style={li}>
          <strong>{t.def_usuario_label}</strong> {t.def_usuario}
        </li>
        <li style={li}>
          <strong>{t.def_plataforma_label}</strong> {t.def_plataforma}
        </li>
        <li style={li}>
          <strong>{t.def_grupo_label}</strong> {t.def_grupo}
        </li>
      </ul>

      <h2 id="aceptacion" style={h2}>{t.h_aceptacion}</h2>
      <p style={p}>
        {t.aceptacion_texto}{' '}
        <Link href="/legal/terminos" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.aceptacion_terminos}
        </Link>
        {t.aceptacion_y1}{' '}
        <Link href="/legal/privacidad" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.aceptacion_privacidad}
        </Link>{' '}
        {t.aceptacion_y2}{' '}
        <Link
          href="/legal/confidencialidad"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          {t.aceptacion_confidencialidad}
        </Link>
        {t.aceptacion_fin}
      </p>

      <h2 id="servicio" style={h2}>{t.h_servicio}</h2>
      <p style={p}>{t.servicio_p1}</p>
      <p style={p}>{t.servicio_p2}</p>

      <h2 id="cuenta" style={h2}>{t.h_cuenta}</h2>
      <p style={p}>{t.cuenta_p}</p>

      <h2 id="obligaciones" style={h2}>{t.h_obligaciones}</h2>
      <ul style={ul}>
        <li style={li}>{t.oblig_1}</li>
        <li style={li}>{t.oblig_2}</li>
        <li style={li}>{t.oblig_3}</li>
        <li style={li}>{t.oblig_4}</li>
        <li style={li}>
          {t.oblig_5_pre}{' '}
          <Link
            href="/legal/confidencialidad"
            style={{ color: 'var(--color-brand)', fontWeight: 600 }}
          >
            {t.oblig_5_link}
          </Link>{' '}
          {t.oblig_5_post}
        </li>
      </ul>

      <h2 id="restricciones" style={h2}>{t.h_restricciones}</h2>
      <p style={p}>{t.restricciones_intro}</p>
      <ul style={ul}>
        <li style={li}>{t.restriccion_1}</li>
        <li style={li}>{t.restriccion_2}</li>
        <li style={li}>{t.restriccion_3}</li>
        <li style={li}>{t.restriccion_4}</li>
        <li style={li}>{t.restriccion_5}</li>
        <li style={li}>{t.restriccion_6}</li>
        <li style={li}>{t.restriccion_7}</li>
        <li style={li}>{t.restriccion_8}</li>
      </ul>

      <h2 id="licencia" style={h2}>{t.h_licencia}</h2>
      <p style={p}>{t.licencia_p}</p>

      <h2 id="propiedad" style={h2}>{t.h_propiedad}</h2>
      <p style={p}>
        {t.propiedad_p_pre}{' '}
        <Link
          href="/legal/confidencialidad"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          {t.propiedad_link}
        </Link>
        {t.propiedad_p_post}
      </p>

      <h2 id="responsabilidad" style={h2}>{t.h_responsabilidad}</h2>
      <p style={p}>{t.responsabilidad_p}</p>

      <h2 id="ley" style={h2}>{t.h_ley}</h2>
      <p style={p}>{t.ley_p1}</p>
      <p style={p}>
        {t.ley_p2_pre}{' '}
        <a
          href="mailto:servicio@lurdes.co"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          servicio@lurdes.co
        </a>{' '}
        {t.ley_p2_o}{' '}
        <Link href="/legal/dudas" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.ley_p2_link}
        </Link>
        {t.ley_p2_post}
      </p>

      <h2 id="seguridad-inalterable" style={h2}>{t.h_seguridad}</h2>
      <p style={p}>
        {t.seguridad_p1_pre}{' '}
        <strong>{t.seguridad_notaria}</strong>
        {t.seguridad_p1_post}
      </p>
      <p style={p}>{t.seguridad_p2}</p>
    </LegalPageLayout>
  )
}
