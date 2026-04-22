import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Faltan credenciales de Supabase en el archivo .env.local");
  console.error("Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const data = [
  {
    categoria: { nombre: 'Ropa y Textiles', icono_lucide: 'Shirt', descripcion: 'Prendas de vestir y tejidos reutilizados', activa: true, orden: 1 },
    items: [
      { nombre: 'Camiseta', peso_kg: 0.200, co2_por_unidad: 1.2200, origen_fuente: 'ecoinvent 3.8 / PEF method', detalle_fuente: 'Producción textil algodón convencional', orden: 1 },
      { nombre: 'Pantalón', peso_kg: 0.800, co2_por_unidad: 4.8800, origen_fuente: 'ecoinvent 3.8 / PEF method', detalle_fuente: 'Tejido denim, incluye confección', orden: 2 },
      { nombre: 'Chaqueta', peso_kg: 1.200, co2_por_unidad: 7.3200, origen_fuente: 'ecoinvent 3.8 / PEF method', detalle_fuente: 'Prenda exterior mixta', orden: 3 },
      { nombre: 'Zapatos par', peso_kg: 0.700, co2_por_unidad: 4.2700, origen_fuente: 'ecoinvent 3.8 / PEF method', detalle_fuente: 'Calzado cuero sintético', orden: 4 },
      { nombre: 'Otra ropa por kg', peso_kg: 1.000, co2_por_unidad: 6.1000, origen_fuente: 'ecoinvent 3.8 / PEF method', detalle_fuente: 'Factor promedio tejidos', orden: 5 }
    ]
  },
  {
    categoria: { nombre: 'Muebles', icono_lucide: 'Armchair', descripcion: 'Mobiliario y elementos de madera reutilizados', activa: true, orden: 2 },
    items: [
      { nombre: 'Silla', peso_kg: 8.0, co2_por_unidad: 65.0, origen_fuente: 'ecoinvent 3.8 / PEF method', detalle_fuente: 'Silla madera/metal', orden: 1 },
      { nombre: 'Mesa', peso_kg: 20.0, co2_por_unidad: 90.0, origen_fuente: 'ecoinvent 3.8 / PEF method', detalle_fuente: 'Mesa de madera maciza 4-6 pers.', orden: 2 },
      { nombre: 'Sofá', peso_kg: 40.0, co2_por_unidad: 100.0, origen_fuente: 'ecoinvent 3.8 / PEF method', detalle_fuente: 'Sofá de 3 plazas', orden: 3 },
      { nombre: 'Estante', peso_kg: 15.0, co2_por_unidad: 55.0, origen_fuente: 'ecoinvent 3.8 / PEF method', detalle_fuente: 'Estantería modular madera', orden: 4 }
    ]
  }
];

async function runSeed() {
  console.log("🌱 Iniciando carga de Seed (Datos Iniciales)...");

  for (const block of data) {
    // 1. Insert Category
    const { data: catData, error: catError } = await supabase
      .from('categorias')
      .insert([block.categoria])
      .select('id')
      .single();

    if (catError) {
      console.error(`⚠️ Error al insertar o quizás ya existe la categoría "${block.categoria.nombre}":`, catError.message);
      continue;
    }

    console.log(`✅ Categoría agregada: ${block.categoria.nombre}`);

    // 2. Insert Items for this category
    const itemsToInsert = block.items.map(item => ({
      ...item,
      categoria_id: catData.id,
      nivel_confianza: 'alta',
      activo: true
    }));

    const { error: itemsError } = await supabase
      .from('items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error(`❌ Error al insertar items de "${block.categoria.nombre}":`, itemsError.message);
    } else {
      console.log(`  └─ ✅ Agregados ${itemsToInsert.length} items a la categoría.`);
    }
  }

  console.log("🚀 ¡Carga de datos finalizada!");
}

runSeed();
