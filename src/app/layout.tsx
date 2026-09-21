import type { Metadata } from 'next'
import './globals.css'
import NextTopLoader from 'nextjs-toploader'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { AlertasProvider } from '@/components/alertas/alertas-provider'
import { ToastProvider } from '@/components/toast-provider'
import { CookieBanner } from '@/components/legal/cookie-banner'
import { GoogleAnalytics } from '@/components/analytics/google-analytics'
import { MicrosoftClarity } from '@/components/analytics/microsoft-clarity'

export const metadata: Metadata = {
  metadataBase: new URL('https://calculadoradereuso.com'),
  title: {
    default: 'calculadoradereuso.com - Medición de Impacto Ambiental',
    template: '%s - calculadoradereuso.com',
  },
  description: 'Mide y comunica el CO₂ evitado cuando reutilizas objetos.',
  // Bloqueamos indexación globalmente por defecto; solo / y /faq sobrescriben
  // con robots: { index: true } en su propia metadata de página.
  robots: { index: false, follow: false },
  // Apaga el ícono de "descargar imagen" que Edge superpone al pasar el
  // mouse sobre cualquier <img> — no es algo que agreguemos nosotros, es un
  // comportamiento nativo del navegador, y aquí no aplica (fotos de
  // cotización dentro de la app autenticada, no contenido para descargar).
  other: { edge: 'no-image-actions', 'p:domain_verify': '2bbca349f7127cd43464aa3906c5b72b' },
  verification: { google: 'PCrWZ6koqycbUa-4rxqzVwD8cli1_bJxXbr0QxpJVAQ' },
  icons: {
    icon: '/logo-icono.svg',
    apple: '/logo-icono.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Adelanta la conexión a Typekit (Seravek): el CSS sale de use.typekit.net
            y las letras de p.typekit.net. Open Sans ya es propia (public/fonts). */}
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://p.typekit.net" />
        <link rel="preload" href="/fonts/open-sans-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Seravek (Typekit) sin bloquear el primer pintado: se inyecta con
            media="print" y pasa a "all" al cargar. Mientras llega, el texto usa
            Open Sans (ya es propia) y luego cambia a Seravek. */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){var l=document.createElement('link');l.rel='stylesheet';
          l.href='https://use.typekit.net/ggf2dir.css';l.media='print';
          l.onload=function(){l.media='all'};document.head.appendChild(l)})();
        ` }} />
        <noscript><link rel="stylesheet" href="https://use.typekit.net/ggf2dir.css" /></noscript>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var saved = localStorage.getItem('theme');
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            var theme = (saved === 'dark' || saved === 'light') ? saved : (prefersDark ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', theme);
          })();
        ` }} />
        {/* Google Consent Mode v2: se fija ANTES de cargar gtag.js. Todo
            arranca en 'denied' (sin cookies); GoogleAnalytics sube a 'granted'
            solo si la persona acepta la categoría "Analíticas" del banner. */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500
          });
        ` }} />
      </head>
      <body>
        <NextTopLoader 
          color="#00827C" 
          showSpinner={false} 
          height={3} 
          shadow="none" 
          zIndex={49}
        />
        <ToastProvider>
          <AlertasProvider>{children}</AlertasProvider>
        </ToastProvider>
        <CookieBanner />
        {/* Analítica web (checklist 19 fundamentales, 2026-09-05). Vercel
            Analytics y Speed Insights no usan cookies ni datos personales, se
            activan siempre. Google Analytics (_ga/_gid) y Microsoft Clarity
            (_clck/_clsk) sí usan cookies y solo se cargan si la persona aceptó
            la categoría "Analíticas" del banner de cookies. */}
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics />
        <MicrosoftClarity />
      </body>
    </html>
  )
}
