'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Upload, Trash, Link as LinkIcon, Image as ImageIcon, AlertCircle as WarningCircle, Plus, Square, SquareCheck as CheckSquare, Save, Info } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { SelectorCiiu } from '@/components/ui/selector-ciiu'
import { SelectorPais, PAISES } from '@/components/ui/selector-pais'
import { SelectorCiudad } from '@/components/ui/selector-ciudad'
import { SelectorRegion } from '@/components/ui/selector-region'
import { InputDireccion } from '@/components/ui/input-direccion'
import { InputDocumento } from '@/components/ui/input-documento'
import { InputTelefono } from '@/components/ui/input-telefono'
import type { Empresa, PorQueElegirnos } from '@/types'

interface Props {
  empresa: Empresa
}

const cardBg = 'bg-[var(--bg-card)] border border-[var(--border)]'
const inputSt: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const labelSt = 'block text-xs font-semibold text-[var(--text-secondary)] mb-1.5'

async function rasterizarSvgAPng(svgTexto: string): Promise<{ base64: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgTexto], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const SIZE = 256
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('No se pudo procesar el SVG.')); return }
      const ratio = Math.min(SIZE / (img.width || SIZE), SIZE / (img.height || SIZE))
      const w = (img.width || SIZE) * ratio
      const h = (img.height || SIZE) * ratio
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) { reject(new Error('No se pudo generar el PNG.')); return }
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          resolve({ base64: dataUrl.split(',')[1], preview: dataUrl })
        }
        reader.readAsDataURL(pngBlob)
      }, 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('El archivo no es un SVG válido.')) }
    img.src = url
  })
}

async function descomprimirSvgz(file: File): Promise<string> {
  const ds = new DecompressionStream('gzip')
  const stream = file.stream().pipeThrough(ds)
  const buffer = await new Response(stream).arrayBuffer()
  return new TextDecoder().decode(buffer)
}

async function pngComoSvg(file: File): Promise<{ svgTexto: string; pngBase64: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 512
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('No se pudo procesar el PNG.')); return }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('No se pudo procesar el PNG.')); return }
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          const pngBase64 = dataUrl.split(',')[1]
          const svgTexto = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="data:image/png;base64,${pngBase64}"/></svg>`
          resolve({ svgTexto, pngBase64, preview: dataUrl })
        }
        reader.readAsDataURL(blob)
      }, 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('El archivo no es un PNG válido.')) }
    img.src = objectUrl
  })
}

async function comprimirAWebp(file: File): Promise<{ base64: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 1000
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('blob')); return }
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          resolve({ base64: dataUrl.split(',')[1], preview: dataUrl })
        }
        reader.readAsDataURL(blob)
      }, 'image/webp', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('No se pudo leer la imagen.')) }
    img.src = objectUrl
  })
}

function objectPositionCSS(pos: 'top' | 'center' | 'bottom' | null | undefined): string {
  if (pos === 'top') return 'center top'
  if (pos === 'bottom') return 'center bottom'
  return 'center center'
}

export function MarcaEmpresaClient({ empresa }: Props) {
  const router = useRouter()

  const [nombre, setNombre] = useState(empresa.nombre)
  const [razonSocial, setRazonSocial] = useState(empresa.nombre_footer_propuesta ?? '')
  const [sector, setSector] = useState(empresa.sector ?? '')
  const [nit, setNit] = useState(() => empresa.nit?.split('-')[0] ?? '')
  const [indicativo, setIndicativo] = useState(() => {
    if (!empresa.telefono) return PAISES[0].dial
    const match = PAISES.find(p => empresa.telefono?.startsWith(p.dial))
    return match ? match.dial : PAISES[0].dial
  })
  const [telefono, setTelefono] = useState(() => {
    if (!empresa.telefono) return ''
    const match = PAISES.find(p => empresa.telefono?.startsWith(p.dial))
    return match ? empresa.telefono.slice(match.dial.length).trim() : empresa.telefono
  })
  const [pais, setPais] = useState(empresa.pais ?? '')
  const [region, setRegion] = useState(empresa.region ?? '')
  const [ciudad, setCiudad] = useState(empresa.ciudad ?? '')
  const [direccion, setDireccion] = useState(empresa.direccion ?? '')
  const [sitioWeb, setSitioWeb] = useState(empresa.sitio_web ?? '')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [guardadoNombre, setGuardadoNombre] = useState(false)
  const [errorNombre, setErrorNombre] = useState<string | null>(null)

  async function guardarNombre() {
    if (nombre.trim().length < 2) { setErrorNombre('El nombre comercial debe tener al menos 2 caracteres.'); return }
    setErrorNombre(null)
    setGuardandoNombre(true)
    const payload = {
      nombre: nombre.trim(),
      razon_social: razonSocial.trim(),
      sector,
      nit: nit.trim(),
      telefono: `${indicativo} ${telefono}`.trim(),
      pais: pais.trim() || null,
      region: region.trim() || null,
      ciudad: ciudad.trim() || null,
      direccion: direccion.trim() || null,
      sitio_web: sitioWeb.trim() || null,
      logo_alto_minimo_px: logoAltoMinimoPx,
    }
    const res = await fetch(`/api/admin/empresas/${empresa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => null)
    setGuardandoNombre(false)
    if (!res.ok) { setErrorNombre(data?.error ?? 'Error al guardar. Intenta de nuevo.'); return }
    setGuardadoNombre(true)
    setTimeout(() => setGuardadoNombre(false), 2000)
    router.refresh()
  }

  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoSvgPreview, setLogoSvgPreview] = useState<string | null>(empresa.logo_svg_url)
  const [logoPendiente, setLogoPendiente] = useState<{ svg: string; png: string } | null>(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [errorLogo, setErrorLogo] = useState<string | null>(null)
  const [logoAltoMinimoPx, setLogoAltoMinimoPx] = useState(empresa.logo_alto_minimo_px ?? 60)

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorLogo(null)

    const nombreArchivo = file.name.toLowerCase()
    const esSvgz = nombreArchivo.endsWith('.svgz')
    const esSvg = !esSvgz && (nombreArchivo.endsWith('.svg') || file.type === 'image/svg+xml')
    const esPng = !esSvgz && !esSvg && (nombreArchivo.endsWith('.png') || file.type === 'image/png')

    if (!esSvg && !esSvgz && !esPng) {
      setErrorLogo('El logo debe ser SVG, SVGZ o PNG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorLogo('El logo no puede superar 2 MB.')
      return
    }

    try {
      if (esPng) {
        const { svgTexto, pngBase64, preview } = await pngComoSvg(file)
        setLogoPendiente({ svg: btoa(unescape(encodeURIComponent(svgTexto))), png: pngBase64 })
        setLogoSvgPreview(preview)
      } else {
        const svgTexto = esSvgz ? await descomprimirSvgz(file) : await file.text()
        const { base64: pngBase64, preview } = await rasterizarSvgAPng(svgTexto)
        setLogoPendiente({ svg: btoa(unescape(encodeURIComponent(svgTexto))), png: pngBase64 })
        setLogoSvgPreview(preview)
      }
    } catch (err) {
      setErrorLogo(err instanceof Error ? err.message : 'Error al procesar el logo.')
    }
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  async function subirLogo() {
    if (!logoPendiente) return
    setSubiendoLogo(true)
    setErrorLogo(null)
    const res = await fetch(`/api/admin/empresas/${empresa.id}/logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ svg_base64: logoPendiente.svg, png_base64: logoPendiente.png }),
    })
    const data = await res.json()
    setSubiendoLogo(false)
    if (!res.ok) { setErrorLogo(data.error ?? 'Error al subir el logo.'); return }
    setLogoPendiente(null)
    router.refresh()
  }

  const configExistente = empresa.por_que_elegirnos_json
  const [activarSeccion, setActivarSeccion] = useState(configExistente !== null)
  const [parrafo, setParrafo] = useState(configExistente?.parrafo ?? '')
  const [bullets, setBullets] = useState<string[]>(configExistente?.bullets && configExistente.bullets.length > 0 ? configExistente.bullets : [''])
  const [imagenModo, setImagenModo] = useState<'subir' | 'url'>('url')
  const [imagenUrl, setImagenUrl] = useState(configExistente?.imagen_url ?? '')
  const [imagenPosicion, setImagenPosicion] = useState<'top' | 'center' | 'bottom'>(configExistente?.imagen_posicion ?? 'center')
  const [urlPegada, setUrlPegada] = useState('')
  const [imagenRota, setImagenRota] = useState(false)
  const esUrlPropia = !imagenUrl || imagenUrl.includes('supabase.co')
  const [editandoImagen, setEditandoImagen] = useState(!imagenUrl || !esUrlPropia)
  const imagenInputRef = useRef<HTMLInputElement>(null)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [procesandoUrl, setProcesandoUrl] = useState(false)
  const [errorImagenUrl, setErrorImagenUrl] = useState<string | null>(null)
  const [guardandoSeccion, setGuardandoSeccion] = useState(false)
  const [guardadoSeccion, setGuardadoSeccion] = useState(false)
  const [errorSeccion, setErrorSeccion] = useState<string | null>(null)

  function actualizarBullet(i: number, valor: string) {
    setBullets((prev) => prev.map((b, j) => (j === i ? valor : b)))
  }
  function agregarBullet() {
    setBullets((prev) => [...prev, ''])
  }
  function quitarBullet(i: number) {
    setBullets((prev) => prev.filter((_, j) => j !== i))
  }

  async function handleImagenSeccion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorSeccion(null)
    setImagenRota(false)
    setSubiendoImagen(true)
    try {
      const { base64 } = await comprimirAWebp(file)
      const res = await fetch(`/api/admin/empresas/${empresa.id}/imagen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen_base64: base64, mime: 'image/webp' }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorSeccion(data.error ?? 'Error al subir la imagen.'); return }
      setImagenUrl(data.url)
      setEditandoImagen(false)
    } catch (err) {
      setErrorSeccion(err instanceof Error ? err.message : 'Error al procesar la imagen.')
    } finally {
      setSubiendoImagen(false)
      if (imagenInputRef.current) imagenInputRef.current.value = ''
    }
  }

  async function usarUrlExterna() {
    if (!urlPegada.trim()) return
    setErrorImagenUrl(null)
    setImagenRota(false)
    setProcesandoUrl(true)
    try {
      const res = await fetch(`/api/admin/empresas/${empresa.id}/imagen-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlPegada.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorImagenUrl(data.error ?? 'No se pudo usar esa URL.'); return }
      setImagenUrl(data.url)
      setUrlPegada('')
      setEditandoImagen(false)
    } catch {
      setErrorImagenUrl('Error de conexión. Intenta de nuevo.')
    } finally {
      setProcesandoUrl(false)
    }
  }

  const bulletsValidos = bullets.map((b) => b.trim()).filter(Boolean)

  async function guardarSeccion() {
    setErrorSeccion(null)

    if (!activarSeccion) {
      setGuardandoSeccion(true)
      const res = await fetch(`/api/admin/empresas/${empresa.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ por_que_elegirnos_json: null }),
      })
      setGuardandoSeccion(false)
      if (!res.ok) { setErrorSeccion('Error al guardar.'); return }
      setGuardadoSeccion(true)
      setTimeout(() => setGuardadoSeccion(false), 2000)
      router.refresh()
      return
    }

    if (!parrafo.trim()) { setErrorSeccion('Escribe el párrafo de presentación.'); return }
    if (bulletsValidos.length < 4) { setErrorSeccion('Agrega al menos 4 razones.'); return }
    if (!imagenUrl.trim()) { setErrorSeccion('Sube una imagen o pega una URL.'); return }

    const payload: PorQueElegirnos = {
      parrafo: parrafo.trim(),
      bullets: bulletsValidos,
      imagen_url: imagenUrl.trim(),
      imagen_posicion: imagenPosicion,
    }
    setGuardandoSeccion(true)
    const res = await fetch(`/api/admin/empresas/${empresa.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ por_que_elegirnos_json: payload }),
    })
    const data = await res.json().catch(() => null)
    setGuardandoSeccion(false)
    if (!res.ok) { setErrorSeccion(data?.error ?? 'Error al guardar.'); return }
    setGuardadoSeccion(true)
    setTimeout(() => setGuardadoSeccion(false), 2000)
    router.refresh()
  }

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Información general</h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Nombre, sector, logo y presentación que se usan en la cotización pública y en los reportes descargables.
      </p>

      <div className={`rounded-[12px] p-5 mb-5 ${cardBg}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lado Izquierdo: Campos (2/3) */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelSt}>Nombre comercial *</label>
              <input style={inputSt} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} />
            </div>
            <div>
              <div className="relative group/tt flex items-center gap-1.5 mb-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Razón social</label>
                <Info size={13} className="text-[var(--text-secondary)] cursor-help" />
                <div className="pointer-events-none absolute left-0 bottom-full mb-1 z-30 w-[240px] opacity-0 translate-y-1 group-hover/tt:opacity-100 group-hover/tt:translate-y-0 transition-all bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-2.5 text-xs text-[var(--text-secondary)] shadow-xl normal-case tracking-normal">
                  Se usa solo en el pie legal de la cotización pública. Si la dejas vacía, se usa el nombre comercial.
                </div>
              </div>
              <input style={inputSt} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} maxLength={120} placeholder="Ej: Restauraciones Lurdes S.A.S" />
            </div>
            <div>
              <label className={labelSt}>NIT / RFC / NIF</label>
              <InputDocumento style={inputSt} className="w-full" value={nit} onChange={setNit} placeholder="Ej: 900.123.456" />
            </div>
            <div>
              <label className={labelSt}>Actividad económica (CIIU)</label>
              <SelectorCiiu value={sector} onChange={setSector} />
            </div>
            <div>
              <label className={labelSt}>Teléfono celular</label>
              <InputTelefono
                indicativo={indicativo}
                onChangeIndicativo={setIndicativo}
                telefono={telefono}
                onChangeTelefono={setTelefono}
              />
            </div>
            <div>
              <label className={labelSt}>Sitio Web</label>
              <input style={inputSt} value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)} maxLength={200} placeholder="https://ejemplo.com" type="url" />
            </div>
            <div>
              <label className={labelSt}>País</label>
              <SelectorPais
                value={pais}
                onChange={(val) => {
                  setPais(val)
                  setRegion('')
                  setCiudad('')
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="relative group/tt flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Departamento</label>
                  <Info size={13} className="text-[var(--text-secondary)] cursor-help" />
                  <div className="pointer-events-none absolute left-0 bottom-full mb-1 z-30 w-[240px] opacity-0 translate-y-1 group-hover/tt:opacity-100 group-hover/tt:translate-y-0 transition-all bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-2.5 text-xs text-[var(--text-secondary)] shadow-xl normal-case tracking-normal">
                    Fuera de Colombia puedes ingresar el Estado o Provincia.
                  </div>
                </div>
                <SelectorRegion pais={pais} value={region} onChange={(val) => { setRegion(val); setCiudad(''); }} disabled={!pais} />
              </div>
              <div>
                <label className={labelSt}>Ciudad</label>
                <SelectorCiudad pais={pais} region={region} value={ciudad} onChange={setCiudad} disabled={!pais || !region} />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelSt}>Dirección física</label>
              <InputDireccion
                value={direccion}
                onChange={setDireccion}
                paisCodigo={PAISES.find(p => p.nombre === pais)?.codigo}
                paisNombre={pais}
                region={region}
                ciudad={ciudad}
              />
            </div>
          </div>

          {/* Lado Derecho: Logo (1/3) */}
          <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-[var(--border)] pt-5 lg:pt-0 lg:pl-5">
            <p className="text-sm font-bold text-[var(--text-primary)] mb-3">Logo</p>
            <button
              onClick={() => logoInputRef.current?.click()}
              className="text-sm font-medium px-3 py-2 rounded-lg border border-[#00827C]/20 text-[#00827C] hover:bg-[#00827C]/05 transition-colors"
            >
              {logoSvgPreview ? 'Cambiar logo' : 'Sube el logo'}
            </button>
            <p className="text-xs mt-1.5 mb-3 text-[var(--text-secondary)]">Recibe SVG, SVGZ y PNG, máximo 2 MB.</p>
            <input ref={logoInputRef} type="file" accept="image/svg+xml,.svg,.svgz,image/png,.png" className="hidden" onChange={handleLogoChange} />
            {errorLogo && <p className="text-xs text-[#FF5E4B] mb-2">{errorLogo}</p>}

            {logoSvgPreview && (
              <div className="mb-3">
                <div className="flex flex-col gap-3 mt-3">
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Previsualización header día</p>
                    <div className="w-full max-w-[150px] aspect-video rounded-xl border border-[var(--border)] flex items-center justify-center p-3 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoSvgPreview} alt="Logo en el header, modo día" className="w-full h-full object-contain" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">Previsualización header noche</p>
                    <div className="w-full max-w-[150px] aspect-video rounded-xl border border-white/10 flex items-center justify-center p-3 bg-[#474747]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoSvgPreview}
                        alt="Logo en el header, modo noche"
                        className="w-full h-full object-contain"
                        style={{ filter: 'brightness(0) invert(1)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-3">
              <div className="relative group/tt flex items-center gap-1.5 mb-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Alto mínimo visual</label>
                <Info size={13} className="text-[var(--text-secondary)] cursor-help" />
                <div className="pointer-events-none absolute right-0 bottom-full mb-1 z-30 w-[240px] opacity-0 translate-y-1 group-hover/tt:opacity-100 group-hover/tt:translate-y-0 transition-all bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-2.5 text-xs text-[var(--text-secondary)] shadow-xl normal-case tracking-normal text-left">
                  Mínimo 60 px. El logo reemplaza el nombre en el header y en todos los PDF, nunca aparecen los dos juntos.
                </div>
              </div>
              <div className="flex items-center gap-2 border border-[var(--border)] bg-[var(--bg-input)] rounded-lg px-3 py-2 w-[120px]">
                <input
                  type="number"
                  min={40}
                  max={200}
                  value={logoAltoMinimoPx}
                  onChange={(e) => setLogoAltoMinimoPx(Number(e.target.value))}
                  className="w-full bg-transparent outline-none text-[14px] text-[var(--text-primary)] text-right"
                />
                <span className="text-[14px] text-[var(--text-secondary)]">px</span>
              </div>
            </div>

            {logoPendiente && (
              <Button onClick={subirLogo} loading={subiendoLogo} size="sm" icon={<Save size={14} />} className="mt-2">
                Guardar
              </Button>
            )}
          </div>
        </div>

        {/* Footer actions de todo el form */}
        <div className="flex items-center justify-end mt-2">
          {errorNombre && <p className="text-xs text-[#FF5E4B] mr-4">{errorNombre}</p>}
          <Button onClick={guardarNombre} loading={guardandoNombre} size="sm" icon={guardadoNombre ? <Check size={14} /> : <Save size={14} />}>
            Guardar
          </Button>
        </div>
      </div>

      <div style={{ marginTop: 40, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>¿Por qué elegirnos?</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Se muestra en la galería de la cotización pública. No hay contenido por defecto: si no la activas y completas, esta sección no aparece.
        </p>
      </div>

      <div className={`rounded-[12px] p-5 ${cardBg}`}>
        <div className="flex items-center justify-start mb-4">
          <label
            className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none"
            onClick={() => setActivarSeccion((v) => !v)}
          >
            {activarSeccion
              ? <CheckSquare size={18} className="text-[#00827C] flex-shrink-0" />
              : <Square size={18} className="text-[var(--text-secondary)] flex-shrink-0" />}
            Personalizar esta sección
          </label>
        </div>

        {activarSeccion && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-3">
            <div>
              <div className="mb-4">
                <label className={labelSt}>Párrafo</label>
                <textarea
                  style={{ ...inputSt, resize: 'vertical' }}
                  rows={3}
                  value={parrafo}
                  onChange={(e) => setParrafo(e.target.value)}
                  maxLength={600}
                  placeholder="Restauramos muebles con amor, cuidando el planeta en cada pieza..."
                />
              </div>

              <div>
                <label className={labelSt}>Razones (mínimo 4)</label>
                <div className="flex flex-col gap-2">
                  {bullets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check size={15} className="text-[#00827C] flex-shrink-0" />
                      <input style={inputSt} value={b} onChange={(e) => actualizarBullet(i, e.target.value)} maxLength={150} placeholder={`Razón ${i + 1}`} />
                      <button onClick={() => quitarBullet(i)} className="flex-shrink-0 text-[var(--color-error)] hover:opacity-50 transition-opacity">
                        <Trash size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={agregarBullet} className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#00827C] hover-pop hover-press">
                  <Plus size={13} /> Agregar razón
                </button>
              </div>
            </div>

            <div>
              <label className={labelSt}>Imagen de la sección</label>
              {!editandoImagen && imagenUrl && esUrlPropia && !imagenRota ? (
                <div>
                  <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-input)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagenUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: objectPositionCSS(imagenPosicion) }} onError={() => setImagenRota(true)} />
                  </div>

                  <div className="mt-2.5">
                    <span className="text-xs font-semibold text-[var(--text-secondary)] mr-2">Encuadre:</span>
                    <div className="inline-flex items-center rounded-full border border-[var(--border)] p-0.5">
                      {([
                        { valor: 'top', etiqueta: 'Arriba' },
                        { valor: 'center', etiqueta: 'Centro' },
                        { valor: 'bottom', etiqueta: 'Abajo' },
                      ] as const).map((op) => (
                        <button
                          key={op.valor}
                          type="button"
                          onClick={() => setImagenPosicion(op.valor)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${imagenPosicion === op.valor ? 'bg-[#00827C] text-white' : 'text-[var(--text-secondary)]'}`}
                        >
                          {op.etiqueta}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2.5">
                    <button
                      onClick={() => setEditandoImagen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00827C] hover-pop hover-press"
                    >
                      <Upload size={13} /> Cambiar imagen
                    </button>
                    <button
                      onClick={() => { setImagenUrl(''); setEditandoImagen(true) }}
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-error)] hover:opacity-50 transition-opacity bg-transparent border-0 cursor-pointer"
                    >
                      <Trash size={13} /> Eliminar imagen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-full aspect-[16/9] rounded-[8px] overflow-hidden bg-[var(--bg-hover)] mb-3 relative">
                    {!imagenUrl ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon size={32} className="text-[var(--text-secondary)]" />
                      </div>
                    ) : !esUrlPropia || imagenRota ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 bg-[var(--bg-input)]">
                        <WarningCircle size={22} className="text-[#FF5E4B]" />
                        <span className="text-xs text-center leading-tight text-[var(--text-secondary)]">No se pudo cargar</span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagenUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ objectPosition: objectPositionCSS(imagenPosicion) }}
                        onError={() => setImagenRota(true)}
                        onLoad={() => setImagenRota(false)}
                      />
                    )}
                  </div>

                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setImagenModo('url')}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${imagenModo === 'url' ? 'bg-[#00827C]/10 border-[#00827C]/30 text-[#00827C]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}
                    >
                      <LinkIcon size={13} /> Usar URL
                    </button>
                    <button
                      onClick={() => setImagenModo('subir')}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${imagenModo === 'subir' ? 'bg-[#00827C]/10 border-[#00827C]/30 text-[#00827C]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}
                    >
                      <Upload size={13} /> Subir archivo
                    </button>
                  </div>

                  {imagenModo === 'url' ? (
                    <div className="flex gap-2">
                      <input
                        style={inputSt}
                        value={urlPegada}
                        onChange={(e) => setUrlPegada(e.target.value)}
                        placeholder="https://..."
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); usarUrlExterna() } }}
                      />
                      <Button onClick={usarUrlExterna} loading={procesandoUrl} size="sm" className="flex-shrink-0">
                        {procesandoUrl ? 'Cargando...' : 'Usar'}
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => imagenInputRef.current?.click()}
                      disabled={subiendoImagen}
                      className="text-sm font-medium px-3 py-2 rounded-lg border border-[#00827C]/20 text-[#00827C] hover:bg-[#00827C]/05 transition-colors"
                    >
                      {subiendoImagen ? 'Subiendo...' : imagenUrl ? 'Cambiar imagen' : 'Sube una imagen'}
                    </button>
                  )}
                  <input ref={imagenInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImagenSeccion} />
                  {errorImagenUrl && <p className="text-xs text-[#FF5E4B] mt-2">{errorImagenUrl}</p>}

                  {imagenUrl && esUrlPropia && !imagenRota && (
                    <button
                      onClick={() => setEditandoImagen(false)}
                      className="w-full mt-3 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors text-center"
                    >
                      Cancelar
                    </button>
                  )}

                  {imagenUrl && !esUrlPropia && (
                    <p className="text-xs text-[#F6BF3E] mt-2">
                      Esta imagen quedó guardada como enlace externo directo (de antes de este arreglo) y por eso no carga en la cotización pública. Pega la URL de nuevo arriba y presiona &quot;Usar&quot;, o sube el archivo, para que quede alojada correctamente.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {errorSeccion && <p className="text-xs text-[#FF5E4B] mb-2">{errorSeccion}</p>}
        <div className="flex justify-end mt-2">
          <Button onClick={guardarSeccion} loading={guardandoSeccion} size="sm" icon={guardadoSeccion ? <Check size={14} /> : <Save size={14} />}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}
