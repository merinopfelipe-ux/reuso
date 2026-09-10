/**
 * Limpieza de Datos de Prueba QA - Calculadora de Reúso
 *
 * Borra de manera segura y en orden de dependencias todos los registros
 * y usuarios creados exclusivamente para pruebas en el ecosistema QA.
 *
 * USO:
 *   node --env-file=.env.local scripts/limpiar-datos-qa.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Faltan credenciales de Supabase.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function limpiarDatosQA() {
  console.log("🧹 Iniciando limpieza de datos de prueba QA...");

  // 1. Obtener IDs de empresas demo
  const { data: empresasDemo } = await supabase
    .from('empresas')
    .select('id, nombre, slug')
    .or('slug.ilike.demo-%,slug.ilike.e2e-%,nombre.ilike.[DEMO]%');

  const empresaIds = empresasDemo ? empresasDemo.map(e => e.id) : [];

  if (empresaIds.length > 0) {
    console.log(`🏢 Empresas demo encontradas (${empresaIds.length}):`, empresasDemo.map(e => e.nombre));

    // Borrar dependencias por empresa_id
    const { data: cotizaciones } = await supabase.from('crm_cotizaciones').select('id').in('empresa_id', empresaIds);
    if (cotizaciones?.length) {
      const cotIds = cotizaciones.map(c => c.id);
      await supabase.from('crm_cotizaciones_notas').delete().in('cotizacion_id', cotIds);
      await supabase.from('crm_cotizaciones_aperturas').delete().in('cotizacion_id', cotIds);
      await supabase.from('crm_cotizaciones_estado_historial').delete().in('cotizacion_id', cotIds);
      await supabase.from('crm_muebles_cotizados').delete().in('cotizacion_id', cotIds);
    }

    await supabase.from('crm_cotizaciones').delete().in('empresa_id', empresaIds);

    const { data: activos } = await supabase.from('dpp_activos').select('id').in('empresa_id', empresaIds);
    if (activos?.length) {
      const actIds = activos.map(a => a.id);
      await supabase.from('dpp_ciclos').delete().in('activo_id', actIds);
      await supabase.from('dpp_metricas_financieras').delete().in('activo_id', actIds);
      await supabase.from('dpp_documentos_ingesta').delete().in('activo_id', actIds);
    }

    await supabase.from('dpp_activos').delete().in('empresa_id', empresaIds);
    await supabase.from('crm_clientes').delete().in('empresa_id', empresaIds);
    await supabase.from('crm_empresas_clientes').delete().in('empresa_id', empresaIds);
    await supabase.from('calculos').delete().in('empresa_id', empresaIds);

    const { data: tickets } = await supabase.from('tickets').select('id').in('empresa_id', empresaIds);
    if (tickets?.length) {
      await supabase.from('tickets_mensajes').delete().in('ticket_id', tickets.map(t => t.id));
    }
    await supabase.from('tickets').delete().in('empresa_id', empresaIds);
    await supabase.from('modulos_empresas').delete().in('empresa_id', empresaIds);
    await supabase.from('invitaciones').delete().in('empresa_id', empresaIds);

    // Desvincular perfiles antes de borrar empresas
    await supabase.from('profiles').update({ empresa_id: null }).in('empresa_id', empresaIds);

    // Borrar empresas demo
    await supabase.from('empresas').delete().in('id', empresaIds);
    console.log("✅ Empresas demo y sus datos relacionados eliminados.");
  }

  // 2. Limpiar leads demo
  const { data: leadsDemo } = await supabase
    .from('leads')
    .delete()
    .or('email.ilike.demo_%,nombre.ilike.[DEMO]%,empresa.ilike.[DEMO]%')
    .select('id');
  if (leadsDemo?.length) console.log(`✅ ${leadsDemo.length} lead(s) demo eliminados.`);

  // 3. Limpiar tickets demo no asociados a empresa
  const { data: ticketsDemo } = await supabase
    .from('tickets')
    .delete()
    .or('asunto.ilike.[DEMO]%,email_contacto.ilike.demo_%')
    .select('id');
  if (ticketsDemo?.length) console.log(`✅ ${ticketsDemo.length} ticket(s) demo eliminados.`);

  // 4. Limpiar usuarios auth y profiles demo
  const { data: authList } = await supabase.auth.admin.listUsers();
  const demoUsers = authList?.users.filter(u =>
    u.email?.startsWith('demo_') ||
    u.email?.startsWith('e2e_') ||
    u.email?.includes('demo@calculadoradereuso.com')
  ) || [];

  for (const u of demoUsers) {
    await supabase.auth.admin.deleteUser(u.id);
    await supabase.from('profiles').delete().eq('user_id', u.id);
    await supabase.from('calculos').delete().eq('user_id', u.id);
  }
  if (demoUsers.length > 0) {
    console.log(`✅ ${demoUsers.length} usuario(s) demo eliminados de Auth y Profiles.`);
  }

  console.log("🎉 Limpieza completada. La base de datos está libre de datos demo.");
}

// Ejecución directa si se invoca por CLI
if (process.argv[1]?.endsWith('limpiar-datos-qa.mjs')) {
  limpiarDatosQA().catch(console.error);
}
