import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Estado del sistema',
  robots: {
    index: false,
    follow: false,
  },
}

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
