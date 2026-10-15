'use client'

import { LegalPageLayout, h2, p } from '@/components/legal/legal-page-layout'

const T = {
  ES: {
    titulo: 'Bancos de Imágenes, Iconografía y Licencias de Activos',
    breadcrumb: 'Bancos de Imágenes y Licencias',
    meta: 'Información legal sobre las licencias comerciales de bancos de imágenes gratuitos (Unsplash, Pexels, Pixabay, Negative Space, Picjumbo, Shotstash), iconografía y tipografía en Calculadora de Reúso.',
    secciones: [
      { id: 'cumplimiento', label: 'Marco de Propiedad Intelectual' },
      { id: 'bancos-imagenes', label: 'Bancos de Imágenes Gratuitos' },
      { id: 'iconografia', label: 'Iconografía y Fuentes' },
      { id: 'propiedad-propia', label: 'Activos Exclusivos de Grupo MLP' },
      { id: 'notice-takedown', label: 'Notificación y Retiro' },
    ],
    s1Title: '1. Marco de Propiedad Intelectual y Cumplimiento Normativo',
    s1: [
      'Grupo MLP S.A.S. (NIT 901.832.079-1) diseña y opera la Calculadora de Reúso de acuerdo con la Decisión Andina 351 de 1993, la Ley 23 de 1982, la Ley 44 de 1993 de la República de Colombia y los tratados internacionales suscritos ante la Organización Mundial de la Propiedad Intelectual (OMPI).',
      'Nos comprometemos a que todos los recursos visuales, fotográficos, tipográficos e infográficos incorporados en nuestra plataforma cuentan con autorización de uso comercial, licencias abiertas permisivas o corresponden a creaciones originales de nuestro equipo.',
    ],
    s2Title: '2. Bancos de Imágenes Gratuitos Autorizados para Uso Comercial',
    s2Intro: 'Estos son los bancos de imágenes cuyas licencias revisamos. Hoy usamos fotos de Unsplash en la landing. Los demás quedan revisados para uso futuro, con su enlace oficial:',
    bancos: [
      {
        nombre: 'Unsplash',
        licencia: 'Unsplash License',
        url: 'https://unsplash.com/license',
        permisos: 'Uso comercial y no comercial, gratuito y en todo el mundo. No es obligatorio dar crédito, aunque se agradece.',
        restricciones: 'No se pueden vender las fotos sin cambios importantes, ni usarlas para crear un servicio que compita con Unsplash.',
      },
      {
        nombre: 'Pexels',
        licencia: 'Pexels License',
        url: 'https://www.pexels.com/license/',
        permisos: 'Uso comercial gratuito, con cambios o sin ellos. No es obligatorio dar crédito.',
        restricciones: 'No se pueden vender copias sin cambios, ni publicarlas en otras plataformas de fotos, ni usarlas como marca. Tampoco insinuar respaldo de personas o marcas.',
      },
      {
        nombre: 'Pixabay',
        licencia: 'Pixabay Content License',
        url: 'https://pixabay.com/service/license-summary/',
        permisos: 'Uso comercial y editorial gratuito. No es obligatorio dar crédito.',
        restricciones: 'No se puede vender ni distribuir el contenido por separado sin un aporte creativo propio, ni usarlo como marca.',
      },
      {
        nombre: 'Negative Space',
        licencia: 'Creative Commons Zero (CC0 1.0)',
        url: 'https://negativespace.co/',
        permisos: 'Uso personal y comercial, sin pagar ni pedir permiso. No es obligatorio dar crédito.',
        restricciones: 'Sin limitaciones de derechos. No hay que presentarse como autor de la foto.',
      },
      {
        nombre: 'Picjumbo',
        licencia: 'Picjumbo Free License',
        url: 'https://picjumbo.com/faq-and-terms/',
        permisos: 'Uso comercial, también en trabajos de clientes. No es obligatorio dar crédito, aunque se agradece.',
        restricciones: 'No se pueden revender las fotos. Se pueden incluir en plantillas o diseños vendidos, pero no como archivos de imagen. Algunas fotos no tienen autorización de modelo.',
      },
      {
        nombre: 'Shotstash',
        licencia: 'Licencia CC0 de Shotstash',
        url: 'https://shotstash.com/license/',
        permisos: 'Uso personal y comercial, sin pagar ni pedir permiso. No es obligatorio dar crédito.',
        restricciones: 'No hay que presentarse como autor de la foto. No se pueden usar con fines ilegales, inmorales ni para dañar la imagen de personas.',
      },
    ],
    s3Title: '3. Licencias de Iconografía y Fuentes Tipográficas',
    s3: [
      'Lucide Icons (lucide-react): Biblioteca de íconos vectoriales licenciada bajo ISC License (altamente permisiva y compatible con MIT), autorizando su compilación, adaptación y distribución en aplicaciones comerciales.',
      'Phosphor Icons (@phosphor-icons/react): Biblioteca de iconografía licenciada bajo MIT License, permitiendo su integración y renderizado sin restricciones de regalías.',
      'Tipografía: usamos Open Sans, una fuente de código abierto distribuida bajo la SIL Open Font License (OFL 1.1), que permite mostrarla libremente en navegadores y documentos. Los títulos usan Seravek solo cuando el dispositivo del visitante ya la tiene instalada, como Mac y iPhone. Seravek es una fuente de Adobe Fonts, creada por Eric Olson y distribuida por Process Type Foundry. Nuestro sitio no la carga desde ningún servidor ni la distribuimos. En los demás equipos se usa la fuente del sistema.',
    ],
    s4Title: '4. Activos Exclusivos y Titularidad de Grupo MLP S.A.S.',
    s4: [
      'Pertenecen exclusivamente a Grupo MLP S.A.S. todos los derechos de propiedad intelectual sobre:',
      '- La identidad de marca, logotipos, eslóganes y signos distintivos de la Calculadora de Reúso.',
      '- El diseño de arquitectura de información, layouts y componentes propietarios del sistema de diseño (Design System).',
      '- El modelo matemático, algoritmos de estimación de CO₂ eq evitado y metodología inmutable de factores de emisión.',
      '- La estructura, diagramación y diseño gráfico de los Pasaportes Digitales de Producto (DPP) y reportes ejecutivos generados.',
    ],
    s5Title: '5. Procedimiento de Notificación y Retiro (Notice and Takedown)',
    s5: [
      'Grupo MLP S.A.S. actúa con diligencia preventiva ante cualquier reclamación legítima de derechos de autor.',
      'Si consideras que algún contenido o imagen incorporada vulnera tus derechos de propiedad intelectual, comunícate a:',
    ],
    s5Correo: 'innovacion@lurdes.co',
    s5FormLabel: 'Formulario Oficial de Consultas Legales',
    s5Plazo: 'Revisaremos la solicitud y adoptaremos las medidas procedentes en un término máximo de cinco (5) días hábiles.',
  },
  ENG: {
    titulo: 'Image Banks, Iconography, and Asset Licenses',
    breadcrumb: 'Asset Licenses and Image Banks',
    meta: 'Legal disclosure regarding commercial licenses for free image banks (Unsplash, Pexels, Pixabay, Negative Space, Picjumbo, Shotstash), iconography, and fonts in Reúso.',
    secciones: [
      { id: 'cumplimiento', label: 'Intellectual Property Framework' },
      { id: 'bancos-imagenes', label: 'Stock Image Banks' },
      { id: 'iconografia', label: 'Iconography and Typography' },
      { id: 'propiedad-propia', label: 'Exclusive Proprietary Assets' },
      { id: 'notice-takedown', label: 'Notice and Takedown' },
    ],
    s1Title: '1. Intellectual Property Framework and Legal Compliance',
    s1: [
      'Grupo MLP S.A.S. (Tax ID 901.832.079-1) designs and operates the Calculadora de Reúso under Andean Decision 351 of 1993, Colombian Law 23 of 1982, and WIPO international conventions.',
      'We ensure that every visual, photographic, and iconographic asset deployed throughout our platform carries commercial clearance, permissive open-source licensing, or represents original proprietary work.',
    ],
    s2Title: '2. Permissive Free Image Banks for Commercial Use',
    s2Intro: 'To illustrate case studies, UI graphics, and circular economy learning materials, our platform relies on image repositories operating under royalty-free commercial licenses:',
    bancos: [
      {
        nombre: 'Unsplash',
        licencia: 'Unsplash License',
        url: 'https://unsplash.com/license',
        permisos: 'Commercial and non-commercial use, free and worldwide. Attribution is not required, although it is appreciated.',
        restricciones: 'Photos may not be sold without significant changes, nor used to build a service that competes with Unsplash.',
      },
      {
        nombre: 'Pexels',
        licencia: 'Pexels License',
        url: 'https://www.pexels.com/license/',
        permisos: 'Free commercial use, with or without changes. Attribution is not required.',
        restricciones: 'Unaltered copies may not be sold, nor published on other photo platforms, nor used as a trademark. Do not imply endorsement by people or brands.',
      },
      {
        nombre: 'Pixabay',
        licencia: 'Pixabay Content License',
        url: 'https://pixabay.com/service/license-summary/',
        permisos: 'Free commercial and editorial use. Attribution is not required.',
        restricciones: 'Content may not be sold or distributed on its own without your own creative input, nor used as a trademark.',
      },
      {
        nombre: 'Negative Space',
        licencia: 'Creative Commons Zero (CC0 1.0)',
        url: 'https://negativespace.co/',
        permisos: 'Personal and commercial use, without paying or asking permission. Attribution is not required.',
        restricciones: 'No rights restrictions. Do not present yourself as the author of the photo.',
      },
      {
        nombre: 'Picjumbo',
        licencia: 'Picjumbo Free License',
        url: 'https://picjumbo.com/faq-and-terms/',
        permisos: 'Commercial use, including client work. Attribution is not required, although it is appreciated.',
        restricciones: 'Photos may not be resold. They may be included in templates or designs that are sold, but not as image files. Some photos lack model release.',
      },
      {
        nombre: 'Shotstash',
        licencia: 'Shotstash CC0 License',
        url: 'https://shotstash.com/license/',
        permisos: 'Personal and commercial use, without paying or asking permission. Attribution is not required.',
        restricciones: 'Do not present yourself as the author of the photo. Do not use them for illegal or immoral purposes, or to harm the image of people.',
      },
    ],
    s3Title: '3. Iconography and Typographic Licenses',
    s3: [
      'Lucide Icons (lucide-react): Open-source vector library under the ISC License (permissive and MIT-compatible), authorizing inclusion and modification in commercial software.',
      'Phosphor Icons (@phosphor-icons/react): Open-source icon family licensed under MIT License, granting royalty-free integration.',
      'Typography: we use Open Sans, an open-source font distributed under the SIL Open Font License (OFL 1.1), which allows free display in browsers and documents. Headings use Seravek only when the device of the visitor already has it installed, such as Mac and iPhone. Seravek is an Adobe Fonts typeface created by Eric Olson and distributed by Process Type Foundry. Our site does not load it from any server, and we do not distribute it. Other devices use the system font.',
    ],
    s4Title: '4. Proprietary Assets and Exclusive Ownership',
    s4: [
      'Grupo MLP S.A.S. retains exclusive ownership over:',
      '- Distinctive trademarks, logos, emblems, and slogans of Reúso.',
      '- Proprietary UI architectures, design tokens, and components of our Design System.',
      '- Mathematical emission modeling, calculation algorithms, and immutable emission factor snapshots.',
      '- Layout, design, and formatting of Digital Product Passports (DPP) and generated environmental reports.',
    ],
    s5Title: '5. Notice and Takedown Procedure',
    s5: [
      'Grupo MLP S.A.S. complies proactively with intellectual property enforcement requests.',
      'If you believe any content on the platform infringes upon your copyright, please notify us at:',
    ],
    s5Correo: 'innovacion@lurdes.co',
    s5FormLabel: 'Official Legal Query Form',
    s5Plazo: 'We will assess your claim and take appropriate measures within five (5) business days.',
  },
}

export default function ActivosYLicenciasPage() {
  const lang = 'ES' as const
  const t = T[lang]

  return (
    <LegalPageLayout
      titulo={t.titulo}
      breadcrumbLabel={t.breadcrumb}
      secciones={t.secciones}
      resumen={t.meta}
    >
      {/* 1. Cumplimiento */}
      <section id="cumplimiento">
        <h2 style={h2}>{t.s1Title}</h2>
        {t.s1.map((item, i) => (
          <p key={i} style={p}>
            {item}
          </p>
        ))}
      </section>

      {/* 2. Bancos de imágenes */}
      <section id="bancos-imagenes">
        <h2 style={h2}>{t.s2Title}</h2>
        <p style={p}>{t.s2Intro}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16, marginBottom: 24 }}>
          {t.bancos.map((banco, i) => (
            <div
              key={i}
              style={{
                padding: '16px 20px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {banco.nombre}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--color-brand-light)',
                    color: 'var(--color-brand)',
                    fontFamily: 'monospace',
                  }}
                >
                  {banco.licencia}{banco.url ? <> · <a href={banco.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-brand)' }}>{banco.url}</a></> : null}
                </span>
              </div>
              <p style={{ ...p, fontSize: 13, margin: 0, color: 'var(--text-secondary)' }}>
                <strong>Alcance comercial:</strong> {banco.permisos}
              </p>
              <p style={{ ...p, fontSize: 12, margin: 0, color: 'var(--text-muted)' }}>
                <strong>Límites:</strong> {banco.restricciones}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Iconografía */}
      <section id="iconografia">
        <h2 style={h2}>{t.s3Title}</h2>
        {t.s3.map((item, i) => (
          <p key={i} style={p}>
            {item}
          </p>
        ))}
      </section>

      {/* 4. Propiedad de Grupo MLP */}
      <section id="propiedad-propia">
        <h2 style={h2}>{t.s4Title}</h2>
        {t.s4.map((item, i) => (
          <p key={i} style={p}>
            {item}
          </p>
        ))}
      </section>

      {/* 5. Notificación y retiro */}
      <section id="notice-takedown">
        <h2 style={h2}>{t.s5Title}</h2>
        {t.s5.map((item, i) => (
          <p key={i} style={p}>
            {item}
          </p>
        ))}
        <p style={{ ...p, fontWeight: 600 }}>
          <a href="mailto:innovacion@lurdes.co" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>
            {t.s5Correo}
          </a>
        </p>
        <p style={{ ...p, fontWeight: 600 }}>
          <a href="https://calculadoradereuso.com/legal/dudas" style={{ color: 'var(--color-brand)', textDecoration: 'underline' }}>
            {t.s5FormLabel} →
          </a>
        </p>
        <p style={p}>{t.s5Plazo}</p>
      </section>
    </LegalPageLayout>
  )
}
