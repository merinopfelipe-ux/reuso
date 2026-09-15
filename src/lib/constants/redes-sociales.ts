// ─── Enlaces a Redes Sociales Oficiales ──────────────────────────────────────
// Por ahora dirigen al home de cada plataforma.
// Orden estricto definido: LinkedIn, YouTube, Facebook, TikTok, Instagram.

export interface RedSocialItem {
  id: 'linkedin' | 'youtube' | 'instagram'
  nombre: string
  handle: string
  href: string
  ariaLabel: string
}

export const REDES_SOCIALES_DEFAULT: RedSocialItem[] = [
  {
    id: 'linkedin',
    nombre: 'LinkedIn',
    handle: '/calculadoradereuso',
    href: 'https://www.linkedin.com/company/calculadoradereuso/',
    ariaLabel: 'Visitar nuestro perfil en LinkedIn',
  },
  {
    id: 'youtube',
    nombre: 'YouTube',
    handle: '/calculadoradereuso',
    href: 'https://www.youtube.com/@calculadoradereuso',
    ariaLabel: 'Visitar nuestro canal en YouTube',
  },
  {
    id: 'instagram',
    nombre: 'Instagram',
    handle: '@calculadoradereuso',
    href: 'https://www.instagram.com/calculadoradereuso',
    ariaLabel: 'Visitar nuestro perfil en Instagram',
  },
]
