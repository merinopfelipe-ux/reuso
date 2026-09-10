'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

// Microsoft Clarity (mapas de calor + grabaciones de sesión). Igual que Google
// Analytics: usa cookies propias (_clck, _clsk) y solo se carga si la persona
// aceptó la categoría "Analíticas" del banner de cookies. Vercel Analytics, en
// cambio, no usa cookies y se monta siempre (ver layout.tsx).
const CONSENT_KEY = 'reuso_cookies_consent'
// El id de proyecto de Clarity es público (aparece en el código de la página),
// no es un secreto. Se deja fijo aquí para no depender de otra variable de
// entorno — si algún día se cambia de proyecto, se edita esta línea.
const CLARITY_ID = 'ygc9g90epg'

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

export function MicrosoftClarity() {
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
    // Interruptor oficial de Clarity: si la persona revoca el permiso después
    // de haber cargado el script, deja de rastrear sin recargar la página.
    const clarity = (window as unknown as { clarity?: (...args: unknown[]) => void }).clarity
    if (clarity) clarity('consent', permitido)
  }, [permitido])

  if (!CLARITY_ID || !permitido) return null

  return (
    <Script
      id="microsoft-clarity-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `,
      }}
    />
  )
}
