import { z } from 'zod'

export const crearCategoriaSchema = z.object({
  nombre: z.string().min(2).max(80),
  icono_lucide: z.string().min(1).max(50),
  descripcion: z.string().max(300).optional(),
})

export const patchCategoriaSchema = z.object({
  activa: z.boolean().optional(),
  nombre: z.string().min(2).max(80).optional(),
  icono_lucide: z.string().min(1).max(50).optional(),
  descripcion: z.string().max(300).nullable().optional(),
  orden: z.number().int().optional(),
})

export type CrearCategoria = z.infer<typeof crearCategoriaSchema>
export type PatchCategoria = z.infer<typeof patchCategoriaSchema>
