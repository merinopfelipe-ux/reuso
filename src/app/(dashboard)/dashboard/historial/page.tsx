import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Mi historial' }

import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { HistorialCalculos } from '@/components/calculadora/historial-calculos'
import type { Rol } from '@/types'

export default async function HistorialPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = await createAdminClient()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, apodo, rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  const rol = (perfil?.rol ?? 'usuario_libre') as Rol

  // Carga inicial — primeras 20 filas del usuario
  const [historialRes, categoriasRes] = await Promise.all([
    adminClient
      .from('calculos')
      .select('id, user_id, empresa_id, fecha, total_co2, total_agua, detalle_json, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .range(0, 19),
    adminClient
      .from('categorias')
      .select('nombre')
      .eq('activa', true)
      .order('orden', { ascending: true }),
  ])

  const calculos = historialRes.data ?? []
  const total = rol === 'usuario_libre'
    ? Math.min(historialRes.count ?? 0, 15)
    : (historialRes.count ?? 0)
  const categorias = (categoriasRes.data ?? []).map((c) => c.nombre)

  return (
    <div>
      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          Mi historial
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          Aquí guardamos tus registros de impacto. Nosotros protegemos cada dato para que sea permanente e inalterable.
        </p>
      </div>

      <Suspense fallback={
        <div style={{
          background: 'var(--bg-card)', borderRadius: 16,
          border: '1px solid var(--border)', height: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Cargando historial...</p>
        </div>
      }>
        <HistorialCalculos
          calculos={calculos as Parameters<typeof HistorialCalculos>[0]['calculos']}
          total={total}
          rol={rol}
          categorias={categorias}
        />
      </Suspense>
    </div>
  )
}
