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

export function ThemeToggle({ size = 'md' }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = (saved === 'dark' || saved === 'light') ? saved === 'dark' : prefersDark
    setIsDark(dark)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    setMounted(true)
  }, [])

  function manejarToggle() {
    const siguiente = !isDark
    setIsDark(siguiente)
    document.documentElement.setAttribute('data-theme', siguiente ? 'dark' : 'light')
    localStorage.setItem('theme', siguiente ? 'dark' : 'light')
  }

  const dimension = size === 'sm' ? 26 : 32
  const iconSize = size === 'sm' ? 16 : 20

  if (!mounted) {
    return (
      <div
        style={{
          width: dimension,
          height: dimension,
          borderRadius: '50%',
          border: '1px solid var(--border-light)',
          background: 'rgba(0, 130, 124, 0.06)',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={manejarToggle}
      aria-label={isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      title={isDark ? 'Modo día' : 'Modo noche'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dimension,
        height: dimension,
        borderRadius: '50%',
        border: '1px solid var(--border-light)',
        background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 130, 124, 0.06)',
        color: isDark ? '#D6F391' : '#00827C',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0,
        opacity: 1,
      }}
      className="hover-press"
    >
      <SpinIcon toggled={isDark} duration={400} size={iconSize} />
    </button>
  )
}


