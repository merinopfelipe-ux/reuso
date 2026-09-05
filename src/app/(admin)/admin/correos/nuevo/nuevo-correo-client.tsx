'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail,
  Send,
  Users,
  Eye,
  CheckCircle,
  AlertCircle,
  PaperPlaneTilt,
} from '@/components/ui/icons'
import { RichTextEditor, type RichTextEditorHandle } from '@/components/ui/rich-text-editor'
import { Selector } from '@/components/ui/selector'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatNumero } from '@/lib/format'

interface EmpresaItem {
  id: string
  nombre: string
}

interface Props {
  empresas: EmpresaItem[]
  userEmail: string
  userNombre: string
}

type TipoCorreo = 'comunicado' | 'plataforma' | 'individual'
type Segmento = 'todos' | 'empresa_admin' | 'empleado' | 'usuario_libre' | 'empresa_especifica' | 'leads' | 'manual'

export function NuevoCorreoClient({ empresas, userEmail, userNombre }: Props) {
  const router = useRouter()
  const editorRef = useRef<RichTextEditorHandle>(null)

  // Form State
  const [tipo, setTipo] = useState<TipoCorreo>('comunicado')
  const [segmento, setSegmento] = useState<Segmento>('todos')
  const [empresaId, setEmpresaId] = useState<string>(empresas[0]?.id || '')
  const [manualEmails, setManualEmails] = useState('')
  const [asunto, setAsunto] = useState('')
  const [preheader, setPreheader] = useState('')
  const [subtituloHeader, setSubtituloHeader] = useState('Comunicado oficial')
  const [saludo, setSaludo] = useState('¡Hola, {nombre}! 👋')
  const [cuerpoHtml, setCuerpoHtml] = useState('<p>Escribe aquí el contenido de tu mensaje...</p>')
  const [incluirDesuscripcion, setIncluirDesuscripcion] = useState(true)

  // Recipients Resolution State
  const [totalDestinatarios, setTotalDestinatarios] = useState<number>(0)
  const [resolviendoDestinatarios, setResolviendoDestinatarios] = useState(false)

  // Actions State
  const [enviandoPrueba, setEnviandoPrueba] = useState(false)
  const [mensajePrueba, setMensajePrueba] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [modalConfirmar, setModalConfirmar] = useState(false)
  const [enviandoMasivo, setEnviandoMasivo] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')

  // Query recipient count when segment or filters change
  useEffect(() => {
    let cancel = false

    async function consultarDestinatarios() {
      setResolviendoDestinatarios(true)
      try {
        const res = await fetch('/api/admin/correos/destinatarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmento, empresaId, manualEmails }),
        })
        const data = await res.json()
        if (!cancel && res.ok) {
          setTotalDestinatarios(data.total || 0)
        }
      } catch (e) {
        console.error('Error al resolver destinatarios:', e)
      } finally {
        if (!cancel) setResolviendoDestinatarios(false)
      }
    }

    const timer = setTimeout(consultarDestinatarios, 300)
    return () => {
      cancel = true
      clearTimeout(timer)
    }
  }, [segmento, empresaId, manualEmails])

  // Sync editor content periodically
  const actualizarContenidoEditor = () => {
    if (editorRef.current) {
      setCuerpoHtml(editorRef.current.getHTML())
    }
  }

  // Insert variable token into subject or editor
  const copiarVariable = (token: string) => {
    navigator.clipboard.writeText(token)
  }

  // Handle Test Send
  const handleEnviarPrueba = async () => {
    actualizarContenidoEditor()
    const htmlActual = editorRef.current ? editorRef.current.getHTML() : cuerpoHtml

    if (!asunto.trim()) {
      setMensajePrueba({ tipo: 'error', texto: 'Ingresa un asunto antes de enviar la prueba.' })
      return
    }

    setEnviandoPrueba(true)
    setMensajePrueba(null)
    setErrorGeneral('')

    try {
      const res = await fetch('/api/admin/correos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asunto,
          preheader,
          subtituloHeader,
          saludo,
          cuerpoHtml: htmlActual,
          tipo,
          segmento,
          empresaId,
          manualEmails,
          incluirDesuscripcion,
          esPrueba: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar prueba')

      setMensajePrueba({ tipo: 'ok', texto: `¡Prueba enviada exitosamente a ${userEmail}!` })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setMensajePrueba({ tipo: 'error', texto: msg })
    } finally {
      setEnviandoPrueba(false)
    }
  }

  // Handle Full Dispatch
  const handleEnviarMasivo = async () => {
    actualizarContenidoEditor()
    const htmlActual = editorRef.current ? editorRef.current.getHTML() : cuerpoHtml

    if (!asunto.trim()) {
      setErrorGeneral('El asunto del correo es obligatorio.')
      setModalConfirmar(false)
      return
    }

    setEnviandoMasivo(true)
    setErrorGeneral('')

    try {
      const res = await fetch('/api/admin/correos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asunto,
          preheader,
          subtituloHeader,
          saludo,
          cuerpoHtml: htmlActual,
          tipo,
          segmento,
          empresaId,
          manualEmails,
          incluirDesuscripcion,
          esPrueba: false,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al despachar correos')

      setModalConfirmar(false)
      router.push('/admin/correos')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setErrorGeneral(msg)
    } finally {
      setEnviandoMasivo(false)
    }
  }

  const opcionesSegmento = [
    { value: 'todos', label: 'Todos los usuarios registrados' },
    { value: 'empresa_admin', label: 'Administradores de Empresa (empresa_admin)' },
    { value: 'empleado', label: 'Empleados / Colaboradores' },
    { value: 'usuario_libre', label: 'Usuarios libres' },
    { value: 'empresa_especifica', label: 'Miembros de una Empresa específica' },
    { value: 'leads', label: 'Leads / Clientes potenciales' },
    { value: 'manual', label: 'Lista manual de correos' },
  ]

  const opcionesEmpresas = empresas.map(e => ({
    value: e.id,
    label: e.nombre,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── COLUMNA IZQUIERDA: FORMULARIO Y EDITOR (66%) ── */}
      <div className="lg:col-span-2 space-y-6">
        {/* Tarjeta 1: Audiencia y Tipo */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Users size={16} className="text-[var(--color-brand)]" />
              1. Audiencia y Tipo de Envío
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--color-brand)] border border-[var(--border)]">
              {resolviendoDestinatarios ? 'Contando...' : `${formatNumero(totalDestinatarios)} destinatarios`}
            </span>
          </div>

          {/* Tipo de Correo */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">
              Tipo de mensaje
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'comunicado', label: 'Comunicado', desc: 'Con enlace de desuscripción' },
                { id: 'plataforma', label: 'Aviso plataforma', desc: 'Operativo e institucional' },
                { id: 'individual', label: 'Individual', desc: 'Mensaje personalizado' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id as TipoCorreo)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    tipo === t.id
                      ? 'border-[var(--color-brand)] bg-[rgba(0,130,124,0.06)]'
                      : 'border-[var(--border)] bg-[var(--bg-input)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <p className="text-xs font-bold text-[var(--text-primary)]">{t.label}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Segmento */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
              Segmento de destinatarios
            </label>
            <Selector
              value={segmento}
              onChange={val => setSegmento(val as Segmento)}
              opciones={opcionesSegmento}
              placeholder="Seleccionar segmento..."
            />
          </div>

          {/* Selector de Empresa si aplica */}
          {segmento === 'empresa_especifica' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Empresa destino
              </label>
              <Selector
                value={empresaId}
                onChange={val => setEmpresaId(val)}
                opciones={opcionesEmpresas}
                placeholder="Seleccionar empresa..."
              />
            </div>
          )}

          {/* Textarea si es manual */}
          {segmento === 'manual' && (
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                Correos electrónicos (separados por coma, espacio o salto de línea)
              </label>
              <textarea
                value={manualEmails}
                onChange={e => setManualEmails(e.target.value)}
                placeholder="ejemplo1@empresa.com, ejemplo2@cliente.com"
                rows={3}
                className="w-full p-3 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          )}

          {/* Opción de desuscripción al pie */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
            <input
              type="checkbox"
              id="toggle-desuscripcion"
              checked={incluirDesuscripcion}
              onChange={e => setIncluirDesuscripcion(e.target.checked)}
              className="h-4 w-4 rounded accent-[var(--color-brand)] cursor-pointer"
            />
            <label htmlFor="toggle-desuscripcion" className="text-xs text-[var(--text-secondary)] cursor-pointer select-none">
              Incluir enlace de cancelación de suscripción (<span className="font-mono text-[10px]">/unsubscribe</span>) al pie de página (Activado por defecto)
            </label>
          </div>
        </div>

        {/* Tarjeta 2: Redacción del Mensaje */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Mail size={16} className="text-[var(--color-brand)]" />
              2. Asunto y Contenido del Correo
            </h3>
            {/* Chips de Variables */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-[var(--text-secondary)] font-medium mr-1">Variables:</span>
              {['{nombre}', '{empresa}', '{email}'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => copiarVariable(v)}
                  title={`Haz clic para copiar ${v}`}
                  className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[var(--bg-hover)] text-[var(--color-brand)] border border-[var(--border)] hover:bg-[var(--color-brand)] hover:text-white transition-colors cursor-pointer"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Asunto del correo <span className="text-[var(--color-error)]">*</span>
              </label>
              <input
                type="text"
                value={asunto}
                onChange={e => setAsunto(e.target.value)}
                placeholder="ej. Novedades en tu panel de huella ambiental"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Texto de previsualización (Preheader)
              </label>
              <input
                type="text"
                value={preheader}
                onChange={e => setPreheader(e.target.value)}
                placeholder="ej. Descubre las nuevas funciones para este mes"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Subtítulo de cabecera
              </label>
              <input
                type="text"
                value={subtituloHeader}
                onChange={e => setSubtituloHeader(e.target.value)}
                placeholder="ej. Comunicado oficial"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Saludo inicial
              </label>
              <input
                type="text"
                value={saludo}
                onChange={e => setSaludo(e.target.value)}
                placeholder="ej. ¡Hola, {nombre}! 👋"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--color-brand)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
              Cuerpo del mensaje
            </label>
            <div onKeyUp={actualizarContenidoEditor} onClick={actualizarContenidoEditor}>
              <RichTextEditor
                ref={editorRef}
                placeholder="Redacta el contenido de tu correo institucional..."
                initialHTML={cuerpoHtml}
                minHeightPx={240}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── COLUMNA DERECHA: PREVIEW Y ACCIONES (33%) ── */}
      <div className="space-y-6">
        {/* Tarjeta de Acciones */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Send size={16} className="text-[var(--color-brand)]" />
            3. Despacho y Prueba
          </h3>

          {errorGeneral && (
            <div className="p-3 rounded-lg bg-[rgba(255,94,75,0.08)] border border-[rgba(255,94,75,0.25)] text-xs text-[#CC3C2A] flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{errorGeneral}</span>
            </div>
          )}

          {mensajePrueba && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                mensajePrueba.tipo === 'ok'
                  ? 'bg-[rgba(56,185,142,0.1)] border-[rgba(56,185,142,0.3)] text-[#1F8C65]'
                  : 'bg-[rgba(255,94,75,0.08)] border-[rgba(255,94,75,0.25)] text-[#CC3C2A]'
              }`}
            >
              {mensajePrueba.tipo === 'ok' ? (
                <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              )}
              <span>{mensajePrueba.texto}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <Button
              variant="secondary"
              className="w-full justify-center"
              loading={enviandoPrueba}
              icon={<PaperPlaneTilt size={14} />}
              onClick={handleEnviarPrueba}
            >
              Enviar prueba a mi correo
            </Button>

            <Button
              variant="primary"
              className="w-full justify-center"
              disabled={totalDestinatarios === 0 || !asunto.trim()}
              icon={<Send size={14} />}
              onClick={() => {
                actualizarContenidoEditor()
                setModalConfirmar(true)
              }}
            >
              Enviar a {formatNumero(totalDestinatarios)} destinatarios
            </Button>
          </div>
        </div>

        {/* Tarjeta de Previsualización en Vivo */}
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Eye size={14} className="text-[var(--color-brand)]" />
              Vista Previa
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">
              Plantilla Institucional
            </span>
          </div>

          {/* Mockup Correo */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-white text-[#474747] text-xs shadow-xs">
            {/* Header Verde */}
            <div className="bg-[#00827C] text-white p-4">
              <p className="font-bold text-sm tracking-tight m-0">Calculadora de Reúso</p>
              <p className="text-[11px] text-white/80 m-0 mt-0.5">{subtituloHeader || 'Comunicado'}</p>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-3">
              <p className="font-bold text-sm text-[#474747] m-0">
                {saludo.replace(/{nombre}/gi, userNombre).replace(/{empresa}/gi, 'tu empresa')}
              </p>

              <div
                className="prose prose-xs max-w-none text-[#474747] leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: cuerpoHtml
                    .replace(/{nombre}/gi, userNombre)
                    .replace(/{empresa}/gi, 'tu empresa')
                    .replace(/{email}/gi, userEmail),
                }}
              />

              <div className="pt-3 border-t border-gray-100 text-[10px] text-gray-500">
                Un saludo,<br />
                <strong>El equipo de la Calculadora de Reúso</strong>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[var(--bg-hover)] p-3 text-center text-[9px] text-gray-500 border-t border-[var(--border)] space-y-1">
              {incluirDesuscripcion ? (
                <p className="m-0">
                  Para dejar de recibir estos correos,{' '}
                  <span className="underline text-gray-600">cancela tu suscripción</span>.
                </p>
              ) : (
                <p className="m-0">
                  Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso.
                </p>
              )}
              <p className="m-0">
                © {new Date().getFullYear()} Grupo MLP S.A.S. · Todos los derechos reservados.<br />
                <span className="underline text-gray-600">calculadoradereuso.com</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Despacho Masivo */}
      {modalConfirmar && (
        <Modal
          abierto={modalConfirmar}
          onClose={() => setModalConfirmar(false)}
          titulo="¿Confirmar despacho de correo?"
          descripcion={`Estás a punto de enviar este correo a ${formatNumero(totalDestinatarios)} destinatarios (${opcionesSegmento.find(s => s.value === segmento)?.label}). Esta acción no se puede deshacer.`}
          textoCancelar="Cancelar"
          textoConfirmar={enviandoMasivo ? 'Despachando correos...' : 'Sí, despachar correo'}
          varianteConfirmar="brand"
          onCancelar={() => setModalConfirmar(false)}
          onConfirmar={handleEnviarMasivo}
          icono={<Send size={24} />}
        >
          <div className="space-y-2 text-xs bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border)]">
            <p><strong className="text-[var(--text-primary)]">Asunto:</strong> {asunto}</p>
            <p><strong className="text-[var(--text-primary)]">Tipo:</strong> {tipo}</p>
            <p><strong className="text-[var(--text-primary)]">Total destinatarios:</strong> {formatNumero(totalDestinatarios)}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
