// Siembra un caso de uso real (Muebles) sobre el motor de catálogo genérico
// (categorías de profundidad libre + dimensiones aisladas: item_materiales
// para huella de carbono, item_servicios/item_insumos para el Cotizador).
//
// El parser lee scripts/data/muebles-fuente.txt línea por línea (copia
// literal del archivo del usuario, sin retranscribir números a mano) y no
// contiene ninguna lógica específica de "mueble": simplemente reconoce la
// forma del texto (jerarquía, materiales, servicios, insumos) y la vuelca
// en las tablas genéricas.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan credenciales de Supabase en .env.local')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const NOTA_PROVISIONAL = 'Factor interno provisional, pendiente de fuente documentada (usuario aportará PDF de referencia).'

// ── Parser del TXT ───────────────────────────────────────────────────────

function parseArchivo(texto) {
  const bloques = texto.split(/\n=+\n/).map(b => b.trim()).filter(Boolean)
  const items = []

  for (const bloque of bloques) {
    const lineas = bloque.split('\n')

    // Línea 1: [Categoria] - [Subcategoria] - [NombreItem]
    const jerarquia = lineas[0].match(/^\[([^\]]+)\]\s*-\s*\[([^\]]+)\]\s*-\s*\[([^\]]+)\]/)
    if (!jerarquia) continue
    const [, categoria, subcategoria, nombre] = jerarquia

    // Materiales: bloques "- Insumo rescatado: X" / "Peso continuado: Y kg" / "Factor de conversión: Z ..."
    const materiales = []
    const reMaterial = /- Insumo rescatado:\s*(.+)\n\s*Peso continuado:\s*([\d.]+)\s*kg\n\s*Factor de conversión:\s*([\d.]+)\s*kg CO2/g
    let m
    while ((m = reMaterial.exec(bloque)) !== null) {
      materiales.push({
        nombre: m[1].trim(),
        peso_kg: parseFloat(m[2]),
        factor_co2_kg: parseFloat(m[3]),
        origen_fuente: null,
        detalle_fuente: NOTA_PROVISIONAL,
        nivel_confianza: 'baja',
      })
    }

    // Servicios: entre "Servicios:" y "Subtotal Servicios"
    const servicios = []
    const bloqueServicios = bloque.match(/Servicios:\n([\s\S]*?)\nSubtotal Servicios/)
    if (bloqueServicios) {
      const reServicio = /- ([^:\n]+):\s*\$\s*([\d,]+\.\d+)/g
      let s
      while ((s = reServicio.exec(bloqueServicios[1])) !== null) {
        servicios.push({ nombre: s[1].trim(), precio: parseFloat(s[2].replace(/,/g, '')) })
      }
    }

    // Insumos: entre "Insumos Asociados:" y "Subtotal Insumos" — patrón "Tela (0.3 metros a $80,000.00/m)"
    const insumos = []
    const bloqueInsumos = bloque.match(/Insumos Asociados:\n([\s\S]*?)\nSubtotal Insumos/)
    if (bloqueInsumos) {
      const reInsumo = /- ([^(]+)\(([\d.]+)\s+(\S+)\s+a\s+\$([\d,]+\.\d+)\/\S+\)/g
      let i
      while ((i = reInsumo.exec(bloqueInsumos[1])) !== null) {
        insumos.push({
          nombre: i[1].trim(),
          cantidad: parseFloat(i[2]),
          unidad: i[3].trim(),
          precio_unitario: parseFloat(i[4].replace(/,/g, '')),
        })
      }
    }

    const factorMatch = bloque.match(/FACTOR DE RENTABILIDAD:\s*x([\d.]+)/)
    const factor_rentabilidad = factorMatch ? parseFloat(factorMatch[1]) : 2

    items.push({ categoria, subcategoria, nombre, materiales, servicios, insumos, factor_rentabilidad })
  }
  return items
}

// ── Siembra ───────────────────────────────────────────────────────────────

async function sembrar() {
  const texto = readFileSync(path.join(__dirname, 'data', 'muebles-fuente.txt'), 'utf-8')
  const items = parseArchivo(texto)
  console.log(`📄 Parseados ${items.length} ítems del archivo fuente.`)

  const categoriaNombre = items[0]?.categoria ?? 'Muebles'
  const { data: catRaiz, error: catError } = await supabase
    .from('categorias')
    .insert({ nombre: categoriaNombre, icono_lucide: 'Armchair', descripcion: 'Mobiliario y elementos reutilizados', activa: true, orden: 1, parent_id: null })
    .select('id')
    .single()
  if (catError) { console.error('❌ Error creando categoría raíz:', catError.message); process.exit(1) }
  console.log(`✅ Categoría raíz: ${categoriaNombre}`)

  const subcategorias = Array.from(new Set(items.map(i => i.subcategoria)))
  const subcatIds = {}
  for (const [idx, nombreSub] of subcategorias.entries()) {
    const { data, error } = await supabase
      .from('categorias')
      .insert({ nombre: nombreSub, icono_lucide: 'Tag', activa: true, orden: idx + 1, parent_id: catRaiz.id })
      .select('id')
      .single()
    if (error) { console.error(`❌ Error creando subcategoría ${nombreSub}:`, error.message); process.exit(1) }
    subcatIds[nombreSub] = data.id
    console.log(`  ✅ Subcategoría: ${nombreSub}`)
  }

  let creados = 0
  for (const [idx, it] of items.entries()) {
    const peso_kg = it.materiales.reduce((s, m) => s + m.peso_kg, 0)
    const co2_por_unidad = it.materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0)

    const { data: item, error: itemError } = await supabase
      .from('items')
      .insert({
        categoria_id: subcatIds[it.subcategoria],
        nombre: it.nombre,
        factor_rentabilidad: it.factor_rentabilidad,
        peso_kg,
        co2_por_unidad,
        nivel_confianza: 'baja',
        origen_fuente: null,
        detalle_fuente: NOTA_PROVISIONAL,
        activo: true,
        orden: idx,
      })
      .select('id')
      .single()
    if (itemError) { console.error(`❌ Error creando ítem "${it.nombre}":`, itemError.message); continue }

    if (it.materiales.length > 0) {
      const { error } = await supabase.from('item_materiales').insert(
        it.materiales.map((m, i) => ({ ...m, item_id: item.id, orden: i }))
      )
      if (error) console.error(`  ⚠️ Error materiales de "${it.nombre}":`, error.message)
    }
    if (it.servicios.length > 0) {
      const { error } = await supabase.from('item_servicios').insert(
        it.servicios.map((s, i) => ({ ...s, item_id: item.id, orden: i }))
      )
      if (error) console.error(`  ⚠️ Error servicios de "${it.nombre}":`, error.message)
    }
    if (it.insumos.length > 0) {
      const { error } = await supabase.from('item_insumos').insert(
        it.insumos.map((s, i) => ({ ...s, item_id: item.id, orden: i }))
      )
      if (error) console.error(`  ⚠️ Error insumos de "${it.nombre}":`, error.message)
    }

    creados++
  }

  console.log(`\n🌱 Siembra completa: ${creados}/${items.length} ítems creados en "${categoriaNombre}" (${subcategorias.length} subcategorías).`)
}

sembrar()
