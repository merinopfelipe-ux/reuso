import type { MetadataRoute } from 'next'

// robots.txt real (antes no existía ninguno). /verificar/[codigo] queda
// bloqueado porque cada código de un informe es una URL única de una
// empresa puntual, no contenido genérico para indexar (mismo criterio que
// noindex de metadata en esa ruta, ver skill seguridad-reuso). El resto de
// rutas autenticadas ((dashboard)/(empresa)/(admin)/settings/ayuda) también
// se excluyen explícitamente: no aportan nada a un buscador y exponen
// estructura interna.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/faq', '/eventos'],
      disallow: [
        '/admin/',
        '/api/',
        '/dashboard/',
        '/empresa/',
        '/settings/',
        '/ayuda/',
        '/cotizador/',
        '/informes/',
        '/propuesta/',
        '/login',
        '/registro',
        '/recuperar',
        '/verificar/',
        '/pasaporte/',
        '/invitacion/',
        '/sistema-diseno',
        '/ppt',
        '/legal/',
      ],
    },
    sitemap: 'https://calculadoradereuso.com/sitemap.xml',
  }
}
