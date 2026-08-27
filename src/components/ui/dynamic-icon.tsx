'use client'

import { useMemo } from 'react'
import dynamicImport from 'next/dynamic'
import { Truck } from '@/components/ui/icons'

type LucideComponent = React.ComponentType<{ size?: number; className?: string }>

/**
 * Renderiza por nombre cualquier ícono de Lucide guardado como texto (mismo
 * valor que produce IconPicker) — carga bajo demanda vía next/dynamic (no
 * import() suelto en un useEffect) para no cargar los ~1500 íconos de
 * lucide-react en el bundle inicial de las páginas públicas que usan este
 * componente, y porque next/dynamic es el mecanismo de code-splitting propio
 * de Next, más robusto en Turbopack ante HMR que un import() crudo (ese
 * patrón viejo producía "module factory is not available" real y repetible
 * en /admin/categorias). Si el nombre no existe o todavía está cargando, cae
 * en Truck (el default de "Recogemos y entregamos gratis").
 */
export function DynamicIcon({ nombre, size = 16, className }: { nombre?: string | null; size?: number; className?: string }) {
  const Comp = useMemo<LucideComponent | null>(() => {
    if (!nombre) return null
    return dynamicImport(() => import('lucide-react').then(mod => {
      const c = (mod as unknown as Record<string, LucideComponent>)[nombre]
      return c ?? Truck
    }), { loading: () => <Truck size={size} className={className} /> })
  }, [nombre, size, className])

  if (!Comp) return <Truck size={size} className={className} />
  return <Comp size={size} className={className} />
}
