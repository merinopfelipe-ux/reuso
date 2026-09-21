import type { MetadataRoute } from 'next'

// sitemap.xml generado dinámicamente por Next.js — accesible en /sitemap.xml.
// Solo páginas públicas e indexables. Quedan fuera a propósito:
//   - Rutas dinámicas (/verificar/[codigo], /pasaporte/[codigo], /propuesta/[token])
//     → son URLs únicas por empresa, no contenido genérico para buscadores.
//   - Árbol /legal → noindex (políticas internas, no de valor SEO).
//   - Rutas autenticadas → protegidas por sesión, no indexables.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://calculadoradereuso.com'
  const hoy = new Date()

  const paginas: { ruta: string; prioridad: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { ruta: '',         prioridad: 1.0, changeFrequency: 'weekly'  },
    { ruta: '/faq',     prioridad: 0.8, changeFrequency: 'monthly' },
    // /eventos es una landing de captura de leads ligada a eventos presenciales;
    // se indexa para que quienes busquen el evento nos encuentren, pero con
    // prioridad baja porque no compite con el home en keywords de sostenibilidad.
    { ruta: '/eventos', prioridad: 0.5, changeFrequency: 'weekly'  },
  ]

  return paginas.map(({ ruta, prioridad, changeFrequency }) => ({
    url: `${base}${ruta}`,
    lastModified: hoy,
    changeFrequency,
    priority: prioridad,
  }))
}
