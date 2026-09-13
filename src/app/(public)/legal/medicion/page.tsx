'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: '¿Cómo medimos tu impacto?',
    breadcrumb: 'Metodología de cálculo',
    resumen: 'Medimos una estimación rigurosa del impacto ambiental que evitas al reutilizar, restaurar o prolongar la vida de los materiales, en lugar de extraer materias primas nuevas. Calculamos dos indicadores de forma independiente: las emisiones de CO₂ equivalente y la huella hídrica. Los resultados son inmutables y verificables con un sello digital único. Esta metodología es propiedad intelectual de Grupo MLP S.A.S. y no puedes reproducirla sin autorización.',
    leeTabien: [
      { href: '/legal/ia', label: 'Uso de IA', descripcion: 'Transparencia sobre modelos y procesamiento de datos.' },
      { href: '/legal/reglamento', label: 'Reglamento de Uso', descripcion: 'Términos de servicio y normas de la plataforma.' },
      { href: '/legal/confidencialidad', label: 'Confidencialidad', descripcion: 'Protección de fórmulas y metodologías.' },
    ],
    secciones: [
      { id: 'que-medimos', label: '¿Qué medimos?' },
      { id: 'como-calculamos', label: '¿Cómo lo calculamos?' },
      { id: 'algoritmo-cr', label: 'El Algoritmo CR' },
      { id: 'equivalencias', label: 'Nuestras equivalencias' },
      { id: 'seguridad', label: 'Seguridad digital' },
      { id: 'por-que-importa', label: '¿Por qué importa?' },
      { id: 'limitaciones', label: 'Limitaciones' },
      { id: 'ia-transparencia', label: 'IA y transparencia' },
    ],
    ipNoticePre: 'El contenido de esta página, nuestra matriz de cálculo y la metodología empleada constituyen propiedad intelectual y "know-how" exclusivo de Grupo MLP S.A.S. Queda prohibida su reproducción, extracción o uso sin autorización expresa y escrita. Para más detalles, consulta el',
    ipNoticeLink: 'acuerdo de confidencialidad',
    s1Title: '¿Qué medimos?',
    s1p1: 'Medimos una estimación rigurosa del impacto ambiental que evitas cuando decides reutilizar, restaurar o prolongar la vida de los materiales, en lugar de extraer materias primas nuevas. Específicamente, calculamos dos grandes indicadores de forma independiente: las emisiones de Dióxido de Carbono equivalente (CO₂ eq) y la huella hídrica (litros de agua ahorrados).',
    s1p2: 'Esa diferencia entre hacer algo desde cero y aprovechar lo existente constituye tu impacto positivo.',
    s2Title: '¿Cómo lo calculamos?',
    s2p1: 'Hemos desarrollado una matriz de datos interna basada en referencias y estudios de Análisis de Ciclo de Vida (ACV) reconocidos internacionalmente.',
    s2p2: 'El cálculo toma como dato de entrada la categoría y el peso (kg) del material principal de tu proyecto. Luego, el sistema cruza esta información con nuestra matriz de factores de emisión y requerimientos hídricos para estimar el CO₂ eq y los litros de agua evitados. Estos factores internos se fijan en el momento del cálculo, permitiendo que los informes históricos sean consistentes y verificables dentro de nuestra plataforma.',
    algoritmoTitle: 'El Algoritmo CR',
    algoritmoP1: 'El Algoritmo CR de la Calculadora de Reúso es un modelo de evaluación desarrollado por el Grupo MLP. Su cálculo toma como referencia académica marcos metodológicos fiables como el estándar ISO 59020 y el Material Circularity Indicator (MCI) de la Ellen MacArthur Foundation.',
    algoritmoP2: 'Esta herramienta es un proyecto exclusivo del Grupo MLP y no está afiliada, respaldada ni certificada por dichas organizaciones.',
    algoritmoP3: 'Los resultados generados son estimaciones referenciales para visibilizar el beneficio de los ciclos de reúso continuo y no constituyen una garantía exacta, absoluta o certificación legal sobre el impacto ambiental.',
    algoritmoP4: 'Algunos indicadores financieros dependen de datos internos de tu empresa (como el costo de operación o la inversión en economía circular) que se solicitan al registrar tu organización. Si tu plan incluye asistencia de inteligencia artificial y no conoces alguno de estos valores, el sistema puede sugerir uno de referencia a partir de promedios sectoriales publicados por fuentes oficiales de Colombia (Departamento Administrativo Nacional de Estadística, DANE, según el código CIIU de tu actividad económica) — este mecanismo aplica únicamente a empresas registradas en Colombia. Ese valor sugerido queda siempre señalado como una estimación editable, nunca como tu dato real, y puedes reemplazarlo en cualquier momento por el valor exacto de tu empresa. Si tu plan no incluye inteligencia artificial, este campo se completa siempre de forma manual.',
    s3Title: 'Nuestras equivalencias',
    s3Intro: 'Para comunicar los resultados técnicos de manera clara y cotidiana, traducimos los totales ambientales utilizando dos constantes matemáticas estándar de ilustración.',
    s3Items: [
      'Árboles: tomamos como referencia que un árbol promedio en crecimiento puede absorber unos 25 kg de CO₂ eq al año.',
      'Duchas: tomamos como referencia que una ducha estándar de 5 minutos consume un promedio de 100 litros de agua.',
    ],
    s3Nota: 'El cálculo del ahorro de agua es independiente de las emisiones de carbono.',
    s4Title: 'Seguridad y sellos digitales',
    s4p1: 'La plataforma asigna un sello digital único (hash criptográfico) a cada registro. Este sello funciona como una huella dactilar que identifica el cálculo y lo conecta matemáticamente con el registro anterior. Si alguien intentara alterar un dato histórico, la cadena se rompe de inmediato, invalidando la verificación pública.',
    s5Title: '¿Por qué importa?',
    s5p1: 'El respeto por la materia prima y su ciclo natural es la esencia artesanal que nos define. Cada material que reutilizas, cada madera que tocas, sientes y disfrutas en lugar de desechar, evita procesos industriales innecesarios. Al medir este impacto, te entregamos un lenguaje común y estructurado para comunicar tu compromiso real con el planeta.',
    s6Title: 'Limitaciones de la estimación',
    s6Intro: 'Para promover la mayor transparencia y evitar el greenwashing, aclaramos lo que este cálculo no incluye.',
    s6Items: [
      'Los datos son estimaciones sectoriales y pueden diferir de la huella exacta de un fabricante externo en particular.',
      'El cálculo excluye el impacto logístico de transporte o almacenamiento de los objetos.',
      'Los informes generados son una herramienta de comunicación y educación ambiental de Grupo MLP S.A.S. No equivalen a créditos de carbono transables emitidos por organismos internacionales.',
      'Nuestra matriz interna puede actualizarse conforme avanza la ciencia ambiental, pero los cálculos históricos conservan su valor original.',
    ],
    s6CierrePre: 'Para conocer las condiciones completas de uso, consulta el',
    s6CierreLink: 'reglamento de uso',
    transparenciaIA: 'Desarrollamos esta Calculadora con asistencia de modelos de inteligencia artificial para la estructuración del código. Trabajamos de forma continua auditando las fórmulas para mantener la coherencia técnica de la herramienta.',
  },
  ENG: {
    titulo: 'How we measure your impact',
    breadcrumb: 'Calculation methodology',
    resumen: 'We measure a rigorous estimate of the environmental impact you avoid by reusing, restoring, or extending the life of materials instead of extracting new raw materials. We calculate two indicators independently: CO₂ equivalent emissions and the water footprint. Results are immutable and verifiable with a unique digital seal. This methodology is the intellectual property of Grupo MLP S.A.S. and you cannot reproduce it without authorization.',
    leeTabien: [
      { href: '/legal/ia', label: 'AI Use', descripcion: 'Transparency on models and data processing.' },
      { href: '/legal/reglamento', label: 'Usage Rules', descripcion: 'Terms of service and platform standards.' },
      { href: '/legal/confidencialidad', label: 'Confidentiality', descripcion: 'Protection of formulas and methodologies.' },
    ],
    secciones: [
      { id: 'que-medimos', label: 'What we measure' },
      { id: 'como-calculamos', label: 'How we calculate it' },
      { id: 'algoritmo-cr', label: 'The CR Algorithm' },
      { id: 'equivalencias', label: 'Our equivalences' },
      { id: 'seguridad', label: 'Digital security' },
      { id: 'por-que-importa', label: 'Why it matters' },
      { id: 'limitaciones', label: 'Limitations' },
      { id: 'ia-transparencia', label: 'AI and transparency' },
    ],
    ipNoticePre: 'The content of this page, our calculation matrix and the methodology used constitute exclusive intellectual property and "know-how" of Grupo MLP S.A.S. Its reproduction, extraction or use without express written authorization is prohibited. For more details, see the',
    ipNoticeLink: 'non-disclosure agreement',
    s1Title: 'What we measure',
    s1p1: 'We measure a rigorous estimate of the environmental impact you avoid when you decide to reuse, restore, or extend the life of materials, instead of extracting new raw materials. Specifically, we calculate two major indicators independently: equivalent Carbon Dioxide emissions (CO₂ eq) and the water footprint (liters of water saved).',
    s1p2: 'That difference between starting from scratch and making use of what already exists constitutes your positive impact.',
    s2Title: 'How we calculate it',
    s2p1: 'We have developed an internal data matrix based on internationally recognized Life Cycle Assessment (LCA) references and studies.',
    s2p2: 'The calculation takes the category and weight (kg) of your project’s main material as input. The system then cross-references this information with our matrix of emission factors and water requirements to estimate the avoided CO₂ eq and liters of water. These internal factors are locked in at the moment of calculation, guaranteeing that historical reports remain always consistent and verifiable within our platform.',
    algoritmoTitle: 'The CR Algorithm',
    algoritmoP1: 'The CR Algorithm of the Reuse Calculator is an evaluation model developed by Grupo MLP. Its calculation takes as an academic reference reliable methodological frameworks such as the ISO 59020 standard and the Material Circularity Indicator (MCI) from the Ellen MacArthur Foundation.',
    algoritmoP2: 'This tool is an exclusive project of Grupo MLP and is not affiliated with, endorsed by, or certified by these organizations.',
    algoritmoP3: 'The generated results are referential estimates to highlight the benefit of continuous reuse cycles and do not constitute an exact, absolute guarantee or legal certification of environmental impact.',
    algoritmoP4: 'Some financial indicators depend on internal data from your company (such as operating cost or investment in circular economy) that are requested when you register your organization. If your plan includes AI assistance and you don\'t know one of these values, the system may suggest a reference value from sector averages published by official Colombian sources (National Administrative Department of Statistics, DANE, based on your economic activity\'s CIIU code) — this mechanism only applies to companies registered in Colombia. That suggested value is always flagged as an editable estimate, never as your real data, and you can replace it at any time with your company\'s exact figure. If your plan does not include artificial intelligence, this field is always completed manually.',
    s3Title: 'Our equivalences',
    s3Intro: 'To communicate technical results clearly and in everyday terms, we translate the environmental totals using two standard illustrative mathematical constants.',
    s3Items: [
      'Trees: we use as a reference that an average growing tree can absorb about 25 kg of CO₂ eq per year.',
      'Showers: we use as a reference that a standard 5 minute shower consumes an average of 100 liters of water.',
    ],
    s3Nota: 'The water savings calculation is independent of carbon emissions.',
    s4Title: 'Security and digital seals',
    s4p1: 'The platform assigns a unique digital seal (cryptographic hash) to each record. This seal works like a fingerprint that identifies the calculation and mathematically connects it to the previous record. If someone were to try to alter a historical data point, the chain breaks immediately, invalidating the public verification.',
    s5Title: 'Why it matters',
    s5p1: 'Respect for raw materials and their natural cycle is the artisanal essence that defines us. Every material you reuse, every piece of wood you touch, feel, and enjoy instead of discarding, avoids unnecessary industrial processes. By certifying this impact, we give you a common, structured language to communicate your real commitment to the planet.',
    s6Title: 'Limitations of the estimate',
    s6Intro: 'To guarantee maximum transparency and avoid greenwashing, we clarify what this calculation does not include.',
    s6Items: [
      'The data are sector averages and may differ from the exact footprint of a particular external manufacturer.',
      'The calculation excludes the logistical impact of transporting or storing the objects.',
      'The reports generated are an environmental communication and education tool from Grupo MLP S.A.S. They are not equivalent to tradable carbon credits issued by international bodies.',
      'Our internal matrix may be updated as environmental science advances, but historical calculations retain their original value.',
    ],
    s6CierrePre: 'To review the full terms of use, see the',
    s6CierreLink: 'usage rules',
    transparenciaIA: 'We developed this Calculator with the assistance of artificial intelligence models for structuring the code. We continuously work on auditing the formulas to guarantee the tool’s technical accuracy.',
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
      transparenciaTexto={
        <div style={{ margin: 0 }}>
          <p style={{ margin: 0, marginBottom: 8 }}>{t.transparenciaIA}</p>
          <div>
            <Link href="/legal/ia" style={{ color: '#59A6E4', textDecoration: 'underline', fontWeight: 600, display: 'inline-block' }}>
              {lang === 'ENG' ? 'Read our AI usage policy →' : 'Lee nuestra política de uso de IA →'}
            </Link>
          </div>
        </div>
      }
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

      <h2 id="algoritmo-cr" style={h2}>{t.algoritmoTitle}</h2>
      <p style={p}>{t.algoritmoP1}</p>
      <p style={p}>{t.algoritmoP2}</p>
      <p style={p}>{t.algoritmoP3}</p>
      <p style={p}>{t.algoritmoP4}</p>

      <h2 id="equivalencias" style={h2}>{t.s3Title}</h2>
      <p style={p}>{t.s3Intro}</p>
      <ul style={ul}>
        {t.s3Items.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>
      <p style={{ ...p, fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{t.s3Nota}</p>

      <h2 id="seguridad" style={h2}>{t.s4Title}</h2>
      <p style={p}>{t.s4p1}</p>

      <h2 id="por-que-importa" style={h2}>{t.s5Title}</h2>
      <p style={p}>{t.s5p1}</p>

      <h2 id="limitaciones" style={h2}>{t.s6Title}</h2>
      <p style={p}>{t.s6Intro}</p>
      <ul style={ul}>
        {t.s6Items.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>
      <p style={p}>
        {t.s6CierrePre}{' '}
        <Link href="/legal/reglamento" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {t.s6CierreLink}
        </Link>
        .
      </p>

      <h2 id="ia-transparencia" style={h2}>{lang === 'ENG' ? 'AI and Transparency' : 'IA y Transparencia'}</h2>
      <p style={p}>{t.transparenciaIA}</p>
      <p style={p}>
        <Link href="/legal/ia" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>
          {lang === 'ENG' ? 'Learn more in our AI policy →' : 'Conoce todos los detalles en nuestra política de uso de IA →'}
        </Link>
      </p>
    </LegalPageLayout>
  )
}
