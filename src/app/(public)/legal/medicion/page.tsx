'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: '¿Cómo medimos tu impacto?',
    breadcrumb: 'Metodología de cálculo',
    resumen: 'Medimos una estimación técnica del impacto ambiental que evitas al reutilizar, restaurar o prolongar la vida útil de los materiales frente a la extracción de materias primas nuevas. Calculamos dos indicadores de forma independiente: las emisiones de CO₂ equivalente y el agua preservada. Los resultados formales cuentan con un sello digital único verificable. Esta metodología constituye propiedad intelectual de Grupo MLP S.A.S. y no puedes reproducirla sin autorización.',
    leeTabien: [
      { href: '/legal/ia', label: 'Uso de IA', descripcion: 'Transparencia sobre modelos y procesamiento de datos.' },
      { href: '/legal/reglamento', label: 'Reglamento de Uso', descripcion: 'Términos de servicio y normas de la plataforma.' },
      { href: '/legal/confidencialidad', label: 'Confidencialidad', descripcion: 'Protección de fórmulas y metodologías.' },
    ],
    secciones: [
      { id: 'que-medimos', label: '¿Qué medimos?' },
      { id: 'huella-carbono', label: 'Huella de carbono' },
      { id: 'como-calculamos', label: '¿Cómo lo calculamos?' },
      { id: 'marcos-referencia', label: 'Marcos de referencia' },
      { id: 'marco-legal-empco', label: 'Marco legal y antifraude verde' },
      { id: 'equivalencias', label: 'Equivalencias ilustrativas' },
      { id: 'seguridad', label: 'Seguridad digital' },
      { id: 'por-que-importa', label: '¿Por qué importa?' },
      { id: 'limitaciones', label: 'Limitaciones' },
    ],
    ipNoticePre: 'El contenido de esta página, nuestra matriz de cálculo y la metodología empleada constituyen propiedad intelectual y conocimiento exclusivo de Grupo MLP S.A.S. Queda prohibida su reproducción, extracción o uso sin autorización expresa y escrita. Para más detalles, consulta el',
    ipNoticeLink: 'acuerdo de confidencialidad',
    s1Title: '¿Qué medimos?',
    s1p1: 'Medimos una estimación técnica del impacto ambiental positivo que generas cuando decides reutilizar, restaurar o prolongar la vida útil de los materiales, en lugar de extraer materias primas nuevas. Calculamos dos grandes indicadores de manera independiente: las emisiones de dióxido de carbono equivalente (CO₂ eq) y el volumen de agua preservada.',
    s1p2: 'La diferencia neta entre fabricar un bien desde cero y aprovechar los recursos existentes define tu impacto positivo proyectado.',
    hcTitle: 'Huella de carbono',
    hcP1: 'Presentamos el cálculo como «huella de carbono» para cuantificar de forma técnica las emisiones de gases de efecto invernadero (en kilogramos de CO₂ equivalente) que tu organización evita al extender la vida útil de los materiales existentes frente a la extracción virgen.',
    hcP2: 'Esta medición técnica corresponde a una huella real de Alcance 3, Categoría 1 (Bienes y servicios adquiridos), según los estándares internacionales del Protocolo de Gases de Efecto Invernadero (GHG Protocol). Al restaurar, reutilizar o adquirir bienes reacondicionados, reduces directamente las emisiones incorporadas en la cadena de suministro aguas arriba de tu empresa.',
    hcLegalNota: 'Alcance 3, Categoría 1: La cifra de huella de carbono reportada por nuestra plataforma corresponde exclusivamente a una estimación técnica del impacto evitado en la Categoría 1 de Alcance 3 (Bienes y servicios adquiridos en la cadena de valor). Este cálculo sirve como respaldo técnico para memorias de sostenibilidad corporativa y compras circulares, sin constituir una auditoría de emisiones de alcance directo (Alcance 1 y 2) ni un esquema de compensación o créditos de carbono.',
    s2Title: '¿Cómo lo calculamos?',
    s2p1: 'Construimos una matriz de datos técnica basada en estudios y referencias reconocidas de Análisis de Ciclo de Vida (ACV).',
    s2p2: 'El sistema toma como datos de entrada la categoría del objeto y el peso neto en kilogramos de cada material recuperado. Luego cruza esta información con nuestra matriz de factores de emisión y demanda hídrica para estimar las emisiones de CO₂ eq evitadas y los litros de agua preservados. Fijamos estos factores en el momento del cálculo para que los reportes conserven coherencia histórica en la plataforma.',
    s2p3: 'Diferenciamos de manera estricta los cálculos de ingeniería ambiental frente a cualquier recurso gráfico o pedagógico. Las emisiones y el ahorro de agua provienen exclusivamente de factores de masa y ciclo de vida de los materiales. Ninguna figura narrativa modifica las fórmulas matemáticas del balance ambiental.',
    marcosTitle: 'Marcos de referencia y modelos de evaluación',
    marcosP1: 'Los modelos de cálculo de la plataforma toman como referencia académica marcos metodológicos fiables como el estándar ISO 59020 sobre medición de circularidad y el Material Circularity Indicator (MCI) de la Ellen MacArthur Foundation.',
    marcosP2: 'Grupo MLP desarrolla y gestiona esta herramienta como un proyecto exclusivo. Las organizaciones mencionadas no avalan, certifican ni auditan de manera directa la plataforma.',
    marcosP3: 'Todos los resultados numéricos emitidos constituyen estimaciones referenciales para visibilizar el beneficio de los ciclos continuos de reúso. No configuran una garantía exacta, absoluta o certificación legal sobre el impacto ambiental.',
    marcosP4: 'Algunos indicadores financieros requieren datos internos de tu empresa, como el costo de operación o la inversión en circularidad. Si tu plan incluye asistencia de inteligencia artificial y desconoces alguno de estos valores, el sistema puede sugerir una cifra de referencia basada en promedios sectoriales oficiales de Colombia (DANE según código CIIU). La plataforma presenta siempre este valor como una estimación editable que puedes sustituir en cualquier momento por tus datos contables reales. Si tu plan prescinde de inteligencia artificial, completas este campo manualmente.',
    marcoLegalTitle: 'Marco regulatorio internacional y prevención del greenwashing',
    marcoLegalP1: 'La ley específica que transforma radicalmente la comunicación de estos datos es la Directiva sobre el Empoderamiento de los Consumidores para la Transición Ecológica (conocida como EmpCo por sus siglas en inglés), o Directiva (UE) 2024/825.',
    marcoLegalP2: 'Esta directiva entró en vigor en 2024 y exige cumplimiento y ejecución obligatoria a partir del 27 de septiembre de 2026. La norma modifica las leyes de protección al consumidor para prohibir de forma explícita el greenwashing o lavado verde.',
    marcoLegalP3: 'Bajo esta ley, métricas como "árboles preservados" o "duchas ahorradas" califican como afirmaciones ambientales genéricas e infundadas. La directiva prohíbe totalmente estas afirmaciones porque no se basan en un desempeño ambiental excelente y verificado para ese producto específico. Asimismo, la normativa prohíbe usar un "índice circular" o algoritmos propios si se presentan como una etiqueta de sostenibilidad creada por la propia empresa sin un esquema de certificación transparente e independiente verificado por terceros.',
    marcoLegalP4: 'En cuanto a su aplicación geográfica, focalizamos tres ámbitos clave:',
    marcoLegalItems: [
      'Unión Europea (UE): La Directiva EmpCo rige como ley en toda la Unión Europea. Su alcance es extraterritorial y aplica a cualquier empresa del mundo que comercialice u ofrezca productos o servicios a consumidores dentro de la Unión Europea, sin importar su tamaño o país de origen. Las sanciones por incumplimiento alcanzan hasta el 4% de la facturación anual de la empresa.',
      'Estados Unidos: La directiva europea EmpCo no rige como ley nacional en Estados Unidos, pero el país aplica su propio instrumento regulatorio estricto mediante las Guías Verdes (Green Guides) de la Comisión Federal de Comercio (FTC). Las directrices de la FTC persiguen el mismo fin y prohíben afirmaciones ambientales amplias o vagas (como "ecológico" o equivalencias sin base científica), exigiendo que cualquier beneficio ambiental publicitado cuente con respaldo de evidencia científica rigurosa, específica y demostrable.',
      'Colombia: Si una empresa de recuperación o mantenimiento en Colombia solo comercializa sus servicios o bienes a nivel nacional, la directiva EmpCo y las normas de la FTC no ejercen jurisdicción legal directa. Sin embargo, rigen dos factores determinantes: Primero, al exportar productos, activos o componentes recuperados a clientes en Europa o Estados Unidos, la empresa debe cumplir obligatoriamente con EmpCo y las reglas de la FTC. Segundo, opera el efecto dominó como estándar global corporativo, pues las filiales colombianas de multinacionales europeas o estadounidenses exigen a sus proveedores locales que los informes de circularidad cumplan estos estándares internacionales para evitar riesgos de auditoría en sus casas matrices.',
    ],
    marcoLegalCierre: 'Aunque EmpCo constituye una directiva europea, opera en la práctica como el nuevo estándar global corporativo. Mantener métricas lúdicas o no verificadas como los árboles salvados excluye a las empresas de licitaciones corporativas modernas en Estados Unidos y Colombia debido al alto riesgo reputacional que generan.',
    s3Title: 'Equivalencias ilustrativas y exclusión de métricas oficiales',
    s3Intro: 'Para comunicar los resultados técnicos de forma comprensible en la cotización comercial preliminar, traducimos los totales de impacto usando dos constantes matemáticas ilustrativas:',
    s3Items: [
      'Árboles: tomamos como referencia que un árbol promedio en crecimiento absorbe cerca de 25 kg de CO₂ eq al año.',
      'Duchas: tomamos como referencia que una ducha estándar de 5 minutos consume un promedio de 100 litros de agua.',
    ],
    s3ReglaEstricta: 'Establecemos una regla tajante en nuestra plataforma: las equivalencias de árboles preservados y duchas ahorradas nunca constituyen un cálculo verificado ni una alegación técnica oficial. Como norma estricta del sistema, estos dos datos nunca tocan un Pasaporte Digital de Producto (DPP), ni un informe de auditoría, ni ningún archivo importante. Solo ilustran la cotización preliminar.',
    s3Nota: 'El cálculo técnico del agua preservada opera de forma totalmente independiente a las emisiones de carbono.',
    s4Title: 'Seguridad y sellos digitales',
    s4p1: 'La plataforma asigna un sello digital único (hash criptográfico) a cada registro formal. Este sello funciona como una huella digital que identifica el cálculo y lo conecta matemáticamente con el registro anterior. Si alguien intenta alterar un dato histórico, la cadena se invalida de inmediato.',
    s5Title: '¿Por qué importa?',
    s5p1: 'El aprovechamiento de la materia prima y su ciclo de vida prolongado evita procesos industriales extractivos. Al medir este impacto mediante metodologías rigurosas, entregamos a tu organización un sustento técnico estructurado para comunicar tu compromiso ambiental sin incurrir en riesgos regulatorios.',
    s6Title: 'Limitaciones de la estimación',
    s6Intro: 'Para promover la mayor transparencia y erradicar cualquier práctica de greenwashing, aclaramos el alcance de nuestras estimaciones:',
    s6Items: [
      'Los datos son estimaciones sectoriales y pueden diferir de la huella puntual de un fabricante específico.',
      'El cálculo excluye el impacto logístico de transporte o almacenamiento salvo en los módulos que miden específicamente la logística.',
      'Los informes generados respaldan la gestión interna y la educación ambiental de Grupo MLP S.A.S. No equivalen a créditos de carbono negociables en mercados financieros.',
      'Actualizamos nuestra matriz técnica conforme evoluciona la ciencia ambiental, pero los registros históricos mantienen inalterado su valor original.',
    ],
    s6CierrePre: 'Para conocer las condiciones completas de uso, consulta el',
    s6CierreLink: 'reglamento de uso',
    transparenciaIA: 'Desarrollamos esta plataforma con asistencia de modelos de inteligencia artificial para la estructuración del código y la verificación algorítmica. Auditamos de forma continua las fórmulas para mantener la congruencia técnica del sistema.',
  },
  ENG: {
    titulo: 'How we measure your impact',
    breadcrumb: 'Calculation methodology',
    resumen: 'We measure a technical estimate of the environmental impact you avoid by reusing, restoring, or extending the life of materials instead of extracting virgin raw materials. We calculate two indicators independently: CO₂ equivalent emissions and preserved water. Formal platform records include a unique verifiable cryptographic seal. This methodology constitutes intellectual property of Grupo MLP S.A.S. and you cannot reproduce it without authorization.',
    leeTabien: [
      { href: '/legal/ia', label: 'AI Use', descripcion: 'Transparency on models and data processing.' },
      { href: '/legal/reglamento', label: 'Usage Rules', descripcion: 'Terms of service and platform standards.' },
      { href: '/legal/confidencialidad', label: 'Confidentiality', descripcion: 'Protection of formulas and methodologies.' },
    ],
    secciones: [
      { id: 'que-medimos', label: 'What we measure' },
      { id: 'huella-carbono', label: 'Carbon footprint' },
      { id: 'como-calculamos', label: 'How we calculate it' },
      { id: 'marcos-referencia', label: 'Reference frameworks' },
      { id: 'marco-legal-empco', label: 'International legal framework' },
      { id: 'equivalencias', label: 'Illustrative equivalences' },
      { id: 'seguridad', label: 'Digital security' },
      { id: 'por-que-importa', label: 'Why it matters' },
      { id: 'limitaciones', label: 'Limitations' },
    ],
    ipNoticePre: 'The content of this page, our calculation matrix and the methodology used constitute exclusive intellectual property and know how of Grupo MLP S.A.S. Its reproduction, extraction or use without express written authorization is prohibited. For more details, see the',
    ipNoticeLink: 'non disclosure agreement',
    s1Title: 'What we measure',
    s1p1: 'We measure a technical estimate of the positive environmental impact you generate when you decide to reuse, restore, or extend the lifespan of materials instead of extracting new raw materials. Specifically, we calculate two major indicators independently: equivalent Carbon Dioxide emissions (CO₂ eq) and the volume of preserved water.',
    s1p2: 'The net difference between manufacturing a product from scratch and taking advantage of existing resources defines your projected positive impact.',
    hcTitle: 'Carbon footprint',
    hcP1: 'We present the calculation as "carbon footprint" to technically quantify the greenhouse gas emissions (in kilograms of CO₂ equivalent) that your organization avoids by extending the operational lifespan of existing materials instead of extracting virgin resources.',
    hcP2: 'This technical calculation represents an estimate of Scope 3, Category 1 emissions (Purchased goods and services), aligned with the Greenhouse Gas Protocol (GHG Protocol) international framework. By restoring, reusing, or purchasing refurbished goods, you directly reduce embodied emissions upstream in your supply chain.',
    hcLegalNota: 'Scope 3, Category 1: The carbon footprint reported by our platform corresponds exclusively to a technical estimate of avoided emissions within Scope 3, Category 1 (Purchased goods and services in the value chain). This metric provides technical backing for corporate sustainability reports and circular procurement, without constituting a direct emissions audit (Scopes 1 and 2) or tradable carbon credits.',
    s2Title: 'How we calculate it',
    s2p1: 'We build an internal technical data matrix based on recognized Life Cycle Assessment (LCA) studies and scientific emission factors.',
    s2p2: 'The system takes the product category and the net weight in kilograms of each recovered material as input. It then cross references this data with our matrix of emission factors and water requirements to estimate avoided CO₂ eq and preserved water. We lock in these factors at the exact moment of calculation to ensure historical consistency across the platform.',
    s2p3: 'We strictly separate environmental engineering calculations from any pedagogical or graphic figures. Carbon emissions and water savings derive exclusively from material mass and life cycle factors. No narrative equivalence alters the mathematical balance of environmental metrics.',
    marcosTitle: 'Reference frameworks and evaluation models',
    marcosP1: 'Platform calculation models draw academic reference from dependable standards such as ISO 59020 on circularity measurement and the Material Circularity Indicator (MCI) guidelines from the Ellen MacArthur Foundation.',
    marcosP2: 'Grupo MLP develops and operates this tool as an exclusive project. The mentioned organizations do not directly endorse, certify, or audit this platform.',
    marcosP3: 'All numerical results represent referential estimates to showcase the benefits of continuous reuse cycles. They do not constitute an exact guarantee or legal certification of environmental impact.',
    marcosP4: 'Certain financial indicators require internal company data such as operating costs or circularity investments. If your plan includes artificial intelligence assistance and you lack one of these values, the system can suggest a sector reference average based on official Colombian public statistics (DANE under CIIU codes). The platform always marks this figure as an editable estimate that you can replace with your verified accounting records. If your plan does not include artificial intelligence, you complete this field manually.',
    marcoLegalTitle: 'International regulatory framework and greenwashing prevention',
    marcoLegalP1: 'The specific legislation transforming environmental communication is the Directive on Empowering Consumers for the Green Transition (known as EmpCo), Directive (EU) 2024/825.',
    marcoLegalP2: 'This directive entered into force in 2024 and requires mandatory enforcement starting September 27, 2026. The legislation updates consumer protection laws to explicitly prohibit greenwashing.',
    marcoLegalP3: 'Under this law, metrics such as "preserved trees" or "saved showers" count as generic, unsubstantiated environmental claims. The directive strictly prohibits these claims because they do not rest on verified excellent environmental performance for that specific product. Furthermore, the regulation bans presenting circular indices or proprietary algorithms as sustainability labels unless an independent, third party verified certification scheme backs them.',
    marcoLegalP4: 'Regarding geographic reach, we highlight three critical arenas:',
    marcoLegalItems: [
      'European Union (EU): The EmpCo Directive is binding law across the European Union. Its extraterritorial jurisdiction applies to any company worldwide that markets or delivers products or services to consumers within the EU, regardless of company size or location. Fines for non compliance can reach up to 4% of total annual corporate turnover.',
      'United States: While the European EmpCo Directive does not apply as federal law in the United States, the Federal Trade Commission (FTC) enforces strict regulatory oversight through its Green Guides. FTC guidelines pursue the same objective by prohibiting broad or vague environmental claims and requiring rigorous, specific, verifiable scientific evidence for any advertised ecological benefit.',
      'Colombia and regional markets: Colombian circular maintenance and recovery companies experience this regulatory impact through two clear channels. First, if a company exports recovered products, physical assets, or components to Europe or the United States, it must comply directly with EmpCo and FTC Green Guides. Second, a corporate domino effect occurs because Colombian subsidiaries of multinational companies require their local suppliers to provide circularity reports aligned with these global standards to protect parent organizations during audits.',
    ],
    marcoLegalCierre: 'Although EmpCo originated in Europe, it now operates as the new global corporate benchmark. Relying on playful or unverified metrics such as saved trees excludes companies from modern corporate tenders in both the United States and Colombia due to significant reputational risk.',
    s3Title: 'Illustrative equivalences and exclusion from formal metrics',
    s3Intro: 'To make technical quantities intuitive in preliminary commercial proposals, we provide everyday analogies based on standard illustrative factors:',
    s3Items: [
      'Trees: we reference a theoretical benchmark where an average growing tree absorbs approximately 25 kg of CO₂ eq per year.',
      'Showers: we reference a theoretical benchmark where an average 5 minute shower consumes roughly 100 liters of water.',
    ],
    s3ReglaEstricta: 'We uphold a strict rule across our platform: tree and shower analogies never constitute verified calculations or official environmental claims. By rule, these two figures never enter a Digital Product Passport (DPP), an audit report, or any formal document. They solely illustrate initial commercial proposals.',
    s3Nota: 'Technical calculations for preserved water operate independently from carbon emission calculations.',
    s4Title: 'Security and digital seals',
    s4p1: 'The platform assigns a unique cryptographic hash seal to every formal record. This seal acts as a digital fingerprint linking the calculation mathematically with the preceding block. Any attempt to alter historical records breaks the verification sequence instantly.',
    s5Title: 'Why it matters',
    s5p1: 'Extending material lifespan avoids industrial extraction and relieves pressure on natural ecosystems. By delivering structured data with methodological rigor, we equip your organization to demonstrate environmental responsibility while staying shielded against legal risks.',
    s6Title: 'Limitations of the estimate',
    s6Intro: 'To promote maximum transparency and eliminate any risk of greenwashing, we delineate the boundaries of our models:',
    s6Items: [
      'Data points reflect sector estimates and can vary from individual manufacturer footprints.',
      'The baseline calculation excludes transportation logistics and storage except within specialized logistics modules.',
      'Platform reports support internal management and environmental education for Grupo MLP S.A.S. They do not constitute tradable carbon credits in financial markets.',
      'We update our technical matrices as environmental science advances, while preserving original values in historical records.',
    ],
    s6CierrePre: 'To review complete platform terms of service, see the',
    s6CierreLink: 'usage rules',
    transparenciaIA: 'We developed this platform with artificial intelligence assistance for code structuring and algorithmic verification. We continuously audit our numerical factors to uphold technical accuracy.',
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

      <h2 id="huella-carbono" style={h2}>{t.hcTitle}</h2>
      <p style={p}>{t.hcP1}</p>
      <p style={p}>{t.hcP2}</p>
      <div style={{ ...p, fontSize: 13, color: 'var(--text-secondary)', padding: '14px 18px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)', lineHeight: 1.7 }}>
        {t.hcLegalNota}
      </div>

      <h2 id="como-calculamos" style={h2}>{t.s2Title}</h2>
      <p style={p}>{t.s2p1}</p>
      <p style={p}>{t.s2p2}</p>
      <p style={p}>{t.s2p3}</p>

      <h2 id="marcos-referencia" style={h2}>{t.marcosTitle}</h2>
      <p style={p}>{t.marcosP1}</p>
      <p style={p}>{t.marcosP2}</p>
      <p style={p}>{t.marcosP3}</p>
      <p style={p}>{t.marcosP4}</p>

      <h2 id="marco-legal-empco" style={h2}>{t.marcoLegalTitle}</h2>
      <p style={p}>{t.marcoLegalP1}</p>
      <p style={p}>{t.marcoLegalP2}</p>
      <p style={p}>{t.marcoLegalP3}</p>
      <p style={p}>{t.marcoLegalP4}</p>
      <ul style={ul}>
        {t.marcoLegalItems.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>
      <p style={p}>{t.marcoLegalCierre}</p>

      <h2 id="equivalencias" style={h2}>{t.s3Title}</h2>
      <p style={p}>{t.s3Intro}</p>
      <ul style={ul}>
        {t.s3Items.map((item, i) => (
          <li key={i} style={li}>{item}</li>
        ))}
      </ul>
      <p style={{ ...p, fontWeight: 600, color: 'var(--text-primary)' }}>{t.s3ReglaEstricta}</p>
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
    </LegalPageLayout>
  )
}
