import { z } from 'zod'

export const crearModuloSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80),
  icono_lucide: z.string().min(1).max(50).default('Package'),
  descripcion: z.string().max(300).optional(),
})

export const patchModuloSchema = z.object({
  nombre: z.string().min(2).max(80).optional(),
  icono_lucide: z.string().min(1).max(50).optional(),
  descripcion: z.string().max(300).nullable().optional(),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
})

export const patchModuloEmpresaSchema = z.object({
  modulo_id: z.string().uuid(),
  activo: z.boolean(),
})
