'use client'

import { useEffect, useState, useId } from 'react'

interface SpinIconProps {
  toggled: boolean
  duration?: number
  size?: number | string
}

function SpinIcon({ toggled, duration = 400, size = 20 }: SpinIconProps) {
  const toggleId = useId()
  const clipMainId = `toggles-dev-spin-${toggleId.replace(/:/g, '')}`

  const rays = [
    'M12 1.4v2.4',
    'm20.3 3.7-2.5 2.5',
    'M22.6 12h-2.4',
    'M12 22.6v-2.4',
    'M1.4 12h2.4',
    'm20.3 20.3-2.5-2.5',
    'm3.7 20.3 2.5-2.5',
    'm3.7 3.7 2.5 2.5',
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        display: 'block',
        overflow: 'visible',
      }}
    >
      <defs>
        <clipPath id={clipMainId}>
          <path
            d={toggled ? 'M0 2h13a1 1 0 0010 10v14H0Z' : 'M0 0h25a1 1 0 0010 10v14H0Z'}
            style={{
              transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              transitionDelay: toggled ? `${duration * 0.15}ms` : '0ms',
            }}
          />
        </clipPath>
      </defs>
      <g stroke="currentColor" strokeLinecap="round">
        <circle
          cx={12}
          cy={12}
          r={5}
          fill="currentColor"
          clipPath={`url(#${clipMainId})`}
          style={{
            transformOrigin: '12px 12px',
            transform: toggled ? 'scale(1.7)' : 'scale(1)',
            transition: `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        />
        {rays.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeMiterlimit={0}
            style={{
              transformOrigin: '12px 12px',
              transform: toggled ? 'rotate(45deg) scale(0)' : 'rotate(0deg) scale(1)',
              opacity: toggled ? 0 : 1,
              transition: `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${duration}ms ease`,
              transitionDelay: toggled ? '0ms' : `${duration * 0.15}ms`,
            }}
          />
        ))}
      </g>
    </svg>
  )
}

interface ThemeToggleProps {
  size?: 'sm' | 'md'
}

// Interruptor día/noche. Al cargar manda SIEMPRE la configuración del
// dispositivo (script del layout raíz) y el cambio manual dura solo mientras
// la página está abierta: no se guarda en ningún lado (directriz de Felipe,
// 2026-10-05). Tipo switch para que se entienda; la perilla conserva el ícono
// animado de sol/luna.
export function ThemeToggle({ size = 'md' }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const leer = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    leer()
    setMounted(true)
    const observer = new MutationObserver(leer)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  function manejarToggle() {
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark')
  }

  const perilla = size === 'sm' ? 22 : 28
  const iconSize = size === 'sm' ? 14 : 18
  const ancho = perilla * 2 + 4
  const alto = perilla + 4

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={manejarToggle}
      aria-label={isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      title={isDark ? 'Modo día' : 'Modo noche'}
      className="hover-press"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: ancho,
        height: alto,
        padding: 0,
        borderRadius: 999,
        border: '1px solid var(--border-light)',
        background: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 130, 124, 0.10)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.3s',
        visibility: mounted ? 'visible' : 'hidden',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 1,
          left: 1,
          width: perilla,
          height: perilla,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDark ? '#D6F391' : '#FFFFFF',
          color: isDark ? '#474747' : '#00827C',
          boxShadow: '0 1px 3px rgba(71, 71, 71, 0.25)',
          transform: isDark ? `translateX(${perilla}px)` : 'translateX(0)',
          transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), background 0.3s',
        }}
      >
        <SpinIcon toggled={isDark} duration={400} size={iconSize} />
      </span>
    </button>
  )
}
