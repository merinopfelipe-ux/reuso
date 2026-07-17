'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { PageSubmenu } from '@/components/page-submenu'

interface SeccionItem {
  id: string
  label: string
}

interface LegalSubmenuProps {
  secciones: SeccionItem[]
  titulo?: string
}

export function LegalSubmenu({ secciones, titulo = '' }: LegalSubmenuProps) {
  const pathname = usePathname()
  const [activeHash, setActiveHash] = useState('')

  useEffect(() => {
    setActiveHash(window.location.hash || '')
    const onHashChange = () => setActiveHash(window.location.hash || '')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const items = secciones.map((s) => ({
    href: `${pathname}#${s.id}`,
    label: s.label,
  }))

  return (
    <aside
      style={{
        flexShrink: 0,
        width: 180,
      }}
    >
      {titulo && (
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            marginBottom: 8,
            paddingLeft: 16,
          }}
        >
          {titulo}
        </p>
      )}
      <PageSubmenu items={items} activeHash={activeHash} />
    </aside>
  )
}
