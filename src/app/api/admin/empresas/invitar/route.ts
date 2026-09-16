import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { invitarEmpresaSchema } from '@/lib/schemas/empresa.schema'
import { generarSlugEmpresa } from '@/lib/generar-slug'
import { sincronizarModulosSegunPlan } from '@/lib/permisos/sync-modulos-plan'
import { enviarInvitacion, enviarInvitacionEmpresaAbierta } from '@/lib/email'

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  const body = await request.json().catch(() => null)
  const parsed = invitarEmpresaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }

  const { email, plan, nombre } = parsed.data
  const adminClient = guard.adminClient
  const ip = getIp(request)

  let empresaId: string | null = null

  // Camino A: el super_admin ya sabe el nombre — la empresa nace ya.
  if (nombre) {
    let slug = generarSlugEmpresa(nombre)
    const { data: existente } = await adminClient
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (existente) slug = `${slug}-${randomBytes(2).toString('hex')}`

    const { data: empresa, error: empresaError } = await adminClient
      .from('empresas')
      .insert({ nombre, slug, plan, activa: true })
      .select('id')
      .single()

    if (empresaError || !empresa) {
      return NextResponse.json({ error: 'Error al crear la empresa.' }, { status: 500 })
    }

    empresaId = empresa.id
    await sincronizarModulosSegunPlan(adminClient, empresaId as string, plan)
  }

  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data: invitacion, error: invError } = await adminClient
    .from('invitaciones')
    .insert({
      empresa_id: empresaId,
      email,
      token_hash: tokenHash,
      rol_asignado: 'empresa_admin',
      plan_invitado: empresaId ? null : plan,
    })
    .select()
    .single()

  if (invError || !invitacion) {
    // Si ya se creó la empresa (Camino A) y la invitación falla, no dejar
    // una empresa huérfana sin ninguna invitación asociada.
    if (empresaId) await adminClient.from('empresas').delete().eq('id', empresaId)
    return NextResponse.json({ error: 'Error al generar la invitación.' }, { status: 500 })
  }

  let resendEmailId: string | null = null
  try {
    if (empresaId && nombre) {
      const res = await enviarInvitacion(email, token, nombre, null, null)
      resendEmailId = res.resendEmailId
    } else {
      const res = await enviarInvitacionEmpresaAbierta(email, token, plan)
      resendEmailId = res.resendEmailId
    }
    if (resendEmailId) {
      await adminClient.from('invitaciones').update({ resend_email_id: resendEmailId }).eq('id', invitacion.id)
    }
  } catch {
    // El envío de correo puede fallar sin bloquear la invitación — el
    // super_admin puede copiar el link manualmente (mismo criterio que el
    // endpoint de invitar empleados).
  }

  await logAuditoria(adminClient, {
    user_id: guard.user.id,
    accion: 'empresa_invitada',
    detalle: { empresa_id: empresaId, email, plan, camino: empresaId ? 'A' : 'B' },
    ip,
  })

  return NextResponse.json({ invitacion, rawToken: token, empresa_id: empresaId })
}
