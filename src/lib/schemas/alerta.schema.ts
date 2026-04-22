import { z } from 'zod'

export const crearAlertaSchema = z.object({
  titulo: z.string().min(3).max(120),
  mensaje: z.string().min(5).max(1000),
  tipo: z.enum(['info', 'promo', 'estado', 'urgente']),
  destinatario_tipo: z.enum(['todos', 'empresa', 'usuario']),
  destinatario_id: z.string().uuid().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
})

export const patchAlertaSchema = z.object({
  activa: z.boolean(),
})

export type CrearAlerta = z.infer<typeof crearAlertaSchema>
export type PatchAlerta = z.infer<typeof patchAlertaSchema>
