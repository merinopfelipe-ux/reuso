'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from '@/components/ui/icons'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    // 'system' es un valor válido guardado desde /settings — ahí se resuelve
    // a la preferencia del sistema operativo, igual que cuando no hay nada
    // guardado (bug real corregido 2026-09-02, antes 'system' se leía como
    // "no es dark" y forzaba modo claro sin importar el sistema operativo).
    const dark = (saved === 'dark' || saved === 'light') ? saved === 'dark' : prefersDark
    setIsDark(dark)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: 'none',
        background: 'var(--bg-card)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flexShrink: 0,
        padding: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}
      className="theme-toggle-circle hover-rotate-180 hover-press"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
      <style>{`
        .theme-toggle-circle:hover {
          background: rgba(0,0,0,0.03);
          transform: scale(1.05);
        }
      `}</style>
    </button>
  )
}
