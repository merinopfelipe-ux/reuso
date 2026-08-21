'use client'

import { useState, useRef } from 'react'
import { Search as MagnifyingGlass, User, Building2 as Buildings, CheckCircle, TriangleAlert as Warning } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { SelectorPais, PAISES, type Pais } from '@/components/ui/selector-pais'
import { SelectorCiudad, CIUDAD_DEFECTO } from '@/components/ui/selector-ciudad'
import { InputDireccion } from '@/components/ui/input-direccion'
import { InputDocumento } from '@/components/ui/input-documento'
import { distanciaLevenshtein } from '@/lib/similitud'
import { validarTelefono, formatTelefonoVista } from '@/lib/telefono'

export interface ClienteIdentificado {
  id: string
  tipo: 'persona' | 'empresa'
  nombre: string
  apellido: string | null
  identificacion: string | null
  telefono: string
  telefono_indicativo: string
  email: string | null
  pais: string | null
  ciudad: string | null
  direccion: string | null
  empresa_cliente_id: string | null
  es_contacto_real: boolean
  duplicado_de_id: string | null
  crm_empresas_clientes: { id: string; nit: string; razon_social: string; nombre_comercial: string | null; direccion: string | null } | { id: string; nit: string; razon_social: string; nombre_comercial: string | null; direccion: string | null }[] | null
}

interface Props {
  conEmpresa: (url: string) => string
  onClienteListo: (cliente: ClienteIdentificado) => void
}

type Paso = 'buscar' | 'resultados' | 'encontrado' | 'crear'

export function IdentificacionCliente({ conEmpresa, onClienteListo }: Props) {
  const [paso, setPaso] = useState<Paso>('buscar')
  const [q, setQ] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'persona' | 'empresa'>('todos')

  // Para el formulario de crear
  const [indicativo, setIndicativo] = useState<Pais>(PAISES[0])
  const [telefono, setTelefono] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [resultados, setResultados] = useState<ClienteIdentificado[]>([])
  
  const [encontrado, setEncontrado] = useState<ClienteIdentificado | null>(null)
  const [identificacionEncontrado, setIdentificacionEncontrado] = useState('')
  const [guardandoIdentificacion, setGuardandoIdentificacion] = useState(false)

  // Formulario de creación
  const [tipoNuevo, setTipoNuevo] = useState<'persona' | 'empresa'>('persona')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [identificacion, setIdentificacion] = useState('')
  const [email, setEmail] = useState('')
  const [pais, setPais] = useState('Colombia')
  const [ciudad, setCiudad] = useState(CIUDAD_DEFECTO)
  const [direccion, setDireccion] = useState('')
  const [direccionNotas, setDireccionNotas] = useState('')
  const [nit, setNit] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [nombreComercial, setNombreComercial] = useState('')
  const [guardando, setGuardando] = useState(false)

  interface ContactoNuevo { nombre: string; apellido: string; telefono: string; email: string }
  const [contactos, setContactos] = useState<ContactoNuevo[]>([])
  // Recuerda qué contactos ya se crearon con éxito en un intento previo de
  // crearClienteEmpresa, para que un reintento tras un error parcial no
  // vuelva a crear los mismos contactos ya guardados. Se reinicia siempre
  // que la lista de contactos cambia de tamaño (agregar/quitar).
  const contactosCreadosRef = useRef<(ClienteIdentificado | null)[]>([])

  function agregarContacto() {
    contactosCreadosRef.current = []
    setContactos(prev => [...prev, { nombre: '', apellido: '', telefono: '', email: '' }])
  }
  function actualizarContacto(idx: number, patch: Partial<ContactoNuevo>) {
    setContactos(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }
  function quitarContacto(idx: number) {
    contactosCreadosRef.current = []
    setContactos(prev => prev.filter((_, i) => i !== idx))
  }

  // Antes de crear: se busca un celular casi idéntico a uno ya existente
  // (típico typo de un dígito) y se le pregunta al vendedor si es la misma
  // persona, en vez de dejar que se cree un cliente duplicado en silencio.
  const [posibleDuplicado, setPosibleDuplicado] = useState<ClienteIdentificado | null>(null)
  const [posibleDuplicadoContactoIdx, setPosibleDuplicadoContactoIdx] = useState<number | null>(null)
  const [buscandoDuplicado, setBuscandoDuplicado] = useState(false)

  // Convertir un contacto B2B en un cliente B2C independiente, sin dejar de
  // ser contacto de su empresa (endpoint POST /convertir-b2c, ya existente).
  const [convirtiendo, setConvirtiendo] = useState<ClienteIdentificado | null>(null)
  const [telefonoConversion, setTelefonoConversion] = useState('')
  const [convirtiendoGuardando, setConvirtiendoGuardando] = useState(false)
  const [errorConversion, setErrorConversion] = useState<string | null>(null)

  function abrirConvertirB2C(c: ClienteIdentificado) {
    setConvirtiendo(c)
    setTelefonoConversion('')
    setIndicativo(PAISES[0])
    setErrorConversion(null)
  }

  async function confirmarConvertirB2C() {
    if (!convirtiendo || convirtiendoGuardando) return
    setConvirtiendoGuardando(true)
    setErrorConversion(null)
    try {
      const res = await fetch(conEmpresa(`/api/cotizador/clientes/${convirtiendo.id}/convertir-b2c`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: telefonoConversion.trim() || undefined, telefono_indicativo: indicativo.dial }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorConversion(data.error ?? 'No se pudo convertir.'); return }
      setConvirtiendo(null)
      // Se queda en la lista de resultados — el vendedor puede ahora
      // buscar de nuevo y encontrar el B2C recién creado si lo necesita.
    } catch {
      setErrorConversion('Error de conexión. Intenta de nuevo.')
    } finally {
      setConvirtiendoGuardando(false)
    }
  }

  const tp = 'text-[var(--text-primary)]'
  const ts = 'text-[var(--text-secondary)]'
  const cardBg = 'bg-[var(--bg-card)] border-[var(--border)]'
  const inputSt = 'w-full px-4 py-3 rounded-2xl border text-sm outline-none bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-primary)]'

  async function buscar() {
    if (!q.trim()) { setError('Ingresa un término de búsqueda.'); return }
    setError(null)
    setBuscando(true)
    try {
      const params = new URLSearchParams({ q: q.trim() })
      if (filtroTipo !== 'todos') params.set('tipo', filtroTipo)
      const res = await fetch(conEmpresa(`/api/cotizador/clientes?${params}`))
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al buscar clientes.'); return }

      if (data.clientes && data.clientes.length > 0) {
        setResultados(data.clientes)
        setPaso('resultados')
      } else {
        // Pre-llenar el telefono si q parece ser numerico
        const qNum = q.replace(/[^\d]/g, '')
        if (qNum.length >= 7) setTelefono(qNum)
        setPaso('crear')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setBuscando(false)
    }
  }

  // Punto de entrada del botón "Crear cliente": valida, busca coincidencias
  // cercanas de celular y solo si no hay ninguna (o el vendedor ya confirmó
  // que es una persona distinta) pasa a crearCliente().
  async function intentarCrear() {
    if (tipoNuevo === 'persona') {
      if (!telefono.trim() || telefono.length < 5) { setError('El celular es obligatorio y debe ser válido.'); return }
      const errorTelefono = validarTelefono(telefono.trim(), indicativo.dial)
      if (errorTelefono) { setError(errorTelefono); return }
      if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
      setError(null)
      setBuscandoDuplicado(true)
      try {
        const res = await fetch(conEmpresa('/api/cotizador/clientes'))
        const data = await res.json()
        const candidatos: ClienteIdentificado[] = data.clientes ?? []
        const telefonoLimpio = telefono.trim()
        const match = candidatos.find(c =>
          c.telefono !== telefonoLimpio &&
          distanciaLevenshtein(c.telefono ?? '', telefonoLimpio) <= 2
        )
        if (match) {
          setPosibleDuplicado(match)
          setBuscandoDuplicado(false)
          return
        }
      } catch {
        // Si falla la búsqueda de coincidencias no se bloquea la creación —
        // el índice único de la base sigue siendo la protección real.
      }
      setBuscandoDuplicado(false)
      await crearClientePersona()
      return
    }

    // tipoNuevo === 'empresa'
    if (!nit.trim() || !razonSocial.trim()) {
      setError('NIT y razón social son obligatorios.')
      return
    }
    // Chequeo de duplicado por teléfono solo para los contactos que sí
    // trajeron celular — igual criterio que B2C, un contacto por uno.
    const conTelefono = contactos.filter(c => c.telefono.trim())
    if (conTelefono.length > 0) {
      setBuscandoDuplicado(true)
      try {
        const res = await fetch(conEmpresa('/api/cotizador/clientes'))
        const data = await res.json()
        const candidatos: ClienteIdentificado[] = data.clientes ?? []
        for (const c of conTelefono) {
          const match = candidatos.find(cand =>
            cand.telefono !== c.telefono.trim() &&
            distanciaLevenshtein(cand.telefono ?? '', c.telefono.trim()) <= 2
          )
          if (match) {
            setPosibleDuplicado(match)
            setPosibleDuplicadoContactoIdx(contactos.indexOf(c))
            setBuscandoDuplicado(false)
            return
          }
        }
      } catch {
        // mismo criterio: el índice único es la protección real
      }
      setBuscandoDuplicado(false)
    }
    setError(null)
    await crearClienteEmpresa()
  }

  async function crearClientePersona() {
    setError(null)
    setGuardando(true)
    try {
      const res = await fetch(conEmpresa('/api/cotizador/clientes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoNuevo,
          telefono: telefono.trim(),
          telefono_indicativo: indicativo.dial,
          nombre: nombre.trim(),
          apellido: apellido.trim() || undefined,
          identificacion: identificacion.trim() || undefined,
          email: email.trim() || undefined,
          pais: pais.trim() || undefined,
          ciudad: ciudad.trim() || undefined,
          direccion: direccion.trim() || undefined,
          direccion_notas: direccionNotas.trim() || undefined,
          nit: tipoNuevo === 'empresa' ? nit.trim() : undefined,
          razon_social: tipoNuevo === 'empresa' ? razonSocial.trim() : undefined,
          nombre_comercial: tipoNuevo === 'empresa' ? (nombreComercial.trim() || undefined) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear el cliente.'); return }
      onClienteListo(data.cliente)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  // Crea la empresa + tantos contactos como se hayan agregado, con POSTs
  // secuenciales al mismo endpoint (reutiliza la lógica ya existente de
  // "reusar crm_empresas_clientes si el NIT ya existe" — sin esto habría
  // que duplicar esa lógica en el backend). Si no hay ningún contacto, un
  // solo POST crea el ancla de la empresa. cliente_id de la cotización
  // termina apuntando al PRIMER cliente creado.
  async function crearClienteEmpresa() {
    setGuardando(true)
    try {
      const base = {
        tipo: 'empresa' as const,
        nit: nit.trim(),
        razon_social: razonSocial.trim(),
        nombre_comercial: nombreComercial.trim() || undefined,
        pais: pais.trim() || undefined,
        ciudad: ciudad.trim() || undefined,
        direccion: direccion.trim() || undefined,
        direccion_notas: direccionNotas.trim() || undefined,
      }
      // Contactos dejados en blanco (agregados con "+ Agregar contacto" pero
      // nunca llenados) no se envían — evita crear una segunda fila-ancla
      // idéntica a la primera.
      const conDatos = contactos.filter(c => c.nombre.trim() || c.apellido.trim() || c.telefono.trim() || c.email.trim())
      const lista: (ContactoNuevo | null)[] = conDatos.length > 0 ? conDatos : [null]
      let primero: ClienteIdentificado | null = null
      for (let i = 0; i < lista.length; i++) {
        const yaCreado = contactosCreadosRef.current[i]
        if (yaCreado) {
          if (!primero) primero = yaCreado
          continue
        }
        const c = lista[i]
        const res = await fetch(conEmpresa('/api/cotizador/clientes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...base,
            nombre: c?.nombre.trim() || undefined,
            apellido: c?.apellido.trim() || undefined,
            telefono: c?.telefono.trim() || undefined,
            telefono_indicativo: indicativo.dial,
            email: c?.email.trim() || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Error al crear el cliente.'); setGuardando(false); return }
        contactosCreadosRef.current[i] = data.cliente
        if (!primero) primero = data.cliente
      }
      contactosCreadosRef.current = []
      onClienteListo(primero!)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  function seleccionarCliente(c: ClienteIdentificado) {
    setEncontrado(c)
    setIdentificacionEncontrado(c.identificacion ?? '')
    setPaso('encontrado')
  }

  if (paso === 'resultados') {
    const empresasAgrupadas = new Map<string, { emp: { id: string; nit: string; razon_social: string; nombre_comercial: string | null }; contactos: ClienteIdentificado[] }>()
    const personasSueltas: ClienteIdentificado[] = []
    resultados.forEach(c => {
      const emp = Array.isArray(c.crm_empresas_clientes) ? c.crm_empresas_clientes[0] : c.crm_empresas_clientes
      if (emp) {
        if (!empresasAgrupadas.has(emp.id)) empresasAgrupadas.set(emp.id, { emp, contactos: [] })
        empresasAgrupadas.get(emp.id)!.contactos.push(c)
      } else {
        personasSueltas.push(c)
      }
    })

    return (
      <div className={`rounded-[12px] border p-5 ${cardBg}`}>
        <p className={`text-sm font-semibold mb-1 ${tp}`}>Resultados de búsqueda</p>
        <p className={`text-xs mb-4 ${ts}`}>Se encontraron {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} para &quot;{q}&quot;</p>

        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 mb-4">
          {Array.from(empresasAgrupadas.values()).map(({ emp, contactos: contactosEmp }) => (
            <div key={emp.id} className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] p-3">
              <button
                onClick={() => seleccionarCliente(contactosEmp[0])}
                className="w-full text-left"
              >
                <p className={`text-sm font-bold ${tp}`}>{emp.razon_social}</p>
                <p className={`text-xs ${ts}`}>NIT {emp.nit}{emp.nombre_comercial ? ` · ${emp.nombre_comercial}` : ''}</p>
              </button>
              {/* La fila-ancla (es_contacto_real: false) nunca se muestra como
                  si fuera un contacto elegible — su nombre autocompletado
                  (el de la empresa) haría que "Convertir en cliente B2C"
                  no tuviera sentido sobre ella. */}
              {contactosEmp.filter(c => c.es_contacto_real).length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-1.5">
                  {contactosEmp.filter(c => c.es_contacto_real).map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <button onClick={() => seleccionarCliente(c)} className="text-left flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${tp}`}>{c.nombre} {c.apellido ?? ''}</p>
                        {c.telefono && <p className={`text-[11px] ${ts}`}>{formatTelefonoVista(c.telefono, c.telefono_indicativo)}</p>}
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirConvertirB2C(c)}
                        className="text-[11px] font-semibold px-2 py-1 rounded-full border border-[var(--border)] hover-pop flex-shrink-0"
                        style={{ color: 'var(--color-brand)' }}
                      >
                        Convertir en cliente B2C
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {personasSueltas.map(c => (
            <button
              key={c.id}
              onClick={() => seleccionarCliente(c)}
              className="w-full text-left p-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-bold ${tp}`}>{c.nombre} {c.apellido ?? ''}</p>
                  <p className={`text-xs ${ts}`}>{formatTelefonoVista(c.telefono, c.telefono_indicativo)}</p>
                </div>
                <span className="text-[10px] uppercase font-bold bg-[#59A6E4]/20 text-[#59A6E4] px-2 py-0.5 rounded-full">B2C</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => setPaso('buscar')}>Atrás</Button>
          <Button size="sm" onClick={() => {
            const qNum = q.replace(/[^\d]/g, '')
            if (qNum.length >= 7) setTelefono(qNum)
            setPaso('crear')
          }} className="flex-1">
            No está en la lista, crear nuevo
          </Button>
        </div>

        {/* Confirmar conversión a B2C */}
        <Modal
          abierto={convirtiendo !== null}
          onClose={() => setConvirtiendo(null)}
          titulo="Convertir en cliente B2C"
          descripcion={convirtiendo ? `${convirtiendo.nombre} ${convirtiendo.apellido ?? ''} pasa a existir también como cliente independiente, sin dejar de ser contacto de su empresa.` : ''}
          textoConfirmar={convirtiendoGuardando ? 'Creando...' : 'Convertir'}
          onConfirmar={() => { if (!convirtiendoGuardando) confirmarConvertirB2C() }}
        >
          {convirtiendo && !convirtiendo.telefono && (
            <div>
              <label className={`text-xs font-semibold mb-1 block ${ts}`}>Celular (obligatorio para el cliente B2C)</label>
              <div className="flex gap-2">
                <SelectorPais value={indicativo} onChange={setIndicativo} />
                <input
                  value={telefonoConversion}
                  onChange={e => setTelefonoConversion(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Número de celular"
                  inputMode="tel"
                  className={`${inputSt} flex-1`}
                />
              </div>
            </div>
          )}
          {errorConversion && <p className="mt-2 text-sm text-[#FF5E4B]">{errorConversion}</p>}
        </Modal>
      </div>
    )
  }
  if (paso === 'encontrado' && encontrado) {
    const empresaCliente = Array.isArray(encontrado.crm_empresas_clientes) ? encontrado.crm_empresas_clientes[0] : encontrado.crm_empresas_clientes
    return (
      <div className={`rounded-[12px] border p-5 ${cardBg}`}>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle size={18} className="text-[#38B98E]" />
          <p className={`text-sm font-semibold ${tp}`}>Cliente encontrado</p>
        </div>
        <p className={`text-base font-bold ${tp}`}>{encontrado.nombre} {encontrado.apellido ?? ''}</p>
        <p className={`text-sm ${ts}`}>{formatTelefonoVista(encontrado.telefono, encontrado.telefono_indicativo)}</p>
        {empresaCliente && (
          <p className={`text-sm mt-1 ${ts}`}>{empresaCliente.razon_social} · NIT {empresaCliente.nit}</p>
        )}
        {encontrado.tipo === 'persona' && (
          <div className="mt-3">
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Cédula</label>
            <input
              value={identificacionEncontrado}
              onChange={e => setIdentificacionEncontrado(e.target.value)}
              className={inputSt}
              placeholder="Falta agregarla"
              inputMode="numeric"
            />
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <Button variant="secondary" size="sm" onClick={() => { setEncontrado(null); setPaso('buscar'); setQ('') }}>
            No es este cliente
          </Button>
          <Button
            size="sm"
            loading={guardandoIdentificacion}
            onClick={async () => {
              const nueva = identificacionEncontrado.trim()
              if (nueva === (encontrado.identificacion ?? '')) { onClienteListo(encontrado); return }
              setGuardandoIdentificacion(true)
              try {
                const res = await fetch(conEmpresa(`/api/cotizador/clientes/${encontrado.id}`), {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ identificacion: nueva || null }),
                })
                const data = await res.json()
                onClienteListo(res.ok ? data.cliente : encontrado)
              } catch {
                onClienteListo(encontrado)
              } finally {
                setGuardandoIdentificacion(false)
              }
            }}
          >
            Continuar con este cliente
          </Button>
        </div>
      </div>
    )
  }

  if (paso === 'crear') {
    return (
      <div className={`rounded-[12px] border p-5 ${cardBg}`}>
        <p className={`text-sm font-semibold mb-1 ${tp}`}>Cliente nuevo</p>
        <p className={`text-xs mb-4 ${ts}`}>&quot;{q}&quot; — no está registrado, crea su perfil.</p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTipoNuevo('persona')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-colors ${
              tipoNuevo === 'persona' ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'
            }`}
          >
            <User size={15} /> Persona (B2C)
          </button>
          <button
            type="button"
            onClick={() => setTipoNuevo('empresa')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-colors ${
              tipoNuevo === 'empresa' ? 'bg-[var(--color-brand)] text-[var(--text-on-brand)]' : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'
            }`}
          >
            <Buildings size={15} /> Empresa (B2B)
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {tipoNuevo === 'persona' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} className={inputSt} placeholder="Nombre" />
                </div>
                <div>
                  <label className={`text-xs font-semibold mb-1 block ${ts}`}>Apellido</label>
                  <input value={apellido} onChange={e => setApellido(e.target.value)} className={inputSt} placeholder="Apellido" />
                </div>
              </div>
              <div>
                <label className={`text-xs font-semibold mb-1 block ${ts}`}>Celular</label>
                <div className="flex gap-2">
                  <SelectorPais value={indicativo} onChange={setIndicativo} />
                  <input
                    value={telefono}
                    onChange={e => setTelefono(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="Número de celular"
                    inputMode="tel"
                    className={`${inputSt} flex-1`}
                  />
                </div>
              </div>
              <div>
                <label className={`text-xs font-semibold mb-1 block ${ts}`}>Cédula</label>
                <input value={identificacion} onChange={e => setIdentificacion(e.target.value)} className={inputSt} placeholder="Opcional" inputMode="numeric" />
              </div>
              <div>
                <label className={`text-xs font-semibold mb-1 block ${ts}`}>Correo electrónico</label>
                <input value={email} onChange={e => setEmail(e.target.value)} className={inputSt} placeholder="Opcional" type="email" />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl p-3 border border-[var(--border)] bg-[var(--bg-input)]">
                <p className={`text-xs font-semibold mb-2 ${ts}`}>Datos de la empresa</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-semibold mb-1 block ${ts}`}>NIT</label>
                    <InputDocumento value={nit} onChange={setNit} className={inputSt} placeholder="Ej. 900.123.456" />
                  </div>
                  <div>
                    <label className={`text-xs font-semibold mb-1 block ${ts}`}>Nombre comercial</label>
                    <input value={nombreComercial} onChange={e => setNombreComercial(e.target.value)} className={inputSt} placeholder="Opcional" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={`text-xs font-semibold mb-1 block ${ts}`}>Razón social</label>
                  <input value={razonSocial} onChange={e => setRazonSocial(e.target.value)} className={inputSt} placeholder="Razón social completa" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs font-semibold ${ts}`}>Contactos (opcional)</p>
                  <button type="button" onClick={agregarContacto} className={`text-xs font-semibold hover-pop ${tp}`} style={{ color: 'var(--color-brand)' }}>
                    + Agregar contacto
                  </button>
                </div>
                {contactos.length === 0 && (
                  <p className={`text-xs italic ${ts}`}>Ninguno todavía — puedes guardar la empresa sin contactos y agregarlos después.</p>
                )}
                <div className="flex flex-col gap-3">
                  {contactos.map((c, idx) => (
                    <div key={idx} className="rounded-xl p-3 border border-[var(--border)] bg-[var(--bg-card)]">
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-[11px] font-semibold ${ts}`}>Contacto {idx + 1}</p>
                        <button type="button" onClick={() => quitarContacto(idx)} className={`text-xs font-semibold ${ts}`}>
                          Quitar
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input value={c.nombre} onChange={e => actualizarContacto(idx, { nombre: e.target.value })} className={inputSt} placeholder="Nombre" />
                        <input value={c.apellido} onChange={e => actualizarContacto(idx, { apellido: e.target.value })} className={inputSt} placeholder="Apellido" />
                      </div>
                      <div className="flex gap-2 mb-3">
                        <SelectorPais value={indicativo} onChange={setIndicativo} />
                        <input
                          value={c.telefono}
                          onChange={e => actualizarContacto(idx, { telefono: e.target.value.replace(/[^\d]/g, '') })}
                          placeholder="Celular (opcional)"
                          inputMode="tel"
                          className={`${inputSt} flex-1`}
                        />
                      </div>
                      <input value={c.email} onChange={e => actualizarContacto(idx, { email: e.target.value })} className={inputSt} placeholder="Correo (opcional)" type="email" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>País</label>
            <SelectorPais value={pais} onChange={setPais} />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Ciudad</label>
            <SelectorCiudad value={ciudad} onChange={setCiudad} pais={pais} conEmpresa={conEmpresa} />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Dirección</label>
            <InputDireccion value={direccion} onChange={setDireccion} paisCodigo={PAISES.find(p => p.nombre === pais)?.codigo} paisNombre={pais} ciudad={ciudad} />
          </div>
          <div>
            <label className={`text-xs font-semibold mb-1 block ${ts}`}>Notas sobre la dirección</label>
            <input value={direccionNotas} onChange={e => setDireccionNotas(e.target.value)} className={inputSt} placeholder="Ej. torre, apto, punto de referencia" />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-[#FF5E4B] flex items-center gap-1"><Warning size={14} /> {error}</p>
        )}

        {posibleDuplicado && (
          <div className={`mt-4 rounded-xl p-3 border ${cardBg}`} style={{ borderColor: '#F6BF3E' }}>
            <p className={`text-xs font-semibold mb-1 flex items-center gap-1 ${tp}`}>
              <Warning size={14} className="text-[#F6BF3E]" /> Celular muy parecido a uno ya existente
            </p>
            <p className={`text-xs mb-3 ${ts}`}>
              {posibleDuplicado.nombre} {posibleDuplicado.apellido ?? ''} · {formatTelefonoVista(posibleDuplicado.telefono, posibleDuplicado.telefono_indicativo)}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  // En B2B no se abandona el formulario de la empresa (NIT,
                  // razón social, otros contactos ya llenados) — el contacto
                  // que ya existe como cliente simplemente se quita de la
                  // lista para no duplicarlo, y el vendedor confirma de nuevo.
                  if (tipoNuevo === 'empresa' && posibleDuplicadoContactoIdx !== null) {
                    quitarContacto(posibleDuplicadoContactoIdx)
                    setPosibleDuplicado(null)
                    setPosibleDuplicadoContactoIdx(null)
                    return
                  }
                  seleccionarCliente(posibleDuplicado)
                }}
              >
                Sí, es la misma persona
              </Button>
              <Button size="sm" className="flex-1" loading={guardando} onClick={() => { setPosibleDuplicado(null); setPosibleDuplicadoContactoIdx(null); if (tipoNuevo === 'persona') { crearClientePersona() } else { crearClienteEmpresa() } }}>
                No, es alguien distinto
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <Button variant="secondary" size="sm" onClick={() => setPaso(resultados.length > 0 ? 'resultados' : 'buscar')}>Atrás</Button>
          <Button size="sm" loading={guardando || buscandoDuplicado} onClick={intentarCrear} className="flex-1">
            Crear y continuar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-[12px] border p-5 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--color-brand-light)]">
          <MagnifyingGlass size={15} className="text-[var(--color-brand)]" sinAnimacion />
        </div>
        <p className={`text-sm font-semibold ${tp}`}>¿A quién le cotizas?</p>
      </div>
      <p className={`text-xs mb-4 ${ts}`}>Ingresa el NIT, celular o nombre del cliente para buscarlo o crearlo</p>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') buscar() }}
          placeholder="Ej: 900123456, 310..., Juan"
          className={`${inputSt} flex-1`}
        />
        {(['persona', 'empresa'] as const).map(t => (
          <button
            key={t}
            type="button"
            aria-pressed={filtroTipo === t}
            title={t === 'persona' ? 'Buscar solo personas (B2C)' : 'Buscar solo empresas (B2B)'}
            onClick={() => setFiltroTipo(filtroTipo === t ? 'todos' : t)}
            className={`flex-shrink-0 w-[52px] h-[46px] rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
              filtroTipo === t
                ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-[var(--text-on-brand)] shadow-sm'
                : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--color-brand)]/50'
            }`}
          >
            {t === 'persona' ? <User size={16} sinAnimacion /> : <Buildings size={16} sinAnimacion />}
            <span className="text-[8px] font-bold leading-none">{t === 'persona' ? 'B2C' : 'B2B'}</span>
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm text-[#FF5E4B] flex items-center gap-1"><Warning size={14} /> {error}</p>
      )}
      <Button onClick={buscar} loading={buscando} icon={<MagnifyingGlass size={16} />} className="w-full mt-4">
        Buscar
      </Button>
    </div>
  )
}
