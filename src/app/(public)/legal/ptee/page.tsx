'use client'

import { useEffect, useState } from 'react'
import { LegalPageLayout, h2, p } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: 'Programa de Transparencia y Ética Empresarial (PTEE)',
    subtitulo: 'Nuestras reglas claras contra la corrupción, el soborno y las malas prácticas comerciales en Grupo MLP S.A.S.',
    breadcrumbLabel: 'Programa de Ética (PTEE)',
    secciones: [
      { id: 'compromiso', label: 'Nuestro compromiso' },
      { id: 'alcance', label: 'A quiénes aplica' },
      { id: 'anticorrupcion', label: 'Cero sobornos' },
      { id: 'soborno-transnacional', label: 'Negocios internacionales' },
      { id: 'conflictos-interes', label: 'Conflictos de interés' },
      { id: 'regalos-hospitalidad', label: 'Regalos y atenciones' },
      { id: 'integridad-calculos', label: 'Cálculos honestos' },
      { id: 'debida-diligencia', label: 'Conozcamos a las partes' },
      { id: 'canal-denuncias', label: 'Canal ético' },
      { id: 'consecuencias', label: 'Sanciones' },
    ],
    resumen:
      'En la Calculadora de Reúso no aceptamos tramposos ni jugadas sucias. Trabajamos con total honestidad y aplicamos al pie de la letra el Programa de Transparencia y Ética Empresarial (PTEE) de Grupo MLP S.A.S. Cumplimos las leyes colombianas (Ley 1778 de 2016 y Ley 2195 de 2022) y los lineamientos de la Superintendencia de Sociedades para garantizar que cada contrato y cada kg de CO₂ evitado sea 100% real y auditable.',
    leeTabien: [
      { href: '/legal/sagrilaft', label: 'Política SAGRILAFT' },
      { href: '/legal/terminos', label: 'Términos y Condiciones' },
      { href: '/legal/confidencialidad', label: 'Acuerdo de Confidencialidad' },
    ],
    intro:
      'Grupo MLP S.A.S., empresa colombiana con sede en Medellín y dueña de la Calculadora de Reúso (calculadoradereuso.com), diseñó este Programa de Transparencia y Ética Empresarial (PTEE) para dejar las reglas de juego claras. Aquí explicamos cómo prevenimos la corrupción, qué conductas no toleramos y cómo nos aseguramos de que todo funcione con limpieza.',
    compromisoTitle: 'Nuestro compromiso: actuar bien siempre',
    compromiso1:
      'Hacemos negocios de forma limpia, honesta y transparente. Nos dedicamos a medir el impacto ambiental para transformar descartes en oportunidades de oro. Sabemos que un certificado ambiental o un contrato no vale nada si se consigue con trampas.',
    compromiso2:
      'Cumplimos con la Circular Básica Jurídica de la Superintendencia de Sociedades (Capítulo XIII) y con las leyes anticorrupción de Colombia. Monitoreamos constantemente cada proceso para cerrarle la puerta a cualquier intento de soborno o fraude.',
    alcanceTitle: '¿A quiénes aplica este programa?',
    alcanceIntro: 'Estas reglas son obligatorias y sin excepciones para:',
    alcanceItems: [
      'Nuestros socios, directivos, administradores y empleados.',
      'Nuestros proveedores de tecnología, infraestructura, servidores y suministros.',
      'Las empresas y clientes corporativos que usan la Calculadora de Reúso.',
      'Cualquier asesor o tercero que actúe en nombre de Grupo MLP S.A.S.',
    ],
    anticorrupcionTitle: 'Cero sobornos ni ventajas indebidas',
    anticorrupcionIntro:
      'Prohibimos rotundamente ofrecer, prometer, dar, pedir o recibir dinero, regalos o favores para:',
    anticorrupcionItems: [
      'Ganar contratos, licitaciones o ventajas comerciales de forma desleal.',
      'Cambiar, inflar o inventar cifras de pesaje o cálculos de CO₂ evitado en la plataforma.',
      'Convencer a un funcionario público o a un particular de hacer algo indebido.',
      'Agilizar trámites o permisos pagando "agradecimientos" o comisiones por debajo de la mesa.',
    ],
    sobornoTitle: 'Cero corrupción en negocios internacionales',
    soborno1:
      'Respetamos la Ley 1778 de 2016 y las normas internacionales de la OCDE. Jamás ofrecemos ni entregamos dinero o regalos a funcionarios de otros países para abrir mercados o cerrar tratos internacionales.',
    soborno2:
      'Usamos el dinero de la empresa únicamente para el funcionamiento legal del negocio. Cada pago que hacemos cuenta con facturas y contratos claros que cualquier auditor puede revisar.',
    conflictosTitle: 'Transparencia en conflictos de interés',
    conflictos1:
      'Un conflicto de interés ocurre cuando un beneficio personal, familiar o de un amigo se cruza con las decisiones de la empresa y puede nublar el buen juicio.',
    conflictos2:
      'Exigimos a todo nuestro equipo levantar la mano y avisar a la Dirección General sobre cualquier conflicto de interés antes de firmar contratos, contratar un proveedor o validar un informe.',
    regalosTitle: 'Reglas para regalos y atenciones',
    regalos1:
      'No recibimos ni damos plata en efectivo, tarjetas de regalo ni obsequios valiosos. Solo aceptamos o entregamos detalles institucionales sencillos (como cuadernos o pocillos de la marca) que no comprometan la independencia de nadie.',
    regalos2:
      'Las invitaciones a eventos o almuerzos de trabajo deben ser transparentes, razonables y contar con la aprobación previa de la empresa.',
    integridadTitle: 'Cálculos de impacto 100% honestos',
    integridad1:
      'El corazón de la Calculadora de Reúso es la verdad matemática. Prohibimos simular datos, inventar objetos reutilizados o cambiar las fórmulas para inflar los resultados ambientales de una empresa.',
    integridad2:
      'Protegemos cada informe con sellos de seguridad inalterables y códigos QR verificables en tiempo real en calculadoradereuso.com/verificar.',
    debidaTitle: 'Conozcamos bien a las empresas con las que trabajamos',
    debida1:
      'Antes de cerrar alianzas o contratos con una empresa, investigamos sus antecedentes en listas oficiales de control (como ONU, OFAC, Procuraduría y Contraloría) para confirmar que sea una organización limpia.',
    debida2:
      'Si descubrimos que un cliente o proveedor incurre en actos de corrupción o tiene sanciones graves, cancelamos la alianza e interrumpimos el servicio de inmediato.',
    denunciasTitle: 'Canal ético: habla con tranquilidad',
    denuncias1:
      'Si ves algo sospechoso, una mala práctica o un intento de soborno, avísanos de inmediato a través de nuestro correo seguro:',
    denunciasCanal: 'servicio@calculadoradereuso.com',
    denuncias2:
      'Cuidamos tu identidad bajo total reserva. Nadie sufrirá represalias ni consecuencias por reportar de buena fe una irregularidad.',
    consecuenciasTitle: 'Sanciones severas para quien incumpla',
    consecuencias1:
      'El incumplimiento de este programa se considera una falta grave. Despediremos con justa causa al empleado que cometa un acto de corrupción y terminaremos el contrato de cualquier cliente o proveedor involucrado. Además, llevaremos el caso ante la Fiscalía General de la Nación y las autoridades competentes.',
  },
  ENG: {
    titulo: 'Transparency and Business Ethics Program (PTEE)',
    subtitulo: 'Our clear rules against corruption, bribery, and unfair business practices at Grupo MLP S.A.S.',
    breadcrumbLabel: 'Ethics Program (PTEE)',
    secciones: [
      { id: 'compromiso', label: 'Our commitment' },
      { id: 'alcance', label: 'Who it applies to' },
      { id: 'anticorrupcion', label: 'Zero bribery' },
      { id: 'soborno-transnacional', label: 'International business' },
      { id: 'conflictos-interes', label: 'Conflicts of interest' },
      { id: 'regalos-hospitalidad', label: 'Gifts & hospitality' },
      { id: 'integridad-calculos', label: 'Honest calculations' },
      { id: 'debida-diligencia', label: 'Know your partners' },
      { id: 'canal-denuncias', label: 'Ethics channel' },
      { id: 'consecuencias', label: 'Sanctions' },
    ],
    resumen:
      'At Calculadora de Reúso we have zero tolerance for shortcuts or illegal moves. We operate with absolute honesty under the Transparency and Business Ethics Program (PTEE) of Grupo MLP S.A.S. We strictly comply with Colombian laws (Law 1778 of 2016 & Law 2195 of 2022) and Superintendencia de Sociedades guidelines to ensure every contract and every kg of avoided CO₂ is genuine, accurate, and auditable.',
    leeTabien: [
      { href: '/legal/sagrilaft', label: 'SAGRILAFT Policy' },
      { href: '/legal/terminos', label: 'Terms and Conditions' },
      { href: '/legal/confidencialidad', label: 'Confidentiality Agreement' },
    ],
    intro:
      'Grupo MLP S.A.S., a Colombian company based in Medellín and owner of Calculadora de Reúso (calculadoradereuso.com), created this Transparency and Business Ethics Program (PTEE) to set clear ground rules. Here we explain how we prevent corruption, what behavior we reject, and how we keep all operations clean.',
    compromisoTitle: 'Our commitment: always doing the right thing',
    compromiso1:
      'We run our business cleanly and transparently. We measure environmental impact to turn waste into real opportunities. We know that an environmental certificate or contract is worthless if achieved through deception.',
    compromiso2:
      'We comply with Chapter XIII of the Basic Legal Circular of Colombia’s Superintendencia de Sociedades and national anti-corruption laws. We actively monitor our processes to block any attempt at bribery or fraud.',
    alcanceTitle: 'Who does this program apply to?',
    alcanceIntro: 'These rules apply strictly and without exception to:',
    alcanceItems: [
      'Our shareholders, executives, managers, and employees.',
      'Our technology, infrastructure, server, and materials suppliers.',
      'Organizations and corporate clients using Calculadora de Reúso.',
      'Any advisor or representative acting on behalf of Grupo MLP S.A.S.',
    ],
    anticorrupcionTitle: 'Zero bribery or improper favors',
    anticorrupcionIntro:
      'We strictly forbid offering, promising, giving, requesting, or receiving money, gifts, or favors to:',
    anticorrupcionItems: [
      'Win contracts, tenders, or unfair commercial advantages.',
      'Alter, inflate, or invent waste figures or avoided CO₂ calculations.',
      'Induce public officials or private individuals to act improperly.',
      'Speed up bureaucratic procedures using unofficial payments or tips.',
    ],
    sobornoTitle: 'Zero corruption in international business',
    soborno1:
      'We enforce Law 1778 of 2016 and OECD international anti-bribery standards. We never give money or valuable gifts to foreign public officials to open international markets.',
    soborno2:
      'We spend company funds exclusively on legitimate business operations, supporting every payment with clear invoices and contracts.',
    conflictosTitle: 'Transparency in conflicts of interest',
    conflictos1:
      'A conflict of interest happens when personal, family, or financial interests interfere with objective business decisions.',
    conflictos2:
      'We require every team member to disclose any conflict of interest to management before signing agreements, hiring vendors, or issuing reports.',
    regalosTitle: 'Rules for gifts and business hospitality',
    regalos1:
      'We do not accept or give cash gifts, gift cards, or valuable items. We only accept or offer modest branded promotional items (like notebooks or mugs) that do not influence decision-making.',
    regalos2:
      'Invitations to industry events or meals must remain reasonable, transparent, and approved in advance.',
    integridadTitle: '100% honest impact calculations',
    integridad1:
      'Mathematical truth is the core of Calculadora de Reúso. We forbid fake data, fabricated waste items, or altering emission formulas to boost environmental scores.',
    integridad2:
      'We secure every report with tamper-proof digital seals and real-time QR verification at calculadoradereuso.com/verificar.',
    debidaTitle: 'Getting to know our business partners',
    debida1:
      'Before signing partnerships or contracts, we verify company backgrounds on official watchlists (such as UN, OFAC, and national registries) to ensure we partner with clean organizations.',
    debida2:
      'If we discover a client or supplier engages in corruption, we terminate the contract and suspend services immediately.',
    denunciasTitle: 'Ethics channel: speak up with peace of mind',
    denuncias1:
      'If you notice suspicious activity, unfair practices, or a bribery attempt, report it immediately through our secure email:',
    denunciasCanal: 'servicio@calculadoradereuso.com',
    denuncias2:
      'We protect your identity with total confidentiality. No one will face retaliation for filing a report in good faith.',
    consecuenciasTitle: 'Strict sanctions for non-compliance',
    consecuencias1:
      'Breaching this program is a severe offense. We terminate employment contracts with cause for any worker involved in corruption, and cancel agreements with involved clients or vendors. We also report offenses to law enforcement authorities.',
  },
}

const ul: React.CSSProperties = { paddingLeft: 20, marginBottom: 16, listStyleType: 'disc' }
const li: React.CSSProperties = { marginBottom: 8 }

export default function PteeLegalPage() {
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

      <h2 id="compromiso" style={h2}>{t.compromisoTitle}</h2>
      <p style={p}>{t.compromiso1}</p>
      <p style={p}>{t.compromiso2}</p>

      <h2 id="alcance" style={h2}>{t.alcanceTitle}</h2>
      <p style={p}>{t.alcanceIntro}</p>
      <ul style={ul}>
        {t.alcanceItems.map((item, idx) => (
          <li key={idx} style={li}>{item}</li>
        ))}
      </ul>

      <h2 id="anticorrupcion" style={h2}>{t.anticorrupcionTitle}</h2>
      <p style={p}>{t.anticorrupcionIntro}</p>
      <ul style={ul}>
        {t.anticorrupcionItems.map((item, idx) => (
          <li key={idx} style={li}>{item}</li>
        ))}
      </ul>

      <h2 id="soborno-transnacional" style={h2}>{t.sobornoTitle}</h2>
      <p style={p}>{t.soborno1}</p>
      <p style={p}>{t.soborno2}</p>

      <h2 id="conflictos-interes" style={h2}>{t.conflictosTitle}</h2>
      <p style={p}>{t.conflictos1}</p>
      <p style={p}>{t.conflictos2}</p>

      <h2 id="regalos-hospitalidad" style={h2}>{t.regalosTitle}</h2>
      <p style={p}>{t.regalos1}</p>
      <p style={p}>{t.regalos2}</p>

      <h2 id="integridad-calculos" style={h2}>{t.integridadTitle}</h2>
      <p style={p}>{t.integridad1}</p>
      <p style={p}>{t.integridad2}</p>

      <h2 id="debida-diligencia" style={h2}>{t.debidaTitle}</h2>
      <p style={p}>{t.debida1}</p>
      <p style={p}>{t.debida2}</p>

      <h2 id="canal-denuncias" style={h2}>{t.denunciasTitle}</h2>
      <p style={p}>{t.denuncias1}</p>
      <p style={p}>
        <a
          href={`mailto:${t.denunciasCanal}`}
          style={{ color: 'var(--color-brand)', fontWeight: 600, textDecoration: 'underline' }}
        >
          {t.denunciasCanal}
        </a>
      </p>
      <p style={p}>{t.denuncias2}</p>

      <h2 id="consecuencias" style={h2}>{t.consecuenciasTitle}</h2>
      <p style={p}>{t.consecuencias1}</p>
    </LegalPageLayout>
  )
}
