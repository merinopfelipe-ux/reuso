import { z } from 'zod'

export const patchUsuarioSchema = z.object({
  rol: z.enum(['super_admin', 'empresa_admin', 'empleado', 'usuario_libre']),
})

export type PatchUsuario = z.infer<typeof patchUsuarioSchema>
