// Único ítem de la lista prioritaria de rutas de alto tráfico (junto a
// categorías/usuarios/leads/empresas) que todavía no tenía su propio
// loading.tsx — completado 2026-09-04 al documentar el skeleton como
// regla obligatoria para todo el sistema.
export default function StatusLoading() {
  return (
    <div className="p-6 md:p-10 w-full flex flex-col gap-6">
      <div className="skeleton-shimmer w-full max-w-[240px] h-10 rounded-xl" />
      <div className="skeleton-shimmer w-full max-w-[420px] h-4 rounded-lg" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
