import type { MetadataRoute } from 'next'

// sitemap.xml real (antes no existía ninguno). Solo páginas públicas y
// estáticas — las rutas dinámicas por código/token (/verificar/[codigo],
// /pasaporte/[codigo], /propuesta/[token]) quedan fuera a propósito, cada
// una es una URL única de una empresa puntual, no contenido genérico.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://reuso.lurdes.co'
  const hoy = new Date()

  const paginas = [
    { ruta: '', prioridad: 1 },
    { ruta: '/legal', prioridad: 0.5 },
    { ruta: '/legal/medicion', prioridad: 0.8 },
    { ruta: '/legal/terminos', prioridad: 0.3 },
    { ruta: '/legal/privacidad', prioridad: 0.3 },
    { ruta: '/legal/datos', prioridad: 0.3 },
    { ruta: '/legal/cookies', prioridad: 0.3 },
    { ruta: '/legal/reglamento', prioridad: 0.3 },
    { ruta: '/legal/confidencialidad', prioridad: 0.3 },
    { ruta: '/legal/ia', prioridad: 0.3 },
    { ruta: '/legal/dudas', prioridad: 0.3 },
  ]

  return paginas.map(({ ruta, prioridad }) => ({
    url: `${base}${ruta}`,
    lastModified: hoy,
    changeFrequency: ruta === '' ? 'weekly' : 'monthly',
    priority: prioridad,
  }))
}
