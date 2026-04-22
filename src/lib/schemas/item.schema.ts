import { z } from 'zod'

const nivelConfianza = z.enum(['alta', 'media', 'baja'])

export const crearItemSchema = z.object({
  categoria_id: z.string().uuid(),
  nombre: z.string().min(2).max(100),
  descripcion: z.string().max(300).optional(),
  peso_kg: z.number().positive(),
  co2_por_unidad: z.number().positive(),
  icono_lucide: z.string().max(50).optional(),
  origen_fuente: z.string().max(200).optional(),
  detalle_fuente: z.string().max(400).optional(),
  nivel_confianza: nivelConfianza.default('media'),
  orden: z.number().int().optional(),
})

export const patchItemSchema = z.object({
  activo: z.boolean().optional(),
  nombre: z.string().min(2).max(100).optional(),
  descripcion: z.string().max(300).nullable().optional(),
  peso_kg: z.number().positive().optional(),
  co2_por_unidad: z.number().positive().optional(),
  origen_fuente: z.string().max(200).nullable().optional(),
  detalle_fuente: z.string().max(400).nullable().optional(),
  nivel_confianza: nivelConfianza.optional(),
  orden: z.number().int().optional(),
})

export type CrearItem = z.infer<typeof crearItemSchema>
export type PatchItem = z.infer<typeof patchItemSchema>
