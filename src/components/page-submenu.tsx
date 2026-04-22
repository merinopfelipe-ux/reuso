'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SubmenuItem {
  href: string
  label: string
}

interface PageSubmenuProps {
  items: SubmenuItem[]
  activeHash?: string
}

export function PageSubmenu({ items, activeHash: initialHash }: PageSubmenuProps) {
  const pathname = usePathname()
  const [activeHash, setActiveHash] = useState(initialHash ?? '')
  const rafRef = useRef<number | null>(null)
  // Cuando el usuario hace clic en un ítem, bloqueamos el scroll-tracker
  // por 800ms para que el clic no sea sobreescrito inmediatamente
  const clickLockRef = useRef(false)
  const clickLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setActiveHash(window.location.hash || initialHash || '')

    const ids = items
      .filter((item) => item.href.includes('#'))
      .map((item) => item.href.split('#')[1])

    if (ids.length === 0) return

    const THRESHOLD = 168

    function calcActive() {
      if (clickLockRef.current) return

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80

      if (atBottom) {
        // Al fondo de la página: marcar el último ítem que esté visible en pantalla
        let lastVisible = ids[0]
        for (const id of ids) {
          const el = document.getElementById(id)
          if (!el) continue
          const top = el.getBoundingClientRect().top
          if (top < window.innerHeight) lastVisible = id
        }
        setActiveHash(`#${lastVisible}`)
        return
      }

      // Caso normal: la última sección cuyo borde superior pasó el umbral
      let active = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= THRESHOLD) {
          active = id
        }
      }
      setActiveHash(`#${active}`)
    }

    calcActive()

    function onScroll() {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        calcActive()
        rafRef.current = null
      })
    }

    function onHashChange() {
      // Clic en un enlace de ancla: bloquear el tracker 800ms
      clickLockRef.current = true
      if (clickLockTimer.current) clearTimeout(clickLockTimer.current)
      clickLockTimer.current = setTimeout(() => {
        clickLockRef.current = false
      }, 800)
      setActiveHash(window.location.hash || '')
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('hashchange', onHashChange)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hashchange', onHashChange)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (clickLockTimer.current) clearTimeout(clickLockTimer.current)
    }
  }, [items, initialHash])

  function isActive(href: string) {
    if (href.includes('#')) {
      const [path, hash] = href.split('#')
      return pathname === path && activeHash === `#${hash}`
    }
    return pathname === href
  }

  return (
    <nav
      aria-label="Navegación de sección"
      style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 180 }}
    >
      {items.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'block',
              padding: '10px 16px',
              borderRight: active ? '3px solid var(--color-brand)' : '3px solid transparent',
              color: active ? 'var(--color-brand)' : 'var(--text-secondary)',
              fontWeight: active ? 700 : 400,
              fontSize: 14,
              textDecoration: 'none',
              borderRadius: '8px 0 0 8px',
              background: active ? 'var(--color-brand-light)' : 'transparent',
              transition: 'all 0.15s',
              lineHeight: 1.4,
            }}
            className="page-submenu-item"
          >
            {item.label}
          </Link>
        )
      })}
      <style dangerouslySetInnerHTML={{ __html: `
        .page-submenu-item:hover {
          color: var(--color-brand) !important;
          background: var(--color-brand-light) !important;
        }
      `}} />
    </nav>
  )
}
