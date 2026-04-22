import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-guard'
import { z } from 'zod'

const patchSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.enum(['certificado', 'informe']),
  activa: z.boolean().optional(),
  encabezado_html: z.string().max(200).optional(),
  pie_legal: z.string().max(500).optional(),
  firmante_nombre: z.string().max(120).optional(),
  firmante_cargo: z.string().max(120).optional(),
  firma_imagen_url: z.string().url().optional().or(z.literal('')),
})

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const { data, error } = await guard.adminClient
    .from('plantillas_documentos')
    .select('*')
    .order('tipo')

  if (error) return NextResponse.json({ error: 'Error al leer plantillas.' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }) }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { id, ...fields } = parsed.data
  const payload = { ...fields, updated_at: new Date().toISOString() }

  let data, error
  if (id) {
    // Actualizar plantilla existente
    ;({ data, error } = await guard.adminClient
      .from('plantillas_documentos')
      .update(payload)
      .eq('id', id)
      .select()
      .single())
  } else {
    // Crear nueva plantilla
    ;({ data, error } = await guard.adminClient
      .from('plantillas_documentos')
      .insert(payload)
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: 'Error al guardar plantilla.' }, { status: 500 })
  return NextResponse.json({ data })
}
