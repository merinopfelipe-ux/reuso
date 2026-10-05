import type { Metadata } from 'next'
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
  // Los íconos los detecta Next.js automáticamente desde src/app/ por
  // convención: favicon.ico, icon.svg y apple-icon.png. No se declaran a mano
  // para evitar links duplicados o rutas que apunten a archivos inexistentes.
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Seravek: los títulos piden `seravek`, la fuente del sistema en Apple
            (Mac/iPhone); en el resto cae a Open Sans (propia, public/fonts, con
            font-display: swap). Sin <link rel="preload"> de la fuente a propósito:
            Chrome espera a las fuentes precargadas antes del primer pintado y eso
            retrasaba el FCP en celular de 0.4 s a 1.5 s (medido 2026-10-05). */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // Día o noche lo decide SIEMPRE la configuración del dispositivo
            // (directriz de Felipe, 2026-10-04). Sin botón de tema y sin
            // preferencia guardada: se borra cualquier elección vieja.
            try { localStorage.removeItem('theme'); localStorage.removeItem('reuso-theme'); } catch (e) {}
            var mq = window.matchMedia('(prefers-color-scheme: dark)');
            var aplicar = function() { document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light'); };
            aplicar();
            if (mq.addEventListener) mq.addEventListener('change', aplicar); else if (mq.addListener) mq.addListener(aplicar);
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
        {process.env.VERCEL === '1' && <Analytics />}
        {process.env.VERCEL === '1' && <SpeedInsights />}
        <GoogleAnalytics />
        <MicrosoftClarity />
      </body>
    </html>
  )
}
