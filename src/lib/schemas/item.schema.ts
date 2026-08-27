import { z } from 'zod'
import { servicioSchema, insumoSchema, materialesConImpactoSchema } from './dimensiones.schema'

export const crearItemSchema = z.object({
  categoria_id: z.string().uuid(),
  nombre: z.string().min(2).max(150),
  descripcion: z.string().max(300).optional(),
  icono_lucide: z.string().max(50).optional(),
  factor_rentabilidad: z.number().positive().max(100).default(2),
  // La dimensión ambiental es obligatoria: un ítem nunca "nace" con huella cero.
  materiales: materialesConImpactoSchema,
  servicios: z.array(servicioSchema).default([]),
  insumos: z.array(insumoSchema).default([]),
  orden: z.number().int().optional(),
})

export const patchItemSchema = z.object({
  activo: z.boolean().optional(),
  visibilidad: z.enum(['global', 'restringido']).optional(),
  nombre: z.string().min(2).max(150).optional(),
  descripcion: z.string().max(300).nullable().optional(),
  categoria_id: z.string().uuid().optional(),
  factor_rentabilidad: z.number().positive().max(100).optional(),
  // En edición si se envía materiales, también debe mantener impacto > 0.
  materiales: materialesConImpactoSchema.optional(),
  servicios: z.array(servicioSchema).optional(),
  insumos: z.array(insumoSchema).optional(),
  orden: z.number().int().optional(),
})

export type CrearItem = z.infer<typeof crearItemSchema>
export type PatchItem = z.infer<typeof patchItemSchema>
export type { MaterialInput, ServicioInput, InsumoInput } from './dimensiones.schema'
