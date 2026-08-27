'use client'

import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import { Save as FloppyDisk } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { RichTextEditor, type RichTextEditorHandle } from '@/components/ui/rich-text-editor'
import { ModalImagenZoom } from '@/components/ui/modal-imagen-zoom'
import { NOTA_SANITIZE_CONFIG } from '@/lib/sanitize-notas'
import { displayName } from '@/lib/display-name'
import { formatFecha } from '@/lib/format'

interface PerfilAutor { nombre: string; apellido: string | null; apodo: string | null }

interface Nota {
  id: string
  nota: string
  created_at: string
  profiles: PerfilAutor | PerfilAutor[] | null
}

function formatFechaHora(iso: string) {
  return formatFecha(iso, { conHora: true })
}

/**
 * Hilo de notas genérico — cada nota registra automáticamente
 * "[Nombre del usuario] - [Fecha] - [Hora]" (resuelto server-side, nunca
 * enviado por el frontend). Reutilizado para notas de cotización
 * (crm_cotizaciones_notas) y notas de cliente (crm_clientes_notas):
 * pasa `endpointBase` apuntando al endpoint GET/POST correspondiente.
 *
 * El editor es el RichTextEditor compartido (`src/components/ui/`). El HTML
 * se sanea con DOMPurify tanto al enviar como al mostrar cada nota (server
 * y cliente sanean por separado, ver NOTA_SANITIZE_CONFIG).
 */
export function HiloNotas({ endpointBase, placeholder = 'Escribe una nota interna...' }: { endpointBase: string; placeholder?: string }) {
  const [notas, setNotas] = useState<Nota[]>([])
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)
  const editorRef = useRef<RichTextEditorHandle>(null)

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

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'

  if (cargando) return null

  return (
    <div>
      <div className="flex flex-col gap-2 mb-3">
        {notas.map(n => {
          const perfilAutor = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles
          const autor = perfilAutor ? displayName(perfilAutor) : null
          return (
            <div key={n.id} className="rounded-xl p-2.5 bg-[var(--bg-input)]">
              {/* Fotos pegadas dentro de la nota (ver
                  conceptos/contenteditable-paste-imagenes.md) vienen como
                  <img> crudo dentro de HTML ya guardado, fuera del control
                  de React — delegación de clic: cualquier <img> aquí abre
                  el mismo visor de zoom que el resto del sistema. */}
              <div
                className={`text-[13px] font-normal break-words whitespace-pre-wrap nota-con-fotos-ampliables ${tp}`}
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.tagName === 'IMG') setZoomUrl((target as HTMLImageElement).src)
                }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(n.nota, NOTA_SANITIZE_CONFIG) }}
              />
              <p className={`text-[10px] mt-1 ${ts}`}>{autor ?? 'Usuario'} · {formatFechaHora(n.created_at)}</p>
            </div>
          )
        })}
      </div>

      <RichTextEditor
        ref={editorRef}
        placeholder={placeholder}
        onEnviar={enviarNota}
        footer={
          <div className="flex justify-end px-2 pb-2">
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
