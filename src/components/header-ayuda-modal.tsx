'use client'

import { useRouter } from 'next/navigation'
import {
  CircleHelp as Question,
} from 'lucide-react'

export function HeaderAyudaModal() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/ayuda')}
      style={circleButtonStyle}
      aria-label="Centro de ayuda"
      className="icon-circle"
    >
      <Question size={20} />
    </button>
  )
}

const circleButtonStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: '50%',
  border: 'none', background: 'var(--bg-card)',
  color: 'var(--text-secondary)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', padding: 0,
  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
  transition: 'all 0.2s',
}
