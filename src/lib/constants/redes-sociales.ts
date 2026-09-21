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
    handle: '/calculadora-de-reuso',
    href: 'https://www.linkedin.com/company/calculadora-de-reuso',
    // WCAG 2.5.3: el aria-label debe contener el texto visible (el handle)
    ariaLabel: 'LinkedIn /calculadora-de-reuso — Ver perfil',
  },
  {
    id: 'youtube',
    nombre: 'YouTube',
    handle: '/calculadoradereuso',
    href: 'https://www.youtube.com/@calculadoradereuso',
    ariaLabel: 'YouTube /calculadoradereuso — Ver canal',
  },
  {
    id: 'instagram',
    nombre: 'Instagram',
    handle: '@calculadoradereuso',
    href: 'https://www.instagram.com/calculadoradereuso',
    ariaLabel: 'Instagram @calculadoradereuso — Ver perfil',
  },
]
