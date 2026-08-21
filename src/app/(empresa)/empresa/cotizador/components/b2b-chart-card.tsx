'use client'

import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { User, Pencil } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { formatCOP } from '@/lib/format'

// No importamos tipo para no hacer dependencias circulares, usamos un minimal inline type
interface EmpresaCliente { razon_social: string; nombre_comercial: string | null }
interface MinimalCot {
  total: number
  crm_clientes?: {
    // Supabase devuelve esta relación como objeto o como arreglo de 1 según
    // la forma del select — mismo criterio que definicionDe('tipo_cliente')
    // en vistas.ts, la MISMA fuente de verdad de qué es B2B (si tiene
    // empresa vinculada) para que esta card nunca cuente distinto de lo que
    // muestra la columna "Tipo cliente" de la tabla.
    crm_empresas_clientes?: EmpresaCliente | EmpresaCliente[] | null
  } | null
}

type ModoVista = 'clientes' | 'monto'

export function B2BChartCard({
  cotizaciones,
  cardBg,
  tp,
  ts,
  style
}: {
  cotizaciones: MinimalCot[]
  cardBg: string
  tp: string
  ts: string
  style?: React.CSSProperties
}) {
  // Por defecto "por clientes" (conteo) — "por monto" suma el valor real de
  // cada cotización cerrada ganada. Elección puramente de visualización,
  // no se persiste: cada quien la deja como prefiera ver en el momento.
  const [modoVista, setModoVista] = useState<ModoVista>('clientes')
  const [modalAbierto, setModalAbierto] = useState(false)

  // Solo B2B/B2C — igual que definicionDe('tipo_cliente') en vistas.ts, que
  // tampoco tiene una tercera categoría ("cliente con empresa vinculada" o
  // no hay más opciones), así que no queda ningún "Otros" real que sumar.
  const data = useMemo(() => {
    let b2b = 0
    let b2c = 0

    cotizaciones.forEach(c => {
      const emp = c.crm_clientes?.crm_empresas_clientes
      const empInfo = Array.isArray(emp) ? emp[0] : emp
      const esB2B = !!empInfo
      const aporte = modoVista === 'monto' ? Number(c.total) || 0 : 1
      if (esB2B) b2b += aporte
      else b2c += aporte
    })

    return [
      { name: 'B2B', value: b2b, color: 'var(--color-nogal)' }, // Café
      { name: 'B2C', value: b2c, color: 'var(--color-info)' },  // Azul
    ]
  }, [cotizaciones, modoVista])

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className={`group rounded-[12px] border ${cardBg} p-3 lg:p-2 xl:p-3 flex flex-col justify-center h-full cursor-default`} style={style}>
      {/* Cabecera — mismo patrón exacto que KpiCard ("Tiempo de apertura",
          "Muebles cotizados"): ícono a la izquierda, título con
          block/xl:inline para partir a 2 líneas hasta desktop, directriz
          explícita para que las 4 cards se vean consistentes entre sí.
          Ícono de persona (no Buildings — la card mezcla B2B y B2C, una
          persona representa mejor "cliente" en general), azul. La
          animación de hover la da el ícono del sistema (User ya trae su
          versión animada de lucide-animated.com vía el hub) — nunca se le
          agrega una animación propia encima. El lápiz abre elegir entre
          ver por cantidad de clientes o por monto cerrado. */}
      <div className="flex items-center justify-between mb-3 lg:mb-2 xl:mb-3 z-10 w-full gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <User size={14} className="text-[var(--color-info)] flex-shrink-0" />
          <p className={`text-[12px] font-semibold leading-tight font-sans ${ts}`} style={{ fontFamily: "'Open Sans', sans-serif", fontWeight: 600, fontStyle: 'normal' }}>
            <span className="block xl:inline">Tipo</span>
            <span className="hidden xl:inline"> </span>
            <span className="block xl:inline">cliente</span>
          </p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          title="Ver por monto o por clientes"
          className={`p-1.5 rounded-md hover-pop hover:bg-[var(--bg-hover)] transition-colors flex-shrink-0 ${ts}`}
        >
          <Pencil size={12} />
        </button>
      </div>

      {total === 0 ? (
        <div className={`flex-1 flex items-center justify-center text-xs italic text-center px-2 ${ts}`}>
          Sin cotizaciones en el periodo seleccionado
        </div>
      ) : (
        // La torta va sola arriba y la leyenda debajo hasta 2xl — solo en
        // pantallas grandes hay ancho real para ponerlas lado a lado sin
        // apretujar ninguna de las dos (bug reportado en tablet: el círculo
        // quedaba diminuto y el texto se cortaba).
        <div className="flex-1 flex flex-col 2xl:flex-row items-center justify-center gap-2 xl:gap-3 2xl:gap-6 mt-1 w-full px-1">
          {/* Gráfico de Dona — compacta en tablet (lg), tamaño completo desde xl */}
          {/* w-24 base (mobile, ancho completo, cómodo) → lg:w-16 (tablet,
              columna angosta de 3, compacto) → xl:w-24 (desktop, columna
              ancha de nuevo). Antes solo tenía 2 niveles y mobile heredaba
              por error el tamaño chico pensado para tablet (bug real
              reportado: "se ve muy pequeño en mobile"). */}
          <div className="w-24 h-24 lg:w-16 lg:h-16 xl:w-24 xl:h-24 2xl:w-28 2xl:h-28 flex-shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="100%"
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                {/* "B2B: 5 COT" o "B2B: $ X" según el modo — antes perdía el
                    nombre (formatter devolvía '' como segundo elemento),
                    bug real reportado ("falta poner B2B o B2C"). */}
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', fontSize: '10px', padding: '4px 6px' }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                  formatter={(value) => modoVista === 'clientes' ? `${value} COT` : formatCOP(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Leyenda — horizontal cuando la torta va arriba (más ancho
              disponible), vertical solo cuando quedan lado a lado (2xl). */}
          <div className="flex flex-row 2xl:flex-col flex-wrap justify-center gap-x-4 gap-y-1.5 2xl:gap-3">
            {data.map(item => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
              return (
                <div key={item.name} className="flex flex-col items-center 2xl:items-start leading-tight">
                  <span className="font-bold text-xs tracking-wider" style={{ color: item.color }}>{item.name}</span>
                  <span className={`font-black text-xs ${tp} mt-0.5`}>{pct} %</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Modal
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
        titulo="Tipo de cliente"
        descripcion="Elige cómo repartir B2B/B2C: por cantidad de cotizaciones cerradas ganadas, o por el monto total de esas cotizaciones."
        icono={<User size={20} className="text-[var(--color-info)]" />}
        colorIcono="var(--color-info)"
        textoConfirmar="Listo"
        onConfirmar={() => setModalAbierto(false)}
        ancho="sm"
      >
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={() => setModoVista('clientes')}
            className={`text-left rounded-lg border p-3 transition-colors ${modoVista === 'clientes' ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--color-brand)]/40'}`}
          >
            <p className={`text-sm font-semibold ${tp}`}>Por clientes</p>
            <p className={`text-xs mt-0.5 ${ts}`}>Cuenta cuántas cotizaciones cerradas ganadas son de cada tipo.</p>
          </button>
          <button
            onClick={() => setModoVista('monto')}
            className={`text-left rounded-lg border p-3 transition-colors ${modoVista === 'monto' ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--color-brand)]/40'}`}
          >
            <p className={`text-sm font-semibold ${tp}`}>Por monto</p>
            <p className={`text-xs mt-0.5 ${ts}`}>Suma el valor total cerrado ganado de cada tipo, en pesos.</p>
          </button>
        </div>
      </Modal>
    </div>
  )
}
