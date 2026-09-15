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
  robots: { index: true, follow: true },
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
  openGraph: {
    title: 'calculadoradereuso.com - Medición de Impacto Ambiental',
    description: 'Mide y comunica el CO₂ evitado cuando reutilizas objetos.',
    url: 'https://calculadoradereuso.com',
    siteName: 'calculadoradereuso.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'es_CO',
    type: 'website',
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
        <link rel="stylesheet" href="https://use.typekit.net/ggf2dir.css" />
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
