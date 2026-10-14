'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, TriangleAlert as Warning, Download } from '@/components/ui/icons'
import { BotonDescargarCliente } from '@/components/boton-descargar-cliente'
import { CasillaCabecera, CasillaFila, BarraSeleccion } from '@/components/tabla/seleccion'
import { MenuFila } from '@/components/tabla/menu-fila'
import { Modal } from '@/components/ui/modal'
import { formatFecha, formatNumero } from '@/lib/format'

const C = {
  brand: 'var(--color-brand)', dark: 'var(--text-primary)', mid: 'var(--text-secondary)',
  border: 'var(--border)', light: 'var(--bg-hover)',
  error: 'var(--color-error)',
}

interface Calculo {
  id: string
  user_id: string
  empresa_id: string | null
  fecha: string
  total_co2: number
  total_agua: number
  estado: string | null
  motivo_anulacion: string | null
  anulado_en: string | null
  created_at: string
  profiles: { nombre: string; apellido: string | null } | null
  empresas: { nombre: string } | null
}

export function CalculosAdminClient({ calculos: inicial, total }: { calculos: Calculo[]; total: number }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [calculos, setCalculos] = useState(inicial)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'anulado'>('todos')
  // Selección en grupo: solo filas visibles. Anular en grupo aplica el mismo motivo a todas.
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [anulandoGrupo, setAnulandoGrupo] = useState(false)
  const [errorGrupo, setErrorGrupo] = useState('')

  const filtrados = filtroEstado === 'todos' ? calculos : calculos.filter(c => (c.estado ?? 'activo') === filtroEstado)

  const todasPagina = filtrados.length > 0 && filtrados.every(c => seleccion.has(c.id))
  const algunasPagina = filtrados.some(c => seleccion.has(c.id))
  const seleccionados = filtrados.filter(c => seleccion.has(c.id))
  const seleccionadosActivos = seleccionados.filter(c => (c.estado ?? 'activo') === 'activo')

  function toggleTodas() {
    setSeleccion(prev => {
      const siguiente = new Set(prev)
      if (todasPagina) filtrados.forEach(c => siguiente.delete(c.id))
      else filtrados.forEach(c => siguiente.add(c.id))
      return siguiente
    })
  }

  function toggleFila(id: string) {
    setSeleccion(prev => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  function filasSeleccionadas() {
    return seleccionados.map(c => ({
      Fecha: formatFecha(c.fecha),
      Usuario: c.profiles ? `${c.profiles.nombre}${c.profiles.apellido ? ` ${c.profiles.apellido}` : ''}` : '-',
      Empresa: c.empresas?.nombre ?? '',
      'CO₂eq (kg)': c.total_co2,
      'Agua (m³)': c.total_agua / 1000,
      Estado: (c.estado ?? 'activo') === 'activo' ? 'Activo' : 'Anulado',
    }))
  }

  // Anula varios cálculos con un PATCH por cálculo y el mismo motivo.
  async function anularGrupo() {
    if (motivo.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres.')
      return
    }
    setGuardando(true); setError('')
    const ids = seleccionadosActivos.map(c => c.id)
    const resultados = await Promise.all(
      ids.map(id =>
        fetch(`/api/admin/calculos?id=${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo_anulacion: motivo }),
        })
          .then(r => r.ok)
          .catch(() => false)
      )
    )
    const exitosos = new Set(ids.filter((_, i) => resultados[i]))
    setCalculos(prev => prev.map(c => (exitosos.has(c.id) ? { ...c, estado: 'anulado', motivo_anulacion: motivo } : c)))
    const fallidos = ids.length - exitosos.size
    setGuardando(false)
    setAnulandoGrupo(false)
    setMotivo('')
    setSeleccion(new Set())
    if (fallidos > 0) setErrorGrupo(`No se pudieron anular ${fallidos} de ${ids.length} cálculos.`)
    startTransition(() => router.refresh())
  }

  async function confirmarAnulacion() {
    if (!anulando || motivo.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres.')
      return
    }
    setGuardando(true); setError('')
    const res = await fetch(`/api/admin/calculos?id=${anulando}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo_anulacion: motivo }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Ocurrió un error.')
    } else {
      setCalculos(prev => prev.map(c => c.id === anulando ? { ...c, estado: 'anulado', motivo_anulacion: motivo } : c))
      setAnulando(null); setMotivo('')
      startTransition(() => router.refresh())
    }
    setGuardando(false)
  }

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Filtros + total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: C.mid }}>{total} registros totales</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['todos', 'activo', 'anulado'] as const).map(f => (
            <button key={f} onClick={() => setFiltroEstado(f)}
              className="hover-pop"
              style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${filtroEstado === f ? C.brand : C.border}`, background: filtroEstado === f ? C.light : 'var(--bg-card)', color: filtroEstado === f ? C.brand : C.mid, transition: 'all 0.2s' }}>
              {f === 'todos' ? 'Todos' : f === 'activo' ? 'Activos' : 'Anulados'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 16 }}>
          <Calculator size={40} color={C.border} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>Sin resultados</p>
        </div>
      ) : (
        <>
        <BarraSeleccion cantidad={seleccionados.length} singular="cálculo" plural="cálculos" femenino={false}>
          <BotonDescargarCliente
            data={filasSeleccionadas()}
            nombre="calculos_seleccionados"
            tituloPdf="Cálculos seleccionados"
            label="Exportar"
            icon={<Download size={14} />}
          />
          {seleccionadosActivos.length > 0 && (
            <button
              type="button"
              onClick={() => { setMotivo(''); setError(''); setAnulandoGrupo(true) }}
              className="text-sm font-semibold px-3 py-1.5 bg-transparent text-error transition-opacity duration-200 hover:opacity-50"
            >
              Anular
            </button>
          )}
        </BarraSeleccion>
        {errorGrupo && <p className="text-sm m-0 mb-3 text-error">{errorGrupo}</p>}
        <div className="rounded-card border border-(--border) bg-(--bg-card) overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-(--bg-table-header) text-brand">
                  <CasillaCabecera todas={todasPagina} algunas={algunasPagina} onToggle={toggleTodas} />
                  <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Fecha</th>
                  <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Usuario</th>
                  <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Empresa</th>
                  <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">CO₂eq</th>
                  <th className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">Agua</th>
                  <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Estado</th>
                  <th className="px-1 py-2.5 w-8" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
              {filtrados.map((c, idx) => {
                const activo = (c.estado ?? 'activo') === 'activo';
                return (
                  <tr
                    key={c.id}
                    className={`cursor-pointer transition-colors duration-150 hover:bg-(--bg-table-hover) ${
                      idx % 2 === 1 ? 'bg-(--bg-zebra)' : 'bg-(--bg-card)'
                    }`}
                    style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none', opacity: activo ? 1 : 0.55 }}
                  >
                    <CasillaFila marcada={seleccion.has(c.id)} onToggle={() => toggleFila(c.id)} label={`Seleccionar cálculo de ${formatFecha(c.fecha)}`} />
                    <td className="px-4 py-3 whitespace-nowrap text-(--text-secondary) text-center">
                      {formatFecha(c.fecha)}
                    </td>
                    <td className="px-4 py-3 text-(--text-primary)">
                      {c.profiles ? `${c.profiles.nombre}${c.profiles.apellido ? ` ${c.profiles.apellido}` : ''}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-brand">{c.empresas?.nombre ?? '-'}</td>
                    <td className="px-4 py-3 font-semibold text-brand text-right whitespace-nowrap">{formatNumero(c.total_co2, { unidad: 'kg CO₂' })}</td>
                    <td className="px-4 py-3 text-(--text-secondary) text-right whitespace-nowrap">{formatNumero(c.total_agua / 1000, { unidad: 'm³' })}</td>
                    <td className="px-4 py-3 text-center">
                      {activo ? (
                        <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(56,185,142,0.12)', color: '#1F8C65' }}>Activo</span>
                      ) : (
                        <span title={c.motivo_anulacion ?? ''} style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(255,94,75,0.10)', color: '#CC3C2A', cursor: 'help' }}>Anulado</span>
                      )}
                    </td>
                    <td className="px-1 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <MenuFila
                        label={`Acciones del cálculo de ${formatFecha(c.fecha)}`}
                        acciones={activo ? [{ label: 'Anular cálculo', icono: <Warning size={13} />, peligro: true, onClick: () => { setAnulando(c.id); setMotivo(''); setError('') } }] : []}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Modal anulación en grupo */}
      <Modal
        abierto={anulandoGrupo}
        onClose={() => !guardando && setAnulandoGrupo(false)}
        titulo="Anular cálculos seleccionados"
        descripcion={`Se anularán ${seleccionadosActivos.length} ${seleccionadosActivos.length === 1 ? 'cálculo activo' : 'cálculos activos'} con el mismo motivo.`}
        textoCancelar="Cancelar"
        textoConfirmar={guardando ? 'Anulando...' : 'Confirmar anulación'}
        varianteConfirmar="error"
        onCancelar={() => setAnulandoGrupo(false)}
        onConfirmar={anularGrupo}
      >
        <div>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Describe el motivo de anulación..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
          {error && <p style={{ fontSize: 12, color: C.error, marginTop: 6 }}>{error}</p>}
        </div>
      </Modal>

      {/* Modal anulación */}
      <Modal
        abierto={!!anulando}
        onClose={() => setAnulando(null)}
        titulo="Anular cálculo"
        descripcion="Esta acción excluye el cálculo de los totales. No se puede deshacer."
        textoCancelar="Cancelar"
        textoConfirmar={guardando ? 'Anulando...' : 'Confirmar anulación'}
        varianteConfirmar="error"
        onCancelar={() => setAnulando(null)}
        onConfirmar={confirmarAnulacion}
      >
        <div>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Describe el motivo de anulación..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: 'var(--bg-input)' }}
          />
          {error && <p style={{ fontSize: 12, color: C.error, marginTop: 6 }}>{error}</p>}
        </div>
      </Modal>
    </div>
  )
}
