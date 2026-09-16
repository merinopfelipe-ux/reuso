import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { puedeEditarNit } from '@/lib/empresa/nit-lock'

const bodySchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  sector: z.string().min(1).max(255).nullable().optional(),
  logo_url: z.url('URL de logo inválida.').nullable().optional(),
  nit: z.string().min(1).max(100).nullable().optional(),
  telefono: z.string().min(1).max(100).nullable().optional(),
  pais: z.string().min(1).max(100).nullable().optional(),
  region: z.string().min(1).max(100).nullable().optional(),
  ciudad: z.string().min(1).max(100).nullable().optional(),
  direccion: z.string().max(500).nullable().optional(),
  sitio_web: z.string().url('URL inválida.').or(z.literal('')).nullable().optional(),
  sector_ciiu_principal: z.string().max(255).nullable().optional(),
  sector_ciiu_secundarios: z.array(z.string().max(255)).max(2).optional(),
})

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  // Cualquier miembro de una empresa (empleado, empresa_admin, super_admin
  // operando sobre su propia sesión) puede editar los datos operativos de su
  // empresa — cambio de permiso deliberado respecto al comportamiento
  // anterior, exclusivo de empresa_admin. usuario_libre nunca tiene
  // empresa_id, así que queda excluido de forma natural.
  if (!perfil?.rol || !perfil.empresa_id) {
    return NextResponse.json({ error: 'No tienes empresa asociada.' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const updates = parsed.data
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay cambios para guardar.' }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  if (typeof updates.nit !== 'undefined') {
    const { data: empresaActual } = await adminClient
      .from('empresas')
      .select('nit')
      .eq('id', perfil.empresa_id)
      .single()

    if (!puedeEditarNit(empresaActual?.nit ?? null, perfil.rol)) {
      return NextResponse.json(
        { error: 'El NIT ya fue registrado. Solo el equipo de Calculadora de Reúso puede corregirlo.' },
        { status: 403 }
      )
    }
  }

  const { error } = await adminClient
    .from('empresas')
    .update(updates)
    .eq('id', perfil.empresa_id)

  if (error) {
    return NextResponse.json({ error: 'Error al guardar los cambios.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'empresa_config_actualizada',
    detalle: { empresa_id: perfil.empresa_id, campos: Object.keys(updates) },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
