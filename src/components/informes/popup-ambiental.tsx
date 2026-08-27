'use client'

import { Leaf } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'

interface Props {
  url: string
  onClose: () => void
}

export function PopupAmbiental({ url, onClose }: Props) {
  const handleDescargar = () => {
    window.open(url, '_blank')
    onClose()
  }

  return (
    <Modal
      abierto
      onClose={onClose}
      icono={<Leaf size={24} className="text-[var(--color-success-content)]" />}
      titulo="Cuidar el planeta es un compromiso de todos"
      descripcion="Este documento cuenta con un Sello de Seguridad Digital y verificación QR que nosotros usamos para proteger tus datos y garantizar que nunca sean alterados. No es necesario imprimirlo, úsalo y compártelo de forma 100% digital."
      textoCancelar="Prefiero no descargarlo"
      textoConfirmar="Descargar PDF"
      onConfirmar={handleDescargar}
      onCancelar={onClose}
    />
  )
}
