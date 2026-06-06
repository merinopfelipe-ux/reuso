import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'
import { randomBytes } from 'crypto'

const bodySchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(100),
  sector: z.string().min(1).max(80).optional(),
  logo_url: z.url('URL de logo inválida.').nullable().optional(),
})

function generarSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  if (perfil?.empresa_id) {
    return NextResponse.json({ error: 'Ya tienes una empresa asociada.' }, { status: 409 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { nombre, sector, logo_url } = parsed.data
  const adminClient = await createAdminClient()
  const ip = getIp(request)

  // Generar slug único
  let slug = generarSlug(nombre)
  const { data: existing } = await adminClient
    .from('empresas')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${randomBytes(2).toString('hex')}`
  }

  const { data: empresa, error: insertError } = await adminClient
    .from('empresas')
    .insert({
      nombre,
      slug,
      sector: sector ?? null,
      logo_url: logo_url ?? null,
      plan: 'free',
      activa: true,
    })
    .select('id')
    .single()

  if (insertError || !empresa) {
    return NextResponse.json({ error: 'Error al crear la empresa.' }, { status: 500 })
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ rol: 'empresa_admin', empresa_id: empresa.id })
    .eq('user_id', user.id)

  if (profileError) {
    // Limpiar empresa creada ante fallo del profile
    await adminClient.from('empresas').delete().eq('id', empresa.id)
    return NextResponse.json({ error: 'Error al asignar el rol de empresa_admin.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'empresa_creada',
    detalle: { empresa_id: empresa.id, nombre, slug, sector: sector ?? null },
    ip,
  })

  return NextResponse.json({ empresa_id: empresa.id, slug })
}
