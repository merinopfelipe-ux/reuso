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
  // Qué hacer con un contacto que ya existe (mismo correo o mismo teléfono):
  // actualizarlo con los datos nuevos, o dejarlo como está.
  duplicados: z.enum(['actualizar', 'omitir']).default('actualizar'),
})

// Un teléfono se compara solo por sus dígitos: "+57 314 248 6695" y
// "3142486695" son el mismo número escrito distinto.
const soloDigitos = (t: string | null | undefined) => (t ?? '').replace(/\D/g, '').slice(-10)

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos de importación inválidos.' }, { status: 400 })
  }

  const todas = parsed.data.contactos.map(c => {
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

  // Se buscan los que ya existen por correo o por teléfono para no duplicarlos.
  const { data: existentes } = await guard.adminClient
    .from('leads')
    .select('id, email, telefono')

  const porEmail = new Map<string, string>()
  const porTelefono = new Map<string, string>()
  for (const l of existentes ?? []) {
    if (l.email) porEmail.set(l.email.trim().toLowerCase(), l.id)
    const d = soloDigitos(l.telefono)
    if (d.length >= 7) porTelefono.set(d, l.id)
  }

  const nuevas: typeof todas = []
  const aActualizar: { id: string; fila: (typeof todas)[number] }[] = []
  const vistosEmail = new Set<string>()
  const vistosTel = new Set<string>()

  for (const fila of todas) {
    const email = fila.email?.trim().toLowerCase() ?? ''
    const tel = soloDigitos(fila.telefono)
    // También se detectan los repetidos dentro del mismo archivo.
    if ((email && vistosEmail.has(email)) || (tel.length >= 7 && vistosTel.has(tel))) continue
    const id = (email && porEmail.get(email)) || (tel.length >= 7 ? porTelefono.get(tel) : undefined)
    if (email) vistosEmail.add(email)
    if (tel.length >= 7) vistosTel.add(tel)
    if (id) aActualizar.push({ id, fila })
    else nuevas.push(fila)
  }

  let insertados = 0
  if (nuevas.length > 0) {
    const { data, error } = await guard.adminClient.from('leads').insert(nuevas).select('id')
    if (error) {
      return NextResponse.json({ error: 'Error al insertar los contactos en la base de datos.' }, { status: 500 })
    }
    insertados = data?.length ?? nuevas.length
  }

  let actualizados = 0
  if (parsed.data.duplicados === 'actualizar') {
    for (const { id, fila } of aActualizar) {
      // Solo se pisan los campos que traen valor: un campo vacío en el archivo
      // nunca borra lo que ya estaba guardado.
      const cambios = Object.fromEntries(
        Object.entries(fila).filter(([, v]) => v !== null && v !== '' && v !== undefined)
      )
      const { error } = await guard.adminClient.from('leads').update(cambios).eq('id', id)
      if (!error) actualizados++
    }
  }

  const omitidos = todas.length - insertados - actualizados

  await logAuditoria(guard.adminClient, {
    user_id: guard.user.id,
    accion: 'importar_leads',
    detalle: { total: todas.length, insertados, actualizados, omitidos, modo: parsed.data.duplicados },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true, insertados, actualizados, omitidos, total: todas.length })
}
