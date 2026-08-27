'use client'

import { useState } from 'react'
import { ZoomIn } from '@/components/ui/icons'
import { ModalImagenZoom } from '@/components/ui/modal-imagen-zoom'

interface Props {
  src: string
  alt: string
  // Tamaño, forma y recorte del recuadro (w-*, h-*, rounded-*, flex-shrink-0...).
  wrapperClassName?: string
  // Cómo se ajusta la foto dentro del recuadro — object-cover/object-contain,
  // w-full/h-auto, etc. Se pasa aparte porque no todas las pantallas recortan
  // igual (miniaturas cuadradas vs. la imagen completa sin recortar).
  imgClassName?: string
  loading?: 'lazy' | 'eager'
}

/**
 * Toda foto real del sistema (nunca logos ni íconos decorativos) debe poder
 * ampliarse: lupa visible al pasar el mouse o tocar, clic/tap abre el visor
 * a pantalla completa. Regla explícita del usuario, 2026-08-27, aplicada de
 * forma rigurosa en todo el proyecto — "ninguna foto sin esa opción".
 *
 * Un solo componente en vez de repetir overlay + estado de zoom en cada
 * pantalla (antes cada una tenía su propio patrón, algunas sin lupa visible,
 * solo `cursor-zoom-in` sin ningún indicio visual al pasar el mouse).
 */
export function ImagenAmpliable({ src, alt, wrapperClassName, imgClassName, loading }: Props) {
  const [abierta, setAbierta] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={`Ampliar imagen: ${alt}`}
        className={`group relative overflow-hidden cursor-zoom-in ${wrapperClassName ?? ''}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          loading={loading}
          className={imgClassName ?? 'w-full h-full object-cover object-center'}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-[#474747]/0 group-hover:bg-[#474747]/35 transition-colors duration-150">
          <span className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-150 shadow-lg">
            <ZoomIn size={16} className="text-[#474747]" sinAnimacion />
          </span>
        </span>
      </button>
      <ModalImagenZoom imagenUrl={abierta ? src : null} onClose={() => setAbierta(false)} />
    </>
  )
}
