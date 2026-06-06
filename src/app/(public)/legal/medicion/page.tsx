'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: '¿Cómo medimos tu impacto?',
    breadcrumb: 'Metodología de cálculo',
    resumen: 'Calculamos el CO₂ equivalente que evitas cada vez que reutilizas un objeto en lugar de comprar uno nuevo. Usamos factores de emisión reconocidos internacionalmente. Los cálculos son inmutables y verificables con un código QR único. Esta metodología es propiedad intelectual de Grupo MLP S.A.S. y no puedes reproducirla sin autorización.',
    leeTabien: [
      { href: '/legal/reglamento', label: 'Reglamento de Uso' },
      { href: '/legal/confidencialidad', label: 'Confidencialidad' },
      { href: '/legal/terminos', label: 'Términos y Condiciones' },
    ],
    secciones: [
      { id: 'que-medimos', label: '¿Qué medimos?' },
      { id: 'como-calculamos', label: '¿Cómo calculamos?' },
      { id: 'seguridad', label: 'Seguridad digital' },
      { id: 'por-que-importa', label: '¿Por qué importa?' },
      { id: 'limitaciones', label: 'Limitaciones' },
    ],
    ipNoticePre: 'El contenido de esta página, la metodología y los factores de emisión empleados constituyen propiedad intelectual de Grupo MLP S.A.S. Queda prohibida su reproducción, extracción o uso sin autorización expresa y escrita. Para más detalles, consulta el',
    ipNoticeLink: 'acuerdo de confidencialidad',
    s1Title: '¿Qué medimos?',
    s1p1: 'Medimos el CO₂ equivalente (CO₂e) que se evita cuando un objeto, como ropa, mueble, electrónico o herramienta, continúa en uso en lugar de ser descartado y reemplazado por uno nuevo.',
    s1p2: 'Cada vez que registras un objeto, la plataforma estima cuánto CO₂ habrías emitido si hubieras adquirido ese mismo objeto nuevo. Esa diferencia constituye tu impacto positivo y el valor que certificamos.',
    s2Title: '¿Cómo calculamos?',
    s2p1: 'Para cada categoría de objeto (ropa, madera, metal, plástico, electrónicos, entre otras) empleamos factores de emisión basados en estudios de ciclo de vida (ACV) reconocidos internacionalmente. Estos factores expresan el CO₂e por unidad de peso (kg).',
    s2p2: 'El cálculo toma como dato de entrada la categoría y el peso del objeto registrado, y aplica el factor correspondiente para obtener el CO₂e evitado. Los factores se fijan en el momento del cálculo y permanecen inmutables, de modo que los certificados históricos permanecen siempre reproducibles y verificables.',
    s2p3: 'Los resultados se expresan en kilogramos de CO₂ equivalente (kg CO₂e). En grandes volúmenes también se presentan en toneladas (t CO₂e).',
    s3Title: 'Seguridad y Sellos Digitales',
    s3p1: 'La plataforma asigna un sello digital único (Hash criptográfico) a cada registro. Este sello funciona como una huella dactilar que identifica el cálculo y lo conecta matemáticamente con el registro anterior, creando una cadena de seguridad que protege toda la información.',
    s3p2: 'El sistema garantiza que los resultados de los certificados permanezcan intactos. Si alguien intentara modificar un dato en los registros, la cadena de seguridad se rompe de inmediato, invalidando la verificación pública de los documentos.',
    s4Title: '¿Por qué importa?',
    s4p1: 'La economía circular propone que los objetos mantengan su valor el mayor tiempo posible. Cada objeto que reutilizas evita la extracción de materias primas, el consumo de energía del proceso productivo y las emisiones del transporte asociado a fabricar uno nuevo.',
    s4p2: 'Al certificar ese impacto, te entregamos un lenguaje común para comunicarlo: en reuniones de equipo, en reportes de sostenibilidad o al compartir tu compromiso con el planeta.',
    s5Title: 'Limitaciones del estimado',
    s5Intro: 'Somos transparentes sobre lo que el cálculo todavía no incluye:',
    s5Items: [
      'Los factores de emisión son promedios sectoriales y difieren de los valores específicos de cada fabricante.',
      'El cálculo excluye el impacto del transporte o almacenamiento del objeto reutilizado.',
      'Los certificados difieren de créditos de carbono certificados por organismos internacionales de verificación.',
      'La metodología puede actualizarse a medida que se publiquen nuevos estudios. Los cálculos históricos conservan siempre el factor original.',
    ],
    s5CierrePre: 'Los certificados de la calculadora son una herramienta de comunicación y educación ambiental. Para conocer las condiciones completas de uso, consulta el',
    s5CierreLink: 'reglamento de uso',
  },
  ENG: {
    titulo: 'How we measure your impact',
    breadcrumb: 'Calculation methodology',
    resumen: 'We calculate the equivalent CO₂ you avoid every time you reuse an object instead of buying a new one. We use internationally recognized emission factors. Calculations are immutable and verifiable with a unique QR code. This methodology is the intellectual property of Grupo MLP S.A.S. and you cannot reproduce it without authorization.',
    leeTabien: [
      { href: '/legal/reglamento', label: 'Usage Rules' },
      { href: '/legal/confidencialidad', label: 'Confidentiality' },
      { href: '/legal/terminos', label: 'Terms and Conditions' },
    ],
    secciones: [
      { id: 'que-medimos', label: 'What we measure' },
      { id: 'como-calculamos', label: 'How we calculate' },
      { id: 'seguridad', label: 'Digital security' },
      { id: 'por-que-importa', label: 'Why it matters' },
      { id: 'limitaciones', label: 'Limitations' },
    ],
    ipNoticePre: 'The content of this page, the methodology and the emission factors used constitute the intellectual property of Grupo MLP S.A.S. Its reproduction, extraction or use without express written authorization is prohibited. For more details, see the',
    ipNoticeLink: 'non-disclosure agreement',
    s1Title: 'What we measure',
    s1p1: 'We measure the equivalent CO₂ (CO₂e) avoided when an object, such as clothing, furniture, electronics, or tools, continues to be used instead of being discarded and replaced with a new one.',
    s1p2: 'Every time you register an object, the platform estimates how much CO₂ you would have emitted if you had acquired that same object new. This difference constitutes your positive impact and the value we certify.',
    s2Title: 'How we calculate',
    s2p1: 'For each category of object (clothing, wood, metal, plastic, electronics, among others), we employ emission factors based on internationally recognized life cycle studies (LCA). These factors express CO₂e per unit of weight (kg).',
    s2p2: 'The calculation takes the registered object’s category and weight as input and applies the corresponding factor to obtain the avoided CO₂e. Factors are locked at the time of calculation and remain immutable, so historical certificates are always reproducible and verifiable.',
    s2p3: 'Results are expressed in kilograms of CO₂ equivalent (kg CO₂e). In large volumes they are also presented in metric tons (t CO₂e).',
    s3Title: 'Security and Digital Stamps',
    s3p1: 'The platform assigns a unique digital stamp (cryptographic hash) to each record. This stamp works like a fingerprint that identifies the calculation and mathematically connects it with the previous record, creating a security chain that protects all information.',
    s3p2: 'The system ensures that certificate results remain intact. If someone tries to modify a data point in the records, the security chain breaks immediately, invalidating the public verification of the documents.',
    s4Title: 'Why it matters',
    s4p1: 'The circular economy proposes that objects maintain their value for as long as possible. Each object you reuse avoids raw material extraction, production energy consumption, and transport emissions associated with manufacturing a new one.',
    s4p2: 'By certifying this impact, we provide you with a common language to communicate it: in team meetings, in sustainability reports, or when sharing your commitment to the planet.',
    s5Title: 'Limitations of the estimate',
    s5Intro: 'We are transparent about what the calculation does not yet include:',
    s5Items: [
      'Emission factors are sector averages and differ from each manufacturer’s specific values.',
      'The calculation excludes the transport or storage impact of the reused object.',
      'Certificates differ from carbon credits certified by international verification bodies.',
      'The methodology may be updated as new studies are published. Historical calculations always retain the original factor.',
    ],
    s5CierrePre: 'The calculator certificates are an environmental communication and education tool. To read the full terms of use, see the',
    s5CierreLink: 'usage rules',
  }
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

export default function MedicionPage() {
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
      leeTabien={t.leeTabien}
    >
      {/* IP notice */}
      <p
        style={{
          ...p,
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          marginBottom: 32,
        }}
      >
        {t.ipNoticePre}{' '}
        <Link
          href="/legal/confidencialidad"
          style={{ color: 'var(--color-brand)', fontWeight: 600 }}
        >
          {t.ipNoticeLink}
        </Link>
        .
      </p>

      <h2 id="que-medimos" style={{ ...h2, marginTop: 0 }}>{t.s1Title}</h2>
      <p style={p}>{t.s1p1}</p>
      <p style={p}>{t.s1p2}</p>

      <h2 id="como-calculamos" style={h2}>{t.s2Title}</h2>
      <p style={p}>{t.s2p1}</p>
      <p style={p}>{t.s2p2}</p>
      <p style={p}>{t.s2p3}</p>

      <h2 id="seguridad" style={h2}>{t.s3Title}</h2>
      <p style={p}>{t.s3p1}</p>
      <p style={p}>{t.s3p2}</p>

      <h2 id="por-que-importa" style={h2}>{t.s4Title}</h2>
      <p style={p}>{t.s4p1}</p>
      <p style={p}>{t.s4p2}</p>

      <h2 id="limitaciones" style={h2}>{t.s5Title}</h2>
      <p style={p}>{t.s5Intro}</p>
      <ul style={ul}>
        {t.s5Items.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>
      <p style={p}>
        {t.s5CierrePre}{' '}
        <Link href="/legal/reglamento" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.s5CierreLink}
        </Link>
        .
      </p>
    </LegalPageLayout>
  )
}
