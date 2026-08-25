import { useEffect, useState } from 'react'

/**
 * Carga una sola vez el mapa { nombre: descripcion } de los 8 materiales
 * base del Cotizador — compartido por las 5 pantallas que muestran
 * materiales. `conEmpresa` es la misma función que cada pantalla ya usa
 * para anexar `?empresa_id=` cuando aplica (super_admin operando por
 * cuenta de una empresa).
 */
export function useMaterialDescripciones(conEmpresa: (url: string) => string) {
  const [descripciones, setDescripciones] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelado = false
    fetch(conEmpresa('/api/cotizador/material-descripciones'))
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelado && d) setDescripciones(d.descripciones ?? {}) })
      .catch(() => {})
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return descripciones
}
