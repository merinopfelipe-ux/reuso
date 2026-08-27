import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Prueba de aislamiento multi-tenant (RLS) — Paso 4 del pipeline DevSecOps.
 *
 * Objetivo: probar, con llamadas REALES a Postgres a través de PostgREST
 * (no con mocks), que un usuario autenticado de la Empresa A NUNCA puede
 * leer, listar, editar ni borrar datos de la Empresa B, aunque conozca el
 * ID exacto de la fila. Esto valida las políticas RLS en sí mismas, no el
 * código de la aplicación (que es lo que ya cubre
 * e2e/06-aislamiento-usuarios.spec.ts a nivel de UI con Playwright).
 *
 * Cómo funciona: se crean dos empresas y dos usuarios reales de Supabase
 * Auth con el service_role (bypassa RLS, solo para preparar el escenario).
 * Luego cada usuario inicia sesión de verdad con la ANON key
 * (auth.signInWithPassword), lo que produce un JWT real con su propio
 * `sub` (auth.uid()). Ese cliente autenticado —no el admin— es el que se
 * usa para cada aserción, exactamente como lo haría el navegador de un
 * usuario real.
 *
 * Requiere variables de entorno de .env.local (NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) — por eso corre
 * con `npm run test:rls`, no con `npm run test:unit`. Toca la base de datos
 * real: crea sus propios datos de prueba y los borra siempre en afterAll.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    '[test:rls] Faltan variables de entorno. Corre con: node --env-file=.env.local ./node_modules/.bin/vitest run tests/rls'
  )
}

const PASSWORD = 'TestRLS-Isolation-2026!'
const SUFIJO = Date.now()

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

interface Tenant {
  empresaId: string
  userId: string
  email: string
  client: SupabaseClient
}

async function crearTenant(letra: 'A' | 'B'): Promise<Tenant> {
  const email = `test_rls_tenant_${letra.toLowerCase()}_${SUFIJO}@reuso.lurdes.co`

  const { data: empresa, error: errEmpresa } = await adminClient
    .from('empresas')
    .insert({ nombre: `Empresa RLS Test ${letra} ${SUFIJO}`, slug: `rls-test-${letra.toLowerCase()}-${SUFIJO}` })
    .select('id')
    .single()
  if (errEmpresa || !empresa) throw new Error(`No se pudo crear la empresa de prueba ${letra}: ${errEmpresa?.message}`)

  const { data: userData, error: errUser } = await adminClient.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (errUser || !userData.user) throw new Error(`No se pudo crear el usuario de prueba ${letra}: ${errUser?.message}`)

  // El trigger on_auth_user_created ya insertó la fila en profiles con rol
  // 'usuario_libre' y empresa_id null — la ajustamos al escenario de prueba
  // (empresa_admin de SU empresa) con el service_role, igual que ya hace
  // hoy el endpoint real de "crear empresa" en la app.
  const { error: errProfile } = await adminClient
    .from('profiles')
    .update({ rol: 'empresa_admin', empresa_id: empresa.id })
    .eq('user_id', userData.user.id)
  if (errProfile) throw new Error(`No se pudo preparar el profile de prueba ${letra}: ${errProfile.message}`)

  // Sesión REAL con la anon key — este es el mismo tipo de cliente/JWT que
  // usa el navegador de un usuario de verdad, sujeto por completo a RLS.
  const client = createClient(SUPABASE_URL!, ANON_KEY!)
  const { error: errLogin } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (errLogin) throw new Error(`No se pudo iniciar sesión con el usuario de prueba ${letra}: ${errLogin.message}`)

  return { empresaId: empresa.id, userId: userData.user.id, email, client }
}

async function borrarTenant(tenant: Tenant | null) {
  if (!tenant) return
  try {
    await tenant.client.auth.signOut()
  } catch (e) {
    console.warn(`[test:rls] No se pudo cerrar sesión de ${tenant.email}:`, e)
  }
  const { error: errUser } = await adminClient.auth.admin.deleteUser(tenant.userId) // ON DELETE CASCADE borra el profile
  if (errUser) console.warn(`[test:rls] No se pudo borrar el usuario de prueba ${tenant.email}:`, errUser.message)
  const { error: errEmpresa } = await adminClient.from('empresas').delete().eq('id', tenant.empresaId)
  if (errEmpresa) console.warn(`[test:rls] No se pudo borrar la empresa de prueba ${tenant.empresaId}:`, errEmpresa.message)
}

describe('Aislamiento multi-tenant vía RLS (crm_clientes)', () => {
  let tenantA: Tenant | null = null
  let tenantB: Tenant | null = null
  let clienteSecretoId: string

  beforeAll(async () => {
    tenantA = await crearTenant('A')
    tenantB = await crearTenant('B')

    // Tenant A crea un cliente propio (dato de negocio real y sensible:
    // nombre, teléfono, identificación de un cliente suyo).
    const { data, error } = await tenantA.client
      .from('crm_clientes')
      .insert({ empresa_id: tenantA.empresaId, nombre: 'Cliente Secreto de Empresa A', telefono: '3000000000' })
      .select('id')
      .single()
    if (error || !data) throw new Error(`Tenant A no pudo crear su propio cliente (esto ya sería un bug de RLS): ${error?.message}`)
    clienteSecretoId = data.id
  }, 30_000)

  afterAll(async () => {
    if (clienteSecretoId) {
      const { error } = await adminClient.from('crm_clientes').delete().eq('id', clienteSecretoId)
      if (error) console.warn('[test:rls] No se pudo borrar el cliente de prueba:', error.message)
    }
    await borrarTenant(tenantA)
    await borrarTenant(tenantB)
  }, 30_000)

  it('control positivo: Tenant A sí puede leer su propio cliente', async () => {
    const { data, error } = await tenantA!.client
      .from('crm_clientes')
      .select('id, nombre')
      .eq('id', clienteSecretoId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.nombre).toBe('Cliente Secreto de Empresa A')
  })

  it('Tenant B NO puede leer el cliente de Tenant A por ID directo', async () => {
    const { data, error } = await tenantB!.client
      .from('crm_clientes')
      .select('id, nombre')
      .eq('id', clienteSecretoId)
      .maybeSingle()

    // RLS filtra la fila como si no existiera: sin error, sin datos.
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('Tenant B NO ve el cliente de Tenant A en un listado completo (anti-enumeración)', async () => {
    const { data, error } = await tenantB!.client.from('crm_clientes').select('id')

    expect(error).toBeNull()
    const ids = (data ?? []).map(r => r.id)
    expect(ids).not.toContain(clienteSecretoId)
  })

  it('Tenant B NO puede modificar el cliente de Tenant A', async () => {
    const { error } = await tenantB!.client
      .from('crm_clientes')
      .update({ nombre: 'HACKEADO POR EMPRESA B' })
      .eq('id', clienteSecretoId)

    // La política WITH CHECK bloquea la escritura silenciosamente (0 filas
    // afectadas, PostgREST no reporta error) — la comprobación real es que
    // el dato NO haya cambiado, verificado abajo con el service_role.
    expect(error).toBeNull()

    const { data: verificacion } = await adminClient
      .from('crm_clientes')
      .select('nombre')
      .eq('id', clienteSecretoId)
      .single()
    expect(verificacion?.nombre).toBe('Cliente Secreto de Empresa A')
  })

  it('Tenant B NO puede borrar el cliente de Tenant A', async () => {
    const { error } = await tenantB!.client.from('crm_clientes').delete().eq('id', clienteSecretoId)
    expect(error).toBeNull()

    const { data: sigueExistiendo } = await adminClient
      .from('crm_clientes')
      .select('id')
      .eq('id', clienteSecretoId)
      .maybeSingle()
    expect(sigueExistiendo?.id).toBe(clienteSecretoId)
  })
})
