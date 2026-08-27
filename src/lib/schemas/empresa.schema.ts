import { z } from 'zod'

const planEnum = z.enum(['free', 'lab', 'impulso', 'ilimitado'])

// "¿Por qué elegirnos?" de la cotización pública — si se configura, exige el
// mínimo pedido (párrafo + 4 bullets + imagen); null desactiva la sección
// personalizada y la cotización vuelve al contenido por defecto.
const porQueElegirnosSchema = z.object({
  parrafo: z.string().min(1).max(600),
  bullets: z.array(z.string().min(1).max(150)).min(4, 'Agrega al menos 4 razones.'),
  imagen_url: z.string().url().nullable(),
  imagen_posicion: z.enum(['center', 'top', 'bottom']).optional().nullable(),
})

export const patchEmpresaSchema = z.object({
  plan: planEnum.optional(),
  notas_admin: z.string().max(2000).nullable().optional(),
  activa: z.boolean().optional(),
  nombre: z.string().min(2).max(120).optional(),
  sector: z.string().max(100).nullable().optional(),
  // Razón social — opcional, cae a `nombre` si es null (ver skill dominios-datos).
  nombre_footer_propuesta: z.string().max(120).nullable().optional(),
  por_que_elegirnos_json: porQueElegirnosSchema.nullable().optional(),
  logo_alto_minimo_px: z.number().int().min(60, 'El alto mínimo es 60 px.').max(400).optional(),
  // Nuevos campos operativos
  nit: z.string().max(100).nullable().optional(),
  telefono: z.string().max(100).nullable().optional(),
  pais: z.string().max(100).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
  ciudad: z.string().max(100).nullable().optional(),
  direccion: z.string().max(500).nullable().optional(),
  sitio_web: z.string().url('URL inválida').or(z.literal('')).nullable().optional(),
  tamano_empresa: z.string().max(100).nullable().optional(),
})

export type PatchEmpresa = z.infer<typeof patchEmpresaSchema>
