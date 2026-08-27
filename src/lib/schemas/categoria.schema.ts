import { z } from 'zod'
import { servicioSchema, insumoSchema, materialesConImpactoSchema } from './dimensiones.schema'

export const crearCategoriaSchema = z.object({
  nombre: z.string().min(2).max(80),
  icono_lucide: z.string().min(1).max(50),
  descripcion: z.string().max(300).optional(),
  parent_id: z.string().uuid().optional(),
  modulo_id: z.string().uuid().optional(),
  // Esquema base (molde): la dimensión ambiental es obligatoria, la
  // financiera es opcional. Nunca se usan en cálculos reales, solo
  // pre-llenan la creación de subcategorías e ítems.
  materiales_base: materialesConImpactoSchema,
  servicios_base: z.array(servicioSchema).default([]),
  insumos_base: z.array(insumoSchema).default([]),
})

export const patchCategoriaSchema = z.object({
  activa: z.boolean().optional(),
  nombre: z.string().min(2).max(80).optional(),
  icono_lucide: z.string().min(1).max(50).optional(),
  descripcion: z.string().max(300).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  modulo_id: z.string().uuid().nullable().optional(),
  orden: z.number().int().optional(),
  materiales_base: materialesConImpactoSchema.optional(),
  servicios_base: z.array(servicioSchema).optional(),
  insumos_base: z.array(insumoSchema).optional(),
})

export type CrearCategoria = z.infer<typeof crearCategoriaSchema>
export type PatchCategoria = z.infer<typeof patchCategoriaSchema>
