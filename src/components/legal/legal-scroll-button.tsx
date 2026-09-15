'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowDown } from '@/components/ui/icons'

export function LegalScrollButton() {
  const [isAtBottom, setIsAtBottom] = useState(false)
  const [bottomOffset, setBottomOffset] = useState(28)

  const handleScroll = useCallback(() => {
    const footer = document.getElementById('site-footer')
    if (footer) {
      const rect = footer.getBoundingClientRect()
      const windowHeight = window.innerHeight
      // Altura del footer visible en pantalla desde el borde inferior
      const footerVisibleHeight = windowHeight - rect.top

      // El icono se detiene al mismo nivel que terminan las cards de "Lee también"
      // El padding inferior de legal-outer es 48px, por lo que sumamos 48 al footer visible
      if (footerVisibleHeight > 0) {
        setBottomOffset(footerVisibleHeight + 48)
      } else {
        setBottomOffset(28)
      }

      // Al llegar al footer o al final de la página, el icono gira y apunta hacia arriba
      if (footerVisibleHeight > 0 || (windowHeight + window.scrollY >= document.documentElement.scrollHeight - 80)) {
        setIsAtBottom(true)
      } else {
        setIsAtBottom(false)
      }
    } else {
      setBottomOffset(28)
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      const scrollY = window.scrollY || window.pageYOffset
      setIsAtBottom(windowHeight + scrollY >= docHeight - 120)
    }
  }, [])

  useEffect(() => {
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [handleScroll])

  const handleClick = () => {
    if (isAtBottom) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Sí vas hasta el final
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={isAtBottom ? 'Ir al inicio' : 'Ir al final'}
        aria-label={isAtBottom ? 'Ir al inicio' : 'Ir al final'}
        style={{
          position: 'fixed',
          bottom: bottomOffset,
          left: 28,
          zIndex: 200,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid rgba(0,130,124,0.20)',
          boxShadow: '0 2px 12px rgba(71,71,71,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--color-brand)',
          transition: 'box-shadow 0.2s, background-color 0.2s',
        }}
        className="legal-scroll-bottom-btn"
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isAtBottom ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <ArrowDown size={18} />
        </span>
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .legal-scroll-bottom-btn:hover {
          box-shadow: 0 4px 16px rgba(0,130,124,0.25);
          background-color: var(--color-brand-light);
        }
        @media (max-width: 768px) {
          .legal-scroll-bottom-btn { display: none; }
        }
      `}} />
    </>
  )
}
