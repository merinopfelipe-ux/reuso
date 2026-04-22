'use client'

import { useState, useEffect } from 'react'

const DOCUMENTOS = [
  { clave: 'terminos', titulo: 'Términos y Condiciones', href: '/legal/terminos' },
  { clave: 'privacidad', titulo: 'Política de Privacidad', href: '/legal/privacidad' },
  { clave: 'datos', titulo: 'Tratamiento de Datos', href: '/legal/datos' },
  { clave: 'cookies', titulo: 'Política de Cookies', href: '/legal/cookies' },
  { clave: 'reglamento', titulo: 'Reglamento de Uso', href: '/legal/reglamento' },
  { clave: 'confidencialidad', titulo: 'Confidencialidad', href: '/legal/confidencialidad' },
]

interface ContenidoLegal {
  clave: string
  titulo: string
  cuerpo_html: string
  updated_at: string
}

export function LegalAdminClient() {
  const [tab, setTab] = useState('terminos')
  const [contenidos, setContenidos] = useState<Record<string, ContenidoLegal>>({})
  const [editando, setEditando] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    fetch('/api/admin/legal')
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          const map: Record<string, ContenidoLegal> = {}
          for (const item of data) map[item.clave] = item
          setContenidos(map)
        }
      })
  }, [])

  const docActual = DOCUMENTOS.find((d) => d.clave === tab)
  const contenidoActual = contenidos[tab]
  const textoEditando = editando[tab] ?? contenidoActual?.cuerpo_html ?? ''

  async function guardar() {
    if (!docActual) return
    setGuardando(true)
    setMensaje('')
    const res = await fetch('/api/admin/legal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clave: tab,
        titulo: docActual.titulo,
        cuerpo_html: textoEditando,
      }),
    })
    if (res.ok) {
      setContenidos((prev) => ({
        ...prev,
        [tab]: { ...(prev[tab] || {}), clave: tab, titulo: docActual.titulo, cuerpo_html: textoEditando, updated_at: new Date().toISOString() },
      }))
      setEditando((prev) => {
        const next = { ...prev }
        delete next[tab]
        return next
      })
      setMensaje('Contenido guardado.')
    } else {
      setMensaje('No pudimos guardar. Inténtalo de nuevo.')
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 4000)
  }

  const hayCamera = editando[tab] !== undefined

  return (
    <div style={{ color: 'var(--text-primary)' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Gestión de Legales</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Edita el contenido de cada documento legal. Los cambios se reflejan de inmediato en la plataforma.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 28,
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {DOCUMENTOS.map((doc) => (
          <button
            key={doc.clave}
            onClick={() => setTab(doc.clave)}
            style={{
              padding: '9px 16px',
              fontSize: 13,
              fontWeight: tab === doc.clave ? 700 : 500,
              color: tab === doc.clave ? 'var(--color-brand)' : 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === doc.clave ? '2px solid var(--color-brand)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
              transition: 'color 0.2s',
            }}
          >
            {doc.titulo}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Edita el HTML del documento. Los cambios se guardan en la base de datos y se
              aplican de inmediato.
            </p>
            {contenidoActual?.updated_at && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Última edición:{' '}
                {new Date(contenidoActual.updated_at).toLocaleString('es-CO', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </div>
          <a
            href={docActual?.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              color: 'var(--color-brand)',
              fontWeight: 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Ver en la plataforma
          </a>
        </div>

        <textarea
          value={textoEditando}
          onChange={(e) =>
            setEditando((prev) => ({ ...prev, [tab]: e.target.value }))
          }
          rows={20}
          placeholder="Pega aquí el HTML del documento legal..."
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: 13,
            lineHeight: 1.7,
            fontFamily: 'monospace',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={guardar}
            disabled={guardando || !hayCamera}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              background: guardando || !hayCamera ? 'rgba(0,130,124,0.4)' : 'var(--color-brand)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: guardando || !hayCamera ? 'not-allowed' : 'pointer',
            }}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {mensaje && (
            <p
              style={{
                fontSize: 13,
                color: mensaje.startsWith('No') ? 'var(--color-error)' : 'var(--color-success)',
                margin: 0,
                fontWeight: 500,
              }}
            >
              {mensaje}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
