/**
 * Test de RLS entre empresas — Calculadora de Reúso
 *
 * Verifica que un usuario de empresa A no pueda leer datos de empresa B.
 *
 * Uso:
 *   npx tsx scripts/test-rls.ts
 *
 * Variables requeridas en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   TEST_USER_A_EMAIL    — empleado de empresa A
 *   TEST_USER_A_PASS
 *   TEST_EMPRESA_B_ID    — UUID de empresa B (distinta a la de usuario A)
 *   TEST_CALC_B_ID       — UUID de un cálculo que pertenece a empresa B
 */

// Para ejecutar: npx tsx --env-file=.env.local scripts/test-rls.ts
import { createClient } from '@supabase/supabase-js'

const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPA_URL || !SUPA_ANON) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')
  process.exit(1)
}

const USER_A_EMAIL  = process.env.TEST_USER_A_EMAIL!
const USER_A_PASS   = process.env.TEST_USER_A_PASS!
const EMPRESA_B_ID  = process.env.TEST_EMPRESA_B_ID!
const CALC_B_ID     = process.env.TEST_CALC_B_ID!

if (!USER_A_EMAIL || !USER_A_PASS || !EMPRESA_B_ID || !CALC_B_ID) {
  console.error('Configura TEST_USER_A_EMAIL, TEST_USER_A_PASS, TEST_EMPRESA_B_ID y TEST_CALC_B_ID en .env.local')
  process.exit(1)
}

async function check(label: string, fn: () => Promise<boolean>) {
  try {
    const ok = await fn()
    console.log(ok ? '✅' : '❌', label)
    if (!ok) process.exitCode = 1
  } catch (e) {
    console.log('❌', label, '—', String(e))
    process.exitCode = 1
  }
}

async function main() {
  const client = createClient(SUPA_URL, SUPA_ANON)

  const { error: loginError } = await client.auth.signInWithPassword({
    email: USER_A_EMAIL,
    password: USER_A_PASS,
  })
  if (loginError) {
    console.error('No se pudo autenticar usuario A:', loginError.message)
    process.exit(1)
  }
  console.log('Autenticado como usuario A. Probando acceso a recursos de empresa B...\n')

  await check('calculos — cálculo de empresa B invisible por ID', async () => {
    const { data } = await client.from('calculos').select('id').eq('id', CALC_B_ID).maybeSingle()
    return data === null
  })

  await check('calculos — lista de empresa B vacía', async () => {
    const { data } = await client.from('calculos').select('id').eq('empresa_id', EMPRESA_B_ID).limit(1)
    return (data ?? []).length === 0
  })

  await check('certificados — empresa B invisible', async () => {
    const { data } = await client.from('certificados').select('id').eq('empresa_id', EMPRESA_B_ID).limit(1)
    return (data ?? []).length === 0
  })

  await check('crm_cotizaciones — empresa B invisible', async () => {
    const { data } = await client.from('crm_cotizaciones').select('id').eq('empresa_id', EMPRESA_B_ID).limit(1)
    return (data ?? []).length === 0
  })

  await check('crm_clientes — empresa B invisible', async () => {
    const { data } = await client.from('crm_clientes').select('id').eq('empresa_id', EMPRESA_B_ID).limit(1)
    return (data ?? []).length === 0
  })

  await check('dpp_activos — empresa B invisible', async () => {
    const { data } = await client.from('dpp_activos').select('id').eq('empresa_id', EMPRESA_B_ID).limit(1)
    return (data ?? []).length === 0
  })

  await check('profiles — empresa B invisible (solo el propio perfil debe ser visible)', async () => {
    const { data } = await client.from('profiles').select('user_id').eq('empresa_id', EMPRESA_B_ID).limit(1)
    return (data ?? []).length === 0
  })

  await client.auth.signOut()
  console.log('\nPruebas completadas.')
}

main()
