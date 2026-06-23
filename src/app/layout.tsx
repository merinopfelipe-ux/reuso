import type { Metadata } from 'next'
import './globals.css'
import NextTopLoader from 'nextjs-toploader'
import { AlertasProvider } from '@/components/alertas/alertas-provider'
import { ToastProvider } from '@/components/toast-provider'
import { CookieBanner } from '@/components/legal/cookie-banner'

export const metadata: Metadata = {
  metadataBase: new URL('https://reuso.lurdes.co'),
  title: {
    default: 'reuso.lurdes.co - Certificación de Impacto Ambiental',
    template: '%s - reuso.lurdes.co',
  },
  description: 'Mide, certifica y comunica el CO₂ evitado cuando reutilizas objetos.',
  robots: { index: false, follow: false },
  icons: {
    icon: '/logo-icono.svg',
    apple: '/logo-icono.svg',
  },
  openGraph: {
    title: 'reuso.lurdes.co - Certificación de Impacto Ambiental',
    description: 'Mide, certifica y comunica el CO₂ evitado cuando reutilizas objetos.',
    url: 'https://reuso.lurdes.co',
    siteName: 'reuso.lurdes.co',
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
            var theme = saved ? saved : (prefersDark ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', theme);
          })();
        ` }} />
      </head>
      <body>
        <NextTopLoader 
          color="#00827C" 
          showSpinner={false} 
          height={3} 
          shadow="none" 
          zIndex={1600}
        />
        <ToastProvider>
          <AlertasProvider>{children}</AlertasProvider>
        </ToastProvider>
        <CookieBanner />
      </body>
    </html>
  )
}
