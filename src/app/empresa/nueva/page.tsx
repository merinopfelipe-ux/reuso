import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Buildings, Leaf } from '@/components/ui/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import NuevaEmpresaForm from './components/nueva-empresa-form'


export default async function NuevaEmpresaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  // Si ya tiene empresa → a su panel
  if (perfil?.empresa_id) redirect('/empresa')
  // super_admin no crea empresa desde aquí
  if (perfil?.rol === 'super_admin') redirect('/admin')

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'var(--bg-primary)',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
        <ThemeToggle />
      </div>

      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 16,
        padding: '40px 32px',
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid var(--border)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-completo.svg"
            alt="Calculadora de Reúso"
            className="logo-dark-invert"
            style={{ height: 32, marginBottom: 20 }}
          />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--color-brand-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Buildings size={28} color="var(--color-brand)" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Crea tu empresa
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 15 }}>
            Registra tu organización y empieza a medir el impacto de tu equipo
          </p>
        </div>

        <NuevaEmpresaForm />

        <div style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
            <Leaf size={12} style={{ verticalAlign: 'middle', marginRight: 3, color: 'var(--color-brand)' }} />
            © Grupo MLP S.A.S.
          </p>
        </div>
      </div>
    </div>
  )
}
