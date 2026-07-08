'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Sun, Moon, Question } from '@/components/ui/icons'

export function LegalHeader() {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDark(theme === 'dark')
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const headerBg = isDark ? 'rgba(71, 71, 71, 0.5)' : 'rgba(255, 255, 255, 0.5)'

  function toggleDark() {
    const next = !isDark
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: headerBg,
        backdropFilter: 'blur(8px) saturate(180%)',
        WebkitBackdropFilter: 'blur(8px) saturate(180%)',
        borderBottom: isDark
          ? '1px solid rgba(255, 255, 255, 0.15)'
          : '1.5px solid rgba(0, 130, 124, 0.1)',
        padding: '0 32px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      {/* Izquierda: cerrar → home con tooltip */}
      <Link href="/" className="legal-header-btn">
        <X size={18} strokeWidth={2.5} />
        <span className="legal-tooltip legal-tooltip--bottom">Volver al inicio</span>
      </Link>

      {/* Centro: logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Image
          src="/logo-completo.svg"
          alt="Calculadora de Reúso"
          width={140}
          height={40}
          priority
          style={{ 
            objectFit: 'contain',
            filter: mounted && isDark ? 'brightness(0) invert(1)' : 'none'
          }}
        />
      </Link>

      {/* Derecha: tema + ayuda */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={toggleDark}
          className="legal-header-btn"
          aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          {mounted && isDark ? <Sun size={18} strokeWidth={2.5} /> : <Moon size={18} strokeWidth={2.5} />}
          <span className="legal-tooltip legal-tooltip--bottom">
            {mounted && isDark ? 'Modo día' : 'Modo noche'}
          </span>
        </button>
        
        <Link href="/legal/dudas" className="legal-header-btn">
          <Question size={18} strokeWidth={2.5} />
          <span className="legal-tooltip legal-tooltip--bottom">Tengo una duda</span>
        </Link>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .legal-header-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-primary);
          cursor: pointer;
          flex-shrink: 0;
          position: relative;
        }

        [data-theme="light"] .legal-header-btn {
          background: rgba(255, 255, 255, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.5);
          color: #474747;
        }
        [data-theme="light"] .legal-header-btn:hover {
          background: rgba(0, 130, 124, 0.1);
          color: #00827C;
        }

        [data-theme="dark"] .legal-header-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #FFFFFF;
        }
        [data-theme="dark"] .legal-header-btn:hover {
          background: #D6F391;
          color: #474747;
          border-color: transparent;
        }

        .legal-tooltip {
          position: absolute;
          background: transparent;
          color: var(--text-primary);
          border: none;
          box-shadow: none;
          font-size: 11px;
          font-weight: 700;
          padding: 0;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.18s ease;
          z-index: 100;
        }
        
        .legal-tooltip--bottom {
          top: calc(100% + 20px);
          left: 50%;
          transform: translateX(-50%);
        }

        .legal-header-btn:hover .legal-tooltip { opacity: 1; }
      `}} />
    </header>
  )
}
