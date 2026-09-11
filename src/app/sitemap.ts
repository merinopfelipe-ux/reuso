import type { MetadataRoute } from 'next'

// sitemap.xml real (antes no existía ninguno). Solo páginas públicas y
// estáticas — las rutas dinámicas por código/token (/verificar/[codigo],
// /pasaporte/[codigo], /propuesta/[token]) quedan fuera a propósito, cada
// una es una URL única de una empresa puntual, no contenido genérico.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://calculadoradereuso.com'
  const hoy = new Date()

  // Solo páginas indexables (todo el árbol /legal y rutas autenticadas son noindex)
  const paginas = [
    { ruta: '', prioridad: 1.0, changeFrequency: 'weekly' as const },
  ]

  return paginas.map(({ ruta, prioridad, changeFrequency }) => ({
    url: `${base}${ruta}`,
    lastModified: hoy,
    changeFrequency,
    priority: prioridad,
  }))
}
