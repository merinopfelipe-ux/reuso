import { z } from 'zod'

// Compartido entre categoria.schema.ts (esquema base / molde) e item.schema.ts
// (dato real). Misma forma en ambos para que el esquema base pueda copiarse
// tal cual como valor inicial de un ítem nuevo.

const nivelConfianza = z.enum(['alta', 'media', 'baja'])

// Taxonomía del Reporte 2 (Mitigación GRI/ESG, dominio B) — ver skill
// `dominios-datos`. Opcional: material sin clasificar no bloquea el guardado,
// solo queda fuera del desglose por tipo hasta que se corrija.
export const categoriaMaterial = z.enum([
  'madera', 'metal', 'textil', 'cuero', 'plastico', 'vidrio', 'espuma_relleno', 'carton_papel', 'otros',
])

// Dimensión ambiental (huella de carbono / reuso). Nunca se mezcla con la financiera.
// `.nullish()` y no `.optional()` en los campos que la base guarda como
// NULL: el snapshot que manda el Cotizador viene tal cual de `item_materiales`
// (factor de agua, fuente y categoría son nullable ahí), y `.optional()` acepta
// `undefined` pero RECHAZA `null`. Con `.optional()` el guardado automático de
// un ítem detectado por IA moría con 400 "Expected number, received null" y el
// mueble nunca se guardaba (bug real, mismo patrón que `titulo: null`).
export const materialSchema = z.object({
  nombre: z.string().min(1).max(100),
  peso_kg: z.number().positive(),
  factor_co2_kg: z.number().positive(),
  factor_agua_l_kg: z.number().nonnegative().nullish(),
  categoria_material: categoriaMaterial.nullish(),
  origen_fuente: z.string().max(200).nullish(),
  detalle_fuente: z.string().max(400).nullish(),
  nivel_confianza: nivelConfianza.default('baja'),
})

// Dimensión financiera (Cotizador). Nunca se mezcla con la ambiental.
export const servicioSchema = z.object({
  nombre: z.string().min(1).max(100),
  precio: z.number().nonnegative(),
})

export const insumoSchema = z.object({
  nombre: z.string().min(1).max(100),
  cantidad: z.number().positive(),
  unidad: z.string().min(1).max(30),
  precio_unitario: z.number().nonnegative(),
})

// Un material con impacto real (peso × factor > 0) — usado para exigir que
// la dimensión ambiental nunca "nazca" en cero, ni en el esquema base de una
// categoría ni en un ítem real.
export const materialesConImpactoSchema = z.array(materialSchema).min(1, 'Agrega al menos un material con impacto ambiental.').refine(
  (materiales) => materiales.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0) > 0,
  { message: 'El impacto ambiental total no puede ser cero.' }
)

export type MaterialInput = z.infer<typeof materialSchema>
export type ServicioInput = z.infer<typeof servicioSchema>
export type InsumoInput = z.infer<typeof insumoSchema>
