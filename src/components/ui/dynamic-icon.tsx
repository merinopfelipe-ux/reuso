'use client'

import { useMemo } from 'react'
import dynamicImport from 'next/dynamic'
import { Truck } from '@/components/ui/icons'
import { parsearIcono } from '@/lib/icono-nombre'

type AnyIconComponent = React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; weight?: string }>

/**
 * Renderiza por nombre cualquier ícono guardado como texto (mismo valor que
 * produce IconPicker) — Lucide sin prefijo (formato de siempre) o Phosphor
 * con prefijo "phosphor:" (ver src/lib/icono-nombre.ts, necesario porque 762
 * nombres coinciden exactamente entre ambas librerías con diseño distinto).
 * Carga bajo demanda vía next/dynamic (no import() suelto en un useEffect)
 * para no cargar todos los íconos de la librería en el bundle inicial de las
 * páginas públicas que usan este componente, y porque next/dynamic es el
 * mecanismo de code-splitting propio de Next, más robusto en Turbopack ante
 * HMR que un import() crudo (ese patrón viejo producía "module factory is
 * not available" real y repetible en /admin/categorias). Si el nombre no
 * existe o todavía está cargando, cae en Truck (el default de "Recogemos y
 * entregamos gratis").
 */
export function DynamicIcon({ nombre, size = 16, className }: { nombre?: string | null; size?: number; className?: string }) {
  const Comp = useMemo<AnyIconComponent | null>(() => {
    if (!nombre) return null
    const { libreria, nombre: nombreIcono } = parsearIcono(nombre)
    if (libreria === 'phosphor') {
      return dynamicImport(() => import('@phosphor-icons/react').then(mod => {
        const c = (mod as unknown as Record<string, AnyIconComponent>)[nombreIcono]
        return c ?? Truck
      }), { loading: () => <Truck size={size} className={className} strokeWidth={1.3} /> })
    }
    return dynamicImport(() => import('lucide-react').then(mod => {
      const c = (mod as unknown as Record<string, AnyIconComponent>)[nombreIcono]
      return c ?? Truck
    }), { loading: () => <Truck size={size} className={className} strokeWidth={1.3} /> })
  }, [nombre, size, className])

  const { libreria } = nombre ? parsearIcono(nombre) : { libreria: 'lucide' }
  const propsLibreria = libreria === 'phosphor' ? { weight: 'regular' } : { strokeWidth: 1.3 }

  if (!Comp) return <Truck size={size} className={className} strokeWidth={1.3} />
  return <Comp size={size} className={className} {...propsLibreria} />
}
