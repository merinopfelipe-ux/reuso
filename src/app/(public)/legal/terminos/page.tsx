'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: 'Términos y Condiciones de Uso',
    breadcrumbLabel: 'Términos y Condiciones',
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
    ],
    resumen:
      'Al registrarte o usar la Calculadora de Reúso aceptas estas condiciones. Son las reglas del juego: qué puedes hacer, qué no, y qué hacemos nosotros. Lo más importante: no puedes copiar, replicar ni extraer la metodología de cálculo. Tus datos están protegidos por la Ley 1581 (Colombia). Si estás en Europa, también aplica el RGPD; si estás en California, el CCPA.',
    leeTabien: [
      { href: '/legal/privacidad', label: 'Política de Privacidad' },
      { href: '/legal/datos', label: 'Tratamiento de Datos' },
      { href: '/legal/reglamento', label: 'Reglamento de Uso' },
    ],
    intro:
      'Bienvenido a la Calculadora de Reúso, plataforma en línea ubicada en reuso.lurdes.co, propiedad de Grupo MLP S.A.S., empresa constituida bajo las leyes de la República de Colombia, con domicilio en Medellín, Antioquia. Lee estas condiciones antes de usar la plataforma. Al iniciar sesión, registrarte o acceder a la calculadora, confirmas que las aceptas en su totalidad y que celebras un contrato legalmente vinculante con Grupo MLP S.A.S.',
    definicionesTitle: 'Definiciones',
    definiciones: [
      {
        term: 'Servicio:',
        desc: 'la calculadora estima y certifica el CO₂ evitado al mantener objetos en uso en lugar de descartarlos.',
      },
      {
        term: 'Usuario:',
        desc: 'toda persona natural o jurídica que accede o usa la plataforma.',
      },
      {
        term: 'Plataforma:',
        desc: 'el sitio web y sus aplicaciones, bajo la marca Calculadora de Reúso, propiedad de Grupo MLP S.A.S.',
      },
      {
        term: 'Grupo MLP S.A.S.:',
        desc: 'empresa titular y responsable de la plataforma, del tratamiento de datos y de la propiedad intelectual de todos los desarrollos asociados.',
      },
    ],
    aceptacionTitle: 'Aceptación',
    aceptacion:
      'Al usar la calculadora aceptas estos términos y la política de privacidad y tratamiento de datos. Si decides no aceptarlos, debes cesar de inmediato el uso de la plataforma. Estos términos constituyen un contrato legal vinculante entre tú y Grupo MLP S.A.S. También podemos actualizar estos términos y notificarte por correo electrónico o mediante aviso en la plataforma.',
    aceptacionLinkLabel: 'política de privacidad y tratamiento de datos',
    servicioTitle: 'Servicio y funcionamiento',
    servicio1:
      'La Calculadora de Reúso es una plataforma en línea que permite registrar objetos reutilizados y obtener una estimación certificada del CO₂ equivalente evitado. Puedes generar certificados individuales e informes por rango de fecha, cada uno con código de verificación único y QR verificable en reuso.lurdes.co/verificar.',
    servicio2:
      'Las estimaciones se basan en factores de emisión reconocidos internacionalmente y se expresan en kilogramos de CO₂ equivalente (kg CO₂e). Constituyen una herramienta de comunicación ambiental y difieren de una auditoría ambiental oficial.',
    servicio3:
      'El alcance del servicio disponible varía según el plan contratado (Explora, Circular Lab, Impulso Sostenible o Impacto Ilimitado). Para conocer los límites de cada plan, consulta el',
    servicioLinkLabel: 'Reglamento de Uso',
    cuentaTitle: 'Creación de cuenta',
    cuenta1:
      'Puedes registrarte como persona natural o como organización. Las organizaciones designan un administrador que puede invitar a otros usuarios mediante enlace de invitación. El registro requiere nombre completo, correo electrónico y contraseña. Las organizaciones deben proporcionar además razón social y NIT.',
    cuenta2:
      'Eres responsable de la veracidad de la información que suministras y de la confidencialidad de tus credenciales. La plataforma se destina exclusivamente a personas mayores de edad conforme a la legislación colombiana.',
    obligacionesTitle: 'Obligaciones',
    obligaciones: [
      'Mantener la confidencialidad de tus credenciales y abstenerte de compartirlas con terceros.',
      'Proporcionar información veraz, completa y actualizada durante el registro y el uso de la plataforma.',
      'Usar la plataforma conforme a las leyes colombianas vigentes y a los presentes términos.',
      'Informarnos sobre cualquier uso no autorizado de tu cuenta.',
      'Respetar el acuerdo de confidencialidad y abstenerte de replicar o extraer la metodología de cálculo.',
    ],
    obligacionesLinkLabel: 'acuerdo de confidencialidad',
    restriccionesTitle: 'Restricciones de uso',
    restriccionesIntro: 'Queda prohibido:',
    restricciones: [
      'Usar la plataforma para fines ilícitos o contrarios al orden público.',
      'Publicar contenido abusivo, amenazante, obsceno, difamatorio o discriminatorio.',
      'Suplantar la identidad de otra persona, organización o entidad.',
      'Aplicar técnicas de ingeniería inversa, descompilación o extracción de datos sobre el software de la plataforma.',
      'Emplear scripts automatizados, bots o rastreadores para extraer información de la plataforma.',
      'Interferir, obstaculizar o interrumpir el funcionamiento de la plataforma o sus servidores.',
      'Vender, ceder o transferir tu cuenta a terceros.',
    ],
    licenciaTitle: 'Licencia de uso',
    licencia:
      'Te otorgamos una licencia limitada, personal, intransferible y revocable para acceder y usar la plataforma conforme a estos términos. No adquieres ningún derecho sobre el código fuente, diseño, metodología de cálculo, marcas ni ningún otro elemento de la plataforma. La plataforma incorpora software de terceros licenciados a Grupo MLP S.A.S. bajo sus respectivas condiciones.',
    propiedadTitle: 'Propiedad intelectual',
    propiedad:
      'Todos los derechos de propiedad intelectual sobre la plataforma, su diseño, código fuente, metodología de cálculo, factores de emisión, marcas y contenidos pertenecen a Grupo MLP S.A.S. Queda absolutamente prohibida la reproducción, distribución, modificación, extracción o cualquier forma de uso de estos activos sin autorización escrita. Para un detalle completo de las restricciones de uso de la información, consulta el',
    propiedadLinkLabel: 'acuerdo de confidencialidad',
    responsabilidadTitle: 'Limitación de responsabilidad',
    responsabilidad1:
      'No somos responsables por daños directos, indirectos o consecuentes derivados del uso o la imposibilidad de uso de la plataforma. Los valores de CO₂e son estimados con base en factores reconocidos internacionalmente y difieren de una auditoría ambiental oficial. Asumes de forma exclusiva el riesgo de tu uso.',
    responsabilidad2:
      'Tampoco somos responsables del contenido de sitios web de terceros a los que la plataforma pueda enlazar. El acceso a dichos sitios se realiza bajo tu exclusiva responsabilidad.',
    leyTitle: 'Ley aplicable y resolución de controversias',
    ley1:
      'Estos términos se rigen por las leyes de la República de Colombia, incluyendo la Ley 1266 de 2008, la Ley 1480 de 2011 (Estatuto del Consumidor) y la Ley 1581 de 2012 (protección de datos personales). Para usuarios en la Unión Europea, aplica también el Reglamento General de Protección de Datos (RGPD). Para residentes en California (EE. UU.), aplica la California Consumer Privacy Act (CCPA). Ante cualquier controversia, las partes agotan primero una instancia de negociación directa y, de persistir la controversia, se someten al Tribunal de Arbitramento del Centro de Conciliación, Arbitraje y Amigable Composición de Medellín.',
    ley2: 'Ante cualquier duda, comunícate con nosotros en',
    ley3: '. Respondemos en un plazo máximo de 15 días hábiles.',
    transparenciaTexto:
      'Grupo MLP S.A.S. construyó la Calculadora de Reúso mediante modelos de Inteligencia Artificial. Utilizamos herramientas de IA para optimizar el código y procesar los factores de emisión. Dado que estos sistemas pueden generar imprecisiones técnicas, monitoreamos constantemente la plataforma para garantizar la exactitud de los cálculos ambientales.',
    transparenciaLink: 'Lee nuestra política de uso de IA →',
  },
  ENG: {
    titulo: 'Terms and Conditions of Use',
    breadcrumbLabel: 'Terms and Conditions',
    secciones: [
      { id: 'definiciones', label: 'Definitions' },
      { id: 'aceptacion', label: 'Acceptance' },
      { id: 'servicio', label: 'Service' },
      { id: 'cuenta', label: 'Account' },
      { id: 'obligaciones', label: 'Obligations' },
      { id: 'restricciones', label: 'Restrictions' },
      { id: 'licencia', label: 'License' },
      { id: 'propiedad', label: 'Intellectual property' },
      { id: 'responsabilidad', label: 'Liability' },
      { id: 'ley', label: 'Applicable law' },
    ],
    resumen:
      'By signing up or using the Reuse Calculator you accept these terms. These are the rules: what you can do, what you cannot, and what we do. Most importantly: you may not copy, replicate or extract the calculation methodology. Your data is protected by Colombia\'s Law 1581. If you are in Europe, the GDPR also applies; if you are in California, the CCPA applies.',
    leeTabien: [
      { href: '/legal/privacidad', label: 'Privacy Policy' },
      { href: '/legal/datos', label: 'Data Processing' },
      { href: '/legal/reglamento', label: 'Usage Rules' },
    ],
    intro:
      'Welcome to the Reuse Calculator, an online platform at reuso.lurdes.co, owned by Grupo MLP S.A.S., a company incorporated under the laws of the Republic of Colombia, with registered office in Medellín, Antioquia. Please read these terms before using the platform. By logging in, registering or accessing the calculator, you confirm your full acceptance and enter into a legally binding contract with Grupo MLP S.A.S.',
    definicionesTitle: 'Definitions',
    definiciones: [
      {
        term: 'Service:',
        desc: 'the calculator estimates and certifies the CO₂ avoided by keeping objects in use instead of discarding them.',
      },
      {
        term: 'User:',
        desc: 'any natural or legal person who accesses or uses the platform.',
      },
      {
        term: 'Platform:',
        desc: 'the website and its applications, under the Reuse Calculator brand, owned by Grupo MLP S.A.S.',
      },
      {
        term: 'Grupo MLP S.A.S.:',
        desc: 'the company that owns and is responsible for the platform, data processing and intellectual property of all associated developments.',
      },
    ],
    aceptacionTitle: 'Acceptance',
    aceptacion:
      'By using the calculator you accept these terms and the privacy and data processing policy. If you choose not to accept them, you must immediately stop using the platform. These terms constitute a legally binding contract between you and Grupo MLP S.A.S. We may also update these terms and notify you by email or via a notice on the platform.',
    aceptacionLinkLabel: 'privacy and data processing policy',
    servicioTitle: 'Service and operation',
    servicio1:
      'The Reuse Calculator is an online platform that lets you register reused objects and obtain a certified estimate of the CO₂ equivalent avoided. You can generate individual certificates and date-range reports, each with a unique verification code and a QR verifiable at reuso.lurdes.co/verificar.',
    servicio2:
      'Estimates are based on internationally recognized emission factors and are expressed in kilograms of CO₂ equivalent (kg CO₂e). They are an environmental communication tool and differ from an official environmental audit.',
    servicio3:
      'The scope of the available service varies according to the contracted plan (Explora, Circular Lab, Impulso Sostenible or Impacto Ilimitado). To learn the limits of each plan, see the',
    servicioLinkLabel: 'Usage Rules',
    cuentaTitle: 'Account creation',
    cuenta1:
      'You can register as an individual or as an organization. Organizations designate an administrator who can invite other users via an invitation link. Registration requires full name, email address and password. Organizations must also provide legal name and tax ID.',
    cuenta2:
      'You are responsible for the accuracy of the information you provide and for keeping your credentials confidential. The platform is intended exclusively for adults in accordance with Colombian law.',
    obligacionesTitle: 'Obligations',
    obligaciones: [
      'Keep your credentials confidential and refrain from sharing them with third parties.',
      'Provide accurate, complete and up-to-date information during registration and use of the platform.',
      'Use the platform in accordance with current Colombian law and these terms.',
      'Notify us of any unauthorized use of your account.',
      'Respect the confidentiality agreement and refrain from replicating or extracting the calculation methodology.',
    ],
    obligacionesLinkLabel: 'confidentiality agreement',
    restriccionesTitle: 'Usage restrictions',
    restriccionesIntro: 'The following are prohibited:',
    restricciones: [
      'Using the platform for unlawful purposes or contrary to public order.',
      'Publishing abusive, threatening, obscene, defamatory or discriminatory content.',
      'Impersonating another person, organization or entity.',
      'Applying reverse engineering, decompilation or data extraction techniques to the platform software.',
      'Using automated scripts, bots or crawlers to extract information from the platform.',
      'Interfering with, hindering or disrupting the operation of the platform or its servers.',
      'Selling, assigning or transferring your account to third parties.',
    ],
    licenciaTitle: 'License of use',
    licencia:
      'We grant you a limited, personal, non-transferable and revocable license to access and use the platform in accordance with these terms. You do not acquire any rights to the source code, design, calculation methodology, trademarks or any other element of the platform. The platform incorporates third-party software licensed to Grupo MLP S.A.S. under their respective terms.',
    propiedadTitle: 'Intellectual property',
    propiedad:
      'All intellectual property rights in the platform, its design, source code, calculation methodology, emission factors, trademarks and content belong to Grupo MLP S.A.S. Reproduction, distribution, modification, extraction or any form of use of these assets without written authorization is strictly prohibited. For full details of the information use restrictions, see the',
    propiedadLinkLabel: 'confidentiality agreement',
    responsabilidadTitle: 'Limitation of liability',
    responsabilidad1:
      'We are not liable for direct, indirect or consequential damages arising from the use or inability to use the platform. CO₂e values are estimated based on internationally recognized factors and differ from an official environmental audit. You assume exclusive risk of your use.',
    responsabilidad2:
      'We are also not responsible for the content of third-party websites to which the platform may link. Access to such sites is at your sole risk.',
    leyTitle: 'Applicable law and dispute resolution',
    ley1:
      'These terms are governed by the laws of the Republic of Colombia, including Law 1266 of 2008, Law 1480 of 2011 (Consumer Statute) and Law 1581 of 2012 (personal data protection). For users in the European Union, the General Data Protection Regulation (GDPR) also applies. For residents of California (USA), the California Consumer Privacy Act (CCPA) applies. In the event of any dispute, the parties shall first exhaust a direct negotiation stage and, if the dispute persists, submit to the Arbitration Tribunal of the Conciliation, Arbitration and Friendly Composition Center of Medellín.',
    ley2: 'For any questions, contact us at',
    ley3: '. We respond within a maximum of 15 business days.',
    transparenciaTexto:
      'Grupo MLP S.A.S. built the Reuse Calculator using Artificial Intelligence models. We use AI tools to optimize code and process emission factors. Since these systems may generate technical inaccuracies, we constantly monitor the platform to ensure the accuracy of environmental calculations.',
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

export default function TerminosPage() {
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

      <h2 id="definiciones" style={h2}>{t.definicionesTitle}</h2>
      <ul style={ul}>
        {t.definiciones.map((d) => (
          <li key={d.term} style={li}>
            <strong>{d.term}</strong> {d.desc}
          </li>
        ))}
      </ul>

      <h2 id="aceptacion" style={h2}>{t.aceptacionTitle}</h2>
      <p style={p}>
        {lang === 'ES' ? (
          <>
            Al usar la calculadora aceptas estos términos y la{' '}
            <Link href="/legal/privacidad" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
              {t.aceptacionLinkLabel}
            </Link>
            . Si decides no aceptarlos, debes cesar de inmediato el uso de la plataforma. Estos términos constituyen un contrato legal vinculante entre tú y Grupo MLP S.A.S. También podemos actualizar estos términos y notificarte por correo electrónico o mediante aviso en la plataforma.
          </>
        ) : (
          <>
            By using the calculator you accept these terms and the{' '}
            <Link href="/legal/privacidad" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
              {t.aceptacionLinkLabel}
            </Link>
            . If you choose not to accept them, you must immediately stop using the platform. These terms constitute a legally binding contract between you and Grupo MLP S.A.S. We may also update these terms and notify you by email or via a notice on the platform.
          </>
        )}
      </p>

      <h2 id="servicio" style={h2}>{t.servicioTitle}</h2>
      <p style={p}>{t.servicio1}</p>
      <p style={p}>{t.servicio2}</p>
      <p style={p}>
        {t.servicio3}{' '}
        <Link href="/legal/reglamento" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.servicioLinkLabel}
        </Link>
        .
      </p>

      <h2 id="cuenta" style={h2}>{t.cuentaTitle}</h2>
      <p style={p}>{t.cuenta1}</p>
      <p style={p}>{t.cuenta2}</p>

      <h2 id="obligaciones" style={h2}>{t.obligacionesTitle}</h2>
      <ul style={ul}>
        {t.obligaciones.map((item, i) => (
          <li key={i} style={li}>
            {i === 4 ? (
              <>
                {lang === 'ES'
                  ? 'Respetar el '
                  : 'Respect the '}
                <Link
                  href="/legal/confidencialidad"
                  style={{ color: 'var(--color-brand)', fontWeight: 600 }}
                >
                  {t.obligacionesLinkLabel}
                </Link>
                {lang === 'ES'
                  ? ' y abstenerte de replicar o extraer la metodología de cálculo.'
                  : ' and refrain from replicating or extracting the calculation methodology.'}
              </>
            ) : (
              item
            )}
          </li>
        ))}
      </ul>

      <h2 id="restricciones" style={h2}>{t.restriccionesTitle}</h2>
      <p style={p}>{t.restriccionesIntro}</p>
      <ul style={ul}>
        {t.restricciones.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>

      <h2 id="licencia" style={h2}>{t.licenciaTitle}</h2>
      <p style={p}>{t.licencia}</p>

      <h2 id="propiedad" style={h2}>{t.propiedadTitle}</h2>
      <p style={p}>
        {t.propiedad}{' '}
        <Link
          href="/legal/confidencialidad"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          {t.propiedadLinkLabel}
        </Link>
        .
      </p>

      <h2 id="responsabilidad" style={h2}>{t.responsabilidadTitle}</h2>
      <p style={p}>{t.responsabilidad1}</p>
      <p style={p}>{t.responsabilidad2}</p>

      <h2 id="ley" style={h2}>{t.leyTitle}</h2>
      <p style={p}>{t.ley1}</p>
      <p style={p}>
        {t.ley2}{' '}
        <a
          href="mailto:servicio@lurdes.co"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          servicio@lurdes.co
        </a>
        {t.ley3}
      </p>
    </LegalPageLayout>
  )
}
