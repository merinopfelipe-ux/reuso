/**
 * Sembrador de Datos de Prueba QA - Calculadora de Reúso
 *
 * Crea un ecosistema completo y coherente de datos de prueba para QA
 * en todas las áreas del sistema:
 *  - Empresas y membresías de módulos
 *  - Usuarios demo de prueba (Empresa Admin, Empleado/Asesor, Usuario Libre)
 *  - Auto-vinculación de perfiles super_admin existentes a la empresa demo
 *  - Clientes CRM (B2B y B2C)
 *  - Cotizaciones en TODOS los estados del embudo con muebles detallados,
 *    métricas ambientales, notas de seguimiento y aperturas analíticas
 *  - Pasaportes Digitales de Producto (DPP) en todos los estados (activo, en_reuso, archivado, disposicion_final)
 *    con ciclos circulares, métricas financieras y documentos de ingesta
 *  - Registros de cálculos de huella ambiental para alimentar gráficos
 *  - Leads comerciales de captación
 *  - Tickets de soporte y sus mensajes
 *
 * USO:
 *   node --env-file=.env.local scripts/sembrar-datos-qa.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { limpiarDatosQA } from './limpiar-datos-qa.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Faltan credenciales de Supabase en .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEMO_PASSWORD = "DemoPassword2026!";

async function sembrarDatos() {
  console.log("🌱 ===================================================");
  console.log("🌱 INICIANDO SIEMBRA DE DATOS DE PRUEBA PARA QA");
  console.log("🌱 ===================================================\n");

  // 0. Limpiar cualquier remanente anterior
  await limpiarDatosQA();
  console.log("\n🚀 Creando nuevo ecosistema de prueba completo...\n");

  // 1. Obtener módulos y categorías base del sistema
  const { data: modulos } = await supabase.from('modulos').select('id, nombre');
  const { data: categorias } = await supabase.from('categorias').select('id, nombre').limit(5);
  const catMueblesId = categorias?.[0]?.id || null;

  // 2. Crear Empresas Demo
  console.log("🏢 1. Creando empresas demo...");
  const empresasPayload = [
    {
      nombre: "[DEMO] Taller de Ecodiseño Circular",
      slug: "demo-ecodiseno",
      nit: "901.888.777-1",
      telefono: "+57 310 555 0101",
      ciudad: "Medellín",
      pais: "Colombia",
      direccion: "Cra. 48 #10-45, El Poblado",
      tamano_empresa: "11-50",
      plan: "impulso",
      tiene_cotizador: true
    },
    {
      nombre: "[DEMO] Mobiliario Sostenible Andina",
      slug: "demo-mobiliario",
      nit: "900.654.321-9",
      telefono: "+57 320 444 0202",
      ciudad: "Bogotá",
      pais: "Colombia",
      direccion: "Calle 93 #11-20, Chico",
      tamano_empresa: "51-200",
      plan: "ilimitado",
      tiene_cotizador: true
    }
  ];

  const { data: empresasCreadas, error: errEmpresas } = await supabase
    .from('empresas')
    .insert(empresasPayload)
    .select();

  if (errEmpresas || !empresasCreadas?.length) {
    throw new Error(`Error al crear empresas: ${errEmpresas?.message}`);
  }

  const empresaPrincipal = empresasCreadas[0];
  const empresaSecundaria = empresasCreadas[1];
  console.log(`   ✅ 2 Empresas creadas: ${empresaPrincipal.nombre}, ${empresaSecundaria.nombre}`);

  // 3. Vincular Módulos a las Empresas
  if (modulos?.length) {
    const modulosEmpresasPayload = [];
    for (const emp of empresasCreadas) {
      for (const mod of modulos) {
        modulosEmpresasPayload.push({
          empresa_id: emp.id,
          modulo_id: mod.id,
          activo: true
        });
      }
    }
    await supabase.from('modulos_empresas').insert(modulosEmpresasPayload);
    console.log(`   ✅ ${modulosEmpresasPayload.length} asignaciones de módulos activadas.`);
  }

  // 4. Crear Usuarios de Autenticación y Perfiles Demo
  console.log("\n👥 2. Creando usuarios y perfiles demo...");
  const usuariosConfig = [
    {
      email: "demo_admin@calculadoradereuso.com",
      nombre: "Camila Torres (Admin Demo)",
      rol: "empresa_admin",
      empresa_id: empresaPrincipal.id
    },
    {
      email: "demo_empleado@calculadoradereuso.com",
      nombre: "Santiago Gómez (Asesor Demo)",
      rol: "empleado",
      empresa_id: empresaPrincipal.id
    },
    {
      email: "demo_libre@calculadoradereuso.com",
      nombre: "Valentina Ríos (Usuario Demo)",
      rol: "usuario_libre",
      empresa_id: null
    }
  ];

  const usuariosCreados = [];

  for (const cfg of usuariosConfig) {
    const { data: authUser, error: errAuth } = await supabase.auth.admin.createUser({
      email: cfg.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { nombre: cfg.nombre }
    });

    if (errAuth) {
      throw new Error(`Error creando usuario ${cfg.email}: ${errAuth.message}`);
    }

    const userId = authUser.user.id;

    await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          nombre: cfg.nombre,
          email: cfg.email,
          rol: cfg.rol,
          empresa_id: cfg.empresa_id
        },
        { onConflict: 'user_id' }
      );

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const profileId = profileRow?.id || userId;
    usuariosCreados.push({ ...cfg, userId, profileId });
    console.log(`   ✅ Usuario creado: ${cfg.email} [${cfg.rol}] (Profile ID: ${profileId})`);
  }

  // Auto-vincular super_admin existentes a empresaPrincipal
  const { data: superAdmins } = await supabase
    .from('profiles')
    .select('id, email, rol')
    .eq('rol', 'super_admin');

  if (superAdmins?.length) {
    for (const sa of superAdmins) {
      await supabase.from('profiles').update({ empresa_id: empresaPrincipal.id }).eq('id', sa.id);
      console.log(`   🔗 Super admin vinculado a empresa demo: ${sa.email} (${sa.id})`);
    }
  }

  const userAdmin = usuariosCreados.find(u => u.rol === 'empresa_admin');
  const userAsesor = usuariosCreados.find(u => u.rol === 'empleado');
  const userLibre = usuariosCreados.find(u => u.rol === 'usuario_libre');

  // 5. Crear Clientes CRM
  console.log("\n💼 3. Creando clientes CRM...");
  const clientesPayload = [
    {
      empresa_id: empresaPrincipal.id,
      tipo: "empresa",
      nombre: "Inversiones Alto Bosque S.A.S.",
      identificacion: "NIT 900.771.222-4",
      telefono: "+57 300 123 4567",
      email: "compras@altobosque.com",
      ciudad: "Medellín",
      notas: "Cliente corporativo con plan de renovación de 4 pisos de oficinas sostenibles."
    },
    {
      empresa_id: empresaPrincipal.id,
      tipo: "empresa",
      nombre: "Hotel Boutique Valle Esmeralda",
      identificacion: "NIT 901.334.888-0",
      telefono: "+57 311 987 6543",
      email: "operaciones@valleesmeralda.com",
      ciudad: "Rionegro",
      notas: "Proyecto de restauración de mobiliario clásico en área de recepción y restaurante."
    },
    {
      empresa_id: empresaPrincipal.id,
      tipo: "persona",
      nombre: "Laura Restrepo M.",
      identificacion: "CC 1.037.654.321",
      telefono: "+57 315 555 1234",
      email: "laura.restrepo@gmail.com",
      ciudad: "Envigado",
      notas: "Cliente residencial interesada en restauración de juego de comedor familiar."
    },
    {
      empresa_id: empresaPrincipal.id,
      tipo: "empresa",
      nombre: "TechHub Coworking Medellín",
      identificacion: "NIT 901.554.112-8",
      telefono: "+57 318 900 1122",
      email: "facility@techhubmed.co",
      ciudad: "Medellín",
      notas: "Coworking con 120 puestos de trabajo. Interés en estaciones modulares de economía circular."
    }
  ];

  const { data: clientesCreados, error: errClientes } = await supabase
    .from('crm_clientes')
    .insert(clientesPayload)
    .select();

  if (errClientes) throw new Error(`Error creando clientes CRM: ${errClientes.message}`);
  console.log(`   ✅ ${clientesCreados.length} clientes creados.`);

  // 6. Crear Cotizaciones CRM con TODOS los Estados del Embudo
  console.log("\n📑 4. Creando cotizaciones CRM y muebles asociados...");

  const cotizacionBase = {
    descuento: 0,
    descuento_activo: false,
    descuento_tipo: "valor",
    validez_activa: true,
    validez_modo: "dias",
    validez_dias: 15,
    anticipo_activo: true,
    anticipo_porcentaje: 50,
    tiempo_entrega_activo: true,
    tiempo_entrega: "10 días hábiles",
    garantia_activo: true,
    garantia: "12 meses",
    veces_abierta: 0
  };

  const cotizacionesPayload = [
    {
      ...cotizacionBase,
      empresa_id: empresaPrincipal.id,
      cliente_id: clientesCreados[0].id,
      asesor_id: userAsesor.userId,
      codigo_cotizacion: "COT-2026-001",
      estado: "cerrado_ganado",
      subtotal: 5100000,
      descuento: 250000,
      descuento_activo: true,
      descuento_tipo: "valor",
      iva_activo: true,
      iva_porcentaje: 19,
      total: 5474000,
      co2_evitado_total_kg: 142.5000,
      agua_evitada_total_l: 2400.00,
      validez_dias: 30,
      tiempo_entrega: "15 días hábiles a partir del anticipo",
      garantia: "12 meses de garantía estructural y de tapizado",
      observaciones: "Aprobado con anticipo del 50%. Proyecto de renovación de silletería ejecutiva.",
      enlace_publico_token: "demo-token-cot-001-ganado",
      veces_abierta: 4,
      fecha_enviada: new Date(Date.now() - 10 * 86400000).toISOString(),
      fecha_apertura_cliente: new Date(Date.now() - 8 * 86400000).toISOString(),
      fecha_ultima_apertura_cliente: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      ...cotizacionBase,
      empresa_id: empresaPrincipal.id,
      cliente_id: clientesCreados[1].id,
      asesor_id: userAsesor.userId,
      codigo_cotizacion: "COT-2026-002",
      estado: "en_negociacion",
      subtotal: 2350000,
      total: 2350000,
      co2_evitado_total_kg: 68.2000,
      agua_evitada_total_l: 1150.00,
      tiempo_entrega: "10 días calendario",
      garantia: "6 meses de garantía",
      observaciones: "Cliente evaluando telas anti-manchas para las sillas del restaurante.",
      enlace_publico_token: "demo-token-cot-002-negociacion",
      veces_abierta: 3,
      fecha_enviada: new Date(Date.now() - 4 * 86400000).toISOString(),
      fecha_apertura_cliente: new Date(Date.now() - 2 * 86400000).toISOString(),
      fecha_ultima_apertura_cliente: new Date(Date.now() - 12 * 3600000).toISOString()
    },
    {
      ...cotizacionBase,
      empresa_id: empresaPrincipal.id,
      cliente_id: clientesCreados[2].id,
      asesor_id: userAdmin.userId,
      codigo_cotizacion: "COT-2026-003",
      estado: "enviada",
      subtotal: 1120000,
      total: 1120000,
      co2_evitado_total_kg: 35.0000,
      agua_evitada_total_l: 550.00,
      tiempo_entrega: "8 días hábiles",
      garantia: "12 meses sobre encolado y madera",
      observaciones: "Cotización enviada por WhatsApp y correo.",
      enlace_publico_token: "demo-token-cot-003-enviada",
      veces_abierta: 1,
      fecha_enviada: new Date(Date.now() - 1 * 86400000).toISOString(),
      fecha_apertura_cliente: new Date(Date.now() - 6 * 3600000).toISOString()
    },
    {
      ...cotizacionBase,
      empresa_id: empresaPrincipal.id,
      cliente_id: clientesCreados[3].id,
      asesor_id: userAsesor.userId,
      codigo_cotizacion: "COT-2026-004",
      estado: "esperando_anticipo",
      subtotal: 3400000,
      descuento: 100000,
      descuento_activo: true,
      descuento_tipo: "valor",
      total: 3300000,
      co2_evitado_total_kg: 95.0000,
      agua_evitada_total_l: 1600.00,
      validez_dias: 20,
      tiempo_entrega: "12 días hábiles",
      garantia: "24 meses estructural",
      observaciones: "Cliente confirmó aprobación por correo; esperando comprobante de transferencia del anticipo.",
      enlace_publico_token: "demo-token-cot-004-anticipo",
      veces_abierta: 5,
      fecha_enviada: new Date(Date.now() - 3 * 86400000).toISOString(),
      fecha_apertura_cliente: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      ...cotizacionBase,
      empresa_id: empresaPrincipal.id,
      cliente_id: clientesCreados[2].id,
      asesor_id: userAsesor.userId,
      codigo_cotizacion: "COT-2026-005",
      estado: "por_cotizar",
      subtotal: 890000,
      total: 890000,
      co2_evitado_total_kg: 22.4000,
      agua_evitada_total_l: 400.00,
      observaciones: "Diagnóstico inicial por IA completado. Pendiente revisión de telas y precios de mercado.",
      enlace_publico_token: "demo-token-cot-005-borrador"
    },
    {
      ...cotizacionBase,
      empresa_id: empresaPrincipal.id,
      cliente_id: clientesCreados[1].id,
      asesor_id: userAdmin.userId,
      codigo_cotizacion: "COT-2026-006",
      estado: "cerrado_perdido",
      subtotal: 1800000,
      total: 1800000,
      co2_evitado_total_kg: 48.0000,
      agua_evitada_total_l: 800.00,
      observaciones: "El cliente pospuso la remodelación para el segundo semestre por presupuesto.",
      enlace_publico_token: "demo-token-cot-006-perdido",
      veces_abierta: 2,
      fecha_enviada: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
      ...cotizacionBase,
      empresa_id: empresaPrincipal.id,
      cliente_id: clientesCreados[0].id,
      asesor_id: userAsesor.userId,
      codigo_cotizacion: "COT-2026-007",
      estado: "cerrado_inviable",
      subtotal: 650000,
      total: 650000,
      co2_evitado_total_kg: 15.0000,
      agua_evitada_total_l: 250.00,
      observaciones: "Estructura interna carcomida sin posibilidad de refuerzo seguro.",
      enlace_publico_token: "demo-token-cot-007-inviable",
      veces_abierta: 1,
      fecha_enviada: new Date(Date.now() - 20 * 86400000).toISOString()
    }
  ];

  const { data: cotizacionesCreadas, error: errCot } = await supabase
    .from('crm_cotizaciones')
    .insert(cotizacionesPayload)
    .select();

  if (errCot) throw new Error(`Error creando cotizaciones: ${errCot.message}`);

  // Muebles cotizados (Al menos 1 por cada cotización para evitar filtrado por vacías)
  const muebleBase = {
    es_viable: true,
    precio_mercado_nuevo: null,
    precio_mercado_estado: "confirmado",
    cantidad: 1
  };

  const mueblesPayload = [
    {
      ...muebleBase,
      cotizacion_id: cotizacionesCreadas[0].id,
      empresa_id: empresaPrincipal.id,
      titulo: "Sillas ejecutivas ergonómicas (x12)",
      tipo_mueble: "Silla ergonómica de oficina",
      categoria: "Oficina",
      descripcion: "Reacondicionamiento integral: cambio de pistones neumáticos clase 4, tapizado en textil recuperado de alta resistencia y limpieza de bases estrella.",
      cantidad: 12,
      peso_estandar_kg: 96.0,
      precio_mueble: 3600000,
      co2_evitado_kg: 108.0,
      agua_evitada_l: 1800.0,
      precio_mercado_nuevo: 7200000,
      materiales_json: [
        { nombre: "Acero / Estructura metálica", peso_kg: 48, co2_kg: 62 },
        { nombre: "Textil recuperado", peso_kg: 12, co2_kg: 24 },
        { nombre: "Espuma reciclada", peso_kg: 16, co2_kg: 22 }
      ]
    },
    {
      ...muebleBase,
      cotizacion_id: cotizacionesCreadas[0].id,
      empresa_id: empresaPrincipal.id,
      titulo: "Sofá modular 3 puestos para sala de espera",
      tipo_mueble: "Sofá modular",
      categoria: "Sala",
      descripcion: "Tapizado en cuero sintético base biológica y refuerzo de bastidores de madera recuperada.",
      cantidad: 1,
      peso_estandar_kg: 42.0,
      precio_mueble: 1250000,
      co2_evitado_kg: 34.5,
      agua_evitada_l: 600.0,
      precio_mercado_nuevo: 2800000
    },
    {
      ...muebleBase,
      cotizacion_id: cotizacionesCreadas[1].id,
      empresa_id: empresaPrincipal.id,
      titulo: "Sillas de restaurante tapizadas (x8)",
      tipo_mueble: "Silla de comedor / restaurante",
      categoria: "Comedor",
      descripcion: "Cambio de asientos con espuma D30, tapizado repelente a líquidos y barnizado natural mate de patas.",
      cantidad: 8,
      peso_estandar_kg: 48.0,
      precio_mueble: 2350000,
      co2_evitado_kg: 68.2,
      agua_evitada_l: 1150.0,
      precio_mercado_nuevo: 4400000,
      materiales_json: [
        { nombre: "Madera de roble", peso_kg: 32, co2_kg: 45 },
        { nombre: "Textil antifluido", peso_kg: 8, co2_kg: 15 }
      ]
    },
    {
      ...muebleBase,
      cotizacion_id: cotizacionesCreadas[2].id,
      empresa_id: empresaPrincipal.id,
      titulo: "Juego de 4 sillas de comedor madera y tela",
      tipo_mueble: "Silla de comedor",
      categoria: "Comedor",
      descripcion: "Restauración de juntas y encolado estructural con ceras ecológicas de abeja.",
      cantidad: 4,
      peso_estandar_kg: 24.0,
      precio_mueble: 1120000,
      co2_evitado_kg: 35.0,
      agua_evitada_l: 550.0,
      precio_mercado_nuevo: 2200000
    },
    {
      ...muebleBase,
      cotizacion_id: cotizacionesCreadas[3].id,
      empresa_id: empresaPrincipal.id,
      titulo: "Escritorios ejecutivos roble macizo con pasacables (x2)",
      tipo_mueble: "Escritorio corporativo",
      categoria: "Oficina",
      descripcion: "Cepillado y sellado de cubiertas en madera maciza rescatada de archivo histórico.",
      cantidad: 2,
      peso_estandar_kg: 70.0,
      precio_mueble: 3400000,
      co2_evitado_kg: 95.0,
      agua_evitada_l: 1600.0,
      precio_mercado_nuevo: 6200000,
      materiales_json: [
        { nombre: "Madera de roble recuperado", peso_kg: 55, co2_kg: 75 },
        { nombre: "Perfilería metálica", peso_kg: 15, co2_kg: 20 }
      ]
    },
    {
      ...muebleBase,
      cotizacion_id: cotizacionesCreadas[4].id,
      empresa_id: empresaPrincipal.id,
      titulo: "Poltrona vintage escandinava en cedro",
      tipo_mueble: "Poltrona individual",
      categoria: "Sala",
      descripcion: "Borrador inicial: reacondicionamiento de brazos curvos y cambio de cinchas elásticas.",
      cantidad: 1,
      peso_estandar_kg: 18.0,
      precio_mueble: 890000,
      co2_evitado_kg: 22.4,
      agua_evitada_l: 400.0,
      precio_mercado_nuevo: 1800000
    },
    {
      ...muebleBase,
      cotizacion_id: cotizacionesCreadas[5].id,
      empresa_id: empresaPrincipal.id,
      titulo: "Sillas interlocutoras metálicas (x6)",
      tipo_mueble: "Silla interlocutora",
      categoria: "Oficina",
      descripcion: "Pintura electrostática y retapizado.",
      cantidad: 6,
      peso_estandar_kg: 36.0,
      precio_mueble: 1800000,
      co2_evitado_kg: 48.0,
      agua_evitada_l: 800.0
    },
    {
      ...muebleBase,
      cotizacion_id: cotizacionesCreadas[6].id,
      empresa_id: empresaPrincipal.id,
      titulo: "Mesa ratona antigua con daño biológico",
      tipo_mueble: "Mesa de centro",
      categoria: "Sala",
      descripcion: "Evaluación técnica: madera carcomida internamente, riesgo de colapso.",
      cantidad: 1,
      peso_estandar_kg: 12.0,
      precio_mueble: 650000,
      co2_evitado_kg: 15.0,
      agua_evitada_l: 250.0,
      es_viable: false
    }
  ];

  const { error: errMuebles } = await supabase.from('crm_muebles_cotizados').insert(mueblesPayload);
  if (errMuebles) throw new Error(`Error creando muebles cotizados: ${errMuebles.message}`);

  // Notas internas en las cotizaciones
  const notasCotizacionesPayload = [
    {
      cotizacion_id: cotizacionesCreadas[0].id,
      user_id: userAsesor.userId,
      nota: "Cliente aprobó cotización por correo confirmando transferencia del 50%. Se programó recogida el viernes."
    },
    {
      cotizacion_id: cotizacionesCreadas[1].id,
      user_id: userAsesor.userId,
      nota: "Se enviaron muestras físicas de tela impermeable para aprobación del gerente de operaciones."
    },
    {
      cotizacion_id: cotizacionesCreadas[3].id,
      user_id: userAsesor.userId,
      nota: "Cotización aceptada telefónicamente. Pendiente orden de compra oficial del área de adquisiciones."
    }
  ];
  await supabase.from('crm_cotizaciones_notas').insert(notasCotizacionesPayload);

  // Historial de aperturas para analítica de la cotización
  const aperturasPayload = [
    {
      cotizacion_id: cotizacionesCreadas[0].id,
      token: "demo-token-cot-001-ganado",
      ip_hash: "demo-ip-001",
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      dispositivo: "desktop",
      pais: "Colombia",
      ciudad: "Medellín",
      duracion_segundos: 145,
      secciones_vistas_json: ["portada", "muebles", "impacto", "terminos", "aprobacion"]
    },
    {
      cotizacion_id: cotizacionesCreadas[1].id,
      token: "demo-token-cot-002-negociacion",
      ip_hash: "demo-ip-002",
      user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      dispositivo: "movil",
      pais: "Colombia",
      ciudad: "Rionegro",
      duracion_segundos: 85,
      secciones_vistas_json: ["portada", "muebles", "impacto"]
    }
  ];
  await supabase.from('crm_cotizaciones_aperturas').insert(aperturasPayload);

  console.log(`   ✅ ${cotizacionesCreadas.length} cotizaciones, ${mueblesPayload.length} muebles y analítica de aperturas creadas.`);

  // 7. Crear Pasaportes Digitales de Producto (DPP) en Todos los Estados
  console.log("\n📦 5. Creando pasaportes digitales (DPP), ciclos y métricas financieras...");
  const dppPayload = [
    {
      empresa_id: empresaPrincipal.id,
      user_id: userAdmin.profileId,
      codigo_dpp: "DPP-2026-001",
      nombre: "Silla de Oficina Ergonómica Circular Pro",
      descripcion: "Silla reacondicionada certificada: base estrella de aluminio reciclado, espuma de alta resiliencia y tapizado circular.",
      categoria_id: catMueblesId,
      peso_total_kg: 14.500,
      estado: "activo",
      n_ciclos: 2,
      hash_integridad: "sha256:dpp001ecoloop2026medellin",
      composicion_json: {
        acero: "45%",
        polipropileno_reciclado: "30%",
        espuma_reuso: "15%",
        textil_algodon_recuperado: "10%"
      }
    },
    {
      empresa_id: empresaPrincipal.id,
      user_id: userAdmin.profileId,
      codigo_dpp: "DPP-2026-002",
      nombre: "Mesa de Juntas Roble Macizo Colonial Restaurada",
      descripcion: "Mesa de juntas de roble macizo rescatada de demolición de casona en el centro de Medellín, tratada con ceras botánicas.",
      categoria_id: catMueblesId,
      peso_total_kg: 85.000,
      estado: "en_reuso",
      n_ciclos: 1,
      hash_integridad: "sha256:dpp002roblemacizo2026colonial",
      composicion_json: {
        madera_roble_recuperado: "88%",
        estructura_hierro: "10%",
        acabados_ecologicos: "2%"
      }
    },
    {
      empresa_id: empresaPrincipal.id,
      user_id: userAdmin.profileId,
      codigo_dpp: "DPP-2026-003",
      nombre: "Estación de Trabajo Modular Doble Eco-Loop",
      descripcion: "Puesto operativo doble con mampara acústica termoformada de botellas PET 100% recicladas y perfiles de aluminio secundario.",
      categoria_id: catMueblesId,
      peso_total_kg: 48.200,
      estado: "activo",
      n_ciclos: 3,
      hash_integridad: "sha256:dpp003estacionmodular2026loop",
      composicion_json: {
        melamina_recuperada: "55%",
        aluminio_reciclado: "25%",
        pet_fieltro_acustico: "15%",
        tornilleria_acero: "5%"
      }
    },
    {
      empresa_id: empresaPrincipal.id,
      user_id: userAdmin.profileId,
      codigo_dpp: "DPP-2026-004",
      nombre: "Sofá de Espera 3 Puestos Vintage 1980",
      descripcion: "Pieza clásica de diseño vintage restaurada. Estructura de cedro original preservada con nueva tapicería sostenible.",
      categoria_id: catMueblesId,
      peso_total_kg: 36.000,
      estado: "archivado",
      n_ciclos: 2,
      hash_integridad: "sha256:dpp004sofavintage2026archivo",
      composicion_json: {
        madera_cedro_original: "60%",
        espuma_regenerada: "25%",
        textil_algodon: "15%"
      }
    },
    {
      empresa_id: empresaPrincipal.id,
      user_id: userAdmin.profileId,
      codigo_dpp: "DPP-2026-005",
      nombre: "Lote Sillas Operativas Polipropileno Fin de Ciclo",
      descripcion: "Lote de 20 cascos plásticos que completaron 4 vidas de uso y fueron canalizados a molienda para inyección de estibas plásticas.",
      categoria_id: catMueblesId,
      peso_total_kg: 110.000,
      estado: "disposicion_final",
      n_ciclos: 4,
      hash_integridad: "sha256:dpp005reciclajefinal2026polimero",
      composicion_json: {
        polipropileno_reciclado_molienda: "85%",
        chatarra_ferrosa: "15%"
      }
    }
  ];

  const { data: dppCreados, error: errDpp } = await supabase
    .from('dpp_activos')
    .insert(dppPayload)
    .select();

  if (errDpp) throw new Error(`Error creando activos DPP: ${errDpp.message}`);

  // Ciclos circulares de vida
  const ciclosPayload = [
    {
      activo_id: dppCreados[0].id,
      empresa_id: empresaPrincipal.id,
      numero_ciclo: 1,
      fecha_inicio: "2024-03-01",
      fecha_fin: "2024-03-15",
      descripcion: "Primer reacondicionamiento completo: cambio de cilindro neumático y tapizado.",
      operacion_realizada: "Reacondicionamiento Mayor",
      distancia_transporte_km: 15.5,
      co2_ciclo_kg: 4.2,
      co2_evitado_kg: 32.8
    },
    {
      activo_id: dppCreados[0].id,
      empresa_id: empresaPrincipal.id,
      numero_ciclo: 2,
      fecha_inicio: "2026-01-10",
      fecha_fin: "2026-01-20",
      descripcion: "Mantenimiento preventivo, lubricación de mecanismo sincron y cambio de ruedas anti-fricción.",
      operacion_realizada: "Mantenimiento Preventivo",
      distancia_transporte_km: 8.0,
      co2_ciclo_kg: 1.8,
      co2_evitado_kg: 28.5
    },
    {
      activo_id: dppCreados[1].id,
      empresa_id: empresaPrincipal.id,
      numero_ciclo: 1,
      fecha_inicio: "2025-11-05",
      fecha_fin: "2025-11-28",
      descripcion: "Restauración de superficie de madera y fabricación de nueva base metálica recuperada.",
      operacion_realizada: "Restauración Estructural",
      distancia_transporte_km: 25.0,
      co2_ciclo_kg: 12.0,
      co2_evitado_kg: 185.0
    },
    {
      activo_id: dppCreados[2].id,
      empresa_id: empresaPrincipal.id,
      numero_ciclo: 1,
      fecha_inicio: "2023-06-10",
      fecha_fin: "2023-06-25",
      descripcion: "Instalación inicial y ensamble en oficinas corporativas.",
      operacion_realizada: "Ensamble Circular Original",
      distancia_transporte_km: 12.0,
      co2_ciclo_kg: 5.5,
      co2_evitado_kg: 65.0
    },
    {
      activo_id: dppCreados[2].id,
      empresa_id: empresaPrincipal.id,
      numero_ciclo: 2,
      fecha_inicio: "2024-11-01",
      fecha_fin: "2024-11-15",
      descripcion: "Reubicación a nuevo piso y cambio de mamparas acústicas por PET reciclado gris.",
      operacion_realizada: "Reconfiguración y Mejora",
      distancia_transporte_km: 6.0,
      co2_ciclo_kg: 3.2,
      co2_evitado_kg: 48.0
    },
    {
      activo_id: dppCreados[2].id,
      empresa_id: empresaPrincipal.id,
      numero_ciclo: 3,
      fecha_inicio: "2026-02-01",
      fecha_fin: "2026-02-10",
      descripcion: "Inspección técnica anual y retapizado acústico.",
      operacion_realizada: "Mantenimiento Preventivo",
      distancia_transporte_km: 4.5,
      co2_ciclo_kg: 1.5,
      co2_evitado_kg: 30.0
    },
    {
      activo_id: dppCreados[4].id,
      empresa_id: empresaPrincipal.id,
      numero_ciclo: 4,
      fecha_inicio: "2026-01-05",
      fecha_fin: "2026-01-18",
      descripcion: "Desensamble selectivo: envío de plástico a pelletizado y acero a fundición local.",
      operacion_realizada: "Desensamble y Reciclaje Mecánico",
      distancia_transporte_km: 18.0,
      co2_ciclo_kg: 8.5,
      co2_evitado_kg: 140.0
    }
  ];

  await supabase.from('dpp_ciclos').insert(ciclosPayload);

  // Métricas financieras DPP (TCO, Costo Evitado, ICE, E-ROI)
  const metricasPayload = [
    {
      activo_id: dppCreados[0].id,
      empresa_id: empresaPrincipal.id,
      c_adquisicion: 180000,
      c_operacion: 25000,
      c_mantenimiento: 45000,
      c_disposicion: 0,
      v_reventa: 350000,
      costo_evitado: 420000,
      e_roi: 2.33,
      ice_porcentaje: 82.50,
      inflow_circular_pct: 75.00
    },
    {
      activo_id: dppCreados[1].id,
      empresa_id: empresaPrincipal.id,
      c_adquisicion: 850000,
      c_operacion: 50000,
      c_mantenimiento: 120000,
      c_disposicion: 0,
      v_reventa: 1800000,
      costo_evitado: 3500000,
      e_roi: 3.43,
      ice_porcentaje: 91.20,
      inflow_circular_pct: 88.00
    },
    {
      activo_id: dppCreados[2].id,
      empresa_id: empresaPrincipal.id,
      c_adquisicion: 620000,
      c_operacion: 40000,
      c_mantenimiento: 90000,
      c_disposicion: 0,
      v_reventa: 1100000,
      costo_evitado: 1850000,
      e_roi: 2.47,
      ice_porcentaje: 86.40,
      inflow_circular_pct: 80.00
    }
  ];

  await supabase.from('dpp_metricas_financieras').insert(metricasPayload);

  // Documentos de ingesta DPP
  const documentosPayload = [
    {
      activo_id: dppCreados[0].id,
      empresa_id: empresaPrincipal.id,
      user_id: userAdmin.profileId,
      tipo: "certificado_origen",
      nombre_archivo: "Certificado_Mitigacion_CO2_Silla_001.pdf",
      estado_ocr: "completado",
      resultado_json: { emisor: "Calculadora de Reúso", co2_total_kg: 61.3 }
    },
    {
      activo_id: dppCreados[1].id,
      empresa_id: empresaPrincipal.id,
      user_id: userAdmin.profileId,
      tipo: "factura_compra",
      nombre_archivo: "Orden_Servicio_Restauracion_Mesa_Colonial.pdf",
      estado_ocr: "completado",
      resultado_json: { taller: "Taller de Ecodiseño", horas_trabajo: 38 }
    }
  ];

  await supabase.from('dpp_documentos_ingesta').insert(documentosPayload);

  console.log(`   ✅ ${dppCreados.length} pasaportes DPP en 4 estados, ${ciclosPayload.length} ciclos, métricas y documentos creados.`);

  // 8. Crear Cálculos de Huella Ambiental para Dashboards y Gráficos
  console.log("\n📊 6. Creando cálculos de huella ambiental...");
  const diasAtras = [28, 21, 14, 7, 2];
  const calculosPayload = [
    {
      user_id: userAdmin.userId,
      empresa_id: empresaPrincipal.id,
      fecha: new Date(Date.now() - diasAtras[0] * 86400000).toISOString(),
      total_co2: 45.8000,
      total_agua: 850.0000,
      detalle_json: { items_calculados: 3, descripcion: "Cálculo mensual mobiliario piso 1" }
    },
    {
      user_id: userAdmin.userId,
      empresa_id: empresaPrincipal.id,
      fecha: new Date(Date.now() - diasAtras[1] * 86400000).toISOString(),
      total_co2: 68.2000,
      total_agua: 1240.0000,
      detalle_json: { items_calculados: 5, descripcion: "Reúso de silletería auditorio" }
    },
    {
      user_id: userAsesor.userId,
      empresa_id: empresaPrincipal.id,
      fecha: new Date(Date.now() - diasAtras[2] * 86400000).toISOString(),
      total_co2: 92.4000,
      total_agua: 1680.0000,
      detalle_json: { items_calculados: 6, descripcion: "Proyecto salas de juntas" }
    },
    {
      user_id: userAdmin.userId,
      empresa_id: empresaPrincipal.id,
      fecha: new Date(Date.now() - diasAtras[3] * 86400000).toISOString(),
      total_co2: 120.5000,
      total_agua: 2100.0000,
      detalle_json: { items_calculados: 8, descripcion: "Rehabilitación biblioteca corporativa" }
    },
    {
      user_id: userLibre.userId,
      empresa_id: null,
      fecha: new Date(Date.now() - diasAtras[4] * 86400000).toISOString(),
      total_co2: 18.3000,
      total_agua: 320.0000,
      detalle_json: { items_calculados: 1, descripcion: "Cálculo libre usuario residencial" }
    }
  ];

  await supabase.from('calculos').insert(calculosPayload);
  console.log(`   ✅ ${calculosPayload.length} cálculos de huella insertados con fechas distribuidas.`);

  // 9. Crear Leads de Captación
  console.log("\n🎯 7. Creando leads comerciales...");
  const leadsPayload = [
    {
      nombre: "[DEMO] Carlos Mendoza",
      email: "demo_carlos.mendoza@constructoraverde.com",
      empresa: "[DEMO] Constructora Horizonte Verde",
      interes: "Cálculo de huella y certificación de proyectos LEED",
      mensaje: "Buscamos certificar el mobiliario reutilizado de 3 nuevos edificios de oficinas.",
      estado: "contactado"
    },
    {
      nombre: "[DEMO] Mariana Duarte",
      email: "demo_mariana@coworkingnativo.co",
      empresa: "[DEMO] Co-Working Nativo",
      interes: "Cotizador inteligente y catálogo",
      mensaje: "Queremos cotizar el reacondicionamiento de 60 puestos de trabajo.",
      estado: "nuevo"
    },
    {
      nombre: "[DEMO] Felipe Arango",
      email: "demo_felipe@arquitecturaespacios.com",
      empresa: "[DEMO] Arquitectura & Espacios",
      interes: "Pasaporte Digital de Producto (DPP)",
      mensaje: "Interesados en integrar pasaportes digitales con QR para nuestros clientes institucionales.",
      estado: "en_proceso"
    }
  ];

  await supabase.from('leads').insert(leadsPayload);
  console.log(`   ✅ ${leadsPayload.length} leads comerciales creados.`);

  // 10. Crear Tickets de Soporte y Mensajes
  console.log("\n🎫 8. Creando tickets de soporte...");
  const ticketsPayload = [
    {
      titulo: "[DEMO] Consulta sobre exportación de certificado de huella CO2",
      tipo: "duda",
      prioridad: "media",
      estado: "resuelto",
      user_id: userAdmin.userId,
      empresa_id: empresaPrincipal.id
    },
    {
      titulo: "[DEMO] Solicitud de ampliación de cupos para asesores comerciales",
      tipo: "solicitud",
      prioridad: "alta",
      estado: "en_proceso",
      user_id: userAdmin.userId,
      empresa_id: empresaPrincipal.id
    }
  ];

  const { data: ticketsCreados, error: errTickets } = await supabase
    .from('tickets')
    .insert(ticketsPayload)
    .select();

  if (errTickets) throw new Error(`Error creando tickets: ${errTickets.message}`);

  const mensajesPayload = [
    {
      ticket_id: ticketsCreados[0].id,
      user_id: userAdmin.userId,
      mensaje_html: "<p>Hola equipo, ¿cómo puedo generar el certificado PDF con el sello oficial de mitigación?</p>",
      es_admin: false
    },
    {
      ticket_id: ticketsCreados[0].id,
      user_id: userAdmin.userId,
      mensaje_html: "<p>¡Hola Camila! Puedes descargarlo directamente desde el módulo de Informes haciendo clic en 'Generar Certificado Oficial'.</p>",
      es_admin: true
    },
    {
      ticket_id: ticketsCreados[1].id,
      user_id: userAdmin.userId,
      mensaje_html: "<p>Requerimos habilitar 3 asesores adicionales para el equipo comercial de la sede Medellín.</p>",
      es_admin: false
    }
  ];

  await supabase.from('tickets_mensajes').insert(mensajesPayload);
  console.log(`   ✅ ${ticketsCreados.length} tickets y ${mensajesPayload.length} mensajes creados.`);

  // 10.1 Crear Solicitud de Firma Digital Demo
  console.log("✍️  10.1 Creando solicitud de firma digital demo...");
  const cryptoModule = await import('crypto');
  const tokenDemoFirma = 'demo-token-firma-001';
  const tokenHash = cryptoModule.createHash('sha256').update(tokenDemoFirma).digest('hex');
  const expiraAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('firmas_solicitudes').insert({
    tipo_documento: 'confidencialidad',
    nombre: 'Carolina Gómez - Alianza Circular S.A.S.',
    numero_identidad: 'CC 1020304050',
    email: 'carolina.gomez@alianzacircular.com',
    token_hash: tokenHash,
    estado: 'pendiente',
    expira_at: expiraAt,
  });
  console.log("   ✅ Solicitud de firma demo creada (/legal/firma/demo-token-firma-001).");

  // 10.2 Crear Informe Verificado Demo
  console.log("📄 10.2 Creando informe verificado demo (RCO2-DEMO-0001)...");
  await supabase.from('informes').insert({
    id: '00010001-0000-0000-0000-000000000001',
    tipo: 'informe',
    codigo_verificacion: codigoVerificacionUUID,
    fecha_inicio: '2026-01-01',
    fecha_fin: '2026-06-30',
    co2_total: 1450.5,
    agua_total: 8200,
    empresa_id: empresaPrincipal.id,
    user_id: userAdmin.userId,
    metadata_json: {
      titular_nombre: empresaPrincipal.nombre,
      desglose: [
        { categoria: 'Madera (Roble)', cantidad: 12, co2_kg: 850.2 },
        { categoria: 'Metal (Acero)', cantidad: 8, co2_kg: 420.3 },
        { categoria: 'Textiles', cantidad: 15, co2_kg: 180.0 }
      ]
    }
  });
  console.log("   ✅ Informe verificado demo creado (/verificar/RCO2-DEMO-0001).");

  // 11. Resumen y Directorio de URLs para QA
  console.log("\n🎉 ===================================================");
  console.log("🎉 SIEMBRA DE DATOS QA COMPLETADA EXITOSAMENTE");
  console.log("🎉 ===================================================\n");

  console.log("🧭 DIRECTORIO DE EVALUACIÓN PARA QA:");
  console.log("======================================================");
  console.log("🏢 1. MÓDULO COTIZADOR (ADMIN EMPRESA):");
  console.log(`   Panel Principal: http://localhost:3000/empresa/cotizador?empresa_id=${empresaPrincipal.id}`);
  console.log(`   Nueva Cotización: http://localhost:3000/empresa/cotizador/nueva?empresa_id=${empresaPrincipal.id}`);
  for (const cot of cotizacionesCreadas) {
    console.log(`   - [${cot.estado.padEnd(17)}] ${cot.codigo_cotizacion}: http://localhost:3000/empresa/cotizador/${cot.id}`);
  }

  console.log("\n🌐 2. VISTAS PÚBLICAS DE COTIZACIÓN (/cot/[token]):");
  for (const cot of cotizacionesCreadas) {
    console.log(`   - [${cot.estado.padEnd(17)}] http://localhost:3000/cot/${cot.enlace_publico_token}`);
  }

  console.log("\n📦 3. MÓDULO PASAPORTE DIGITAL (DPP):");
  console.log(`   Panel Principal: http://localhost:3000/empresa/dpp`);
  console.log(`   Nuevo DPP:       http://localhost:3000/empresa/dpp/nuevo`);
  for (const dpp of dppCreados) {
    console.log(`   - [${dpp.estado.padEnd(17)}] ${dpp.codigo_dpp} (${dpp.nombre}): http://localhost:3000/empresa/dpp/${dpp.id}`);
  }

  console.log("\n🔍 4. VERIFICACIÓN Y ESTADO DEL SISTEMA:");
  console.log("   Verificador: http://localhost:3000/verificar");
  console.log("   Status:      http://localhost:3000/status");

  console.log("\n🔑 CREDENCIALES DE ACCESO DE PRUEBA:");
  console.log("------------------------------------------------------");
  console.log(`👤 Empresa Admin:   demo_admin@calculadoradereuso.com`);
  console.log(`   Contraseña:      ${DEMO_PASSWORD}`);
  console.log(`   Empresa:         ${empresaPrincipal.nombre}`);
  console.log("------------------------------------------------------");
  console.log(`👤 Empleado/Asesor: demo_empleado@calculadoradereuso.com`);
  console.log(`   Contraseña:      ${DEMO_PASSWORD}`);
  console.log(`   Empresa:         ${empresaPrincipal.nombre}`);
  console.log("------------------------------------------------------");
  console.log(`👤 Usuario Libre:    demo_libre@calculadoradereuso.com`);
  console.log(`   Contraseña:      ${DEMO_PASSWORD}`);
  console.log("------------------------------------------------------");
  console.log("\n🧹 Para borrar todos los datos demo en cualquier momento:");
  console.log("   npm run qa:clean (o node --env-file=.env.local scripts/limpiar-datos-qa.mjs)\n");
}

sembrarDatos().catch(err => {
  console.error("❌ Error durante la siembra de datos:", err);
  process.exit(1);
});
