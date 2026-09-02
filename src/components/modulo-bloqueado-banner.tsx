'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Modal } from '@/components/ui/modal'

// Lee ?modulo_bloqueado=cotizador|dpp|calculo (lo pone src/middleware.ts al
// bloquear el acceso a un módulo sin plan) y muestra el Modal del sistema de
// diseño explicando qué se gana con ese módulo, en vez de perderse en
// silencio como pasaba antes (el query param existía pero nada lo leía).
// Un solo componente para los 3 casos, cambia solo el texto según el valor.

const COPY: Record<string, { titulo: string; descripcion: string }> = {
  cotizador: {
    titulo: 'Cotizador Inteligente no está en tu plan',
    descripcion: 'Sube una foto y la IA identifica el mueble, calcula el precio y el CO2 evitado por unidad, automático.',
  },
  dpp: {
    titulo: 'Pasaporte Digital de Producto no está en tu plan',
    descripcion: 'Cada pieza restaurada lleva su historia completa, trazable de principio a fin.',
  },
  calculo: {
    titulo: 'Cálculo de huella no está en tu plan',
    descripcion: 'Mide el CO2 y el agua que evitas cada vez que reutilizas un objeto.',
  },
}

function ModuloBloqueadoBannerInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const modulo = searchParams.get('modulo_bloqueado')
  const copy = modulo ? COPY[modulo] : null

  if (!copy) return null

  function cerrar() {
    router.replace(window.location.pathname)
  }

  return (
    <Modal
      abierto
      onClose={cerrar}
      titulo={copy.titulo}
      descripcion={copy.descripcion}
      textoConfirmar="Ver planes"
      onConfirmar={() => router.push('/empresa/nueva')}
    />
  )
}

export function ModuloBloqueadoBanner() {
  return (
    <Suspense fallback={null}>
      <ModuloBloqueadoBannerInner />
    </Suspense>
  )
}
