'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export function PageTransitionLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const prevPathRef = useRef(pathname)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Mostrar al hacer clic en links internos
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return
      if (href === pathname) return
      clearTimeout(hideTimer.current)
      clearTimeout(fadeTimer.current)
      setFading(false)
      setVisible(true)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  // Ocultar cuando llega la nueva página
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname
      clearTimeout(hideTimer.current)
      clearTimeout(fadeTimer.current)
      // Mínimo 400ms para que el loader se vea
      hideTimer.current = setTimeout(() => {
        setFading(true)
        fadeTimer.current = setTimeout(() => {
          setVisible(false)
          setFading(false)
        }, 400)
      }, 400)
    }
  }, [pathname])

  if (!visible) return null

  const accent = isDark ? '#D6F391' : '#00827C'
  const bg = isDark ? '#474747' : '#FFFFFF'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {/* Arco exterior - gira hacia adelante */}
        <svg
          width="120" height="120"
          viewBox="0 0 96 96"
          style={{ position: 'absolute', inset: 0, animation: 'spin-cw 1.4s linear infinite' }}
        >
          <circle
            cx="48" cy="48" r="44"
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="90 186"
            strokeDashoffset="0"
            opacity="0.9"
          />
        </svg>

        {/* Arco interior - gira hacia atrás, más lento */}
        <svg
          width="120" height="120"
          viewBox="0 0 96 96"
          style={{ position: 'absolute', inset: 0, animation: 'spin-ccw 2.2s linear infinite' }}
        >
          <circle
            cx="48" cy="48" r="34"
            fill="none"
            stroke={accent}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="40 174"
            strokeDashoffset="0"
            opacity="0.45"
          />
        </svg>

        {/* Nodos del circuito - puntos estáticos sobre el arco exterior */}
        <svg
          width="120" height="120"
          viewBox="0 0 96 96"
          style={{ position: 'absolute', inset: 0, animation: 'spin-cw 1.4s linear infinite' }}
        >
          {[0, 120, 240].map((deg, i) => {
            const rad = (deg * Math.PI) / 180
            const x = 48 + 44 * Math.cos(rad)
            const y = 48 + 44 * Math.sin(rad)
            return <circle key={i} cx={x} cy={y} r="3" fill={accent} opacity={i === 0 ? 1 : 0.5} />
          })}
        </svg>

        {/* Logo icono centrado */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Image
            src="/logo-icono.svg"
            alt="Calculadora de Reúso"
            width={44}
            height={44}
            className={isDark ? 'logo-dark-invert' : ''}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin-cw  { from { transform: rotate(0deg);    } to { transform: rotate(360deg);  } }
        @keyframes spin-ccw { from { transform: rotate(0deg);    } to { transform: rotate(-360deg); } }
      `}</style>
    </div>
  )
}
