'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from '@/components/ui/icons'

type RangoPredefinido =
  | 'hoy' | 'ayer' | 'esta_semana' | 'ultimos_7_dias' | 'semana_pasada'
  | 'ultimos_30_dias' | 'este_mes' | 'mes_pasado'
  | 'ultimos_90_dias' | 'este_ano' | 'personalizado'

interface DateRangePickerProps {
  fechaInicio: string
  fechaFin: string
  onChange: (inicio: string, fin: string) => void
  isDark?: boolean
}

// Helper para YYYY-MM-DD
function formatDateStr(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseDateStr(s: string) {
  const parts = s.split('-')
  if (parts.length === 3) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return new Date()
}

function sumarMeses(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

function formatHuman(s: string) {
  const d = parseDateStr(s)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}
function formatHumanYear(s: string) {
  const d = parseDateStr(s)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

// DD/MM/AAAA en texto plano — a propósito NO usa <input type="date"> aquí:
// ese input dispara el calendario nativo del navegador/sistema ENCIMA del
// calendario propio de este componente ("doble calendario", bug real
// reportado). Reposiciona el cursor por cantidad de dígitos, mismo truco que
// InputMoneda en sales-dashboard.tsx, para que no salte mientras se escribe.
function digitosAntesDe(str: string, pos: number): number {
  return str.slice(0, pos).replace(/\D/g, '').length
}
function posicionParaNDigitos(str: string, n: number): number {
  if (n <= 0) return 0
  let contados = 0
  for (let i = 0; i < str.length; i++) {
    if (/\d/.test(str[i])) {
      contados++
      if (contados === n) return i + 1
    }
  }
  return str.length
}
function formatearDDMMAAAA(digitos: string): string {
  const d = digitos.slice(0, 2)
  const m = digitos.slice(2, 4)
  const a = digitos.slice(4, 8)
  return [d, m, a].filter(Boolean).join('/')
}

function FechaTextoInput({ value, onCompletar, className }: {
  value: string // YYYY-MM-DD
  onCompletar: (v: string) => void
  className?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState(() => {
    const d = parseDateStr(value)
    return formatearDDMMAAAA(`${d.getDate().toString().padStart(2, '0')}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear()}`)
  })

  useEffect(() => {
    const d = parseDateStr(value)
    setTexto(formatearDDMMAAAA(`${d.getDate().toString().padStart(2, '0')}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getFullYear()}`))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const cursorPrevio = input.selectionStart ?? input.value.length
    const nDigitos = digitosAntesDe(input.value, cursorPrevio)
    const digitos = input.value.replace(/\D/g, '').slice(0, 8)
    const nuevoTexto = formatearDDMMAAAA(digitos)
    setTexto(nuevoTexto)

    if (digitos.length === 8) {
      const dia = Number(digitos.slice(0, 2))
      const mes = Number(digitos.slice(2, 4))
      const anio = Number(digitos.slice(4, 8))
      const fecha = new Date(anio, mes - 1, dia)
      if (fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia) {
        onCompletar(formatDateStr(fecha))
      }
    }

    requestAnimationFrame(() => {
      if (!ref.current) return
      const nuevaPos = posicionParaNDigitos(nuevoTexto, nDigitos)
      ref.current.setSelectionRange(nuevaPos, nuevaPos)
    })
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={texto}
      onChange={handleChange}
      placeholder="DD/MM/AAAA"
      maxLength={10}
      className={className}
    />
  )
}

export function DateRangePicker({ fechaInicio, fechaFin, onChange }: DateRangePickerProps) {
  const [abierto, setAbierto] = useState(false)
  const [rangoSeleccionado, setRangoSeleccionado] = useState<RangoPredefinido>('este_mes')

  const [tempInicio, setTempInicio] = useState(fechaInicio)
  const [tempFin, setTempFin] = useState(fechaFin)

  // Un solo mes visible a la vez, siempre arranca en el mes actual (pedido
  // explícito) — el rango puede abarcar otros meses igual, solo hay que
  // navegar con las flechas para verlos, sin la complejidad de dos meses
  // lado a lado (que traía su propio bug de anchos desiguales).
  const [mesVisible, setMesVisible] = useState(() => sumarMeses(new Date(), 0))
  const [selecionando, setSeleccionando] = useState<'inicio' | 'fin' | 'ninguno'>('ninguno')

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hoy = new Date()

  const getSubDays = (d: Date, days: number) => {
    const nd = new Date(d)
    nd.setDate(nd.getDate() - days)
    return nd
  }

  const rangos: { id: RangoPredefinido; label: string; getRange: () => [Date, Date] }[] = [
    { id: 'hoy', label: 'Hoy', getRange: () => [hoy, hoy] },
    { id: 'ayer', label: 'Ayer', getRange: () => [getSubDays(hoy, 1), getSubDays(hoy, 1)] },
    { id: 'ultimos_7_dias', label: 'Los últimos 7 días', getRange: () => [getSubDays(hoy, 6), hoy] },
    { id: 'ultimos_30_dias', label: 'Los últimos 30 días', getRange: () => [getSubDays(hoy, 29), hoy] },
    { id: 'este_mes', label: 'Este mes', getRange: () => [new Date(hoy.getFullYear(), hoy.getMonth(), 1), hoy] },
    { id: 'ultimos_90_dias', label: 'Los últimos 90 días', getRange: () => [getSubDays(hoy, 89), hoy] },
    { id: 'este_ano', label: 'Este año', getRange: () => [new Date(hoy.getFullYear(), 0, 1), hoy] },
  ]

  const formatDisplay = () => {
    if (rangoSeleccionado !== 'personalizado') {
      const rango = rangos.find(r => r.id === rangoSeleccionado)
      if (rango) {
        return `${rango.label} · ${formatHuman(fechaInicio)}-${formatHumanYear(fechaFin)}`
      }
    }
    return `${formatHuman(fechaInicio)}-${formatHumanYear(fechaFin)}`
  }

  // Se aplica solo, sin botón "Aplicar" — al elegir un rango predefinido o
  // completar una selección de días, el filtro ya cambió en la pantalla de
  // atrás. Un preset cierra el picker al toque; un rango de días manual se
  // aplica en cuanto queda completo (inicio Y fin), sin cerrar todavía por
  // si el usuario quiere seguir ajustando.
  const handleRangoClick = (r: typeof rangos[0]) => {
    setRangoSeleccionado(r.id)
    const [start, end] = r.getRange()
    const inicio = formatDateStr(start)
    const fin = formatDateStr(end)
    setTempInicio(inicio)
    setTempFin(fin)
    setMesVisible(sumarMeses(end, 0))
    onChange(inicio, fin)
    setAbierto(false)
  }

  const handleDayClick = (dia: number, mesDelDia: Date) => {
    setRangoSeleccionado('personalizado')
    const selected = new Date(mesDelDia.getFullYear(), mesDelDia.getMonth(), dia)
    const strSelected = formatDateStr(selected)

    if (selecionando === 'ninguno' || selecionando === 'fin') {
      setTempInicio(strSelected)
      setTempFin(strSelected)
      setSeleccionando('inicio')
    } else {
      if (selected < parseDateStr(tempInicio)) {
        setTempInicio(strSelected)
        setTempFin(strSelected)
        onChange(strSelected, strSelected)
      } else {
        setTempFin(strSelected)
        setSeleccionando('ninguno')
        onChange(tempInicio, strSelected)
      }
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-[var(--border)] bg-[var(--bg-card)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
      >
        <CalendarIcon size={14} className="text-[var(--text-secondary)]" />
        <span className="text-[var(--text-secondary)]">{formatDisplay()}</span>
        <ChevronDown size={14} className="text-[var(--text-secondary)]" />
      </button>

      {abierto && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-[12px] shadow-xl flex flex-col md:flex-row w-[300px] md:w-[420px] max-h-[80vh] overflow-y-auto md:overflow-visible">

          <div className="w-full md:w-[150px] flex-shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)] py-2 max-h-[220px] md:max-h-none overflow-y-auto hide-scrollbar">
            <button
              onClick={() => setRangoSeleccionado('personalizado')}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${rangoSeleccionado === 'personalizado' ? 'bg-[#00827C]/10 text-[#00827C] font-medium' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
            >
              Personalizado
            </button>
            {rangos.map(r => (
              <button
                key={r.id}
                onClick={() => handleRangoClick(r)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${rangoSeleccionado === r.id ? 'bg-[#00827C]/10 text-[#00827C] font-medium' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col p-4 bg-[var(--bg-primary)]">
            {/* Entradas manuales — compactas, arriba del calendario. Texto
                DD/MM/AAAA, no input nativo de fecha (evita el calendario del
                navegador encima del nuestro). */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">Fecha de inicio</label>
                <FechaTextoInput
                  value={tempInicio}
                  onCompletar={(v) => {
                    setTempInicio(v); setRangoSeleccionado('personalizado')
                    setMesVisible(sumarMeses(parseDateStr(v), 0))
                    if (parseDateStr(v) <= parseDateStr(tempFin)) onChange(v, tempFin)
                  }}
                  className="w-full bg-transparent border border-[var(--border)] rounded-md px-2 py-1.5 text-sm outline-none text-[var(--text-primary)]"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 block">Fecha de fin</label>
                <FechaTextoInput
                  value={tempFin}
                  onCompletar={(v) => {
                    setTempFin(v); setRangoSeleccionado('personalizado')
                    if (parseDateStr(v) >= parseDateStr(tempInicio)) onChange(tempInicio, v)
                  }}
                  className="w-full bg-transparent border border-[var(--border)] rounded-md px-2 py-1.5 text-sm outline-none text-[var(--text-primary)]"
                />
              </div>
            </div>

            <MiniCalendario
              mesVisible={mesVisible}
              tempInicio={tempInicio}
              tempFin={tempFin}
              onDayClick={handleDayClick}
              onPrev={() => setMesVisible(sumarMeses(mesVisible, -1))}
              onNext={() => setMesVisible(sumarMeses(mesVisible, 1))}
            />

            <div className="mt-4 flex justify-end border-t border-[var(--border)] pt-3">
              <button onClick={() => setAbierto(false)} className="text-sm font-medium text-[#00827C] hover:text-[#00827C]/80 transition-colors">
                Listo
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// Un solo mes del calendario.
function MiniCalendario({ mesVisible, tempInicio, tempFin, onDayClick, onPrev, onNext }: {
  mesVisible: Date
  tempInicio: string
  tempFin: string
  onDayClick: (dia: number, mesVisible: Date) => void
  onPrev: () => void
  onNext: () => void
}) {
  const diasDelMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate()
  const primerDiaMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1).getDay()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < primerDiaMes; i++) calendarDays.push(null)
  for (let i = 1; i <= diasDelMes; i++) calendarDays.push(i)

  return (
    <div className="flex flex-col items-center select-none bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3">
      <div className="flex items-center justify-between w-full mb-3 px-1">
        <button onClick={onPrev} className="p-1 hover:bg-[var(--bg-hover)] rounded-full transition-colors text-[var(--text-secondary)]">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
        </span>
        <button onClick={onNext} className="p-1 hover:bg-[var(--bg-hover)] rounded-full transition-colors text-[var(--text-secondary)]">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Sin gap horizontal entre columnas: la banda del rango necesita
          tocar el borde de cada celda para verse continua, no punteada. */}
      <div className="grid grid-cols-7 w-full gap-y-1 gap-x-0 text-center">
        {DIAS.map(d => (
          <div key={d} className="text-[10px] font-medium text-[var(--text-secondary)]">{d}</div>
        ))}

        {calendarDays.map((dia, idx) => {
          if (!dia) return <div key={idx} />

          const dStr = formatDateStr(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), dia))
          const isStart = dStr === tempInicio
          const isEnd = dStr === tempFin
          const isBetween = dStr > tempInicio && dStr < tempFin
          const enRango = isStart || isEnd || isBetween
          const esHoy = dStr === formatDateStr(new Date())

          return (
            <div key={idx} className="relative h-8">
              {/* Banda continua de fondo del rango — color inline (no clase
                  Tailwind con opacidad sobre variable CSS) para que se pinte
                  siempre, sin depender de cómo el navegador resuelva la
                  utilidad. En el día de inicio solo cubre la mitad derecha
                  (hacia el resto del rango), en el de fin solo la izquierda,
                  para que se vea una sola banda continua de punta a punta. */}
              {enRango && tempInicio !== tempFin && (
                <div
                  className="absolute inset-y-1"
                  style={{
                    left: isStart ? '50%' : 0,
                    right: isEnd ? '50%' : 0,
                    backgroundColor: 'rgba(0, 130, 124, 0.18)',
                  }}
                />
              )}
              <button
                onClick={() => onDayClick(dia, mesVisible)}
                className={`absolute inset-0 m-auto h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors hover:bg-[var(--bg-hover)] ${esHoy && !isStart && !isEnd ? 'ring-1 ring-inset ring-[#00827C]' : ''}`}
                style={
                  isStart || isEnd
                    ? { backgroundColor: '#00827C', color: '#FFFFFF', fontWeight: 700 }
                    : { color: 'var(--text-primary)' }
                }
                title={esHoy ? 'Hoy' : undefined}
              >
                {dia}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
