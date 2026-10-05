import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { z } from 'zod'

const itemSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido.'),
  apellido: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  telefono: z.string().trim().optional().nullable(),
  empresa: z.string().trim().optional().nullable(),
  interes: z.string().trim().optional().nullable(),
  evento_nombre: z.string().trim().optional().nullable(),
  mensaje: z.string().trim().optional().nullable(),
  estado: z.enum(['nuevo', 'contactado', 'convertido', 'descartado']).default('nuevo'),
})

const importSchema = z.object({
  contactos: z.array(itemSchema).min(1, 'Debe incluir al menos un contacto.'),
})

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos de importación inválidos.' }, { status: 400 })
  }

  const filasParaInsertar = parsed.data.contactos.map(c => {
    const nombreCompleto = [c.nombre, c.apellido].filter(Boolean).join(' ').trim() || c.nombre
    return {
      nombre: nombreCompleto,
      email: c.email || null,
      telefono: c.telefono || null,
      empresa: c.empresa || null,
      interes: c.interes || null,
      evento_nombre: c.evento_nombre || null,
      mensaje: c.mensaje || null,
      estado: c.estado || 'nuevo',
    }
  })

  const { data, error } = await guard.adminClient
    .from('leads')
    .insert(filasParaInsertar)
    .select()

  if (error) {
    return NextResponse.json({ error: 'Error al insertar los contactos en la base de datos.' }, { status: 500 })
  }

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'importar_leads',
    detalle: { total: filasParaInsertar.length },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true, insertados: data?.length ?? filasParaInsertar.length, data })
}
