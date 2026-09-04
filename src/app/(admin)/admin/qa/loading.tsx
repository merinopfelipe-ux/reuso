// Skeleton a la medida de /admin/qa — 2ª pasada, 2026-09-04. El primer
// intento usaba .skeleton-shimmer (var(--skeleton-base)/--skeleton-shine),
// que depende del atributo data-theme del <html>. Ese atributo todavía NO
// está puesto en el instante exacto en que se pinta un loading.tsx (se
// sincroniza un poco después, vía localStorage/prefers-color-scheme) — en
// ese hueco, si el sistema operativo del usuario prefiere modo oscuro, el
// skeleton cae en los tokens oscuros por defecto sin ningún matiz visible.
// Esta página en concreto (3000+ líneas, el bundle más grande de /admin)
// tarda más en hidratar que el resto, así que ese hueco se nota mucho más
// aquí — bug real reportado ("se ve como un bloque negro"). Corregido
// usando @media (prefers-color-scheme) directo, que el navegador resuelve
// al pintar, sin esperar ningún script — nunca vuelve a "adivinar mal".
const ESTILOS = `
  .qa-loading-page { background: #FFFFFF; }
  .qa-loading-bar { background: rgba(0, 130, 124, 0.07); position: relative; overflow: hidden; }
  .qa-loading-bar::after {
    content: "";
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(0, 130, 124, 0.14), transparent);
    animation: qaLoadingShine 1.6s ease-in-out infinite;
  }
  @media (prefers-color-scheme: dark) {
    .qa-loading-page { background: #474747; }
    .qa-loading-bar { background: rgba(214, 243, 145, 0.08); }
    .qa-loading-bar::after { background: linear-gradient(90deg, transparent, rgba(214, 243, 145, 0.16), transparent); }
  }
  @keyframes qaLoadingShine {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`

function Barra({ w, h, r = 10 }: { w: string | number; h: number; r?: number }) {
  return <div className="qa-loading-bar" style={{ width: w, height: h, borderRadius: r }} />
}

export default function QaLoading() {
  return (
    <div className="qa-loading-page" style={{ minHeight: '100%' }}>
      <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        {/* Header: título + progreso */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col gap-3">
            <Barra w={140} h={18} r={999} />
            <Barra w={260} h={30} r={12} />
            <Barra w={320} h={14} r={8} />
          </div>
          <Barra w={240} h={72} r={16} />
        </div>

        {/* Sidebar de categorías + lista de pruebas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 flex flex-col gap-2.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Barra key={i} w="100%" h={58} r={12} />
            ))}
          </div>
          <div className="lg:col-span-8 flex flex-col gap-3">
            <Barra w={260} h={36} r={10} />
            {Array.from({ length: 5 }).map((_, i) => (
              <Barra key={i} w="100%" h={60} r={16} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
