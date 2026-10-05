'use client'

// Sin botón de tema (directriz de Felipe, 2026-10-04): día o noche lo decide
// SIEMPRE la configuración del dispositivo, aplicada por el script del layout
// raíz (src/app/layout.tsx). El componente se conserva vacío para que las
// páginas que lo importan (login, registro, footers, pasaporte...) no cambien.
interface ThemeToggleProps {
  size?: 'sm' | 'md'
}

export function ThemeToggle(props: ThemeToggleProps) {
  void props
  return null
}
