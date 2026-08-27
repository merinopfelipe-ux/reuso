'use client'

import { useEffect, useRef, useState } from 'react'

interface GooglePlace {
  formatted_address?: string
  name?: string
}

interface GoogleAutocomplete {
  addListener: (event: string, handler: () => void) => void
  getPlace: () => GooglePlace
}

interface GooglePlaces {
  Autocomplete: new (inputField: HTMLInputElement, opts?: Record<string, unknown>) => GoogleAutocomplete
}

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: GooglePlaces
      }
    }
  }
}

interface InputDireccionProps {
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  paisCodigo?: string
  paisNombre?: string
  region?: string
  ciudad?: string
}

export function InputDireccion({ value, onChange, disabled, paisCodigo }: InputDireccionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<GoogleAutocomplete | null>(null)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

  useEffect(() => {
    function initAutocomplete() {
      if (!window.google?.maps?.places || !inputRef.current) return
      if (autocompleteRef.current) return

      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        ...(paisCodigo ? { componentRestrictions: { country: paisCodigo.toLowerCase() } } : {}),
      })

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace()
        if (place?.formatted_address) {
          onChange(place.formatted_address)
        } else if (place?.name) {
          onChange(place.name)
        }
      })
    }

    if (window.google?.maps?.places) {
      initAutocomplete()
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setApiKeyMissing(true)
      return
    }

    const existingScript = document.getElementById('google-maps-script')
    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = initAutocomplete
      document.head.appendChild(script)
    } else {
      existingScript.addEventListener('load', initAutocomplete)
    }
  }, [paisCodigo, onChange])

  return (
    <div className="relative w-full flex flex-col gap-1">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ej: Calle 10 # 40-50"
        className="w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors outline-none focus:border-[var(--color-brand)]"
        style={{
          background: 'var(--surface, var(--bg-input))',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.6 : 1,
        }}
      />
      {apiKeyMissing && (
        <p className="text-[10px] text-[var(--color-error)]">
          Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local para usar el autocompletado de Maps.
        </p>
      )}
    </div>
  )
}
