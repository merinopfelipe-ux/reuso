'use client'

import { useEffect, useState, useCallback } from 'react'
import { VistaCotizador, vistaPorDefecto } from './vistas'

// Vistas guardadas de /empresa/cotizador: personales de quien las crea, en
// este navegador — no se comparten entre vendedores de la misma empresa
// (decisión explícita, evita el problema de permisos/colisión de vistas
// compartidas entre varios usuarios, que nadie pidió resolver). Se separan
// por empresa_id para que un super_admin viendo distintas empresas no vea
// las vistas de una mezcladas con las de otra.
function claveStorage(empresaId: string | null): string {
  return `reuso_vistas_cotizador_${empresaId ?? 'sin_empresa'}`
}

function leer(empresaId: string | null): VistaCotizador[] {
  if (typeof window === 'undefined') return [vistaPorDefecto()]
  try {
    const raw = window.localStorage.getItem(claveStorage(empresaId))
    if (!raw) return [vistaPorDefecto()]
    let parsed = JSON.parse(raw) as VistaCotizador[]
    // Forzar que la vista por defecto siempre ordene por Fecha de creación descendente,
    // para limpiar cachés viejos donde esto quedó diferente (pedido explícito del usuario).
    parsed = parsed.map(v => {
      if (v.id === 'default') {
        return { ...v, orden: { campo: 'created_at', dir: 'desc' } }
      }
      return v
    })
    return parsed.length > 0 ? parsed : [vistaPorDefecto()]
  } catch {
    return [vistaPorDefecto()]
  }
}

function persistir(empresaId: string | null, vistas: VistaCotizador[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(claveStorage(empresaId), JSON.stringify(vistas))
}

export function useVistas(empresaId: string | null) {
  const [vistas, setVistas] = useState<VistaCotizador[]>([vistaPorDefecto()])
  const [vistaActivaId, setVistaActivaId] = useState('default')
  // Copia de trabajo: lo que se está editando ahora mismo, antes de "Guardar".
  const [borrador, setBorrador] = useState<VistaCotizador>(vistaPorDefecto())

  useEffect(() => {
    const cargadas = leer(empresaId)
    setVistas(cargadas)
    const activa = cargadas[0]
    setVistaActivaId(activa.id)
    setBorrador(activa)
  }, [empresaId])

  const vistaGuardada = vistas.find(v => v.id === vistaActivaId) ?? vistaPorDefecto()
  const sinGuardar = JSON.stringify(borrador) !== JSON.stringify(vistaGuardada)

  const cambiarVistaActiva = useCallback((id: string) => {
    const v = vistas.find(x => x.id === id)
    if (!v) return
    setVistaActivaId(id)
    setBorrador(v)
  }, [vistas])

  const guardar = useCallback(() => {
    setVistas(prev => {
      const existe = prev.some(v => v.id === borrador.id)
      const nuevas = existe ? prev.map(v => v.id === borrador.id ? borrador : v) : [...prev, borrador]
      persistir(empresaId, nuevas)
      return nuevas
    })
  }, [borrador, empresaId])

  const crear = useCallback((nombre: string) => {
    const nueva: VistaCotizador = { ...borrador, id: crypto.randomUUID(), nombre }
    setVistas(prev => {
      const nuevas = [...prev, nueva]
      persistir(empresaId, nuevas)
      return nuevas
    })
    setVistaActivaId(nueva.id)
    setBorrador(nueva)
  }, [borrador, empresaId])

  const duplicar = useCallback(() => {
    crear(`${borrador.nombre} (copia)`)
  }, [borrador, crear])

  const renombrar = useCallback((id: string, nombre: string) => {
    setVistas(prev => {
      const nuevas = prev.map(v => v.id === id ? { ...v, nombre } : v)
      persistir(empresaId, nuevas)
      return nuevas
    })
    setBorrador(prev => prev.id === id ? { ...prev, nombre } : prev)
  }, [empresaId])

  const eliminar = useCallback((id: string) => {
    if (id === 'default') return
    setVistas(prev => {
      const nuevas = prev.filter(v => v.id !== id)
      persistir(empresaId, nuevas)
      if (vistaActivaId === id) {
        setVistaActivaId('default')
        setBorrador(nuevas.find(v => v.id === 'default') ?? vistaPorDefecto())
      }
      return nuevas
    })
  }, [empresaId, vistaActivaId])

  return { vistas, vistaActivaId, borrador, setBorrador, sinGuardar, cambiarVistaActiva, guardar, crear, duplicar, eliminar, renombrar }
}
