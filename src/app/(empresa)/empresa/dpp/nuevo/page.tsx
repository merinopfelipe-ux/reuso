/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { useToast } from '@/components/toast-provider'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { comprimirImagenBase64, comprimirImagenWebP, recortarImagenBase64, boundingBoxEsUtil, type BoundingBox } from '@/lib/image-compress'
import { TarjetaGrupoFotos, type GrupoPendiente, type FotoCola, type ModoAnalisis } from '@/app/(empresa)/empresa/cotizador/nueva/components/tarjeta-grupo-fotos'
import { DppItemCard, type ItemDppPendiente, type MaterialDpp } from './components/dpp-item-card'
import type { ItemDetectadoConSnapshot } from '@/app/api/cotizador/diagnostico/route'

interface ClienteResultado { id: string; nombre: string; apellido: string | null }

const MAX_FOTOS_POR_TANDA = 4

// Placeholder intencional: hoy no agrega nada (a diferencia del `conEmpresa`
// del Cotizador, que sí anexa `empresa_id`) — queda listo para cuando
// super_admin pueda crear un DPP a nombre de una empresa, mismo criterio que
// ya usa el Cotizador para eso. `DppItemCard` lo requiere como prop.
function conEmpresa(url: string) { return url }

function nuevoGrupoVacio(modo: ModoAnalisis = 'ia'): GrupoPendiente {
  return { id: crypto.randomUUID(), fotos: [], modo }
}

// Recorta la miniatura del ítem detectado (o usa la foto completa si el
// recuadro no aporta nada) — mismo patrón que `construirMiniatura` de
// cotizador/nueva/page.tsx, reescrito acá porque ese archivo no exporta la
// función.
async function construirMiniatura(
  imagenIndex: number,
  boundingBox: BoundingBox | null,
  fotosBase: FotoCola[]
): Promise<{ imagenPreview: string; imagenBase64: string }> {
  const foto = fotosBase[imagenIndex] ?? fotosBase[0]
  if (boundingBoxEsUtil(boundingBox)) {
    try {
      const recorte = await recortarImagenBase64(foto.preview, boundingBox)
      return { imagenPreview: recorte.preview, imagenBase64: recorte.base64 }
    } catch {
      // Si el recorte falla, se usa la foto completa — nunca rompe el flujo.
    }
  }
  return { imagenPreview: foto.preview, imagenBase64: foto.base64 }
}

function itemDetectadoAPendiente(
  d: ItemDetectadoConSnapshot,
  miniatura: { imagenPreview: string; imagenBase64: string }
): ItemDppPendiente {
  return {
    _uiKey: crypto.randomUUID(),
    titulo: d.titulo,
    descripcion: d.descripcion,
    confianza: d.confianza,
    imagenPreview: miniatura.imagenPreview,
    imagenBase64: miniatura.imagenBase64,
    materiales: d.materiales.map(m => ({
      nombre: m.nombre,
      peso_kg: m.peso_kg,
      factor_co2_kg: m.factor_co2_kg,
      factor_agua_l_kg: m.factor_agua_l_kg,
      origen_fuente: m.origen_fuente,
      nivel_confianza: m.nivel_confianza,
      categoria_material: m.categoria_material,
      porcentaje_reciclable: m.porcentaje_reciclable,
    })),
    manual: false,
    creando: false,
    errorCreacion: null,
  }
}

function itemManualVacio(fotoPrincipal: FotoCola): ItemDppPendiente {
  return {
    _uiKey: crypto.randomUUID(),
    titulo: '',
    descripcion: '',
    confianza: 1,
    imagenPreview: fotoPrincipal.preview,
    imagenBase64: fotoPrincipal.base64,
    materiales: [],
    manual: true,
    creando: false,
    errorCreacion: null,
  }
}

export default function NuevoActivoDppPage() {
  const { toast } = useToast()
  const router = useRouter()

  const [grupos, setGrupos] = useState<GrupoPendiente[]>([nuevoGrupoVacio()])
  const [itemsPendientes, setItemsPendientes] = useState<ItemDppPendiente[]>([])
  const [generando, setGenerando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  // Error por grupo (grupoId -> mensaje) — cada `TarjetaGrupoFotos` muestra
  // el suyo, nunca un mensaje global que se pisa entre grupos.
  const [erroresGrupos, setErroresGrupos] = useState<Record<string, string>>({})
  const [dppsCreados, setDppsCreados] = useState<{ id: string; titulo: string }[]>([])

  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteResultados, setClienteResultados] = useState<ClienteResultado[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteResultado | null>(null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [clienteBusquedaHecha, setClienteBusquedaHecha] = useState(false)

  async function buscarCliente() {
    if (!clienteQuery.trim()) return
    setBuscandoCliente(true)
    try {
      const res = await fetch(`/api/cotizador/clientes?q=${encodeURIComponent(clienteQuery.trim())}`)
      const data = await res.json()
      setClienteResultados(res.ok ? (data.clientes ?? []) : [])
    } catch {
      setClienteResultados([])
    } finally {
      setClienteBusquedaHecha(true)
      setBuscandoCliente(false)
    }
  }

  // Espera TODAS las compresiones antes de tocar el estado del grupo — nunca
  // expone una foto con `base64: ''` (mismo patrón que `agregarFotosAlActivo`
  // en cotizador/nueva/page.tsx). Sin esto, avanzar a "Generar propuesta" o a
  // modo Manual antes de que termine la compresión en segundo plano mandaba
  // una foto vacía.
  async function agregarFotosAGrupo(grupoId: string, files: File[]) {
    const grupoActual = grupos.find(g => g.id === grupoId)
    if (!grupoActual) return
    const disponibles = MAX_FOTOS_POR_TANDA - grupoActual.fotos.length
    if (disponibles <= 0) return
    const aProcesar = files.slice(0, disponibles)
    const resultados = await Promise.allSettled(aProcesar.map(f => comprimirImagenBase64(f, { calidad: 0.70 })))
    const comprimidas: FotoCola[] = []
    for (const r of resultados) {
      if (r.status === 'fulfilled') comprimidas.push(r.value)
    }
    if (comprimidas.length === 0) return
    setGrupos(prev => prev.map(g => g.id === grupoId ? { ...g, fotos: [...g.fotos, ...comprimidas] } : g))
  }

  function quitarFotoDeGrupo(grupoId: string, index: number) {
    setGrupos(prev => prev.map(g => {
      if (g.id !== grupoId) return g
      // Defensivo: si alguna vez una `preview` llega a ser un blob URL
      // temporal (hoy son data URLs, `comprimirImagenBase64` no crea
      // blobs), se libera para no dejar fugas de memoria.
      const foto = g.fotos[index]
      if (foto?.preview.startsWith('blob:')) URL.revokeObjectURL(foto.preview)
      return { ...g, fotos: g.fotos.filter((_, i) => i !== index) }
    }))
  }

  function cambiarModoGrupo(grupoId: string, modo: ModoAnalisis) {
    setGrupos(prev => prev.map(g => g.id === grupoId ? { ...g, modo } : g))
  }

  // Pegar una imagen desde el portapapeles (Cmd+V) — mismo patrón que
  // cotizador/nueva/page.tsx, adaptado porque acá hay varios grupos a la vez
  // en vez de uno solo activo: va al primer grupo que todavía tenga espacio.
  useEffect(() => {
    if (generando) return
    function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []).filter(i => i.kind === 'file')
      if (items.length === 0) return
      const grupoConEspacio = grupos.find(g => g.fotos.length < MAX_FOTOS_POR_TANDA)
      if (!grupoConEspacio) return
      e.preventDefault()
      const archivos = items.map(i => i.getAsFile()).filter((f): f is File => !!f)
      if (archivos.length > 0) agregarFotosAGrupo(grupoConEspacio.id, archivos)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // agregarFotosAGrupo se recrea en cada render y ya lee `grupos` fresco
    // del cierre — incluirla forzaría reenganchar el listener en cada
    // tecleo sin ganar nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupos, generando])

  function agregarGrupo() {
    if (grupos.length >= MAX_FOTOS_POR_TANDA) return
    setGrupos(prev => [...prev, nuevoGrupoVacio()])
  }

  function quitarGrupo(grupoId: string) {
    setGrupos(prev => prev.length <= 1 ? prev : prev.filter(g => g.id !== grupoId))
  }

  async function generarPropuesta() {
    setErrorGeneral(null)
    const gruposConFotos = grupos.filter(g => g.fotos.length > 0)
    if (gruposConFotos.length === 0) {
      setErrorGeneral('Sube al menos una foto para continuar.')
      return
    }
    setGenerando(true)
    // Grupos que sí terminaron con éxito (IA sin error, o manual) — solo
    // esos se limpian al final. Un grupo con error se queda con sus fotos
    // intactas para que el usuario pueda reintentar sin volver a subirlas.
    const idsExitosos = new Set<string>()
    const erroresNuevos: Record<string, string> = {}
    try {
      for (const grupo of gruposConFotos) {
        if (grupo.modo === 'manual') {
          setItemsPendientes(prev => [...prev, itemManualVacio(grupo.fotos[0])])
          idsExitosos.add(grupo.id)
          continue
        }
        try {
          const res = await fetch(conEmpresa('/api/cotizador/diagnostico'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imagenes: grupo.fotos.map(f => ({ imagen_base64: f.base64, mime_type: 'image/webp' })),
            }),
          })
          const data = await res.json()
          if (!res.ok) {
            erroresNuevos[grupo.id] = data.error ?? 'Error al analizar las fotos. Intenta de nuevo.'
            continue
          }
          const detectados: ItemDetectadoConSnapshot[] = data.items_detectados ?? []
          for (const d of detectados) {
            const miniatura = await construirMiniatura(d.imagen_index, d.bounding_box, grupo.fotos)
            setItemsPendientes(prev => [...prev, itemDetectadoAPendiente(d, miniatura)])
          }
          idsExitosos.add(grupo.id)
        } catch {
          // Fallo de red/parseo en ESTE grupo — se registra su error y se
          // sigue con el resto de la tanda, nunca se corta todo el ciclo.
          erroresNuevos[grupo.id] = 'No se pudo analizar esta foto. Revisa tu conexión e intenta de nuevo.'
        }
      }
      setErroresGrupos(erroresNuevos)
      setGrupos(prev => {
        const restantes = prev.filter(g => !idsExitosos.has(g.id))
        return restantes.length > 0 ? restantes : [nuevoGrupoVacio()]
      })
    } finally {
      setGenerando(false)
    }
  }

  function actualizarItem(uiKey: string, item: ItemDppPendiente) {
    setItemsPendientes(prev => prev.map(it => it._uiKey === uiKey ? item : it))
  }

  function quitarItem(uiKey: string) {
    setItemsPendientes(prev => prev.filter(it => it._uiKey !== uiKey))
  }

  async function confirmarYCrear(item: ItemDppPendiente) {
    actualizarItem(item._uiKey, { ...item, creando: true, errorCreacion: null })

    let imagen_url: string | undefined
    let fallóImagen = false
    try {
      const blob = await fetch(item.imagenPreview).then(r => r.blob())
      const webp = await comprimirImagenWebP(blob, { calidad: 0.85 })
      const supabase = createClient()
      // `item._uiKey` en el path evita colisiones si dos confirmaciones caen
      // en el mismo milisegundo (doble clic, dos pestañas) — con
      // `upsert: false` una colisión haría fallar el upload en silencio.
      const path = `dpp/imagenes/${item._uiKey}-${Date.now()}.webp`
      const { data: uploadData } = await supabase.storage
        .from('dpp')
        .upload(path, webp, { contentType: 'image/webp', upsert: false })
      if (uploadData) imagen_url = uploadData.path
      else fallóImagen = true
    } catch {
      // No bloquea la creación del DPP si falla solo la imagen.
      fallóImagen = true
    }

    // Mismo filtro que `composicion_json` (nombre vacío = fila descartada) —
    // si no coinciden, el peso guardado no representa la composición real.
    const materialesConNombre = item.materiales.filter((m: MaterialDpp) => m.nombre.trim())
    const composicion_json = materialesConNombre.map((m: MaterialDpp) => ({
      material: m.nombre.trim(),
      peso_kg: m.peso_kg,
      factor_co2_kg: m.factor_co2_kg,
      factor_agua_l_kg: m.factor_agua_l_kg ?? undefined,
      origen_fuente: m.origen_fuente ?? undefined,
      nivel_confianza: m.nivel_confianza,
      categoria_material: m.categoria_material ?? undefined,
      porcentaje_reciclable: m.porcentaje_reciclable ?? undefined,
    }))
    const peso_total_kg = materialesConNombre.reduce((s: number, m: MaterialDpp) => s + m.peso_kg, 0)

    const res = await fetch('/api/dpp/activos/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: item.titulo.trim(),
        descripcion: item.descripcion.trim() || undefined,
        peso_total_kg: peso_total_kg > 0 ? peso_total_kg : undefined,
        composicion_json: composicion_json.length > 0 ? composicion_json : undefined,
        imagen_url,
        cliente_id: clienteSeleccionado?.id,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const mensaje = data.error ?? 'Error al crear el pasaporte. Intenta de nuevo.'
      actualizarItem(item._uiKey, { ...item, creando: false, errorCreacion: mensaje })
      if (res.status === 429) toast.limite(mensaje)
      return
    }

    setDppsCreados(prev => [...prev, { id: data.data.id, titulo: item.titulo }])
    quitarItem(item._uiKey)
    toast.success(`"${item.titulo}" creado como pasaporte digital.`)
    if (fallóImagen && item.imagenBase64) {
      toast.error('El pasaporte se creó, pero no se pudo guardar la foto.')
    }
  }

  return (
    <div style={{ fontFamily: "'Open Sans', sans-serif", maxWidth: 900, margin: '0 auto' }}>
      <AdminPageHeader
        titulo="Registra nuevo activo"
        subtitulo="Sube una foto y la IA detecta los materiales, tú confirmas antes de crear cada pasaporte"
        showBack
      />

      {errorGeneral && (
        <div className="rounded-[10px] p-3 mb-5 text-sm font-semibold" style={{ background: 'rgba(255,94,75,0.08)', border: '1px solid rgba(255,94,75,0.25)', color: '#FF5E4B' }}>
          {errorGeneral}
        </div>
      )}

      {/* Cliente dueño del ítem — opcional, un único selector para toda la tanda */}
      <div className="mb-5">
        <label className="text-sm font-semibold text-[var(--text-primary)] block mb-1">Cliente dueño del ítem</label>
        <p className="text-xs text-[var(--text-secondary)] mb-2">Opcional, búscalo si ya sabes de quién es, o crea el pasaporte sin cliente todavía</p>
        {clienteSeleccionado ? (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border" style={{ borderColor: 'rgba(0,130,124,0.30)', background: 'rgba(0,130,124,0.06)' }}>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{clienteSeleccionado.nombre} {clienteSeleccionado.apellido ?? ''}</span>
            <button type="button" onClick={() => setClienteSeleccionado(null)} className="text-[#00827C] text-sm font-semibold">Quitar</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                value={clienteQuery}
                onChange={e => { setClienteQuery(e.target.value); setClienteBusquedaHecha(false) }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarCliente() } }}
                placeholder="Busca por nombre, celular o NIT"
                className="flex-1 px-3 py-2 rounded-lg border text-sm bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)]"
              />
              <Button type="button" variant="secondary" onClick={buscarCliente} loading={buscandoCliente}>Buscar</Button>
            </div>
            {clienteResultados.length > 0 && (
              <div className="mt-2 rounded-lg border border-[var(--border)] overflow-hidden">
                {clienteResultados.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setClienteSeleccionado(c); setClienteResultados([]); setClienteQuery(''); setClienteBusquedaHecha(false) }}
                    className="block w-full text-left px-3 py-2.5 text-sm text-[var(--text-primary)] border-t border-[var(--border)] bg-[var(--bg-card)]"
                  >
                    {c.nombre} {c.apellido ?? ''}
                  </button>
                ))}
              </div>
            )}
            {clienteBusquedaHecha && !buscandoCliente && clienteResultados.length === 0 && (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">No se encontraron clientes con ese término.</p>
            )}
          </>
        )}
      </div>

      {/* Cascada de fotos, mismo componente que usa el Cotizador */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {grupos.map((grupo, i) => (
          <TarjetaGrupoFotos
            key={grupo.id}
            grupo={grupo}
            numero={i + 1}
            esPrimero={i === 0}
            maxFotos={MAX_FOTOS_POR_TANDA}
            error={erroresGrupos[grupo.id] ?? null}
            onCambiarModo={modo => cambiarModoGrupo(grupo.id, modo)}
            onAgregarFotos={files => agregarFotosAGrupo(grupo.id, files)}
            onQuitarFoto={idx => quitarFotoDeGrupo(grupo.id, idx)}
            onQuitarGrupo={grupos.length > 1 ? () => quitarGrupo(grupo.id) : undefined}
          />
        ))}
      </div>

      <div className="flex gap-3 items-center mb-8">
        {grupos.length < MAX_FOTOS_POR_TANDA && (
          <Button type="button" variant="secondary" onClick={agregarGrupo}>+ Agregar otro ítem</Button>
        )}
        <Button type="button" onClick={generarPropuesta} loading={generando}>Generar propuesta</Button>
      </div>

      {itemsPendientes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {itemsPendientes.map(item => (
            <DppItemCard
              key={item._uiKey}
              item={item}
              conEmpresa={conEmpresa}
              onChange={i => actualizarItem(item._uiKey, i)}
              onQuitar={() => quitarItem(item._uiKey)}
              onConfirmar={() => confirmarYCrear(item)}
              clienteVinculado={clienteSeleccionado ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido ?? ''}`.trim() : null}
            />
          ))}
        </div>
      )}

      {dppsCreados.length > 0 && (
        <div className="rounded-2xl border p-4 mb-8" style={{ borderColor: 'rgba(0,130,124,0.30)', background: 'rgba(0,130,124,0.06)' }}>
          <p className="text-sm font-bold text-[var(--text-primary)] mb-2">Pasaportes creados en esta tanda</p>
          <div className="flex flex-col gap-1">
            {dppsCreados.map(d => (
              <button key={d.id} onClick={() => router.push(`/empresa/dpp/${d.id}`)} className="text-left text-sm text-[#00827C] font-semibold hover:underline">
                {d.titulo} →
              </button>
            ))}
          </div>
        </div>
      )}

      <Button type="button" variant="secondary" onClick={() => router.push('/empresa/dpp')}>
        {dppsCreados.length > 0 ? 'Terminar e ir a Pasaportes' : 'Cancelar'}
      </Button>
    </div>
  )
}
