import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, getIp } from '@/lib/admin-guard'
import { logAuditoria } from '@/lib/audit'
import { contarStorageEmpresa, manifiestoEmpresa, ejecutarBorradoStorage } from '@/lib/storage/empresa-storage'

// Borrado definitivo de una empresa con todo lo asociado. Orden seguro:
//   1. Archivos de Storage (carpetas de la empresa y archivos que apuntan sus filas).
//      Se verifica que no quedó nada. Si falla, se detiene: la empresa sigue intacta.
//   2. Filas de la base, en una sola transacción (sql/148).
//   3. Cuentas de acceso de los miembros.
// Solo super_admin. Para borrar, el nombre exacto de la empresa es obligatorio.

const idSchema = z.string().uuid()
const confirmarSchema = z.object({ confirmacion: z.string().min(1).max(200) })

async function miembrosDe(admin: Awaited<ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>>, empresaId: string) {
  const { data } = await admin.from('profiles').select('user_id').eq('empresa_id', empresaId)
  return (data ?? []).map(p => p.user_id as string)
}

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  if (!idSchema.safeParse(params.id).success) {
    return NextResponse.json({ error: 'Empresa inválida.' }, { status: 400 })
  }

  const { data, error } = await guard.adminClient.rpc('eliminar_empresa_definitiva', {
    p_empresa: params.id,
    p_solo_contar: true,
  })
  if (error) {
    console.error('[GET /api/admin/empresas/[id]/eliminar]', error.message)
    return NextResponse.json({ error: 'No se pudo calcular qué se borraría.' }, { status: 500 })
  }

  const miembros = await miembrosDe(guard.adminClient, params.id)
  const storage = await contarStorageEmpresa(guard.adminClient, params.id, miembros).catch(() => null)

  return NextResponse.json({ ...data, archivos: storage?.archivos ?? null })
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const guard = await requireSuperAdmin(request)
  if (guard.error) return guard.error

  if (!idSchema.safeParse(params.id).success) {
    return NextResponse.json({ error: 'Empresa inválida.' }, { status: 400 })
  }

  const parsed = confirmarSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Escribe el nombre de la empresa para confirmar.' }, { status: 400 })
  }

  const admin = guard.adminClient
  const { data: empresa } = await admin.from('empresas').select('nombre').eq('id', params.id).maybeSingle()
  if (!empresa) {
    return NextResponse.json({ error: 'La empresa no existe.' }, { status: 404 })
  }
  if (parsed.data.confirmacion !== empresa.nombre) {
    return NextResponse.json({ error: 'El nombre no coincide con el de la empresa.' }, { status: 400 })
  }

  // 1. Archivos primero: si algo falla aquí, la base no se ha tocado y se puede reintentar.
  const miembros = await miembrosDe(admin, params.id)
  const manifiesto = await manifiestoEmpresa(admin, params.id, miembros)
  const archivos = await ejecutarBorradoStorage(admin, manifiesto)
  if (!archivos.ok) {
    console.error('[POST eliminar empresa] storage incompleto', { restantes: archivos.restantes, errores: archivos.errores })
    return NextResponse.json(
      { error: 'No se pudieron borrar todos los archivos de la empresa. No se borró nada de la base. Intenta de nuevo.' },
      { status: 500 }
    )
  }

  // 2. Filas de la base, en una sola transacción.
  const { data, error } = await admin.rpc('eliminar_empresa_definitiva', {
    p_empresa: params.id,
    p_solo_contar: false,
  })
  if (error) {
    // El detalle (nombres de tablas) queda en el log del servidor, no en la respuesta.
    console.error('[POST eliminar empresa] base', error.message)
    return NextResponse.json(
      { error: 'No se pudo eliminar la empresa en la base. Sus archivos ya se borraron; intenta de nuevo para completarlo.' },
      { status: 500 }
    )
  }

  // 3. Cuentas de acceso de los miembros.
  const usuarios = (data?.usuarios ?? []) as string[]
  const cuentasNoBorradas: string[] = []
  for (const userId of usuarios) {
    const { error: errorCuenta } = await admin.auth.admin.deleteUser(userId)
    if (errorCuenta) {
      console.error('[POST eliminar empresa] cuenta no borrada', userId, errorCuenta.message)
      cuentasNoBorradas.push(userId)
    }
  }

  await logAuditoria(admin, {
    user_id: guard.user.id,
    ip: getIp(request),
    accion: 'eliminar_empresa',
    detalle: {
      empresa_id: params.id,
      nombre: empresa.nombre,
      usuarios: usuarios.length,
      cuentas_no_borradas: cuentasNoBorradas.length,
      archivos_borrados: archivos.archivosBorrados,
      filas: data?.filas ?? {},
      referencias_ajenas: data?.referencias_ajenas ?? {},
      archivos_rechazados: manifiesto.rechazados.length,
    },
  })

  return NextResponse.json({
    ok: true,
    usuarios: usuarios.length,
    archivos_borrados: archivos.archivosBorrados,
    cuentas_no_borradas: cuentasNoBorradas.length,
  })
}
