'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Trash } from '@/components/ui/icons'

interface Conteo {
  empresa: string
  usuarios: number
  filas: Record<string, number>
  archivos: number | null
}

// Nombres legibles para las tablas principales. Lo que no esté aquí se suma en "Otros registros".
const ETIQUETAS: Record<string, string> = {
  calculos: 'Cálculos',
  certificados: 'Certificados e informes',
  tickets: 'Tickets de soporte',
  crm_clientes: 'Clientes',
  crm_cotizaciones: 'Cotizaciones',
  crm_muebles_cotizados: 'Muebles cotizados',
  dpp_activos: 'Activos DPP',
  dpp_ciclos: 'Ciclos DPP',
  invitaciones: 'Invitaciones',
  modulos_empresas: 'Módulos asignados',
  integraciones_empresa: 'Integraciones',
  metas: 'Metas',
}

export function EliminarEmpresaClient({ empresaId, nombre }: { empresaId: string; nombre: string }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [conteo, setConteo] = useState<Conteo | null>(null)
  const [cargando, setCargando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState('')

  async function abrir() {
    setAbierto(true)
    setTexto('')
    setError('')
    setConteo(null)
    setCargando(true)
    const res = await fetch(`/api/admin/empresas/${empresaId}/eliminar`)
    const data = await res.json().catch(() => ({}))
    setCargando(false)
    if (!res.ok) {
      setError(data.error ?? 'No se pudo calcular qué se borraría.')
      return
    }
    setConteo(data as Conteo)
  }

  function cerrar() {
    if (borrando) return
    setAbierto(false)
  }

  async function eliminar() {
    if (texto !== nombre) return
    setBorrando(true)
    setError('')
    const res = await fetch(`/api/admin/empresas/${empresaId}/eliminar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmacion: texto }),
    })
    const data = await res.json().catch(() => ({}))
    setBorrando(false)
    if (!res.ok) {
      setError(data.error ?? 'No se pudo eliminar la empresa.')
      return
    }
    setAbierto(false)
    router.push('/admin/empresas')
    router.refresh()
  }

  const filas = conteo?.filas ?? {}
  const otros = Object.entries(filas)
    .filter(([tabla]) => !ETIQUETAS[tabla])
    .reduce((suma, [, n]) => suma + n, 0)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-(--text-secondary) m-0">
        Borra la empresa con todo lo asociado: cálculos, clientes, cotizaciones, tickets, usuarios y sus cuentas de acceso. No se puede deshacer.
      </p>
      <div>
        <Button variant="danger" size="sm" onClick={abrir} icon={<Trash size={13} />}>
          Eliminar empresa
        </Button>
      </div>

      <Modal
        abierto={abierto}
        onClose={cerrar}
        titulo={`Eliminar ${nombre}`}
        icono={<Trash size={22} />}
        colorIcono="var(--color-error)"
        varianteConfirmar="error"
        textoCancelar="Cancelar"
        textoConfirmar={borrando ? 'Eliminando...' : 'Eliminar para siempre'}
        onConfirmar={eliminar}
        onCancelar={cerrar}
        confirmarDeshabilitado={texto !== nombre || borrando || cargando || !conteo}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-(--text-secondary) m-0">
            Esta acción borra la empresa de forma definitiva, junto con todo lo que tiene asociado. Los ítems del catálogo se conservan.
          </p>

          {cargando && <p className="text-sm text-(--text-secondary) m-0">Calculando lo que se borraría...</p>}

          {conteo && (
            <ul className="text-sm text-(--text-primary) m-0 pl-5 list-disc flex flex-col gap-1">
              <li>{conteo.usuarios} {conteo.usuarios === 1 ? 'usuario y su cuenta de acceso' : 'usuarios y sus cuentas de acceso'}</li>
              {Object.entries(filas)
                .filter(([tabla]) => ETIQUETAS[tabla])
                .map(([tabla, n]) => (
                  <li key={tabla}>{n} {ETIQUETAS[tabla]}</li>
                ))}
              {otros > 0 && <li>{otros} otros registros</li>}
              {conteo.archivos !== null && <li>{conteo.archivos} archivos en Storage (carpeta de la empresa y sus archivos)</li>}
            </ul>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmar-eliminar-empresa" className="text-sm text-(--text-primary)">
              Escribe <strong>{nombre}</strong> para borrarlo definitivamente
            </label>
            <input
              id="confirmar-eliminar-empresa"
              type="text"
              autoComplete="off"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-(--border) bg-(--bg-input) text-sm text-(--text-primary)"
            />
          </div>

          {error && <p className="text-sm m-0 text-error">{error}</p>}
        </div>
      </Modal>
    </div>
  )
}
