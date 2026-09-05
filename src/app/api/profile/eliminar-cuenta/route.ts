import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

// Autoeliminación de cuenta — fundamental de producto, 2026-09-05.
// El user_id SIEMPRE sale de la sesión real (auth.getUser()), nunca del
// body — nadie puede pedir borrar la cuenta de otra persona por aquí.
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const adminClient = await createAdminClient()

  const { data: perfil } = await adminClient
    .from('profiles')
    .select('rol, nombre, email')
    .eq('user_id', user.id)
    .single()

  if (!perfil) {
    return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 })
  }

  // Mismo criterio ya establecido para el borrado por super_admin: una
  // empresa siempre tiene exactamente un empresa_admin, borrarlo la
  // dejaría sin nadie que la gestione.
  if (perfil.rol === 'empresa_admin') {
    return NextResponse.json(
      { error: 'Tu empresa se quedaría sin administrador. Pide a soporte que reasigne un nuevo admin antes de eliminar tu cuenta, o elimina la empresa completa desde tu panel.' },
      { status: 409 }
    )
  }

  // super_admin es un rol permanente del sistema (normalmente uno solo,
  // el dueño de la plataforma) — nunca se borra a sí mismo por autoservicio.
  if (perfil.rol === 'super_admin') {
    return NextResponse.json(
      { error: 'Las cuentas de super_admin no se pueden eliminar por autoservicio. Contacta a soporte si de verdad necesitas cerrar esta cuenta.' },
      { status: 409 }
    )
  }

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: 'Error al eliminar la cuenta.' }, { status: 500 })
  }

  await logAuditoria(adminClient, {
    user_id: user.id,
    accion: 'eliminar_cuenta_propia',
    detalle: { nombre: perfil.nombre, email: perfil.email, rol: perfil.rol },
    ip: getIp(request),
  })

  return NextResponse.json({ ok: true })
}
