'use client'

import { useEffect, useState } from 'react'
import { Eye, Download, ChatCircle, Envelope, Share2 } from '@/components/ui/icons'
import { formatNumero, formatFecha } from '@/lib/format'
import { formatDispositivo } from '@/lib/parse-user-agent'

interface Apertura {
  id: string
  created_at: string
  user_agent: string | null
  referrer: string | null
  ciudad: string | null
  pais: string | null
  duracion_seg: number | null
  tipo: 'apertura' | 'descarga' | 'compartido_whatsapp' | 'compartido_correo'
}

function formatFechaHora(iso: string) {
  return formatFecha(iso, { conHora: true })
}

// TLDs de segundo nivel donde el dominio raíz real son 3 partes, no 2
// (ej. mercadolibre.com.co, no solo "com.co") — heurística común, no es la
// lista oficial de sufijos públicos, pero cubre los casos reales de LATAM.
const TLD_SEGUNDO_NIVEL = new Set([
  'com.co', 'net.co', 'org.co', 'gov.co', 'edu.co',
  'com.mx', 'com.br', 'com.ar', 'com.pe', 'com.ec', 'com.cl',
  'co.uk', 'com.au',
])

function dominioRaiz(hostname: string): string {
  const partes = hostname.split('.')
  if (partes.length <= 2) return hostname
  const ultimasDos = partes.slice(-2).join('.')
  if (TLD_SEGUNDO_NIVEL.has(ultimasDos)) return partes.slice(-3).join('.')
  return ultimasDos
}

// Abierto a cualquier sitio, no una lista fija: se usa el "referrer" que
// manda el navegador (la página desde la que se hizo clic para llegar acá,
// cuando el navegador lo envía) y se reduce a su dominio raíz — así se ve
// exactamente desde qué sitio llegó el cliente (un marketplace, una red
// social, un foro, lo que sea), no solo un puñado de casos reconocidos.
// WhatsApp y los proveedores de correo se detectan aparte porque tienen
// trato especial en la interfaz (van con los botones "Compartir").
function formatOrigen(referrer: string | null): string | null {
  if (!referrer) return 'Enlace directo'
  try {
    const hostCompleto = new URL(referrer).hostname.replace(/^www\./, '')
    if (hostCompleto.includes('whatsapp') || hostCompleto === 'wa.me') return 'WhatsApp'
    if (hostCompleto.includes('mail.google') || hostCompleto.includes('outlook') || hostCompleto.includes('yahoo')) return 'Correo'
    return dominioRaiz(hostCompleto)
  } catch {
    return 'Enlace directo'
  }
}

// Explícito por tramo (segundos / minutos / horas) — nunca se asume ni se
// trunca a un tope arbitrario, siempre se calcula el valor real.
function formatDuracion(seg: number | null): string | null {
  if (seg === null || seg === undefined || seg < 5) return null
  if (seg < 60) return `${seg} s`
  if (seg < 3600) return `${Math.round(seg / 60)} min`
  const horas = Math.floor(seg / 3600)
  const minutosRestantes = Math.round((seg % 3600) / 60)
  return minutosRestantes > 0 ? `${horas} h ${minutosRestantes} min` : `${horas} h`
}

function formatUbicacion(ciudad: string | null, pais: string | null): string | null {
  if (ciudad && pais) return `${ciudad}, ${pais}`
  if (pais) return pais
  return null
}

// La duración es el dato más relevante de una vista real (indica interés),
// así que va en la primera línea junto a la acción, no enterrada abajo con
// dispositivo/ubicación/fecha.
function getAccionInfo(a: Apertura) {
  const duracion = a.tipo === 'apertura' ? formatDuracion(a.duracion_seg) : null
  const conDuracion = (label: string) => duracion ? `${label} · ${duracion}` : label

  if (a.tipo === 'descarga') {
    return { label: 'Descarga de PDF', icon: <Download size={13} /> }
  }
  if (a.tipo === 'compartido_whatsapp') {
    return { label: 'Compartido por WhatsApp', icon: <ChatCircle size={13} /> }
  }
  if (a.tipo === 'compartido_correo') {
    return { label: 'Compartido por correo', icon: <Envelope size={13} /> }
  }
  const origen = formatOrigen(a.referrer)
  if (origen === 'WhatsApp') {
    return { label: conDuracion('Compartido por WhatsApp'), icon: <ChatCircle size={13} /> }
  }
  if (origen === 'Correo') {
    return { label: conDuracion('Compartido por correo'), icon: <Envelope size={13} /> }
  }
  if (origen && origen !== 'Enlace directo') {
    return { label: conDuracion(`Vista desde ${origen}`), icon: <Share2 size={13} /> }
  }
  return { label: conDuracion('Vista de propuesta'), icon: <Eye size={13} /> }
}

function detalles(a: Apertura): string[] {
  return [
    formatUbicacion(a.ciudad, a.pais),
    formatDispositivo(a.user_agent),
  ].filter((x): x is string => Boolean(x))
}

/**
 * Módulo de Trazabilidad Unificado —
 * Muestra las acciones (vistas, descargas, aperturas desde WhatsApp o Correo)
 * en un único espacio cronológico continuo (sin divisiones), desplegando
 * por defecto las 3 acciones más recientes y opción de "+ X más".
 */
export function ModuloTrazabilidad({ cotizacionId, conEmpresa }: { cotizacionId: string; conEmpresa: (url: string) => string }) {
  const [aperturas, setAperturas] = useState<Apertura[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarTodas, setMostrarTodas] = useState(false)

  useEffect(() => {
    fetch(conEmpresa(`/api/cotizador/cotizaciones/${cotizacionId}/aperturas`))
      .then(r => r.json())
      .then(d => setAperturas(d.data ?? []))
      .catch(err => {
        console.error('Error al obtener trazabilidad:', err)
        setAperturas([])
      })
      .finally(() => setCargando(false))
  }, [cotizacionId, conEmpresa])

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  if (cargando) return null

  // Ordenar por fecha descendente (más reciente primero)
  const listaUnificada = [...aperturas].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const itemsAMostrar = mostrarTodas ? listaUnificada : listaUnificada.slice(0, 3)

  return (
    <div className={`rounded-[12px] border p-4 mb-4 ${cardBg}`}>
      <p className={`text-xs font-semibold mb-3 ${ts}`}>Trazabilidad</p>

      {listaUnificada.length === 0 ? (
        <p className={`text-xs ${ts}`}>El cliente aún no ha abierto ni descargado la propuesta.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className={`flex flex-col gap-2.5 ${mostrarTodas ? 'max-h-80 overflow-y-auto pr-1' : ''}`}>
            {itemsAMostrar.map(a => {
              const info = getAccionInfo(a)
              const det = detalles(a)
              const metaText = [...det, formatFechaHora(a.created_at)].filter(Boolean).join(' · ')
              return (
                <div key={a.id} className="flex items-start gap-2">
                  <span className={`mt-0.5 flex-shrink-0 ${ts}`}>{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-normal ${tp}`}>{info.label}</p>
                    <p className={`text-[10px] mt-0.5 ${ts}`}>{metaText}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {listaUnificada.length > 3 && (
            <button
              type="button"
              onClick={() => setMostrarTodas(v => !v)}
              className={`text-xs font-medium text-left hover:underline cursor-pointer ${tp}`}
            >
              {mostrarTodas ? 'Ver menos' : `+${formatNumero(listaUnificada.length - 3)} más`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

