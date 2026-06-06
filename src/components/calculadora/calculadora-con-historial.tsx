'use client'

import { useState, Suspense } from 'react'
import { Calculadora } from './calculadora'
import { HistorialCalculos } from './historial-calculos'
import type { Rol } from '@/types'
import type { Categoria, Item } from '@/types'

interface CategoriaConItems extends Categoria { items: Item[] }

interface Props {
  categorias: CategoriaConItems[]
  rol: Rol
  historialInicial: Parameters<typeof HistorialCalculos>[0]['calculos']
  historialTotal: number
  nombresCategorias: string[]
  empresas?: { id: string; nombre: string }[]
}

export function CalculadoraConHistorial({ categorias, rol, historialInicial, historialTotal, nombresCategorias, empresas }: Props) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      {categorias.length > 0 && (
        <Calculadora
          categorias={categorias}
          rol={rol}
          onGuardado={() => setRefreshKey(k => k + 1)}
        />
      )}
      <Suspense fallback={
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Cargando historial...</p>
        </div>
      }>
        <HistorialCalculos
          calculos={historialInicial}
          total={historialTotal}
          rol={rol}
          categorias={nombresCategorias}
          empresas={empresas}
          refreshKey={refreshKey}
        />
      </Suspense>
    </>
  )
}
