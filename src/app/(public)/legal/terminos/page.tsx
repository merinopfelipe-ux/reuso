'use client'

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
      'Al registrarte o usar la Calculadora de Reúso aceptas estas condiciones. Aquí definimos las reglas de uso y nuestras políticas. Lo más importante es que no debes copiar, replicar ni extraer la metodología de cálculo. Protegemos tus datos bajo la Ley 1581 (Colombia). Si resides en Europa, aplicamos el RGPD. Si resides en California, aplicamos la CCPA.',
    leeTabien: [
      { href: '/legal/privacidad', label: 'Política de Privacidad' },
      { href: '/legal/datos', label: 'Tratamiento de Datos' },
      { href: '/legal/reglamento', label: 'Reglamento de Uso' },
    ],
    intro:
      'Bienvenido a la Calculadora de Reúso. La plataforma está en calculadoradereuso.com y pertenece a Grupo MLP S.A.S., una empresa constituida en Colombia con sede en Medellín, Antioquia. Lee estas condiciones antes de usar la plataforma. Al iniciar sesión, registrarte o entrar a la calculadora, aceptas estas condiciones y firmas un contrato legal con Grupo MLP S.A.S.',
    definicionesTitle: 'Definiciones',
    definiciones: [
      {
        term: 'Servicio:',
        desc: 'la calculadora estima y mide el CO₂ evitado al mantener objetos en uso en lugar de descartarlos.',
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
      'Al usar la calculadora, aceptas estos términos y la política de privacidad. Si no estás de acuerdo, deja de usar la plataforma. Estos términos son un contrato legal entre tú y Grupo MLP S.A.S. Podemos actualizarlos y te avisaremos por correo o con un aviso dentro de la plataforma.',
    aceptacionLinkLabel: 'política de privacidad y tratamiento de datos',
    servicioTitle: 'Servicio y funcionamiento',
    servicio1:
      'La Calculadora de Reúso te ayuda a registrar los objetos que reutilizas y a calcular cuánto CO₂ equivalente evitas. Puedes generar informes por rango de fechas. Cada informe tiene un código único y un QR para verificarlo en calculadoradereuso.com/verificar.',
    servicio2:
      'Los cálculos usan factores de emisión reconocidos internacionalmente y se expresan en kilogramos de CO₂ equivalente (kg CO₂e). Son una herramienta de comunicación ambiental. No reemplazan una auditoría ambiental oficial.',
    servicio3:
      'El alcance del servicio disponible varía según el plan contratado (Explora, Circular Lab, Impulso Sostenible o Impacto Ilimitado). Para conocer los límites de cada plan, consulta el',
    servicioLinkLabel: 'Reglamento de Uso',
    servicio4Title: 'Independencia y fuentes:',
    servicio4:
      'Los cálculos se basan en metodologías reconocidas a nivel mundial. La calculadora es independiente: no tiene afiliación, patrocinio ni aval oficial de las fuentes que usa.',
    servicio5Title: 'Carácter estimativo:',
    servicio5:
      'Los puntajes e indicadores son aproximaciones matemáticas con base en los datos que ingresas. Te ayudan a evaluar tu desempeño circular a lo largo de varios ciclos de uso. No son certificaciones ambientales ni auditorías.',
    cuentaTitle: 'Creación de cuenta',
    cuenta1:
      'Puedes registrarte como persona natural o como organización. Si eres organización, tu administrador puede invitar a otras personas con un enlace. Para registrarte necesitas tu nombre completo, correo electrónico y una contraseña. Las organizaciones también deben dar su razón social y su NIT.',
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
      'Te damos una licencia limitada, personal, intransferible y revocable para usar la plataforma según estos términos. No obtienes derechos sobre el código fuente, el diseño, la metodología de cálculo, las marcas ni otros elementos de la plataforma. La plataforma usa software y activos visuales de terceros, licenciados a Grupo MLP S.A.S. según sus propias condiciones.',
    licenciaActivosTexto: 'Para conocer el detalle y alcance de las licencias comerciales aplicables a fotografía, iconografía y activos visuales, consulta',
    licenciaActivosLink: 'Bancos de Imágenes y Licencias de Activos',
    propiedadTitle: 'Propiedad intelectual',
    propiedad:
      'Grupo MLP S.A.S. es dueño de todos los derechos sobre la plataforma: su diseño, código fuente, metodología de cálculo, factores de emisión, marcas y contenidos. No puedes reproducir, distribuir, modificar ni extraer estos elementos sin autorización escrita. Para conocer las restricciones de uso de la información, consulta el',
    propiedadLinkLabel: 'acuerdo de confidencialidad',
    responsabilidadTitle: 'Limitación de responsabilidad',
    responsabilidad1:
      'No somos responsables de daños directos, indirectos o consecuentes que surjan por usar la plataforma o por no poder usarla. Los valores de CO₂e son estimados con factores reconocidos internacionalmente y no reemplazan una auditoría ambiental oficial. Tú asumes el riesgo de tu uso.',
    responsabilidad2:
      'Tampoco somos responsables del contenido de sitios web de terceros a los que la plataforma pueda enlazar. El acceso a dichos sitios se realiza bajo tu exclusiva responsabilidad.',
    leyTitle: 'Ley aplicable y resolución de controversias',
    ley1:
      'Estos términos se rigen por las leyes de Colombia, incluidas la Ley 1266 de 2008, la Ley 1480 de 2011 (Estatuto del Consumidor) y la Ley 1581 de 2012 (protección de datos personales). Si estás en la Unión Europea, también aplica el Reglamento General de Protección de Datos (RGPD). Si resides en California (EE. UU.), aplica la California Consumer Privacy Act (CCPA). Si surge una diferencia, primero intentamos resolverla de forma directa. Si no se resuelve, el caso va al Tribunal de Arbitramento del Centro de Conciliación, Arbitraje y Amigable Composición de Medellín.',
    ley2: 'Ante cualquier duda, comunícate con nosotros en',
    ley3: '. Respondemos en un plazo de 10 a 15 días hábiles.',
    transparenciaTexto:
      'Construimos la Calculadora de Reúso con ayuda de herramientas de inteligencia artificial, para optimizar el código y procesar los factores de emisión. Estos sistemas pueden cometer errores técnicos. Por eso revisamos la plataforma con frecuencia para mejorar la calidad de los cálculos ambientales.',
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
      'By registering or using the Reuse Calculator you accept these conditions. Here we define the terms of use and our policies. Most importantly, you must not copy, replicate, or extract the calculation methodology. We protect your data under Law 1581 (Colombia). If you reside in Europe, the GDPR applies. If you reside in California, the CCPA applies.',
    leeTabien: [
      { href: '/legal/privacidad', label: 'Privacy Policy' },
      { href: '/legal/datos', label: 'Data Processing' },
      { href: '/legal/reglamento', label: 'Usage Rules' },
    ],
    intro:
      'Welcome to the Reuse Calculator, an online platform at calculadoradereuso.com, owned by Grupo MLP S.A.S., a company incorporated under the laws of the Republic of Colombia, with registered office in Medellín, Antioquia. Please read these terms before using the platform. By logging in, registering or accessing the calculator, you confirm your full acceptance and enter into a legally binding contract with Grupo MLP S.A.S.',
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
      'The Reuse Calculator is an online platform that lets you register reused objects and obtain a verified estimate of the CO₂ equivalent avoided. You can generate date-range reports, each with a unique verification code and a QR verifiable at calculadoradereuso.com/verificar.',
    servicio2:
      'Estimates are based on internationally recognized emission factors and are expressed in kilograms of CO₂ equivalent (kg CO₂e). They are an environmental communication tool and differ from an official environmental audit.',
    servicio3:
      'The scope of the available service varies according to the contracted plan (Explora, Circular Lab, Impulso Sostenible or Impacto Ilimitado). To learn the limits of each plan, see the',
    servicioLinkLabel: 'Usage Rules',
    servicio4Title: 'Independence and sources:',
    servicio4:
      'The calculations are developments based on reliable global methodologies. The calculator is completely autonomous and has no affiliation, sponsorship or official endorsement from the sources.',
    servicio5Title: 'Estimative nature:',
    servicio5:
      'The scores and indicators are mathematical approximations based on the entered data. They serve as a guide to evaluate circular performance across multiple reuse cycles and are not guaranteed as exact figures, environmental certifications or binding audits.',
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
      'We grant you a limited, personal, non-transferable and revocable license to access and use the platform in accordance with these terms. You do not acquire any rights to the source code, design, calculation methodology, trademarks or any other element of the platform. The platform incorporates third-party software and visual assets licensed to Grupo MLP S.A.S. under their respective terms.',
    licenciaActivosTexto: 'To review the details and commercial scope of licenses for stock photography, iconography, and visual assets, see',
    licenciaActivosLink: 'Image Banks & Asset Licenses',
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
    ley3: '. We respond within 10 to 15 business days.',
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
    // Español siempre (Regla de Oro CLAUDE.md) — bug de idioma corregido 2026-09-27
  const lang = ('ES' as string) as 'ES' | 'ENG' // valor fijo, tipado como union para no romper comparaciones existentes

  const t = T[lang]

  return (
    <LegalPageLayout
      titulo={t.titulo}
      breadcrumbLabel={t.breadcrumbLabel}
      secciones={t.secciones}
      transparenciaTexto={
        <div style={{ margin: 0 }}>
          <p style={{ margin: 0, marginBottom: 8 }}>{t.transparenciaTexto}</p>
          <div>
            <Link href="/legal/ia" style={{ color: '#59A6E4', textDecoration: 'underline', fontWeight: 600, display: 'inline-block' }}>
              {t.transparenciaLink}
            </Link>
          </div>
        </div>
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
        <strong>{t.servicio4Title}</strong> {t.servicio4}
      </p>
      <p style={p}>
        <strong>{t.servicio5Title}</strong> {t.servicio5}
      </p>
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
      <p style={p}>
        {t.licenciaActivosTexto}{' '}
        <Link
          href="/legal/activos-y-licencias"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          {t.licenciaActivosLink}
        </Link>
        .
      </p>

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
          href="mailto:innovacion@lurdes.co"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          innovacion@lurdes.co
        </a>
        {t.ley3}
      </p>
    </LegalPageLayout>
  )
}
