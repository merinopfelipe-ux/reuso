import React from 'react'

interface BanderaProps {
  codigo: string
  alt?: string
  className?: string
  style?: React.CSSProperties
}

export function Bandera({ codigo, alt = '', className = '', style }: BanderaProps) {
  if (!codigo) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3/${codigo.toLowerCase()}.svg`}
      alt={alt}
      className={`inline-block object-cover ${className}`}
      style={{
        width: 16,
        height: 11,
        borderRadius: '2px',
        border: '1px solid rgba(0,0,0,0.15)',
        ...style,
      }}
    />
  )
}
