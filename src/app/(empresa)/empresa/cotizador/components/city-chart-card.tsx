'use client'

import { useMemo, useState } from 'react'
import { MapPinHouse, Pencil } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { agregarPorCiudad, colorPorPosicionCiudad, type ModoDesgloseCiudad } from '@/lib/cotizador/ciudades'
import { capitalizarNombre } from '@/lib/cotizador/capitalizar-nombre'
import { formatCOP } from '@/lib/format'

interface MinimalCot {
  total: number
  crm_clientes?: {
    ciudad?: string | null
  } | null
}

type ModoDesglose = ModoDesgloseCiudad

export function CityChartCard({
  cotizaciones,
  ciudadesAgrupadas,
  agrupar,
  onConfigClick,
  cardBg,
  tp,
  ts,
  style
}: {
  cotizaciones: MinimalCot[]
  ciudadesAgrupadas?: Record<string, string[]>
  agrupar: boolean
  onConfigClick?: () => void
  cardBg: string
  tp: string
  ts: string
  style?: React.CSSProperties
}) {

  const [modalDesgloseAbierto, setModalDesgloseAbierto] = useState(false)
  // Toggle SOLO del popup "Todas las ciudades" — es únicamente una forma
  // distinta de ver el mismo ranking (por cantidad de cotizaciones o por
  // monto), nunca cambia lo que muestra la card chica ni se guarda.
  const [modoDesglose, setModoDesglose] = useState<ModoDesglose>('clientes')

  // La card chica SIEMPRE es por cantidad de cotizaciones — el toggle de
  // arriba no la afecta.
  const data = useMemo(
    () => agregarPorCiudad(cotizaciones, agrupar, ciudadesAgrupadas, 'clientes'),
    [cotizaciones, agrupar, ciudadesAgrupadas]
  )
  const dataDesglose = useMemo(
    () => agregarPorCiudad(cotizaciones, agrupar, ciudadesAgrupadas, modoDesglose),
    [cotizaciones, agrupar, ciudadesAgrupadas, modoDesglose]
  )

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const totalDesglose = dataDesglose.reduce((sum, item) => sum + item.value, 0)

  // Ciudades que componen cada grupo, para mostrar junto al nombre del
  // grupo en el popup ("Medellín  Itagüí, Envigado, Sabaneta") — nunca
  // repite el nombre del propio grupo en su lista (ej. el grupo
  // "Medellín" no se lista a sí mismo).
  const miembrosPorGrupo = useMemo(() => {
    const mapa: Record<string, string> = {}
    if (!ciudadesAgrupadas) return mapa
    for (const [grupo, lista] of Object.entries(ciudadesAgrupadas)) {
      const grupoTitle = capitalizarNombre(grupo)
      const otros = lista
        .map(c => capitalizarNombre(c.trim()))
        .filter(c => c.toLowerCase() !== grupoTitle.toLowerCase())
      mapa[grupoTitle] = otros.join(', ')
    }
    return mapa
  }, [ciudadesAgrupadas])

  const displayData = useMemo(() => {
    if (data.length <= 3) return data
    const top3 = data.slice(0, 3)
    const otrosValue = data.slice(3).reduce((sum, item) => sum + item.value, 0)
    return [...top3, { name: 'Otros', value: otrosValue }]
  }, [data])

  function formatValor(valor: number, modo: ModoDesglose): string {
    return modo === 'monto' ? formatCOP(valor) : `${valor} COT`
  }

  return (
    <div className={`group rounded-[12px] border ${cardBg} p-3 lg:p-2 xl:p-3 flex flex-col justify-center h-full cursor-default relative overflow-hidden`} style={style}>

      {/* Cabecera — mismo patrón exacto que KpiCard ("Tiempo de apertura",
          "Muebles cotizados"): ícono a la izquierda, título con
          block/xl:inline para partir a 2 líneas hasta desktop, directriz
          explícita para que las 4 cards se vean consistentes entre sí. */}
      <div className="flex items-center justify-between mb-3 lg:mb-2 xl:mb-3 z-10 w-full gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPinHouse size={14} className="text-[var(--color-rosa)] flex-shrink-0" />
          <p className={`text-[12px] font-semibold leading-tight font-sans ${ts}`} style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontStyle: 'normal' }}>
            <span className="block xl:inline">Top</span>
            <span className="hidden xl:inline"> </span>
            <span className="block xl:inline">ciudades</span>
          </p>
        </div>
        {onConfigClick && (
          <button
            onClick={onConfigClick}
            title="Configurar Áreas Metropolitanas"
            className={`p-1.5 rounded-md hover-pop hover:bg-[var(--bg-hover)] transition-colors flex-shrink-0 ${ts}`}
          >
            <Pencil size={12} />
          </button>
        )}
      </div>

      {total === 0 ? (
        <div className={`flex-1 flex items-center justify-center text-xs italic ${ts}`}>
          Sin datos en el periodo
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col justify-center gap-3 lg:gap-2 xl:gap-3 mt-2 lg:mt-1 xl:mt-2">
            {displayData.map((item, idx) => {
              const pct = Math.round((item.value / total) * 100)
              const colorItem = colorPorPosicionCiudad(idx, item.name)

              return (
                <div key={item.name} className="flex flex-col gap-1 w-full">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end leading-tight gap-0.5 lg:gap-2">
                    {/* El texto del nombre SIEMPRE va en negro (tp) — el color
                        por grupo es solo del gráfico (la barra) y del ícono
                        de la cabecera, nunca del texto (aclaración explícita
                        del usuario). */}
                    <span className={`font-bold text-[11px] break-words ${tp}`}>
                      {item.name}
                    </span>
                    <span className={`font-normal ${tp} text-[11px] whitespace-nowrap flex justify-between w-full lg:w-auto lg:justify-end gap-1 items-baseline`}>
                      <span className={`font-normal ${ts} text-[8px]`}>({formatValor(item.value, 'clientes')})</span>
                      <span>{pct} %</span>
                    </span>
                  </div>
                  {/* Barra de progreso */}
                  <div className="w-full h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: colorItem }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Enlace explícito además de que "Otros" ya sea clicable — no
              todo el mundo nota que esa fila se puede tocar (bug de
              descubribilidad reportado). */}
          <button
            type="button"
            onClick={() => setModalDesgloseAbierto(true)}
            className={`mt-2 text-[11px] font-normal hover-pop hover:underline self-start ${tp}`}
          >
            Todas las ciudades →
          </button>
        </>
      )}

      {/* Desglose completo — la vista resumida siempre colapsa a top-3 +
          "Otros" para caber en la card, pero cualquier ciudad puntual debe
          poder encontrarse igual. Rediseñado con jerarquía real de vista de
          detalle (resumen arriba, ranking numerado, la #1 destacada) en vez
          de repetir la lista plana de la card chica. */}
      <Modal
        abierto={modalDesgloseAbierto}
        onClose={() => setModalDesgloseAbierto(false)}
        titulo="Todas las ciudades"
        icono={<MapPinHouse size={20} className="text-[var(--color-rosa)]" />}
        colorIcono="var(--color-rosa)"
        textoConfirmar="Cerrar"
        onConfirmar={() => setModalDesgloseAbierto(false)}
        ancho="sm"
      >
        <div className="flex flex-col gap-4 pt-1">
          {/* Switch por cotización / por monto — solo cambia esta vista,
              nunca la card chica ni se guarda (directriz explícita). */}
          <div className="flex bg-[var(--bg-hover)] rounded-lg p-1">
            <button
              onClick={() => setModoDesglose('clientes')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${modoDesglose === 'clientes' ? 'bg-[var(--color-brand)] text-white' : ts}`}
            >
              Por cotización
            </button>
            <button
              onClick={() => setModoDesglose('monto')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${modoDesglose === 'monto' ? 'bg-[var(--color-brand)] text-white' : ts}`}
            >
              Por monto
            </button>
          </div>

          {/* Resumen: cuántas cotizaciones/cuánto monto y cuántas ciudades distintas */}
          <div className="flex items-center justify-between rounded-[10px] bg-[var(--bg-hover)] px-4 py-3">
            <div>
              <p className={`text-lg font-black leading-none ${tp}`}>{modoDesglose === 'monto' ? formatCOP(totalDesglose) : totalDesglose}</p>
              <p className={`text-[11px] mt-0.5 ${ts}`}>{modoDesglose === 'monto' ? 'monto total' : 'cotizaciones'}</p>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div className="text-right">
              <p className={`text-lg font-black leading-none ${tp}`}>{dataDesglose.length}</p>
              <p className={`text-[11px] mt-0.5 ${ts}`}>{dataDesglose.length === 1 ? 'ciudad' : 'ciudades'}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {dataDesglose.map((item, idx) => {
              const pct = totalDesglose > 0 ? Math.round((item.value / totalDesglose) * 100) : 0
              const isGroup = agrupar && ciudadesAgrupadas && Object.keys(ciudadesAgrupadas).includes(item.name)
              const esLider = idx === 0
              const colorItem = colorPorPosicionCiudad(idx, item.name)
              const miembrosTexto = isGroup ? miembrosPorGrupo[item.name] : ''
              const badgeBg = esLider ? 'bg-[var(--color-warning)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
              return (
                <div
                  key={item.name}
                  className={`flex items-center gap-3 rounded-[10px] border p-3 ${esLider ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/[0.04]' : 'border-[var(--border)]'}`}
                >
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${badgeBg}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {/* Texto siempre en negro (tp) — el color por grupo es
                        solo del gráfico, nunca del texto. */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`font-bold text-sm truncate ${tp}`}>
                        {item.name}
                        {isGroup && miembrosTexto && (
                          <span className="ml-1.5 text-[11px] font-normal align-middle">{miembrosTexto}</span>
                        )}
                      </span>
                      <span className={`text-xs font-black flex-shrink-0 ${tp}`}>{pct} %</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colorItem }} />
                    </div>
                    <p className={`text-[11px] mt-1 ${ts}`}>{formatValor(item.value, modoDesglose)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </div>
  )
}
