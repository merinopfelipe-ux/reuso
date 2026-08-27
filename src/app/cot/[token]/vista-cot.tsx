'use client'

import DOMPurify from 'dompurify'
import { NOTA_SANITIZE_CONFIG } from '@/lib/sanitize-notas'
import { calcularDesglose, transportePorItem } from '@/lib/cotizador/precio'
import { Download, ChatCircle, CreditCard, Calendar, Clock, ShieldCheck, Loader2 as CircleNotch, RefreshCcw as ArrowsCounterClockwise, ZoomIn } from '@/components/ui/icons'
import { DynamicIcon } from '@/components/ui/dynamic-icon'
import { renderTextoSimple, conPuntoFinal } from '@/lib/cotizador/texto-simple'
import { formatEnteroMillones } from '@/lib/format'
import { formatTelefonoVista } from '@/lib/telefono'

interface MuebleFactura {
  id: string
  titulo: string | null
  descripcion: string | null
  tipo_mueble: string
  cantidad: number
  precio_mueble: number
  imagen_url: string | null
}

interface Props {
  codigoCotizacion: string
  fechaLarga: string
  clienteNombre: string
  clienteApellido: string | null
  clienteIdentificacion: string | null
  clienteTelefono: string | null
  clienteTelefonoIndicativo: string | null
  clienteDireccion: string | null
  clienteEmail?: string | null
  clienteTipo?: 'persona' | 'empresa' | null
  esContactoReal?: boolean
  empresaRazonSocial?: string | null
  empresaNit?: string | null
  empresaDireccion?: string | null
  muebles: MuebleFactura[]
  subtotal: number
  descuentoActivo: boolean
  descuento: number
  descuentoTipo: 'valor' | 'porcentaje'
  transporteActivo: boolean
  transporteValor: number
  ivaActivo: boolean
  ivaPorcentaje: number
  validezActiva: boolean
  fechaValidezLarga: string
  observaciones?: string | null
  anticipoActivo?: boolean
  anticipoPorcentaje?: number
  formaPagoActivo?: boolean
  formaPagoTipo?: 'anticipo' | 'dias' | null
  formaPagoDias?: number | null
  tiempoEntregaActivo?: boolean
  tiempoEntrega?: string | null
  garantiaActivo?: boolean
  garantiaTexto?: string | null
  envioGratisActivo?: boolean
  envioGratisTexto?: string | null
  envioGratisIcono?: string | null
  destacados?: { icono: string; texto: string }[]
  onVerImagen?: (url: string, titulo: string) => void
  total: number
  token: string
  isDark: boolean
  onDescargarPdf?: (e?: React.MouseEvent) => void
  descargandoPdf?: boolean
}

function formatCOPCompact(n: number): string {
  return '$' + formatEnteroMillones(Math.round(n))
}



/**
 * Vista alterna "tipo cotización": tipografía limpia, tabla de ítems con
 * cantidad/precio unitario/total. Usa exactamente los mismos datos que la
 * vista de propuesta — nunca inventa impuestos ni información de pago que
 * el sistema no recolecta.
 *
 * El transporte (si está activo) se reparte entre los ítems para que el
 * precio de cada línea ya lo incluya, en vez de aparecer como un cobro
 * aparte (decisión del negocio) — es solo visual, nunca se guarda así.
 */
export function VistaCot({
  codigoCotizacion, fechaLarga, clienteNombre, clienteApellido, clienteIdentificacion,
  clienteTelefono, clienteTelefonoIndicativo, clienteDireccion, clienteEmail, clienteTipo, esContactoReal = true,
  empresaRazonSocial, empresaNit, empresaDireccion, muebles,
  subtotal, descuentoActivo, descuento, descuentoTipo, transporteActivo, transporteValor,
  ivaActivo, ivaPorcentaje, validezActiva, fechaValidezLarga, observaciones,
  anticipoActivo = true, anticipoPorcentaje = 60, formaPagoActivo = true, formaPagoTipo = 'anticipo', formaPagoDias = 30,
  tiempoEntregaActivo = true, tiempoEntrega = '10 a 15 días hábiles',
  garantiaActivo = true, garantiaTexto = '1 año en estructura y acabados',
  envioGratisActivo = false, envioGratisTexto, envioGratisIcono,
  destacados = [],
  onVerImagen, total, isDark, onDescargarPdf, descargandoPdf,
}: Props) {
  const tp = isDark ? 'text-white' : 'text-[#1a1a1a]'
  const ts = isDark ? 'text-white/60' : 'text-[#1a1a1a]/60'
  const border = isDark ? 'border-white/15' : 'border-[#1a1a1a]/15'
  const borderLight = isDark ? 'border-white/10' : 'border-[#1a1a1a]/10'

  const desglose = calcularDesglose({
    subtotal, descuento_activo: descuentoActivo, descuento, descuento_tipo: descuentoTipo,
    transporte_activo: transporteActivo, transporte_valor: transporteValor,
    iva_activo: ivaActivo, iva_porcentaje: ivaPorcentaje,
  })
  const transportePorLinea = transportePorItem({ transporte_activo: transporteActivo, transporte_valor: transporteValor }, muebles.length)
  const telefonoFormateado = formatTelefonoVista(clienteTelefono, clienteTelefonoIndicativo)

  const esEmpresa = clienteTipo === 'empresa' || !!empresaRazonSocial
  const nombrePrincipal = esEmpresa
    ? (empresaRazonSocial ?? `${clienteNombre} ${clienteApellido ?? ''}`.trim())
    : `${clienteNombre} ${clienteApellido ?? ''}`.trim()

  const identificacionText = esEmpresa
    ? (empresaNit ? `NIT ${empresaNit}` : (clienteIdentificacion ? `NIT ${clienteIdentificacion}` : null))
    : (clienteIdentificacion ? `CC ${clienteIdentificacion}` : null)

  const nombreContacto = esEmpresa && esContactoReal && clienteNombre ? `${clienteNombre} ${clienteApellido ?? ''}`.trim() : null
  const direccionMostrar = empresaDireccion || clienteDireccion

  return (
    <div className={`w-full max-w-4xl mx-auto pt-2 pb-4 ${tp}`}>
      {/* Encabezado: Cliente (B2B/B2C) a la izquierda, COT [código] + Fecha a la derecha */}
      <div className="flex justify-between items-start mb-10 gap-6">
        {/* Izquierda: Cotizado para + Bloque de datos */}
        <div className="text-left">
          <p className={`text-[12px] font-bold tracking-wide mb-1 ${ts}`}>Cotizado para</p>
          <p className="text-[18px] font-bold leading-snug">{nombrePrincipal}</p>

          {identificacionText && (
            <p className={`text-[14px] mt-0.5 ${ts}`}>{identificacionText}</p>
          )}
          {nombreContacto && (
            <p className={`text-[14px] mt-0.5 ${ts}`}>{nombreContacto}</p>
          )}
          {telefonoFormateado && (
            <p className={`text-[14px] mt-0.5 ${ts}`}>{telefonoFormateado}</p>
          )}
          {clienteEmail && (
            <p className={`text-[14px] mt-0.5 ${ts}`}>{clienteEmail}</p>
          )}
          {direccionMostrar && (
            <p className={`text-[14px] mt-0.5 ${ts}`}>{direccionMostrar}</p>
          )}
        </div>

        {/* Derecha: Código COT + Fecha */}
        <div className="text-right flex-shrink-0">
          <p className="text-[22px] md:text-[26px] font-black leading-tight tracking-tight">
            {codigoCotizacion.toUpperCase().startsWith('COT')
              ? codigoCotizacion.toUpperCase()
              : `COT ${codigoCotizacion.toUpperCase()}`}
          </p>
          <p className={`text-[14px] mt-1 font-normal ${ts}`}>{fechaLarga}</p>
        </div>
      </div>

      {/* Tabla de ítems: alineación numérica a la derecha para sincronizar perfectamente con los totales */}
      <div className="mb-4">
        <div className={`hidden sm:grid sm:grid-cols-[1fr_90px_150px_150px] print:grid print:grid-cols-[1fr_90px_150px_150px] gap-4 pb-2 mb-1 border-b text-xs font-bold tracking-wide ${border} ${ts}`}>
          <span className="text-left">Detalle</span>
          <span className="text-center">Cantidad</span>
          <span className="text-right">Valor Unitario</span>
          <span className="text-right">Valor Total</span>
        </div>
        {muebles.map(m => {
          const totalLinea = m.precio_mueble + transportePorLinea
          const unitario = m.cantidad > 0 ? totalLinea / m.cantidad : totalLinea
          const tituloMueble = m.titulo || m.tipo_mueble
          return (
            <div key={m.id} className={`flex flex-col sm:grid sm:grid-cols-[1fr_90px_150px_150px] print:grid print:grid-cols-[1fr_90px_150px_150px] gap-3 sm:gap-4 sm:items-center print:items-center py-4 sm:py-3 print:py-3 border-b ${borderLight}`}>
              
              {/* 1. Detalle (Foto + Texto) */}
              <div className="flex items-center gap-3 min-w-0 w-full print:w-auto">
                {m.imagen_url ? (
                  // El <img> conserva EXACTAMENTE su tamaño/comportamiento
                  // original (incluido print:h-auto para el PDF) — la lupa
                  // es un overlay puramente visual con pointer-events-none,
                  // el clic lo sigue recibiendo la imagen de siempre.
                  <div className="relative group flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      draggable={false}
                      src={m.imagen_url}
                      alt={tituloMueble}
                      onClick={() => onVerImagen && onVerImagen(m.imagen_url!, tituloMueble)}
                      className="w-14 h-14 sm:w-16 sm:h-16 print:w-16 print:h-auto print:max-h-16 rounded-[8px] object-cover print:object-contain object-center cursor-zoom-in hover:opacity-90 transition-opacity print:cursor-auto"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 print:hidden">
                      <span className="w-7 h-7 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                        <ZoomIn size={14} className="text-[#474747]" sinAnimacion />
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 print:w-16 print:h-16 rounded-[8px] flex-shrink-0 flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                    <ArrowsCounterClockwise size={16} className="text-[#00827C]/30" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{tituloMueble}</p>
                  {m.descripcion && <p className={`text-xs mt-1 leading-snug ${ts}`}>{m.descripcion}</p>}
                </div>
              </div>

              {/* 2. Valores en Mobile vs Desktop */}
              <div className="flex sm:contents print:contents items-center justify-between mt-2 sm:mt-0 pl-[4.25rem] sm:pl-0">
                {/* En desktop no mostramos "Cant:", por lo que usamos text-center y ocultamos el texto extra. En mobile usamos flex y text-sm. */}
                <span className={`text-sm sm:text-center print:text-center ${ts}`}>
                  <span className="sm:hidden print:hidden text-xs opacity-70 mr-1">Cant:</span>
                  {m.cantidad}
                </span>
                
                <span className={`text-sm sm:text-right print:text-right ${ts}`}>
                  <span className="sm:hidden print:hidden text-xs opacity-70 mr-1">Unit:</span>
                  {formatCOPCompact(unitario)}
                </span>
                
                <span className="text-sm font-semibold sm:text-right print:text-right text-right">
                  <span className="sm:hidden print:hidden text-xs font-normal opacity-70 mr-1">Total:</span>
                  {formatCOPCompact(totalLinea)}
                </span>
              </div>

            </div>
          )
        })}
      </div>

      {/* Totales: Subtotal / Descuento / IVA (solo si IVA o Descuento están activos) -> Total */}
      <div className="flex justify-end mb-8">
        <div className="w-[260px] sm:w-[300px] space-y-2">
          {(ivaActivo || desglose.descuentoMonto > 0) && (
            <>
              <div className="flex justify-between text-sm">
                <span className={`font-bold tracking-wide text-xs ${ts}`}>Subtotal</span>
                <span className="font-bold">{formatCOPCompact(desglose.subtotal + desglose.transporte)}</span>
              </div>
              {desglose.descuentoMonto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className={ts}>Descuento{descuentoTipo === 'porcentaje' ? ` (${descuento} %)` : ''}</span>
                  <span>- {formatCOPCompact(desglose.descuentoMonto)}</span>
                </div>
              )}
              {ivaActivo && (
                <div className="flex justify-between text-sm">
                  <span className={ts}>IVA ({ivaPorcentaje} %)</span>
                  <span>{formatCOPCompact(desglose.ivaMonto)}</span>
                </div>
              )}
            </>
          )}
          <div className={`${(ivaActivo || desglose.descuentoMonto > 0) ? `border-t pt-2 ${border}` : ''} flex justify-between items-center`}>
            <span className="text-base font-bold">Total</span>
            <span className="text-lg font-bold">{formatCOPCompact(total)}</span>
          </div>
        </div>
      </div>

      {/* ── Condiciones en orden específico: Nota, Recogemos y entregamos
          gratis, Forma de pago, Validez, Tiempo de entrega, Garantía,
          Mensajes destacados (al final) ── */}
      <div className="space-y-3.5 text-sm mb-8">
        {/* 1. Nota: empieza en la misma línea después de los dos puntos (sin punto forzado al final) */}
        {observaciones && (
          <div className="flex flex-wrap items-baseline gap-2">
            <ChatCircle size={15} className={`${ts} flex-shrink-0 self-center`} />
            <span className="font-semibold">Nota:</span>
            <span
              className={ts}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTextoSimple(observaciones), NOTA_SANITIZE_CONFIG) }}
            />
          </div>
        )}

        {/* 1b. Recogemos y entregamos gratis: mismo formato negro/gris que el resto, sin color especial */}
        {envioGratisActivo && (
          <div className="flex flex-wrap items-baseline gap-2">
            <DynamicIcon nombre={envioGratisIcono} size={15} className={`${ts} flex-shrink-0 self-center`} />
            <span
              className={tp}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTextoSimple(conPuntoFinal(envioGratisTexto || 'Recogemos y entregamos Gratis')), NOTA_SANITIZE_CONFIG) }}
            />
          </div>
        )}

        {/* 2. Forma de pago: sin slash (/), texto plano, con punto al final */}
        {formaPagoActivo && (
          <div className="flex flex-wrap items-baseline gap-2">
            <CreditCard size={15} className={`${ts} flex-shrink-0 self-center`} />
            <span className="font-semibold">Forma de pago:</span>
            <span className={ts}>
              {formaPagoTipo === 'dias'
                ? `A ${formaPagoDias || 30} días.`
                : anticipoActivo
                ? `Anticipo ${anticipoPorcentaje} %, restante ${100 - anticipoPorcentaje} % a la entrega.`
                : 'Contado a la entrega.'}
            </span>
          </div>
        )}

        {/* 3. Validez de la oferta: con punto al final */}
        {validezActiva && (
          <div className="flex flex-wrap items-baseline gap-2">
            <Calendar size={15} className={`${ts} flex-shrink-0 self-center`} />
            <span className="font-semibold">Validez de la oferta:</span>
            <span className={ts}>Válida hasta el {fechaValidezLarga}.</span>
          </div>
        )}

        {/* 4. Tiempo de la entrega: por defecto "25 a 30 días hábiles", con punto al final */}
        {tiempoEntregaActivo && (
          <div className="flex flex-wrap items-baseline gap-2">
            <Clock size={15} className={`${ts} flex-shrink-0 self-center`} />
            <span className="font-semibold">Tiempo de la entrega:</span>
            <span className={ts}>
              {(tiempoEntrega || '25 a 30 días hábiles').endsWith('.')
                ? (tiempoEntrega || '25 a 30 días hábiles')
                : `${tiempoEntrega || '25 a 30 días hábiles'}.`}
            </span>
          </div>
        )}

        {/* 5. Garantía: por defecto "Materiales de alta calidad, mano de obra calificada.", sin punto forzado al final */}
        {garantiaActivo && (
          <div className="flex flex-wrap items-baseline gap-2">
            <ShieldCheck size={15} className={`${ts} flex-shrink-0 self-center`} />
            <span className="font-semibold">Garantía:</span>
            <span className={ts}>{garantiaTexto || 'Materiales de alta calidad, mano de obra calificada.'}</span>
          </div>
        )}

        {/* 6. Mensajes destacados: lista común, va al final, debajo de lo preestablecido */}
        {destacados.map((d, i) => (
          <div key={i} className="flex flex-wrap items-baseline gap-2">
            <DynamicIcon nombre={d.icono} size={15} className={`${ts} flex-shrink-0 self-center`} />
            <span className={ts} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTextoSimple(d.texto), NOTA_SANITIZE_CONFIG) }} />
          </div>
        ))}
      </div>

      {/* ── Línea divisoria DEBAJO de garantía y Descarga tu cotización ── */}
      <div className={`pt-6 border-t mb-10 text-center ${border}`}>
        <button
          type="button"
          onClick={onDescargarPdf}
          disabled={descargandoPdf}
          className={`inline-flex items-center gap-1.5 text-sm underline ${ts} hover:opacity-80 transition-colors disabled:opacity-50 cursor-pointer`}
        >
          {descargandoPdf ? <CircleNotch size={14} className="animate-spin" /> : <Download size={14} />}
          {descargandoPdf ? 'Generando PDF...' : 'Descarga tu cotización'}
        </button>
      </div>
    </div>
  )
}
