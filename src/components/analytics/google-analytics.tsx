'use client'

import Script from 'next/script'
import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Analítica web (checklist de 19 fundamentales, 2026-09-05): Google Analytics
// se activa solo si la persona aceptó la categoría "Analíticas" del banner de
// cookies (usa cookies propias de Google, _ga/_gid) — Vercel Analytics, en
// cambio, no usa cookies y se monta sin este condicionamiento (ver layout.tsx).
const CONSENT_KEY = 'reuso_cookies_consent'
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

function leerConsentimientoAnalitico(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return false
    const data = JSON.parse(raw) as { a?: boolean }
    return !!data.a
  } catch {
    return false
  }
}

function GoogleAnalyticsPageview({ gaId }: { gaId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
    if (!gtag) return
    const query = searchParams.toString()
    gtag('config', gaId, { page_path: query ? `${pathname}?${query}` : pathname })
  }, [pathname, searchParams, gaId])

  return null
}

export function GoogleAnalytics() {
  const [permitido, setPermitido] = useState(false)

  useEffect(() => {
    setPermitido(leerConsentimientoAnalitico())
    function actualizar(e: Event) {
      const detalle = (e as CustomEvent<{ analitica: boolean }>).detail
      setPermitido(!!detalle?.analitica)
    }
    window.addEventListener('reuso_cookies_consent_saved', actualizar)
    return () => window.removeEventListener('reuso_cookies_consent_saved', actualizar)
  }, [])

  useEffect(() => {
    if (!GA_ID) return
    // Interruptor oficial de Google para apagar el envío de datos sin
    // necesidad de recargar la página cuando la persona revoca el permiso.
    ;(window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = !permitido
  }, [permitido])

  if (!GA_ID) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window['ga-disable-${GA_ID}'] = ${!permitido};
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `,
        }}
      />
      <Suspense fallback={null}>
        <GoogleAnalyticsPageview gaId={GA_ID} />
      </Suspense>
    </>
  )
}
