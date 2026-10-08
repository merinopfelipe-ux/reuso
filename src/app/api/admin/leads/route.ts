import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { normalizarTelefono } from '@/lib/telefono'
import { parsearNotasLead } from '@/lib/notas-lead'
import { z } from 'zod'

const leadPatchSchema = z.object({
  estado: z.enum(['nuevo', 'contactado', 'convertido', 'descartado']).optional(),
  nombre: z.string().trim().max(100).nullable().optional(),
  email: z.string().trim().email('Correo inválido.').nullable().optional().or(z.literal('')),
  telefono: z.string().trim().max(40).nullable().optional(),
  empresa: z.string().trim().max(100).nullable().optional(),
  interes: z.string().trim().max(100).nullable().optional(),
  mensaje: z.string().max(2000).nullable().optional(),
  evento_nombre: z.string().trim().max(120).nullable().optional(),
  usuario_whatsapp: z.string().trim().max(60).optional().nullable(),
  notas: z.string().trim().max(20000).optional().nullable(),
  // Una nota nueva: el servidor la firma con la fecha y el usuario de la sesión.
  nota_nueva: z.string().trim().min(1, 'Escribe la nota.').max(2000).optional(),
})

const leadPostSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(100),
  email: z.string().trim().email('Correo inválido.').nullable().optional().or(z.literal('')),
  telefono: z.string().trim().max(40).nullable().optional(),
  empresa: z.string().trim().max(100).nullable().optional(),
  interes: z.string().trim().max(100).nullable().optional(),
  evento_nombre: z.string().trim().max(120).nullable().optional(),
  mensaje: z.string().max(2000).nullable().optional(),
  usuario_whatsapp: z.string().trim().max(60).optional().nullable(),
  estado: z.enum(['nuevo', 'contactado', 'convertido', 'descartado']).default('nuevo'),
})

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const estado = searchParams.get('estado')
  const plan = searchParams.get('plan')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const page = parseInt(searchParams.get('page') ?? '0', 10)
  const limit = 20

  let query = guard.adminClient
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1)

  if (estado) query = query.eq('estado', estado)
  if (plan) query = query.ilike('interes', `%${plan}%`)
  if (desde) query = query.gte('created_at', desde)
  if (hasta) query = query.lte('created_at', hasta)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: 'Error al obtener leads.' }, { status: 500 })

  return NextResponse.json({ data: data ?? [], total: count ?? 0 })
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = leadPostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { data, error } = await guard.adminClient
    .from('leads')
    .insert({
      nombre: parsed.data.nombre,
      email: parsed.data.email || null,
      telefono: parsed.data.telefono ? normalizarTelefono(parsed.data.telefono) : null,
      usuario_whatsapp: parsed.data.usuario_whatsapp?.replace(/^@/, '') || null,
      empresa: parsed.data.empresa || null,
      interes: parsed.data.interes || null,
      evento_nombre: parsed.data.evento_nombre || null,
      mensaje: parsed.data.mensaje || null,
      estado: parsed.data.estado,
    })
    .select()
    .single()

  if (error) {
    // Mismo aviso que en PATCH: si falta la migración 141 se dice qué correr,
    // en vez de un error genérico que no orienta a nadie.
    const faltaColumna = /column .* does not exist|could not find the .* column/i.test(error.message)
    return NextResponse.json(
      { error: faltaColumna ? 'Falta correr la migración sql/141 en Supabase (usuario de WhatsApp y notas).' : 'Error al crear el lead.' },
      { status: faltaColumna ? 409 : 500 }
    )
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'crear_lead',
    detalle: { id: data.id, nombre: data.nombre },
    ip: getIp(request),
  })

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el id.' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const parsed = leadPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const patchData: Record<string, unknown> = {}
  if (parsed.data.nombre !== undefined) patchData.nombre = parsed.data.nombre
  if (parsed.data.email !== undefined) patchData.email = parsed.data.email === '' ? null : parsed.data.email
  if (parsed.data.telefono !== undefined) patchData.telefono = parsed.data.telefono ? normalizarTelefono(parsed.data.telefono) : null
  if (parsed.data.empresa !== undefined) patchData.empresa = parsed.data.empresa
  if (parsed.data.interes !== undefined) patchData.interes = parsed.data.interes
  if (parsed.data.evento_nombre !== undefined) patchData.evento_nombre = parsed.data.evento_nombre
  if (parsed.data.mensaje !== undefined) patchData.mensaje = parsed.data.mensaje
  if (parsed.data.estado !== undefined) patchData.estado = parsed.data.estado
  // Campos de la migración 141. Si aún no se corrió, Supabase los rechaza y se
  // avisa claro en vez de fallar en silencio (ver abajo el manejo del error).
  if (parsed.data.usuario_whatsapp !== undefined) patchData.usuario_whatsapp = parsed.data.usuario_whatsapp?.replace(/^@/, '') || null
  if (parsed.data.notas !== undefined) patchData.notas = parsed.data.notas || null

  if (parsed.data.nota_nueva) {
    const [{ data: actual }, { data: perfil }] = await Promise.all([
      guard.adminClient.from('leads').select('notas').eq('id', id).maybeSingle(),
      guard.adminClient.from('profiles').select('nombre, apellido').eq('user_id', guard.user.id).maybeSingle(),
    ])
    const autor = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ').trim() || 'Administración'
    const nueva = { id: crypto.randomUUID(), texto: parsed.data.nota_nueva, fecha: new Date().toISOString(), autor }
    patchData.notas = JSON.stringify([nueva, ...parsearNotasLead(actual?.notas)])
  }

  const { data, error } = await guard.adminClient
    .from('leads')
    .update(patchData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    const faltaColumna = /column .* does not exist|could not find the .* column/i.test(error.message)
    return NextResponse.json(
      { error: faltaColumna ? 'Falta correr la migración sql/141 en Supabase (usuario de WhatsApp y notas).' : 'Error al actualizar el lead.' },
      { status: faltaColumna ? 409 : 500 }
    )
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'actualizar_lead',
    detalle: { id, cambios: patchData },
    ip: getIp(request),
  })

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { searchParams } = new URL(request.url)
  const idParam = searchParams.get('id')
  const idsParam = searchParams.get('ids')

  let ids: string[] = []
  if (idsParam) {
    ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
  } else if (idParam) {
    ids = [idParam.trim()]
  } else {
    const body = await request.json().catch(() => null)
    if (body?.ids && Array.isArray(body.ids)) {
      ids = body.ids.map((s: unknown) => String(s).trim()).filter(Boolean)
    }
  }

  if (ids.length === 0) return NextResponse.json({ error: 'Falta el id o ids.' }, { status: 400 })
  // Solo UUID válidos y máximo 500 por llamada (borrado en lote).
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (ids.length > 500 || ids.some(id => !UUID.test(id))) {
    return NextResponse.json({ error: 'Ids inválidos.' }, { status: 400 })
  }

  const { error } = await guard.adminClient.from('leads').delete().in('id', ids)
  if (error) return NextResponse.json({ error: 'Error al eliminar los leads.' }, { status: 500 })

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'eliminar_leads',
    detalle: { ids, cantidad: ids.length },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true, deleted: ids.length })
}
