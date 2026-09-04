// Primitivas de "cargando" reutilizables — antes cada pantalla improvisaba
// su propio estado de carga (texto plano "Cargando...", animate-pulse con
// colores distintos cada vez, o nada visible), reportado como parte de la
// queja de "el sistema se siente lento". Un solo lugar, un solo look,
// reusa la clase .skeleton-shimmer que ya usan los loading.tsx de cada
// grupo de rutas — no se inventa una animación nueva.

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton-shimmer ${className}`} style={{ height: 14, ...style }} />
}

export function SkeletonCard({ lineas = 3, className = '' }: { lineas?: number; className?: string }) {
  const anchos = ['100%', '80%', '60%', '90%', '70%']
  return (
    <div className={`rounded-[12px] border p-4 bg-[var(--bg-card)] border-[var(--border)] space-y-2.5 ${className}`}>
      {Array.from({ length: lineas }).map((_, i) => (
        <Skeleton key={i} style={{ width: anchos[i % anchos.length], height: i === 0 ? 16 : 12 }} />
      ))}
    </div>
  )
}

// Lista de N tarjetas skeleton — reemplaza el patrón repetido
// `[1,2,3].map(i => <div className="animate-pulse ..." />)` que aparecía
// distinto en cada pantalla.
export function SkeletonLista({ filas = 3 }: { filas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: filas }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

// Fallback genérico para el loading.tsx de una subruta que todavía no
// tiene un skeleton a la medida de su contenido real — Regla de Oro #4
// del CLAUDE.md ("skeleton obligatorio, nunca pantalla congelada"). No
// imita la forma exacta de cada pantalla (eso sigue siendo lo ideal,
// ver SkeletonCard/SkeletonLista arriba), solo evita el hueco en blanco
// mientras el servidor resuelve. Cada loading.tsx que lo usa queda en
// una sola línea: `export { PaginaLoadingGenerico as default } from
// '@/components/ui/skeleton'`.
export function PaginaLoadingGenerico() {
  return (
    <div className="p-6 md:p-10 w-full flex flex-col gap-6">
      <Skeleton style={{ width: 220, height: 32, borderRadius: 12 }} />
      <SkeletonLista filas={3} />
    </div>
  )
}
