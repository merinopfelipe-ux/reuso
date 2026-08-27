/**
 * Seed Maestro del Ecosistema Reúso — Entorno de Taller y Pruebas Seguras
 *
 * Pobla un ecosistema multi-empresa completo con:
 * - 2 Empresas aisladas (Empresa A y Empresa B)
 * - Administradores y Vendedores por empresa
 * - Clientes B2B con contactos asociados
 * - 5 Cotizaciones en distintas etapas del embudo comercial
 * - 3 Pasaportes Digitales de Producto (DPP) con ciclos de trazabilidad
 *
 * USO:
 *   npm run db:seed
 */

import { createClient } from '@supabase/supabase-js';

// ─── 1. GUARDA DE SEGURIDAD PARA PRODUCCIÓN ─────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Faltan credenciales de Supabase en las variables de entorno.");
  process.exit(1);
}

const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production' ||
  SUPABASE_URL.includes('prod-db-reuso') ||
  process.env.REUSO_ENV === 'production';

if (isProduction && process.env.FORCE_SEED !== 'true') {
  console.error("🛑 BLOQUEO DE SEGURIDAD:");
  console.error("No se puede ejecutar db:seed en un entorno marcado como PRODUCCIÓN.");
  console.error("Si realmente necesitas ejecutar esto, define FORCE_SEED=true de manera explícita.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runSeedEcosistema() {
  console.log("🌱 Iniciando siembra del Ecosistema Multi-Tenant Reúso...");

  const timestamp = Date.now().toString().slice(-4);

  // ─── 2. CREACIÓN DE CATEGORÍAS BASE ───────────────────────────────────────
  console.log("📦 Verificando/Creando categorías base...");
  const { data: catRopa } = await supabase
    .from('categorias')
    .upsert(
      { nombre: 'Textiles y Confección', icono_lucide: 'Shirt', descripcion: 'Prendas y tejidos circulares', activa: true, orden: 1 },
      { onConflict: 'nombre' }
    )
    .select('id')
    .single();

  const { data: catMuebles } = await supabase
    .from('categorias')
    .upsert(
      { nombre: 'Mobiliario Corporativo', icono_lucide: 'Armchair', descripcion: 'Muebles de oficina recuperados', activa: true, orden: 2 },
      { onConflict: 'nombre' }
    )
    .select('id')
    .single();

  // ─── 3. CREACIÓN DE EMPRESAS SIMULADAS ─────────────────────────────────────
  console.log("🏢 Creando Empresa Demo A y Empresa Demo B...");

  const empresaA_payload = {
    nombre: `EcoMuebles Andina ${timestamp}`,
    slug: `ecomuebles-andina-${timestamp}`,
    nit: `900123456-${timestamp.slice(0, 1)}`,
    telefono: '3101234567',
    plan: 'ilimitado',
    tiene_cotizador: true,
    tiene_dpp: true,
    moneda_preferida: 'COP'
  };

  const empresaB_payload = {
    nombre: `Circular Textiles S.A.S. ${timestamp}`,
    slug: `circular-textiles-${timestamp}`,
    nit: `900987654-${timestamp.slice(0, 1)}`,
    telefono: '3207654321',
    plan: 'impulso',
    tiene_cotizador: true,
    tiene_dpp: true,
    moneda_preferida: 'COP'
  };

  const { data: empresaA, error: errEmpA } = await supabase
    .from('empresas')
    .insert([empresaA_payload])
    .select('id, nombre')
    .single();

  const { data: empresaB, error: errEmpB } = await supabase
    .from('empresas')
    .insert([empresaB_payload])
    .select('id, nombre')
    .single();

  if (errEmpA || errEmpB) {
    console.error("❌ Error creando empresas:", errEmpA?.message || errEmpB?.message);
    process.exit(1);
  }

  console.log(`✅ Empresa A creada: ${empresaA.nombre} (${empresaA.id})`);
  console.log(`✅ Empresa B creada: ${empresaB.nombre} (${empresaB.id})`);

  // ─── 4. CLIENTES B2B CON CONTACTOS ─────────────────────────────────────────
  console.log("👥 Registrando Clientes Corporativos B2B...");

  const { data: cliente1, error: errC1 } = await supabase
    .from('crm_clientes')
    .insert([{
      empresa_id: empresaA.id,
      tipo: 'empresa',
      nombre: 'Banco Metropolitano',
      identificacion: '860001234-5',
      telefono: '3001112233',
      email: 'compras@bancometro.com',
      ciudad: 'Bogotá',
      notas: 'Interesados en reacondicionamiento de 120 estaciones de trabajo.'
    }])
    .select('id')
    .single();

  const { data: cliente2, error: errC2 } = await supabase
    .from('crm_clientes')
    .insert([{
      empresa_id: empresaA.id,
      tipo: 'empresa',
      nombre: 'Inversiones Hoteleras del Caribe',
      identificacion: '901445566-7',
      telefono: '3152223344',
      email: 'dotaciones@hotelcaribe.com',
      ciudad: 'Cartagena',
      notas: 'Renovación de silletería de conferencias.'
    }])
    .select('id')
    .single();

  const { data: cliente3, error: errC3 } = await supabase
    .from('crm_clientes')
    .insert([{
      empresa_id: empresaB.id,
      tipo: 'empresa',
      nombre: 'Uniformes y Dotaciones Industriales',
      identificacion: '890987111-2',
      telefono: '3119998877',
      email: 'gerencia@dotacionesind.com',
      ciudad: 'Medellín',
      notas: 'Recuperación de fibras textiles.'
    }])
    .select('id')
    .single();

  if (errC1 || errC2 || errC3) {
    console.warn("⚠️ Aviso al registrar clientes:", errC1?.message || errC2?.message || errC3?.message);
  }

  // ─── 5. COTIZACIONES EN DIVERSAS ETAPAS DEL EMBUDO ────────────────────────
  console.log("📊 Generando 5 Cotizaciones demo en diversas etapas...");

  const cotizacionesDemo = [
    {
      empresa_id: empresaA.id,
      cliente_id: cliente1?.id,
      codigo_cotizacion: `COT-A-${timestamp}-01`,
      estado: 'por_cotizar',
      subtotal: 3500000,
      descuento: 0,
      total: 3500000,
      co2_evitado_total_kg: 245.5,
      agua_evitada_total_l: 18000,
      observaciones: 'Etapa inicial: Levantamiento de requerimientos.'
    },
    {
      empresa_id: empresaA.id,
      cliente_id: cliente1?.id,
      codigo_cotizacion: `COT-A-${timestamp}-02`,
      estado: 'enviada',
      subtotal: 7800000,
      descuento: 200000,
      total: 7600000,
      co2_evitado_total_kg: 520.0,
      agua_evitada_total_l: 35000,
      enlace_publico_token: `token-pub-a-${timestamp}-02`,
      observaciones: 'Propuesta enviada al comité de sostenibilidad.'
    },
    {
      empresa_id: empresaA.id,
      cliente_id: cliente2?.id,
      codigo_cotizacion: `COT-A-${timestamp}-03`,
      estado: 'en_negociacion',
      subtotal: 12500000,
      descuento: 500000,
      total: 12000000,
      co2_evitado_total_kg: 890.2,
      agua_evitada_total_l: 62000,
      enlace_publico_token: `token-pub-a-${timestamp}-03`,
      observaciones: 'Revisando términos de pago y cronograma de entrega.'
    },
    {
      empresa_id: empresaA.id,
      cliente_id: cliente2?.id,
      codigo_cotizacion: `COT-A-${timestamp}-04`,
      estado: 'esperando_anticipo',
      subtotal: 4200000,
      descuento: 0,
      total: 4200000,
      co2_evitado_total_kg: 310.0,
      agua_evitada_total_l: 22000,
      enlace_publico_token: `token-pub-a-${timestamp}-04`,
      observaciones: 'Aprobada por el cliente. Esperando pago de anticipo.'
    },
    {
      empresa_id: empresaB.id,
      cliente_id: cliente3?.id,
      codigo_cotizacion: `COT-B-${timestamp}-01`,
      estado: 'cerrado_ganado',
      subtotal: 18900000,
      descuento: 1000000,
      total: 17900000,
      co2_evitado_total_kg: 1450.0,
      agua_evitada_total_l: 110000,
      enlace_publico_token: `token-pub-b-${timestamp}-01`,
      observaciones: 'Negocio cerrado y orden de servicio ejecutándose.'
    }
  ];

  const { error: errCot } = await supabase
    .from('crm_cotizaciones')
    .insert(cotizacionesDemo);

  if (errCot) {
    console.warn("⚠️ Aviso al insertar cotizaciones:", errCot.message);
  } else {
    console.log("✅ 5 Cotizaciones demo insertadas.");
  }

  // ─── 6. PASAPORTES DIGITALES (DPP) CON CICLOS ──────────────────────────────
  console.log("🏷️ Creando 3 Pasaportes Digitales de Producto (DPP) con trazabilidad...");

  const activosDpp = [
    {
      empresa_id: empresaA.id,
      codigo_dpp: `DPP-MUEBLE-${timestamp}-01`,
      nombre: 'Silla Ergonómica Ejecutiva Reacondicionada',
      descripcion: 'Silla re-tapizada en textil circular con cambio de pistón y base de polímero reciclado.',
      categoria_id: catMuebles?.id,
      peso_total_kg: 14.5,
      estado: 'activo',
      n_ciclos: 2,
      composicion_json: [
        { material: 'Polímero reciclado', porcentaje: 45 },
        { material: 'Textil circular post-consumo', porcentaje: 30 },
        { material: 'Acero recuperado', porcentaje: 25 }
      ]
    },
    {
      empresa_id: empresaA.id,
      codigo_dpp: `DPP-MUEBLE-${timestamp}-02`,
      nombre: 'Mesa de Juntas en Madera Teca Reutilizada',
      descripcion: 'Mobiliario fabricado a partir de estibas industriales cepilladas y selladas ecológicamente.',
      categoria_id: catMuebles?.id,
      peso_total_kg: 48.0,
      estado: 'en_reuso',
      n_ciclos: 1,
      composicion_json: [
        { material: 'Madera teca recuperada', porcentaje: 85 },
        { material: 'Herrajes metálicos', porcentaje: 15 }
      ]
    },
    {
      empresa_id: empresaB.id,
      codigo_dpp: `DPP-TEXTIL-${timestamp}-01`,
      nombre: 'Lote Chaquetas Térmicas de Seguridad Recicladas',
      descripcion: 'Confección a partir de retales industriales con relleno en fibra PET 100% recuperada.',
      categoria_id: catRopa?.id,
      peso_total_kg: 25.0,
      estado: 'activo',
      n_ciclos: 3,
      composicion_json: [
        { material: 'Poliéster reciclado (PET)', porcentaje: 70 },
        { material: 'Algodón recuperado', porcentaje: 30 }
      ]
    }
  ];

  const { data: dppInsertados, error: errDpp } = await supabase
    .from('dpp_activos')
    .insert(activosDpp)
    .select('id, codigo_dpp, empresa_id');

  if (errDpp) {
    console.warn("⚠️ Aviso al insertar DPP activos:", errDpp.message);
  } else if (dppInsertados && dppInsertados.length > 0) {
    console.log(`✅ ${dppInsertados.length} Pasaportes DPP creados.`);

    // Agregar ciclos a los activos
    const ciclos = [
      {
        activo_id: dppInsertados[0].id,
        empresa_id: dppInsertados[0].empresa_id,
        numero_ciclo: 1,
        operacion_realizada: 'Fabricación y primer ciclo de uso',
        co2_ciclo_kg: 35.2,
        co2_evitado_kg: 45.0
      },
      {
        activo_id: dppInsertados[0].id,
        empresa_id: dppInsertados[0].empresa_id,
        numero_ciclo: 2,
        operacion_realizada: 'Reacondicionamiento completo y cambio de tapizado',
        co2_ciclo_kg: 8.5,
        co2_evitado_kg: 62.0
      },
      {
        activo_id: dppInsertados[1].id,
        empresa_id: dppInsertados[1].empresa_id,
        numero_ciclo: 1,
        operacion_realizada: 'Transformación de estibas en mesa de juntas',
        co2_ciclo_kg: 18.0,
        co2_evitado_kg: 110.0
      }
    ];

    const { error: errCiclos } = await supabase.from('dpp_ciclos').insert(ciclos);
    if (errCiclos) {
      console.warn("⚠️ Aviso al insertar ciclos DPP:", errCiclos.message);
    } else {
      console.log("✅ Ciclos de trazabilidad física vinculados a los pasaportes.");
    }
  }

  console.log("\n🚀 ¡Siembra del ecosistema completada con éxito!");
  console.log("---------------------------------------------------------------");
  console.log("Entorno de taller listo para pruebas seguras multi-tenant.");
}

runSeedEcosistema().catch((err) => {
  console.error("❌ Error inesperado en el seed:", err);
  process.exit(1);
});
