import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

// Valida número de WhatsApp: código de país + 7-15 dígitos, sin espacios ni guiones
const whatsappRegex = /^\d{7,15}$/

const schema = z.object({
  logo_base64:              z.string().max(3_000_000).optional(),
  logo_mime:                z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']).optional(),
  nombre_footer_propuesta:  z.string().max(120).optional().nullable(),
  whatsapp_propuesta:       z
    .string()
    .max(20)
    .refine(v => !v || whatsappRegex.test(v.replace(/\D/g, '')),
      'Escribe el WhatsApp con código de país, solo números. Ej: 573001234567')
    .optional()
    .nullable(),
  mostrar_marca_reuso: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin'])
  if (!auth.ok) {
    const msg = auth.status === 400 ? 'Selecciona una empresa para continuar.' : 'Sin permiso.'
    return NextResponse.json({ error: msg }, { status: auth.status })
  }
  const { empresa_id, adminClient } = auth

  const { data, error } = await adminClient
    .from('empresas')
    .select('logo_propuesta_url, nombre_footer_propuesta, whatsapp_propuesta, mostrar_marca_reuso, nombre')
    .eq('id', empresa_id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al cargar la configuración de marca.' }, { status: 500 })
  }

  return NextResponse.json(data ?? {})
}

export async function PATCH(request: NextRequest) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin'])
  if (!auth.ok) {
    const msg = auth.status === 400 ? 'Selecciona una empresa para continuar.' : 'Sin permiso.'
    return NextResponse.json({ error: msg }, { status: auth.status })
  }
  const { user_id, empresa_id, adminClient } = auth
  const ip = getIp(request)

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }

  const { logo_base64, logo_mime, nombre_footer_propuesta, whatsapp_propuesta, mostrar_marca_reuso } = parsed.data

  const actualizar: Record<string, unknown> = {}

  // Subir logo si viene en base64
  if (logo_base64 && logo_mime) {
    const buffer = Buffer.from(logo_base64, 'base64')
    if (buffer.length > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'El logo no puede superar 2 MB.' }, { status: 400 })
    }
    const ext = logo_mime === 'image/svg+xml' ? 'svg' : logo_mime.split('/')[1]
    const nombreArchivo = `propuesta-logos/${empresa_id}/${randomUUID()}.${ext}`
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('logos')
      .upload(nombreArchivo, buffer, { contentType: logo_mime, upsert: false })

    if (uploadError || !uploadData) {
      return NextResponse.json({ error: 'Error al subir el logo. Intenta de nuevo.' }, { status: 500 })
    }
    const { data: urlData } = adminClient.storage.from('logos').getPublicUrl(nombreArchivo)
    actualizar.logo_propuesta_url = urlData.publicUrl
  }

  if (nombre_footer_propuesta !== undefined) actualizar.nombre_footer_propuesta = nombre_footer_propuesta
  if (whatsapp_propuesta !== undefined) {
    // Normalizar: solo dígitos
    actualizar.whatsapp_propuesta = whatsapp_propuesta ? whatsapp_propuesta.replace(/\D/g, '') : null
  }
  if (mostrar_marca_reuso !== undefined) actualizar.mostrar_marca_reuso = mostrar_marca_reuso

  if (Object.keys(actualizar).length === 0) {
    return NextResponse.json({ error: 'Envía al menos un campo para actualizar.' }, { status: 400 })
  }

  const { error } = await adminClient.from('empresas').update(actualizar).eq('id', empresa_id)
  if (error) return NextResponse.json({ error: 'Error al guardar la configuración.' }, { status: 500 })

  await logAuditoria(adminClient, {
    user_id,
    accion: 'actualizar_marca_propuesta',
    detalle: { campos: Object.keys(actualizar) },
    ip,
  })

  return NextResponse.json({ ok: true, ...actualizar })
}
