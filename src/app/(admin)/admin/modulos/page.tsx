import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { ModulosClient } from './components/modulos-client'
import { LineasNegocioClient } from './components/lineas-negocio-client'
import type { ModuloConCategorias, LineaNegocio } from '@/types'

export default async function PlataformaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = await createAdminClient()
  
  const [modulosRes, lineasRes] = await Promise.all([
    adminClient
      .from('modulos')
      .select(`
        id, clave, nombre, icono_lucide, descripcion, activo, orden, created_at, updated_at,
        categorias(id, nombre),
        modulos_empresas(id)
      `)
      .order('orden', { ascending: true }),
    adminClient
      .from('lineas_negocio')
      .select(`
        id, clave, nombre, icono_lucide, descripcion, activa, orden, created_at, updated_at,
        lineas_negocio_empresas(id)
      `)
      .order('orden', { ascending: true })
  ])

  const modulos: ModuloConCategorias[] = (modulosRes.data ?? []).map((m) => ({
    ...m,
    categorias: (m.categorias as { id: string; nombre: string }[]) ?? [],
    total_empresas: (m.modulos_empresas as { id: string }[])?.length ?? 0,
    modulos_empresas: undefined,
  }))

  const lineas: (LineaNegocio & { total_empresas: number })[] = (lineasRes.data ?? []).map((l) => ({
    ...l,
    total_empresas: (l.lineas_negocio_empresas as { id: string }[])?.length ?? 0,
    lineas_negocio_empresas: undefined,
  }))

  return (
    <div>
      <AdminPageHeader
        titulo="Plataforma (Módulos y Líneas)"
        subtitulo={
          <>
            Catálogo maestro de módulos y líneas de negocio disponibles en la plataforma. Para activar o desactivar un módulo en una empresa puntual, ve a su ficha en{' '}
            <Link href="/admin/empresas" style={{ color: 'var(--color-brand)', fontWeight: 600 }}>Empresas</Link>.
          </>
        }
        showBack
      />
      
      <div className="mt-6 mb-2">
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>1. Módulos Base (Software)</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Herramientas core de la plataforma (Cotizador, Cálculo Ambiental, DPP).
        </p>
      </div>
      <ModulosClient modulos={modulos} />

      <div className="mt-8 mb-2 border-t pt-8" style={{ borderColor: 'var(--border)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>2. Líneas de Negocio (Industrias/Productos)</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Las verticales de negocio sobre las que operan los módulos (Muebles, Luminarias, Remodelaciones).
        </p>
      </div>
      <LineasNegocioClient lineas={lineas} />
    </div>
  )
}
