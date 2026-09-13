// Compartido entre `GrupoItemCard` (Cotizador) y `DppItemCard` (DPP) — ambas
// tarjetas editan filas de "nombre + valor numérico" (servicios/insumos/
// materiales) con el mismo look, antes cada archivo tenía su propia copia
// idéntica de estas dos clases.
export const inputSt = 'px-3 py-2 rounded-xl border text-sm bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] w-full focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all'
export const rowInputSt = 'bg-transparent border-none p-0 outline-none focus:ring-0 text-sm font-medium text-[var(--text-primary)] min-w-[80px]'
