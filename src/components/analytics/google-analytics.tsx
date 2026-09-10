'use client'

import Script from 'next/script'
import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Analítica web (checklist de 19 fundamentales, 2026-09-05).
//
// Google Analytics 4 con Consent Mode v2:
//   - gtag.js se carga SIEMPRE, pero arranca con `analytics_storage: 'denied'`.
//     En ese estado NO escribe cookies (_ga/_gid) ni identifica al visitante:
//     manda "pings" anónimos y sin cookies que Google usa para modelar el
//     tráfico. Esto es lo que la ley permite sin consentimiento previo.
//   - Cuando la persona acepta la categoría "Analíticas" del banner, se hace
//     `consent update` a 'granted' y a partir de ahí sí hay medición completa
//     con cookies. Si la revoca, vuelve a 'denied' sin recargar la página.
//
// Vercel Analytics y Speed Insights no usan cookies y se montan sin este
// condicionamiento (ver layout.tsx). Microsoft Clarity NO tiene un modo
// sin cookies equivalente, así que ese sí solo se carga con consentimiento
// (ver microsoft-clarity.tsx).
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
    gtag('event', 'page_view', {
      page_path: query ? `${pathname}?${query}` : pathname,
      send_to: gaId,
    })
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
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
    if (!gtag) return
    // Sube o baja el nivel de consentimiento en vivo, sin recargar.
    gtag('consent', 'update', {
      analytics_storage: permitido ? 'granted' : 'denied',
    })
  }, [permitido])

  if (!GA_ID) return null

  // El `consent default: denied` se fija antes que nada en el <head> del
  // layout raíz (script inline, junto al del tema) — así gtag.js nunca llega
  // a correr sin saber que arranca en modo sin cookies.
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
      <Suspense fallback={null}>
        <GoogleAnalyticsPageview gaId={GA_ID} />
      </Suspense>
    </>
  )
}
