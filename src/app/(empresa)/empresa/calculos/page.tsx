import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Cálculos de la empresa' }

import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { HistorialCalculos } from '@/components/calculadora/historial-calculos'
import type { Rol } from '@/types'

export default async function EmpresaCalculosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol
  const empresa_id = perfil?.empresa_id ?? null

  // Guard: solo empresa_admin (y empresa_admin en modo colaborador sigue siendo empresa_admin aquí)
  const modoEmpleado = cookies().get('modo_empleado')?.value === '1'
  if (rol !== 'empresa_admin' || modoEmpleado) redirect('/dashboard')
  if (!empresa_id) redirect('/empresa')

  const adminClient = await createAdminClient()

  // Carga inicial — primeras 20 filas de la empresa
  const [historialRes, categoriasRes, perfilesRes] = await Promise.all([
    adminClient
      .from('calculos')
      .select('id, user_id, empresa_id, fecha, total_co2, total_agua, detalle_json, created_at', { count: 'exact' })
      .eq('empresa_id', empresa_id)
      .order('fecha', { ascending: false })
      .range(0, 19),
    adminClient
      .from('categorias')
      .select('nombre')
      .eq('activa', true)
      .order('orden', { ascending: true }),
    // Nombres de todos los empleados para enriquecer las filas
    adminClient
      .from('profiles')
      .select('user_id, nombre')
      .eq('empresa_id', empresa_id),
  ])

  const calculos = historialRes.data ?? []
  const total = historialRes.count ?? 0
  const categorias = (categoriasRes.data ?? []).map((c) => c.nombre)

  // Enriquecer con nombres de usuario
  const usuariosMap = new Map(
    (perfilesRes.data ?? []).map((p) => [p.user_id, p.nombre])
  )
  const calculosConNombre = calculos.map((c) => ({
    ...c,
    usuario_nombre: usuariosMap.get(c.user_id) ?? null,
  }))

  return (
    <div>
      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          Cálculos de la empresa
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          Todos los registros de tus colaboradores — solo lectura.
        </p>
      </div>

      <Suspense fallback={
        <div style={{
          background: 'var(--bg-card)', borderRadius: 16,
          border: '1px solid var(--border)', height: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Cargando registros...</p>
        </div>
      }>
        <HistorialCalculos
          calculos={calculosConNombre as Parameters<typeof HistorialCalculos>[0]['calculos']}
          total={total}
          rol={rol}
          categorias={categorias}
        />
      </Suspense>
    </div>
  )
}
