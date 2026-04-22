import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const adminClient = await createAdminClient()
  
  // Detalle del ticket con datos del creador
  const { data: ticket, error } = await adminClient
    .from('tickets')
    .select(`
      *,
      profiles_user:user_id (nombre, email),
      empresas_emp:empresa_id (nombre)
    `)
    .eq('id', params.id)
    .single()

  if (error || !ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  // Validar RLS manual: si no es admin, debe poseerlo o ser admin de la empresa
  const { data: profile } = await supabase.from('profiles').select('rol, empresa_id').eq('user_id', user.id).single()
  const rol = profile?.rol

  if (rol !== 'super_admin') {
    if (rol === 'empresa_admin' && ticket.empresa_id !== profile?.empresa_id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    } else if (rol !== 'empresa_admin' && ticket.user_id !== user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  return NextResponse.json(ticket)
}

const patchSchema = z.object({
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  estado: z.enum(['abierto', 'en_proceso', 'resuelto', 'cerrado']).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('rol').eq('user_id', user.id).single()
  
  // Requisito: solo el super_admin (o el usuario creador cerrándolo) puede alterar estado
  // Para simplificar, super_admin cambia todo; usuario solo puede marcar 'cerrado'.
  const isSuper = profile?.rol === 'super_admin'

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Petición inválida' }, { status: 400 })

  const adminClient = await createAdminClient()

  if (!isSuper) {
    if (parsed.data.estado !== 'cerrado') {
        return NextResponse.json({ error: 'Solo puedes cerrar tu ticket.' }, { status: 403 })
    }
    const { data: t } = await adminClient.from('tickets').select('user_id').eq('id', params.id).single()
    if (t?.user_id !== user.id) {
        return NextResponse.json({ error: 'No es tu ticket' }, { status: 403 })
    }
  }

  const { error } = await adminClient
    .from('tickets')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Fallo al actualizar el ticket' }, { status: 500 })

  return NextResponse.json({ success: true })
}
