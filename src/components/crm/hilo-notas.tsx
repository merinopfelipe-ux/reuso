'use client'

import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import { Save as FloppyDisk, PencilSimple, Trash, X, Check } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { WYSIWYG, type WYSIWYGHandle } from '@/components/ui/wysiwyg'
import { ModalImagenZoom } from '@/components/ui/modal-imagen-zoom'
import { NOTA_SANITIZE_CONFIG } from '@/lib/sanitize-notas'
import { displayName } from '@/lib/display-name'
import { formatFecha } from '@/lib/format'

interface PerfilAutor { nombre: string; apellido: string | null; apodo: string | null }

interface Nota {
  id: string
  nota: string
  created_at: string
  editado_at?: string | null
  profiles: PerfilAutor | PerfilAutor[] | null
}

function formatFechaHora(iso: string) {
  return formatFecha(iso, { conHora: true })
}

/**
 * Hilo de notas genérico — soporta crear, editar y eliminar notas.
 * Llama a GET/POST {endpointBase} y a PATCH/DELETE {endpointBase}/{notaId}.
 * El HTML se sanea con DOMPurify en servidor y cliente por separado.
 */
export function HiloNotas({ endpointBase, placeholder = 'Escribe una nota interna...' }: { endpointBase: string; placeholder?: string }) {
  const [notas, setNotas] = useState<Nota[]>([])
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)
  const [modoEdicion, setModoEdicion] = useState<{ id: string; htmlOriginal: string } | null>(null)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [modoEliminacion, setModoEliminacion] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const editorRef = useRef<WYSIWYGHandle>(null)
  const editorEdicionRef = useRef<WYSIWYGHandle>(null)

  useEffect(() => {
    fetch(endpointBase)
      .then(r => r.json())
      .then(d => setNotas(d.data ?? []))
      .finally(() => setCargando(false))
  }, [endpointBase])

  async function enviarNota() {
    const editor = editorRef.current
    if (!editor || editor.isEmpty() || enviando) return
    const html = DOMPurify.sanitize(editor.getHTML(), NOTA_SANITIZE_CONFIG)
    setEnviando(true)
    const res = await fetch(endpointBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nota: html }),
    })
    if (res.ok) {
      const d = await res.json()
      setNotas(prev => [...prev, d.data])
      editor.clear()
    }
    setEnviando(false)
  }

  async function guardarEdicion(notaId: string) {
    const editor = editorEdicionRef.current
    if (!editor || editor.isEmpty() || guardandoEdicion) return
    const html = DOMPurify.sanitize(editor.getHTML(), NOTA_SANITIZE_CONFIG)
    setGuardandoEdicion(true)
    const res = await fetch(`${endpointBase}/${notaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nota: html }),
    })
    if (res.ok) {
      const d = await res.json()
      setNotas(prev => prev.map(n => n.id === notaId ? { ...n, ...d.data } : n))
      setModoEdicion(null)
    }
    setGuardandoEdicion(false)
  }

  async function eliminarNota(notaId: string) {
    if (eliminando) return
    setEliminando(true)
    const res = await fetch(`${endpointBase}/${notaId}`, { method: 'DELETE' })
    if (res.ok) {
      setNotas(prev => prev.filter(n => n.id !== notaId))
      setModoEliminacion(null)
    }
    setEliminando(false)
  }

  const tp = 'text-(--text-primary)'
  const ts = 'text-(--text-secondary)'

  if (cargando) return null

  return (
    <div>
      <div className="flex flex-col gap-2 mb-3">
        {notas.map(n => {
          const perfilAutor = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles
          const autor = perfilAutor ? displayName(perfilAutor) : null
          const enEdicion = modoEdicion?.id === n.id
          const enEliminacion = modoEliminacion === n.id

          return (
            <div key={n.id} className="rounded-xl p-2.5 bg-(--bg-input) group">
              {enEdicion ? (
                <div className="flex flex-col gap-2">
                  <WYSIWYG
                    ref={editorEdicionRef}
                    initialHTML={modoEdicion.htmlOriginal}
                    minHeightPx={80}
                    onEnviar={() => guardarEdicion(n.id)}
                    footer={
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" loading={guardandoEdicion} icon={<Check size={13} />} onClick={() => guardarEdicion(n.id)}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="secondary" icon={<X size={13} />} onClick={() => setModoEdicion(null)}>
                          Cancelar
                        </Button>
                      </div>
                    }
                  />
                </div>
              ) : enEliminacion ? (
                <div className="flex flex-col gap-2">
                  <p className={`text-[12px] ${tp}`}>¿Eliminar esta nota? No se puede deshacer.</p>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="danger" loading={eliminando} onClick={() => eliminarNota(n.id)}>
                      Eliminar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setModoEliminacion(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`text-[13px] font-normal wrap-break-word whitespace-pre-wrap nota-con-fotos-ampliables ${tp}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement
                      if (target.tagName === 'IMG') setZoomUrl((target as HTMLImageElement).src)
                    }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(n.nota, NOTA_SANITIZE_CONFIG) }}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-[10px] ${ts}`}>
                      {autor ?? 'Usuario'} · {formatFechaHora(n.created_at)}
                      {n.editado_at && (
                        <span className="opacity-60"> · Editado el {formatFechaHora(n.editado_at)}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Editar nota"
                        className="p-1 rounded-lg text-(--text-secondary) hover:text-brand hover:bg-(--bg-hover) transition-colors"
                        onClick={() => {
                          setModoEliminacion(null)
                          setModoEdicion({ id: n.id, htmlOriginal: n.nota })
                        }}
                      >
                        <PencilSimple size={13} />
                      </button>
                      <button
                        type="button"
                        title="Eliminar nota"
                        className="p-1 rounded-lg text-(--text-secondary) hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                        onClick={() => {
                          setModoEdicion(null)
                          setModoEliminacion(n.id)
                        }}
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <WYSIWYG
        ref={editorRef}
        placeholder={placeholder}
        onEnviar={enviarNota}
        footer={
          <div className="flex items-center">
            <Button size="sm" loading={enviando} icon={<FloppyDisk size={14} />} onClick={enviarNota}>
              Guardar
            </Button>
          </div>
        }
      />
      <style dangerouslySetInnerHTML={{ __html: '.nota-con-fotos-ampliables img { cursor: zoom-in; }' }} />
      <ModalImagenZoom imagenUrl={zoomUrl} onClose={() => setZoomUrl(null)} />
    </div>
  )
}
