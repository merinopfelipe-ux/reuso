/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Migración de dominio (2026-09-05): reuso.lurdes.co sigue apuntando al
  // mismo proyecto de Vercel, así que en vez de servir la app ahí también,
  // cualquier visita a ese host redirige de forma permanente al dominio de
  // marca — protege links viejos ya impresos/indexados (QR de certificados,
  // resultados de Google) para que no queden rotos.
  async redirects() {
    // ── Vanity URLs de redes sociales ────────────────────────────────────────
    // Permiten compartir URLs cortas y memorables en eventos, tarjetas y
    // presentaciones: calculadoradereuso.com/instagram → perfil oficial.
    // Lo mismo aplica en creuso.app (ver creuso-app-redirect/vercel.json).
    const redesSociales = [
      { source: '/instagram', destination: 'https://www.instagram.com/calculadoradereuso', permanent: true },
      { source: '/linkedin',  destination: 'https://www.linkedin.com/company/calculadora-de-reuso', permanent: true },
      { source: '/youtube',   destination: 'https://www.youtube.com/@calculadoradereuso', permanent: true },
    ]

    return [
      // Migración de dominio (2026-09-05)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'reuso.lurdes.co' }],
        destination: 'https://calculadoradereuso.com/:path*',
        permanent: true,
      },
      ...redesSociales,
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              // Analítica (solo carga si la persona acepta las cookies "Analíticas"):
              // Google Analytics 4 y Microsoft Clarity. Sin estos orígenes en
              // script-src/connect-src/img-src el navegador los bloquea en silencio
              // (Clarity nunca arrancaba, GA4 tampoco enviaba datos). 2026-09-21.
              "default-src 'self'",
              process.env.NODE_ENV === 'development'
              ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://cdn.tailwindcss.com https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms https://va.vercel-scripts.com"
              : "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.tailwindcss.com https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms https://va.vercel-scripts.com",
              // p.typekit.net es de donde Typekit sirve el CSS real, no
              // use.typekit.net (esa es solo el link inicial que lo pide) —
              // sin esto, el navegador bloquea la hoja de estilos real y la
              // tipografía Seravek nunca carga (bug real, mismo que ya se
              // había corregido en reuso-landing/next.config.mjs).
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://use.typekit.net https://p.typekit.net",
              "font-src 'self' https://fonts.gstatic.com https://use.typekit.net https://p.typekit.net https://fonts.typekit.net",
              "img-src 'self' data: blob: https://*.supabase.co https://cdn.jsdelivr.net https://images.unsplash.com https://*.google-analytics.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com",
              "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://generativelanguage.googleapis.com https://api.groq.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com",
              "frame-src https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      // /verificar no se indexa
      {
        source: '/verificar/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },

  images: {
    // Blindaje contra GHSA-2xp9-vwfh-vxw4: solo procesar WebP, nunca AVIF
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        // Fotos de stock de la landing (secciones Soluciones e Industrias).
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default nextConfig
