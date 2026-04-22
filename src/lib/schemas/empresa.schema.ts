import { z } from 'zod'

const planEnum = z.enum(['free', 'lab', 'impulso', 'ilimitado'])

export const patchEmpresaSchema = z.object({
  plan: planEnum.optional(),
  notas_admin: z.string().max(2000).nullable().optional(),
  activa: z.boolean().optional(),
  nombre: z.string().min(2).max(120).optional(),
  sector: z.string().max(100).nullable().optional(),
})

export type PatchEmpresa = z.infer<typeof patchEmpresaSchema>
