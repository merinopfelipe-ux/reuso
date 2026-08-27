import { z } from 'zod'

export const crearLineaNegocioSchema = z.object({
  clave: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guiones bajos'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80),
  icono_lucide: z.string().min(1).max(50).default('Box'),
  descripcion: z.string().max(300).optional(),
})

export const patchLineaNegocioSchema = z.object({
  clave: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/).optional(),
  nombre: z.string().min(2).max(80).optional(),
  icono_lucide: z.string().min(1).max(50).optional(),
  descripcion: z.string().max(300).nullable().optional(),
  activa: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
})

export const patchLineaNegocioEmpresaSchema = z.object({
  linea_negocio_id: z.string().uuid(),
  activa:           z.boolean(),
})
