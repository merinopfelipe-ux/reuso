'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Modal } from '@/components/ui/modal'

// Lee ?modulo_bloqueado=cotizador|dpp|calculo (lo pone src/proxy.ts al
// bloquear el acceso a un módulo sin plan) y muestra el Modal del sistema de
// diseño explicando qué se gana con ese módulo, en vez de perderse en
// silencio como pasaba antes (el query param existía pero nada lo leía).
// Un solo componente para los 3 casos, cambia solo el texto según el valor.

// ejemplo: 2 o 3 líneas inventadas, muy cortas, solo para mostrar qué se ve con el módulo.
const COPY: Record<string, { titulo: string; descripcion: string; ejemplo: string[] }> = {
  cotizador: {
    titulo: 'Cotizador Inteligente no está en tu plan',
    descripcion: 'Sube una foto y la IA identifica el mueble, calcula el precio y el CO2 evitado por unidad, automático.',
    ejemplo: ['Mesa de comedor restaurada', 'Cliente de ejemplo', 'Total: $ 1.250.000'],
  },
  dpp: {
    titulo: 'Pasaporte Digital de Producto no está en tu plan',
    descripcion: 'Cada pieza restaurada lleva su historia completa, trazable de principio a fin.',
    ejemplo: ['Silla restaurada, ciclo 2', 'Historia completa y trazable'],
  },
  calculo: {
    titulo: 'Cálculo de huella no está en tu plan',
    descripcion: 'Mide el CO2 y el agua que evitas cada vez que reutilizas un objeto.',
    ejemplo: ['Estantería reutilizada', 'CO₂ y agua evitados, estimados'],
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
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
        <span style={{ fontWeight: 700 }}>Ejemplo ilustrativo: no son datos reales</span>
        {copy.ejemplo.map((linea) => (
          <span key={linea}>{linea}</span>
        ))}
      </div>
    </Modal>
  )
}

export function ModuloBloqueadoBanner() {
  return (
    <Suspense fallback={null}>
      <ModuloBloqueadoBannerInner />
    </Suspense>
  )
}
