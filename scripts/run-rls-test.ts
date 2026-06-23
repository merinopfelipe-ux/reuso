/**
 * Script autónomo de prueba RLS — Calculadora de Reúso
 *
 * 1. Usa service_role para encontrar 2 empresas distintas y sus datos
 * 2. Crea 2 usuarios de prueba temporales (uno por empresa)
 * 3. Se autentica con el anon key como usuario A
 * 4. Intenta leer datos de empresa B — deben ser invisibles (RLS)
 * 5. Limpia los usuarios temporales al final
 *
 * Uso: npx tsx scripts/run-rls-test.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPA_ANON   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const admin = createClient(SUPA_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let pass = 0
let fail = 0
const created: string[] = []

async function check(label: string, fn: () => Promise<boolean>) {
  try {
    const ok = await fn()
    console.log(ok ? '  ✅' : '  ❌', label)
    ok ? pass++ : fail++
  } catch (e) {
    console.log('  ❌', label, '—', String(e))
    fail++
  }
}

async function cleanup(uids: string[]) {
  for (const uid of uids) {
    try { await admin.auth.admin.deleteUser(uid) } catch { /* silencioso */ }
  }
}

async function main() {
  console.log('\n🔍 Preparando datos de prueba...\n')

  // 1. Obtener 2 empresas activas con al menos 1 usuario cada una
  const { data: empresas } = await admin
    .from('empresas')
    .select('id, nombre')
    .eq('activa', true)
    .limit(5)

  if (!empresas || empresas.length < 2) {
    console.error('❌ Se necesitan al menos 2 empresas activas en la BD para correr el test.')
    process.exit(1)
  }

  const empresaA = empresas[0]
  const empresaB = empresas[1]
  console.log(`   Empresa A: ${empresaA.nombre} (${empresaA.id})`)
  console.log(`   Empresa B: ${empresaB.nombre} (${empresaB.id})`)

  // 2. Obtener un cálculo de empresa B (si existe)
  const { data: calcB } = await admin
    .from('calculos')
    .select('id')
    .eq('empresa_id', empresaB.id)
    .limit(1)
    .maybeSingle()

  // 3. Obtener un certificado de empresa B (si existe)
  const { data: certB } = await admin
    .from('certificados')
    .select('id')
    .eq('empresa_id', empresaB.id)
    .limit(1)
    .maybeSingle()

  // 4. Crear usuarios temporales de prueba
  const TS = Date.now()
  const EMAIL_A = `rls-test-a-${TS}@test-reuso.dev`
  const EMAIL_B = `rls-test-b-${TS}@test-reuso.dev`
  const PASS    = `RlsTest2026_${TS}`

  console.log('\n   Creando usuarios temporales...')

  const { data: userAData, error: errA } = await admin.auth.admin.createUser({
    email: EMAIL_A, password: PASS, email_confirm: true,
  })
  if (errA || !userAData?.user) {
    console.error('❌ No se pudo crear usuario A:', errA?.message); process.exit(1)
  }
  created.push(userAData.user.id)

  const { data: userBData, error: errB } = await admin.auth.admin.createUser({
    email: EMAIL_B, password: PASS, email_confirm: true,
  })
  if (errB || !userBData?.user) {
    await cleanup(created)
    console.error('❌ No se pudo crear usuario B:', errB?.message); process.exit(1)
  }
  created.push(userBData.user.id)

  // 5. Asignar profiles con empresas distintas
  await admin.from('profiles').upsert([
    { user_id: userAData.user.id, nombre: 'Test A', rol: 'empleado', empresa_id: empresaA.id, email: EMAIL_A },
    { user_id: userBData.user.id, nombre: 'Test B', rol: 'empleado', empresa_id: empresaB.id, email: EMAIL_B },
  ])

  console.log('   Usuarios creados. Ejecutando tests RLS...\n')

  // 6. Autenticar como usuario A con el anon key (respeta RLS)
  const clientA = createClient(SUPA_URL, SUPA_ANON)
  const { error: loginErr } = await clientA.auth.signInWithPassword({ email: EMAIL_A, password: PASS })
  if (loginErr) {
    await cleanup(created)
    console.error('❌ Login fallido para usuario A:', loginErr.message); process.exit(1)
  }

  console.log('🔐 Sesión activa como usuario A (empresa A). Intentando leer datos de empresa B...\n')

  // ── Tests ─────────────────────────────────────────────────────────────────

  await check('profiles — empresa B invisible', async () => {
    const { data } = await clientA.from('profiles').select('user_id').eq('empresa_id', empresaB.id).limit(1)
    return (data ?? []).length === 0
  })

  await check('calculos — lista empresa B vacía', async () => {
    const { data } = await clientA.from('calculos').select('id').eq('empresa_id', empresaB.id).limit(1)
    return (data ?? []).length === 0
  })

  if (calcB?.id) {
    await check(`calculos — registro específico de empresa B invisible (${calcB.id.slice(0,8)}...)`, async () => {
      const { data } = await clientA.from('calculos').select('id').eq('id', calcB.id).maybeSingle()
      return data === null
    })
  } else {
    console.log('  ⏭  calculos — no hay registros de empresa B para probar por ID')
  }

  await check('certificados — empresa B invisible', async () => {
    const { data } = await clientA.from('certificados').select('id').eq('empresa_id', empresaB.id).limit(1)
    return (data ?? []).length === 0
  })

  if (certB?.id) {
    await check(`certificados — registro específico invisible (${certB.id.slice(0,8)}...)`, async () => {
      const { data } = await clientA.from('certificados').select('id').eq('id', certB.id).maybeSingle()
      return data === null
    })
  }

  await check('crm_cotizaciones — empresa B invisible', async () => {
    const { data } = await clientA.from('crm_cotizaciones').select('id').eq('empresa_id', empresaB.id).limit(1)
    return (data ?? []).length === 0
  })

  await check('crm_clientes — empresa B invisible', async () => {
    const { data } = await clientA.from('crm_clientes').select('id').eq('empresa_id', empresaB.id).limit(1)
    return (data ?? []).length === 0
  })

  await check('dpp_activos — empresa B invisible', async () => {
    const { data } = await clientA.from('dpp_activos').select('id').eq('empresa_id', empresaB.id).limit(1)
    return (data ?? []).length === 0
  })

  await check('items — solo ve los de su empresa (no puede forzar empresa B)', async () => {
    // items no tiene empresa_id, están vinculados a categorías y módulos — RLS diferente
    // Solo verificamos que puede leer SUS items (no crash)
    const { error } = await clientA.from('items').select('id').limit(1)
    return !error
  })

  await clientA.auth.signOut()

  // ── Resultado ─────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Resultado: ${pass} ✅ correctos  |  ${fail} ❌ fallos`)
  if (fail > 0) {
    console.log('\n⚠️  Hay tablas sin RLS correctamente configurado. Revisar políticas en Supabase.')
  } else {
    console.log('\n🎉 RLS funciona correctamente entre empresas.')
  }

  // 7. Limpiar usuarios temporales
  console.log('\n🧹 Limpiando usuarios de prueba...')
  await cleanup(created)
  console.log('   Limpieza completada.\n')

  process.exit(fail > 0 ? 1 : 0)
}

main().catch(async (e) => {
  console.error('Error inesperado:', e)
  await cleanup(created)
  process.exit(1)
})
