'use client'

import { useEffect, useState } from 'react'
import { LegalPageLayout, h2, p } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: 'Uso de Inteligencia Artificial',
    breadcrumb: 'Uso de IA',
    meta: 'Cómo usamos la inteligencia artificial para construir y operar la Calculadora de Reúso.',
    secciones: [
      { id: 'que-es', label: 'Qué entendemos por IA' },
      { id: 'construccion', label: 'IA en la construcción' },
      { id: 'calculos', label: 'IA en los cálculos' },
      { id: 'que-no-hace', label: 'Lo que la IA no hace' },
      { id: 'supervision', label: 'Supervisión humana' },
      { id: 'limitaciones', label: 'Limitaciones' },
      { id: 'contacto', label: 'Derechos y contacto' },
    ],
    s1Title: '¿Qué entendemos por inteligencia artificial?',
    s1: [
      'En Reúso llamamos "inteligencia artificial" a los modelos de lenguaje de gran escala (LLM) y a las herramientas de generación asistida de código y contenido que usamos durante el desarrollo y la operación de la plataforma.',
      'Estas herramientas no reemplazan la toma de decisiones humana: son asistentes que aceleran procesos y ayudan a revisar la calidad de los resultados. El criterio final siempre lo ejerce el equipo de Grupo MLP S.A.S.',
    ],
    s2Title: 'Cómo usamos la IA para construir la plataforma',
    s2: [
      'Reúso fue construido con asistencia de modelos de IA en varias fases del desarrollo:',
      '- Escritura y revisión de código: los modelos asistieron en la generación de componentes, rutas de API, esquemas de base de datos y lógica de negocio. Todo el código generado fue revisado, adaptado y aprobado por el equipo antes de ser incorporado a producción.',
      '- Diseño y contenido: los textos legales, la interfaz de usuario y la arquitectura de información se desarrollaron con apoyo de IA y fueron revisados por personas.',
      '- Pruebas y seguridad: la IA ayudó a identificar posibles vulnerabilidades y a generar casos de prueba, que luego fueron validados manualmente.',
    ],
    s3Title: 'Cómo usamos la IA en los cálculos de CO₂',
    s3: [
      'El núcleo de Reúso es la estimación del CO₂ evitado al reutilizar objetos. En este proceso, la IA se usa para:',
      '- Validar y estructurar los factores de emisión tomados de bases de datos científicas internacionales (IPCC, Ecoinvent, DEFRA y equivalentes). Los factores se almacenan como datos inmutables (factor_snapshot_json) para garantizar la trazabilidad de cada cálculo.',
      '- Asistir en la generación de los certificados e informes: el contenido textual y el diseño del PDF se produjeron con apoyo de IA y fueron revisados por el equipo.',
      '- Los cálculos finales de CO₂e son deterministas: aplican una fórmula fija a los datos introducidos por el usuario. La IA no interviene en el resultado numérico en tiempo real.',
    ],
    s4Title: 'Lo que la IA no hace en Reúso',
    s4: [
      'Para ser transparentes, detallamos lo que nuestros sistemas de IA no hacen:',
      '- No se entrenan con tus datos personales. Los registros de usuarios, cálculos y certificados no se usan como datos de entrenamiento para ningún modelo.',
      '- No comparten datos con terceros no autorizados. La información que procesa la IA opera dentro de los mismos límites de confidencialidad que el resto del sistema.',
      '- No toman decisiones autónomas sobre usuarios. La IA no determina acceso, precios, planes ni sanciones. Esas decisiones son siempre humanas.',
      '- No generan perfiles de comportamiento. No usamos IA para crear perfiles publicitarios ni para inferir características sensibles de los usuarios.',
    ],
    s5Title: 'Supervisión humana',
    s5a: 'Todo output producido con asistencia de IA pasa por revisión humana antes de ser publicado o incorporado a la plataforma. El equipo de Grupo MLP S.A.S. es responsable de la corrección, pertinencia y legalidad de los resultados.',
    s5b: 'Si detectas un error en cualquier cálculo, texto legal o funcionalidad de la plataforma, puedes reportarlo en',
    s5bPost: '. Revisamos todos los reportes y actuamos en consecuencia.',
    s6Title: 'Limitaciones y responsabilidad',
    s6: [
      'Los sistemas de IA pueden generar imprecisiones, inconsistencias o resultados inesperados. Ningún sistema automatizado es infalible.',
      'Los cálculos de CO₂e que ofrece Reúso son estimaciones basadas en factores internacionalmente reconocidos. No constituyen una auditoría ambiental oficial y no deben usarse como tal sin validación adicional por parte de un experto independiente.',
      'Grupo MLP S.A.S. monitorea continuamente la plataforma para detectar y corregir errores. Al usar Reúso aceptas que los resultados son orientativos y que la responsabilidad de su interpretación recae en el usuario.',
    ],
    s7Title: 'Tus derechos y cómo contactarnos',
    s7Intro: 'Si tienes preguntas sobre cómo usamos la IA en Reúso, cómo afecta al tratamiento de tus datos o quieres ejercer cualquier derecho reconocido por el RGPD (UE), la CCPA (California) o la Ley 1581 de 2012 (Colombia), escríbenos:',
    s7Correo: 'servicio@lurdes.co',
    s7FormLabel: 'Formulario de consultas',
    s7Respuesta: 'Respondemos en un plazo máximo de 10 días hábiles.',
    resumen: 'Usamos IA para construir la plataforma y estructurar los factores de cálculo. Nunca para entrenar modelos con tus datos ni para tomar decisiones automáticas sobre ti. Todo output de IA pasa por revisión humana antes de llegar a producción.',
    leeTabien: [
      { href: '/legal/privacidad', label: 'Política de Privacidad', descripcion: 'Qué datos recopilamos y cómo los protegemos.' },
      { href: '/legal/datos', label: 'Tratamiento de Datos', descripcion: 'Tus derechos y cómo ejercerlos.' },
      { href: '/legal/cookies', label: 'Política de Cookies', descripcion: 'Qué cookies usamos y cómo gestionarlas.' },
    ],
  },
  ENG: {
    titulo: 'Artificial Intelligence Use',
    breadcrumb: 'AI Use',
    meta: 'How we use artificial intelligence to build and operate the Reúso Calculator.',
    secciones: [
      { id: 'que-es', label: 'What we mean by AI' },
      { id: 'construccion', label: 'AI in development' },
      { id: 'calculos', label: 'AI in calculations' },
      { id: 'que-no-hace', label: 'What AI does not do' },
      { id: 'supervision', label: 'Human oversight' },
      { id: 'limitaciones', label: 'Limitations' },
      { id: 'contacto', label: 'Rights & contact' },
    ],
    s1Title: 'What we mean by artificial intelligence',
    s1: [
      'At Reúso we use "artificial intelligence" to refer to large language models (LLMs) and AI-assisted code and content generation tools used during the development and operation of the platform.',
      'These tools do not replace human decision-making: they are assistants that speed up processes and help review the quality of results. The final judgment always rests with the team at Grupo MLP S.A.S.',
    ],
    s2Title: 'How we use AI to build the platform',
    s2: [
      'Reúso was built with AI assistance across several development phases:',
      '- Code writing and review: models assisted in generating components, API routes, database schemas, and business logic. All generated code was reviewed, adapted, and approved by the team before being incorporated into production.',
      '- Design and content: legal texts, the user interface, and information architecture were developed with AI support and reviewed by humans.',
      '- Testing and security: AI helped identify potential vulnerabilities and generate test cases, which were then manually validated.',
    ],
    s3Title: 'How we use AI in CO₂ calculations',
    s3: [
      'The core of Reúso is estimating the CO₂ avoided by reusing objects. In this process, AI is used to:',
      '- Validate and structure emission factors drawn from international scientific databases (IPCC, Ecoinvent, DEFRA, and equivalents). Factors are stored as immutable data (factor_snapshot_json) to guarantee the traceability of each calculation.',
      '- Assist in generating certificates and reports: the textual content and PDF design were produced with AI assistance and reviewed by the team.',
      '- The final CO₂e calculations are deterministic: they apply a fixed formula to the data entered by the user. AI does not intervene in the numerical result in real time.',
    ],
    s4Title: 'What AI does not do at Reúso',
    s4: [
      'To be transparent, we detail what our AI systems do not do:',
      '- They are not trained on your personal data. User records, calculations, and certificates are not used as training data for any model.',
      '- They do not share data with unauthorized third parties. Information processed by AI operates within the same confidentiality boundaries as the rest of the system.',
      '- They do not make autonomous decisions about users. AI does not determine access, pricing, plans, or penalties. Those decisions are always made by humans.',
      '- They do not create behavioral profiles. We do not use AI to create advertising profiles or to infer sensitive characteristics about users.',
    ],
    s5Title: 'Human oversight',
    s5a: 'All output produced with AI assistance goes through human review before being published or incorporated into the platform. The Grupo MLP S.A.S. team is responsible for the accuracy, relevance, and legality of the results.',
    s5b: 'If you spot an error in any calculation, legal text, or platform functionality, you can report it at',
    s5bPost: '. We review all reports and act accordingly.',
    s6Title: 'Limitations and responsibility',
    s6: [
      'AI systems can produce inaccuracies, inconsistencies, or unexpected results. No automated system is infallible.',
      'The CO₂e calculations provided by Reúso are estimates based on internationally recognized factors. They do not constitute an official environmental audit and should not be used as such without additional validation by an independent expert.',
      'Grupo MLP S.A.S. continuously monitors the platform to detect and correct errors. By using Reúso you accept that results are indicative and that responsibility for their interpretation rests with the user.',
    ],
    s7Title: 'Your rights and how to contact us',
    s7Intro: 'If you have questions about how we use AI at Reúso, how it affects the processing of your data, or you wish to exercise any right recognized by the GDPR (EU), the CCPA (California), or Law 1581 of 2012 (Colombia), write to us:',
    s7Correo: 'servicio@lurdes.co',
    s7FormLabel: 'Legal enquiry form',
    s7Respuesta: 'We respond within a maximum of 10 business days.',
    resumen: 'We use AI to build the platform and structure the calculation factors. Never to train models with your data or to make automated decisions about you. All AI output goes through human review before reaching production.',
    leeTabien: [
      { href: '/legal/privacidad', label: 'Privacy Policy', descripcion: 'What data we collect and how we protect it.' },
      { href: '/legal/datos', label: 'Data Processing', descripcion: 'Your rights and how to exercise them.' },
      { href: '/legal/cookies', label: 'Cookie Policy', descripcion: 'What cookies we use and how to manage them.' },
    ],
  },
}

export default function LegalIAPage() {
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
      transparenciaTexto={null}
    >
      {/* 1. Qué entendemos por IA */}
      <section id="que-es">
        <h2 style={h2}>{t.s1Title}</h2>
        {t.s1.map((txt, i) => <p key={i} style={p}>{txt}</p>)}
      </section>

      {/* 2. IA en la construcción */}
      <section id="construccion">
        <h2 style={h2}>{t.s2Title}</h2>
        {t.s2.map((txt, i) => <p key={i} style={p}>{txt}</p>)}
      </section>

      {/* 3. IA en los cálculos */}
      <section id="calculos">
        <h2 style={h2}>{t.s3Title}</h2>
        {t.s3.map((txt, i) => <p key={i} style={p}>{txt}</p>)}
      </section>

      {/* 4. Lo que la IA no hace */}
      <section id="que-no-hace">
        <h2 style={h2}>{t.s4Title}</h2>
        {t.s4.map((txt, i) => <p key={i} style={p}>{txt}</p>)}
      </section>

      {/* 5. Supervisión humana */}
      <section id="supervision">
        <h2 style={h2}>{t.s5Title}</h2>
        <p style={p}>{t.s5a}</p>
        <p style={p}>
          {t.s5b}{' '}
          <a href="mailto:servicio@lurdes.co" style={{ color: 'var(--color-brand)', textDecoration: 'underline', fontWeight: 600 }}>
            servicio@lurdes.co
          </a>
          {t.s5bPost}
        </p>
      </section>

      {/* 6. Limitaciones */}
      <section id="limitaciones">
        <h2 style={h2}>{t.s6Title}</h2>
        {t.s6.map((txt, i) => <p key={i} style={p}>{txt}</p>)}
      </section>

      {/* 7. Derechos y contacto */}
      <section id="contacto">
        <h2 style={h2}>{t.s7Title}</h2>
        <p style={p}>{t.s7Intro}</p>
        <p style={{ ...p, fontWeight: 600 }}>
          <a href="mailto:servicio@lurdes.co" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>
            {t.s7Correo}
          </a>
        </p>
        <p style={{ ...p, fontWeight: 600 }}>
          <a href="https://reuso.lurdes.co/legal/dudas" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>
            {t.s7FormLabel}
          </a>
        </p>
        <p style={p}>{t.s7Respuesta}</p>
      </section>
    </LegalPageLayout>
  )
}
