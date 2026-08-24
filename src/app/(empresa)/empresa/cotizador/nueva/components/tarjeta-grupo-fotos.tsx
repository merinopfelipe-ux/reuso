'use client'
/* eslint-disable @next/next/no-img-element */

import { useRef } from 'react'
import { Camera, Sparkles, Pencil, ClipboardPaste as Clipboard, X, TriangleAlert as Warning, Trash2 as Trash } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

export type ModoAnalisis = 'ia' | 'manual'

export interface FotoCola { base64: string; preview: string }

export interface GrupoPendiente {
  id: string
  fotos: FotoCola[]
  modo: ModoAnalisis
}

interface Props {
  grupo: GrupoPendiente
  numero: number
  esPrimero: boolean
  maxFotos: number
  error: string | null
  onCambiarModo: (modo: ModoAnalisis) => void
  onAgregarFotos: (files: File[]) => void
  onQuitarFoto: (index: number) => void
  // Ausente cuando esta tarjeta no se puede borrar completa — hoy solo pasa
  // si es la única tarjeta en pantalla (siempre debe quedar al menos una
  // zona de carga visible).
  onQuitarGrupo?: () => void
}

// Una tarjeta de staging por ítem — se repite hasta 4 veces en cascada en
// page.tsx, ninguna analiza nada por sí sola. El disparo real vive en
// "Genera la propuesta", en page.tsx.
export function TarjetaGrupoFotos({ grupo, numero, esPrimero, maxFotos, error, onCambiarModo, onAgregarFotos, onQuitarFoto, onQuitarGrupo }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const ts = 'text-[var(--text-secondary)]'
  const tp = 'text-[var(--text-primary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'

  function handleFotoSeleccionada(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onAgregarFotos(files)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={`rounded-[12px] border p-6 text-center ${cardBg}`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-semibold ${ts}`}>Ítem {numero}</p>
        {onQuitarGrupo && (
          <button
            type="button"
            onClick={onQuitarGrupo}
            className="text-xs font-semibold text-[#FF5E4B] hover-pop hover-press flex items-center gap-1"
            title="Quitar este ítem"
          >
            <Trash size={13} sinAnimacion /> Quitar ítem
          </button>
        )}
      </div>

      <div className="flex items-center justify-center mb-4">
        <div className="inline-flex rounded-full border p-1" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => onCambiarModo('ia')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover-pop hover-press ${
              grupo.modo === 'ia' ? 'bg-[#00827C] text-white' : ts
            }`}
          >
            <Sparkles size={14} sinAnimacion /> Con IA
          </button>
          <button
            type="button"
            onClick={() => onCambiarModo('manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover-pop hover-press ${
              grupo.modo === 'manual' ? 'bg-[#00827C] text-white' : ts
            }`}
          >
            <Pencil size={14} sinAnimacion /> Manual
          </button>
        </div>
      </div>

      {grupo.fotos.length === 0 ? (
        <>
          <div className="w-14 h-14 rounded-full bg-[#00827C]/10 flex items-center justify-center mx-auto mb-4">
            <Camera size={28} className="text-[#00827C]" sinAnimacion />
          </div>
          <p className={`text-base font-semibold mb-1 ${tp}`}>
            {esPrimero ? 'Sube las fotos del mueble' : 'Sube las fotos de este ítem'}
          </p>
          <p className={`text-sm mb-1 ${ts}`}>
            {grupo.modo === 'ia'
              ? `La IA detecta todos los muebles que veas, hasta ${maxFotos} fotos a la vez`
              : `Elige tú la categoría y llena todo a mano, hasta ${maxFotos} fotos a la vez`}
          </p>
          <p className={`text-xs mb-4 flex items-center justify-center gap-1 text-center ${ts}`}>
            <Clipboard size={13} className="flex-shrink-0" sinAnimacion /> También puedes pegar imágenes copiadas: ⌘V en Mac, Ctrl+V en PC
          </p>
        </>
      ) : (
        <div className="flex gap-2 overflow-x-auto mb-4">
          {grupo.fotos.map((f, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img src={f.preview} alt="" className="h-24 rounded-[10px] object-cover bg-[var(--bg-input)]" />
              <button
                type="button"
                onClick={() => onQuitarFoto(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#474747] text-white flex items-center justify-center shadow-md hover-pop hover-press"
                title="Quitar esta foto"
              >
                <X size={11} strokeWidth={2.5} sinAnimacion />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button onClick={() => inputRef.current?.click()} variant={grupo.fotos.length > 0 ? 'secondary' : 'primary'}>
        {grupo.fotos.length > 0 ? 'Agregar otra foto' : 'Elegir fotos'}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFotoSeleccionada}
      />
      {error && (
        <p className="mt-3 text-sm text-[#FF5E4B] flex items-center justify-center gap-1"><Warning size={16} sinAnimacion /> {error}</p>
      )}
    </div>
  )
}
