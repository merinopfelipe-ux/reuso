'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, KeyRound, Mail } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

interface AdminEmpresa {
  user_id: string
  nombre: string
  apellido: string | null
  email: string
}

interface Props {
  empresaId: string
  admins: AdminEmpresa[]
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-input)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

export function AdminEmpresaClient({ empresaId, admins }: Props) {
  const router = useRouter()
  const [restableciendo, setRestableciendo] = useState<string | null>(null)
  const [restablecido, setRestablecido] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function restablecerPassword(userId: string) {
    setRestableciendo(userId)
    const res = await fetch(`/api/admin/usuarios/${userId}/restablecer-password`, { method: 'POST' })
    setRestableciendo(null)
    if (res.ok) {
      setRestablecido(userId)
      setTimeout(() => setRestablecido(null), 3000)
    }
  }

  async function crearAdmin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !nombre.trim()) { setError('Correo y nombre son obligatorios.'); return }
    setCreando(true)
    const res = await fetch('/api/admin/usuarios/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        nombre: nombre.trim(),
        apellido: apellido.trim() || null,
        rol: 'empresa_admin',
        empresa_id: empresaId,
      }),
    })
    const data = await res.json().catch(() => null)
    setCreando(false)
    if (!res.ok) { setError(data?.error ?? 'Error al crear el administrador.'); return }
    setMostrarForm(false)
    setEmail('')
    setNombre('')
    setApellido('')
    router.refresh()
  }

  return (
    <div style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Administrador de la empresa</h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Quién puede iniciar sesión como <code>empresa_admin</code> de esta empresa. Al crear uno nuevo, le llega un correo para que defina su propia contraseña.
      </p>

      <div className="rounded-[12px] p-5 bg-[var(--bg-card)] border border-[var(--border)]">
        {admins.length === 0 && !mostrarForm && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Ningún usuario está vinculado como administrador de esta empresa todavía.
          </p>
        )}

        {admins.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {admins.map((a) => (
              <div key={a.user_id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{a.nombre} {a.apellido ?? ''}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{a.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => restablecerPassword(a.user_id)}
                  disabled={restableciendo === a.user_id}
                  title="Enviar correo para restablecer contraseña"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold flex-shrink-0 hover:bg-[var(--bg-hover)] transition-colors"
                  style={{
                    color: restablecido === a.user_id ? 'var(--color-brand)' : 'var(--text-secondary)',
                    opacity: restableciendo === a.user_id ? 0.5 : 1,
                    cursor: restableciendo === a.user_id ? 'not-allowed' : 'pointer',
                  }}
                >
                  <KeyRound size={13} />
                  {restablecido === a.user_id ? 'Correo enviado' : 'Restablecer contraseña'}
                </button>
              </div>
            ))}
          </div>
        )}

        {!mostrarForm ? (
          <Button variant="secondary" size="sm" icon={<UserPlus size={14} />} onClick={() => setMostrarForm(true)}>
            Agregar administrador
          </Button>
        ) : (
          <form onSubmit={crearAdmin} className="flex flex-col gap-3 pt-2 border-t border-[var(--border)] mt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="md:col-span-2">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Correo electrónico *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@empresa.com" style={inputSt} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Nombre *</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputSt} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>Apellido</label>
                <input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} style={inputSt} />
              </div>
            </div>
            {error && <p className="text-xs text-[#FF5E4B]">{error}</p>}
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" loading={creando} icon={<Mail size={14} />}>
                Crear y enviar acceso
              </Button>
              <button
                type="button"
                onClick={() => { setMostrarForm(false); setError(null) }}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
