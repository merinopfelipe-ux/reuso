import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash, randomBytes } from 'crypto'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

const schema = z.object({
  nombre: z.string().min(1, 'Completa el nombre del activo.').max(200),
  descripcion: z.string().max(2000).optional(),
  categoria_id: z.uuid('Selecciona una categoría válida.').optional(),
  peso_total_kg: z.number().positive('El peso debe ser mayor a 0.').max(100000).optional(),
  composicion_json: z.array(z.object({
    material: z.string(),
    peso_kg: z.number().positive(),
    factor_co2_kg: z.number().min(0),
    origen_fuente: z.string().optional(),
    nivel_confianza: z.enum(['alta', 'media', 'baja']).optional(),
  })).optional(),
  empresa_id: z.uuid('ID de empresa inválido.').optional(),
})

function generarCodigoDpp(empresaId: string): string {
  const año = new Date().getFullYear()
  const prefijo = empresaId.replace(/-/g, '').slice(0, 4).toUpperCase()
  const sufijo = randomBytes(3).toString('hex').toUpperCase()
  return `DPP-${año}-${prefijo}-${sufijo}`
}

export async function POST(request: NextRequest) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso para crear activos.' },
      { status: auth.status }
    )
  }
  const { user_id, empresa_id, rol, adminClient } = auth
  const ip = getIp(request)

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisa los datos e intenta de nuevo.' },
      { status: 400 }
    )
  }
  const { nombre, descripcion, categoria_id, peso_total_kg, composicion_json, empresa_id: bodyEmpresaId } = parsed.data

  let targetEmpresaId = empresa_id
  if (rol === 'super_admin') {
    if (!bodyEmpresaId) {
      return NextResponse.json({ error: 'Especifica la empresa para registrar el activo.' }, { status: 400 })
    }
    targetEmpresaId = bodyEmpresaId
  }

  // Generar código único (máx 3 intentos)
  let codigo_dpp = ''
  for (let i = 0; i < 3; i++) {
    const candidato = generarCodigoDpp(targetEmpresaId)
    const { data: existente } = await adminClient
      .from('dpp_activos')
      .select('id')
      .eq('codigo_dpp', candidato)
      .single()
    if (!existente) { codigo_dpp = candidato; break }
  }
  if (!codigo_dpp) {
    return NextResponse.json({ error: 'Error interno al generar el código. Intenta de nuevo.' }, { status: 500 })
  }

  // Hash chain: buscar DPP anterior de la empresa
  const { data: ultimo } = await adminClient
    .from('dpp_activos')
    .select('hash_integridad')
    .eq('empresa_id', targetEmpresaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  const hash_previo = (ultimo as { hash_integridad?: string } | null)?.hash_integridad ?? 'GENESIS_DPP'

  const now = new Date().toISOString()
  const payloadHash = JSON.stringify({ codigo_dpp, empresa_id: targetEmpresaId, nombre, composicion_json: composicion_json ?? null, hash_previo, timestamp: now })
  const hash_integridad = createHash('sha256').update(payloadHash).digest('hex')

  const profileResult = await adminClient.from('profiles').select('id').eq('user_id', user_id).single()

  const { data: activo, error: insertError } = await adminClient
    .from('dpp_activos')
    .insert({
      empresa_id: targetEmpresaId,
      user_id: profileResult.data?.id,
      codigo_dpp,
      nombre,
      descripcion: descripcion ?? null,
      categoria_id: categoria_id ?? null,
      peso_total_kg: peso_total_kg ?? null,
      composicion_json: composicion_json ?? null,
      hash_integridad,
      hash_previo,
    })
    .select()
    .single()

  if (insertError || !activo) {
    return NextResponse.json({ error: 'Error al guardar el activo. Intenta de nuevo.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id,
    accion: 'dpp_activo_creado',
    detalle: { codigo_dpp, nombre, empresa_id: targetEmpresaId },
    ip,
  })

  return NextResponse.json({ data: activo }, { status: 201 })
}
