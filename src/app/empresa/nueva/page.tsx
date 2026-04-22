import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Buildings, Leaf } from '@/components/ui/icons'
import NuevaEmpresaForm from './components/nueva-empresa-form'

const BRAND = '#00827C'

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
      background: 'var(--background)',
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 16,
        padding: '40px 32px',
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: `${BRAND}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Buildings size={28} color={BRAND} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
            Crea tu empresa
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 15 }}>
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
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            <Leaf size={12} style={{ verticalAlign: 'middle', marginRight: 3, color: BRAND }} />
            © Grupo MLP S.A.S.
          </p>
        </div>
      </div>
    </div>
  )
}
