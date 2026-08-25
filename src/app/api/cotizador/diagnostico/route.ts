import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { rateLimit } from '@/lib/rate-limit'
import type { Material as MaterialCompleto } from '@/lib/cotizador/plantillas-base'

// Sin esto, Vercel mata la función a los 10s por defecto (plan Hobby) —
// la llamada real a Gemini con varias fotos puede tardar 60s+ (medido en
// vivo: 61.5s con 2 fotos), así que se veía como "no hace nada" y fallaba
// en producción mucho antes de que el usuario viera cualquier resultado,
// aunque en `next dev` (sin este límite) sí terminaba respondiendo. 60 es
// el máximo permitido en el plan Hobby.
export const maxDuration = 60

// ── Schemas ──────────────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'
const SIN_MATCH = 'NINGUNO'
const MAX_IMAGENES = 6

const imagenEntradaSchema = z.object({
  imagen_base64: z.string().max(5_600_000, 'Imagen demasiado grande (máx 4 MB).').optional(),
  imagen_url: z.string().regex(/^https?:\/\//, 'URL de imagen inválida.').optional(),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
}).refine(d => d.imagen_base64 || d.imagen_url, { message: 'Cada imagen necesita imagen_base64 o imagen_url.' })

const bodySchema = z.object({
  imagenes: z.array(imagenEntradaSchema).min(1, 'Sube al menos una foto.').max(MAX_IMAGENES, `Máximo ${MAX_IMAGENES} fotos por análisis.`),
  contexto_humano: z.string().max(500).optional(),
})

// Recuadro normalizado 0-1000 (convención de Gemini) — permite recortar en
// el navegador la porción exacta de la foto que corresponde a este ítem,
// sin gastar una llamada de IA aparte para el recorte en sí.
const boundingBoxSchema = z.object({
  y_min: z.number().min(0).max(1000),
  x_min: z.number().min(0).max(1000),
  y_max: z.number().min(0).max(1000),
  x_max: z.number().min(0).max(1000),
})

// Un ítem detectado en la foto: siempre debe encuadrar en un nombre real del
// catálogo (o SIN_MATCH). La IA solo clasifica y cuenta, nunca calcula precio.
// "titulo" es la descripción específica de la pieza (distinta del nombre
// genérico del catálogo) — se guarda como el texto visible principal de la
// línea y el vendedor lo puede reescribir en cualquier momento.
const itemDetectadoSchema = z.object({
  item_nombre: z.string(),
  // Tope real, directriz explícita del usuario: 40 caracteres, directo, sin
  // adornos ni viñetas.
  titulo: z.string().max(40),
  // Qué trabajo concreto se le va a hacer a la pieza (no lo que se ve) —
  // tope real 190 caracteres, directo, sin adornos ni viñetas. Editable por
  // el vendedor, visible para el cliente.
  descripcion: z.string().max(190),
  cantidad: z.number().int().min(1).max(50),
  confianza: z.number().min(0).max(1),
  imagen_index: z.number().int().min(0),
  bounding_box: boundingBoxSchema.nullable().optional(),
})

const diagnosticoSchema = z.object({
  items_detectados: z.array(itemDetectadoSchema),
  no_identificados: z.array(z.string()),
  observaciones_visuales: z.string(),
})

export type ItemDetectado = z.infer<typeof itemDetectadoSchema>
export type DiagnosticoIA = z.infer<typeof diagnosticoSchema>
export type BoundingBox = z.infer<typeof boundingBoxSchema>

// Respuesta final enriquecida (lo que realmente devuelve el POST): cada match
// trae ya su snapshot financiero (item_servicios/item_insumos) y ambiental
// (co2/peso por unidad) — dimensiones aisladas, nunca combinadas entre sí.
export interface ItemDetectadoConSnapshot {
  item_id: string
  item_nombre: string
  titulo: string
  descripcion: string
  cantidad: number
  confianza: number
  imagen_index: number
  bounding_box: BoundingBox | null
  factor_rentabilidad: number
  co2_evitado_kg_unidad: number
  agua_evitada_l_unidad: number
  peso_kg_unidad: number
  materiales: MaterialCompleto[]
  servicios: { nombre: string; precio: number }[]
  insumos: { nombre: string; cantidad: number; unidad: string; precio_unitario: number }[]
}

// Pieza que la IA vio pero no pudo encuadrar en ningún ítem exacto del
// catálogo (SIN_MATCH, o un nombre que ya no existe) — a diferencia de
// `no_identificados` (texto plano, sin foto), esta SÍ trae su propia
// miniatura recortable, para que el vendedor pueda buscarla a mano en el
// catálogo real en vez de crear un ítem nuevo a ciegas.
export interface SinMatchDetalle {
  titulo: string
  descripcion: string
  cantidad: number
  confianza: number
  imagen_index: number
  bounding_box: BoundingBox | null
}

// ── Parseo seguro de JSON desde respuesta del VLM ────────────────────────────

function parsearJSON(raw: string): unknown | null {
  if (!raw) return null
  try {
    const mdMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const t = (mdMatch ? mdMatch[1] : raw).trim()
    const start = t.indexOf('{')
    if (start === -1) return null
    try { return JSON.parse(t.slice(start)) } catch { /* continúa */ }
    const end = t.lastIndexOf('}')
    if (end <= start) return null
    return JSON.parse(t.slice(start, end + 1))
  } catch { return null }
}

// ── System prompt del perito visual — detección MÚLTIPLE por foto y tanda ───

function construirSystemPrompt(nombresCatalogo: string[], nImagenes: number): string {
  return `Eres perito visual de muebles para restauración. Solo clasificas lo que ves en las fotos, nunca calculas precios ni pesos.

Vas a recibir ${nImagenes} foto${nImagenes > 1 ? 's' : ''} en un solo análisis, numeradas de 0 a ${nImagenes - 1} en el orden en que aparecen. Cada foto puede contener VARIOS muebles a la vez (ej. una mesa y varias sillas de comedor). Identifica cada tipo de mueble distinto que veas en CADA foto y cuántas unidades hay de cada uno. Si el mismo mueble aparece repetido en más de una foto (ej. dos ángulos del mismo sofá), repórtalo una sola vez con la foto donde mejor se ve, no lo dupliques.

Para cada mueble que identifiques, indica en "imagen_index" de cuál de las fotos (0 a ${nImagenes - 1}) salió, y encuádralo en uno de estos ítems EXACTOS del catálogo (usa el nombre tal cual, sin inventar variantes):
${nombresCatalogo.map(n => `- ${n}`).join('\n')}

Además, para cada mueble escribe un "titulo" con esta estructura fija: elemento, material, estilo — nunca incluyas color ni acabados. Sirve para diferenciarla de otras del mismo tipo en la misma cotización, no repitas el nombre del catálogo tal cual. Máximo 40 caracteres, directo y sin adornos.

También escribe una "descripcion": qué trabajo concreto se le va a hacer a la pieza para restaurarla — ej. cambiar tapizado, reforzar estructura, pulir y barnizar, reemplazar espuma. Nunca describas lo que ves ni cómo está ahora mismo, y nunca empieces con "se observa" ni sinónimos ("se aprecia", "se nota", "presenta", "muestra") — ve directo al trabajo a realizar. Máximo 190 caracteres. Es lo que el cliente final lee en su propuesta: directo, al grano, sin adornos, sin viñetas y sin punto y coma (solo punto o coma), sin inventar datos que no puedas ver en la foto.

Cuando en una misma foto haya más de un mueble distinto (ej. un sofá y una mesa juntos), o varias unidades del mismo mueble que quieras distinguir, devuelve también "bounding_box": el recuadro que encierra SOLO esa pieza en la foto original, como { "y_min", "x_min", "y_max", "x_max" } en una escala de 0 a 1000 (0,0 es la esquina superior izquierda). Si la foto ya muestra un único mueble ocupando casi todo el encuadre, puedes omitir "bounding_box" — se usará la foto completa.

Si un mueble no encaja claramente en ninguno de esos nombres, NO lo fuerces: descríbelo brevemente en "no_identificados" en vez de inventar un match. Rechaza también (no lo incluyas) cualquier pieza con Aglomerado, MDF, Melamina, MDP o daños estructurales irreparables (bastidores partidos, resortes reventados, estructura podrida) — menciónalo en observaciones_visuales.`
}

// ── Llamada a Gemini ──────────────────────────────────────────────────────────

async function llamarGemini(
  imagenes: { base64: string; mimeType: string }[],
  userText: string,
  systemPrompt: string,
  nombresCatalogo: string[]
): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, raw: '' }

  const enumNombres = [...nombresCatalogo, SIN_MATCH]
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          role: 'user',
          parts: [
            ...imagenes.map(img => ({ inline_data: { mime_type: img.mimeType, data: img.base64 } })),
            { text: userText },
          ],
        }],
        generationConfig: {
          // Más fotos por tanda = más ítems posibles en la respuesta.
          maxOutputTokens: 500 + imagenes.length * 350,
          temperature: 0.1,
          // gemini-3.6-flash piensa por defecto: sin este límite, el
          // razonamiento interno consume todo el maxOutputTokens y no deja
          // espacio para el JSON de salida (causaba "respuesta inesperada").
          thinkingConfig: { thinkingBudget: 150 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              items_detectados: {
                type: 'ARRAY',
                description: 'Cada tipo de mueble distinto detectado en cualquiera de las fotos, con su cantidad.',
                items: {
                  type: 'OBJECT',
                  properties: {
                    item_nombre: { type: 'STRING', enum: enumNombres, description: 'Nombre exacto del catálogo, o NINGUNO si no hay match.' },
                    titulo: { type: 'STRING', description: 'Título con estructura fija elemento, material, estilo — nunca color ni acabados. Distinto del nombre del catálogo. Máximo 40 caracteres, directo, sin adornos.' },
                    descripcion: { type: 'STRING', description: 'Trabajo concreto a realizar en la pieza, nunca de lo que se ve ahora ni "se observa"/sinónimos. Máximo 190 caracteres, directo, sin adornos, sin viñetas, sin punto y coma.' },
                    cantidad: { type: 'INTEGER', description: 'Cuántas unidades de este mueble hay.' },
                    confianza: { type: 'NUMBER', description: 'Confianza del match entre 0.0 y 1.0.' },
                    imagen_index: { type: 'INTEGER', description: 'De cuál foto salió este ítem (0 es la primera).' },
                    bounding_box: {
                      type: 'OBJECT',
                      description: 'Recuadro (0-1000) que aísla esta pieza en su foto, solo si hay más de un mueble distinto en esa foto.',
                      nullable: true,
                      properties: {
                        y_min: { type: 'NUMBER' }, x_min: { type: 'NUMBER' },
                        y_max: { type: 'NUMBER' }, x_max: { type: 'NUMBER' },
                      },
                      required: ['y_min', 'x_min', 'y_max', 'x_max'],
                    },
                  },
                  required: ['item_nombre', 'titulo', 'descripcion', 'cantidad', 'confianza', 'imagen_index'],
                },
              },
              no_identificados: {
                type: 'ARRAY',
                description: 'Descripciones breves de muebles vistos que no encuadran en el catálogo.',
                items: { type: 'STRING' },
              },
              observaciones_visuales: { type: 'STRING', description: 'Observaciones generales del estado de lo fotografiado.' },
            },
            required: ['items_detectados', 'no_identificados', 'observaciones_visuales'],
          },
        },
      }),
    })
    if (!res.ok) {
      console.error('[diagnostico] Gemini respondió error', res.status, (await res.text()).slice(0, 500))
      return { ok: false, raw: '' }
    }
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] }
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!txt) console.error('[diagnostico] Gemini respondió 200 sin texto utilizable', JSON.stringify(data).slice(0, 500))
    return { ok: !!txt, raw: txt }
  } catch (e) {
    console.error('[diagnostico] Gemini lanzó excepción', e instanceof Error ? e.message : e)
    return { ok: false, raw: '' }
  }
}

// ── Fallback: OpenRouter Qwen-VL (sin enum forzado, se valida con Zod igual) ──

async function llamarOpenRouter(
  imagenes: { base64: string; mimeType: string }[],
  userText: string,
  systemPrompt: string
): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, raw: '' }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-7b-instruct',
        max_tokens: 500 + imagenes.length * 350,
        temperature: 0.1,
        messages: [
          { role: 'system', content: `${systemPrompt}\n\nResponde SOLO con JSON: { "items_detectados": [{ "item_nombre": string, "titulo": string, "descripcion": string, "cantidad": number, "confianza": number, "imagen_index": number, "bounding_box": { "y_min": number, "x_min": number, "y_max": number, "x_max": number } | null }], "no_identificados": string[], "observaciones_visuales": string }` },
          { role: 'user', content: [
            ...imagenes.map(img => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } })),
            { type: 'text', text: userText },
          ]},
        ],
      }),
    })
    if (!res.ok) {
      console.error('[diagnostico] OpenRouter respondió error', res.status, (await res.text()).slice(0, 500))
      return { ok: false, raw: '' }
    }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    if (!txt) console.error('[diagnostico] OpenRouter respondió 200 sin texto utilizable', JSON.stringify(data).slice(0, 500))
    return { ok: !!txt, raw: txt }
  } catch (e) {
    console.error('[diagnostico] OpenRouter lanzó excepción', e instanceof Error ? e.message : e)
    return { ok: false, raw: '' }
  }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Auth - empresa_admin o empleado (o super_admin eligiendo empresa)
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.status === 401
          ? 'No autenticado.'
          : auth.status === 400
            ? 'Selecciona una empresa para continuar.'
            : 'Sin permiso para usar el Cotizador.',
      },
      { status: auth.status }
    )
  }

  // 2. Rate limit - 5 diagnósticos (tandas de foto) por usuario por minuto
  const allowed = await rateLimit(`cotizador_diag:${auth.user_id}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un momento antes de analizar otra tanda de fotos.' },
      { status: 429 }
    )
  }

  // 3. Validar body
  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400 }
    )
  }
  const { imagenes: imagenesEntrada, contexto_humano } = parsed.data

  // 4. Catálogo activo — el motor no sabe qué es un "mueble", solo lee items
  // activos VISIBLES para esta empresa (adminClient usa service role y NO
  // aplica la RLS de items_read, así que la visibilidad selectiva por
  // permisos se replica aquí a mano — ver migración 035).
  const [{ data: catalogoRaw, error: catalogoError }, { data: permisosDB }] = await Promise.all([
    auth.adminClient.from('items').select('id, nombre, peso_kg, co2_por_unidad, factor_rentabilidad, visibilidad, creado_por_empresa_id').eq('activo', true),
    auth.adminClient.from('item_permisos_empresa').select('item_id').eq('empresa_id', auth.empresa_id),
  ])

  const idsPermitidos = new Set((permisosDB ?? []).map(p => p.item_id))
  const catalogoDB = (catalogoRaw ?? []).filter(i => i.visibilidad === 'global' || idsPermitidos.has(i.id))

  if (catalogoError || catalogoDB.length === 0) {
    return NextResponse.json({ error: 'No hay ítems activos en el catálogo para diagnosticar.' }, { status: 422 })
  }
  const nombreAId = new Map(catalogoDB.map(i => [i.nombre, i.id]))
  const nombresCatalogo = catalogoDB.map(i => i.nombre)
  const systemPrompt = construirSystemPrompt(nombresCatalogo, imagenesEntrada.length)

  // 5. Resolver cada imagen de la tanda a base64
  const imagenes: { base64: string; mimeType: string }[] = []
  for (const entrada of imagenesEntrada) {
    if (entrada.imagen_base64) {
      imagenes.push({ base64: entrada.imagen_base64, mimeType: entrada.mime_type })
      continue
    }
    // Anti-SSRF: solo se permiten URLs del dominio Supabase del proyecto
    try {
      const parsedUrl = new URL(entrada.imagen_url!)
      const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname
      if (parsedUrl.hostname !== supabaseHost && !parsedUrl.hostname.endsWith(`.${supabaseHost}`)) {
        return NextResponse.json({ error: 'URL de imagen no permitida.' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'URL de imagen inválida.' }, { status: 400 })
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5_000)
    try {
      const imgRes = await fetch(entrada.imagen_url!, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (!imgRes.ok) throw new Error('No se pudo descargar la imagen.')
      const buffer = await imgRes.arrayBuffer()
      if (buffer.byteLength > 4 * 1024 * 1024) {
        return NextResponse.json({ error: 'Una de las imágenes supera 4 MB.' }, { status: 400 })
      }
      imagenes.push({ base64: Buffer.from(buffer).toString('base64'), mimeType: entrada.mime_type })
    } catch {
      clearTimeout(timeoutId)
      return NextResponse.json({ error: 'No se pudo acceder a una de las imágenes indicadas.' }, { status: 400 })
    }
  }

  // 6. Few-shot: correcciones previas de esta empresa
  let fewShotTexto = ''
  let fewShotUsado = false
  try {
    const { data: casos } = await auth.adminClient
      .from('ia_memoria_visual')
      .select('diagnostico_ia_original_json, diagnostico_final_humano_json')
      .eq('empresa_id', auth.empresa_id)
      .eq('fue_corregido', true)
      .order('created_at', { ascending: false })
      .limit(3)

    if (casos && casos.length > 0) {
      fewShotUsado = true
      const ejemplos = casos.map((c, i) => {
        const orig = c.diagnostico_ia_original_json as Record<string, unknown>
        const final = c.diagnostico_final_humano_json as Record<string, unknown>
        return `Caso ${i + 1}: Diagnosticaste "${orig?.item_nombre ?? '?'}". El humano corrigió a "${final?.item_nombre ?? '?'}".`
      }).join('\n')
      fewShotTexto = `\n\nEJEMPLOS DE CORRECCIONES PREVIAS (aprende de estos errores):\n${ejemplos}`
    }
  } catch { /* no interrumpir el flujo si falla la consulta de few-shot */ }

  // 7. Construir texto del usuario
  const partes: string[] = []
  if (contexto_humano) partes.push(`Contexto del cliente: "${contexto_humano}"`)
  if (fewShotTexto) partes.push(fewShotTexto)
  partes.push(imagenes.length > 1
    ? `Analiza estas ${imagenes.length} fotos y devuelve el JSON con todos los muebles que identifiques en cada una.`
    : 'Analiza esta foto y devuelve el JSON con todos los muebles que identifiques.')
  const userText = partes.join('\n')

  // 8. Llamar a Gemini; si falla, reintentar con OpenRouter
  let iaResult = await llamarGemini(imagenes, userText, systemPrompt, nombresCatalogo)
  let proveedor = 'gemini'
  if (!iaResult.ok) {
    iaResult = await llamarOpenRouter(imagenes, userText, systemPrompt)
    proveedor = 'openrouter'
  }
  if (!iaResult.ok) {
    return NextResponse.json(
      { error: 'No fue posible analizar la imagen. Intenta de nuevo en unos segundos.' },
      { status: 503 }
    )
  }

  // 9. Parsear y validar respuesta
  const jsonRaw = parsearJSON(iaResult.raw)
  if (!jsonRaw) {
    return NextResponse.json(
      { error: 'La IA devolvió una respuesta inesperada. Intenta de nuevo.' },
      { status: 502 }
    )
  }

  const diagnosticoParsed = diagnosticoSchema.safeParse(jsonRaw)
  if (!diagnosticoParsed.success) {
    return NextResponse.json(
      { error: 'La respuesta de la IA no tiene el formato esperado. Intenta de nuevo.' },
      { status: 502 }
    )
  }

  // 10. Resolver cada item_nombre a su item_id real del catálogo, y
  // descartar cualquier imagen_index fuera de rango (la IA nunca debería
  // inventar un índice que no mandamos, pero no confiamos ciegamente).
  const itemsMatch = diagnosticoParsed.data.items_detectados
    .filter(d => d.item_nombre !== SIN_MATCH)
    .filter(d => d.imagen_index >= 0 && d.imagen_index < imagenes.length)
    .map(d => ({ ...d, item_id: nombreAId.get(d.item_nombre) ?? null }))
    .filter((d): d is typeof d & { item_id: string } => d.item_id !== null)

  // 10b. Enriquecer cada match con su snapshot POR UNIDAD (dimensión
  // financiera: item_servicios/item_insumos, dimensión ambiental: co2/peso
  // del rollup) para que el cliente pueda mostrar precio sin otra llamada.
  const itemIds = itemsMatch.map(d => d.item_id)
  const [{ data: serviciosDB }, { data: insumosDB }, { data: materialesDB }] = itemIds.length > 0
    ? await Promise.all([
        auth.adminClient.from('item_servicios').select('item_id, nombre, precio').in('item_id', itemIds),
        auth.adminClient.from('item_insumos').select('item_id, nombre, cantidad, unidad, precio_unitario').in('item_id', itemIds),
        auth.adminClient.from('item_materiales').select('item_id, nombre, peso_kg, factor_co2_kg, factor_agua_l_kg, categoria_material, origen_fuente, detalle_fuente, nivel_confianza').in('item_id', itemIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const catalogoPorId = new Map(catalogoDB.map(i => [i.id, i]))
  const itemsResueltos: ItemDetectadoConSnapshot[] = itemsMatch.map(d => {
    const catInfo = catalogoPorId.get(d.item_id)!
    const materialesItem = (materialesDB ?? []).filter(m => m.item_id === d.item_id) as MaterialCompleto[]
    const aguaEvitadaUnidad = materialesItem.reduce((s, m) => s + m.peso_kg * (m.factor_agua_l_kg ?? 0), 0)
    const co2EvitadoUnidad = materialesItem.length > 0
      ? materialesItem.reduce((s, m) => s + m.peso_kg * m.factor_co2_kg, 0)
      : catInfo.co2_por_unidad
    return {
      item_id: d.item_id,
      item_nombre: d.item_nombre,
      titulo: d.titulo,
      descripcion: d.descripcion,
      cantidad: d.cantidad,
      confianza: d.confianza,
      imagen_index: d.imagen_index,
      bounding_box: d.bounding_box ?? null,
      factor_rentabilidad: catInfo.factor_rentabilidad,
      co2_evitado_kg_unidad: co2EvitadoUnidad,
      agua_evitada_l_unidad: aguaEvitadaUnidad,
      peso_kg_unidad: catInfo.peso_kg,
      materiales: materialesItem,
      servicios: (serviciosDB ?? []).filter(s => s.item_id === d.item_id).map(({ nombre, precio }) => ({ nombre, precio })),
      insumos: (insumosDB ?? []).filter(i => i.item_id === d.item_id).map(({ nombre, cantidad, unidad, precio_unitario }) => ({ nombre, cantidad, unidad, precio_unitario })),
    }
  })

  // Piezas con SIN_MATCH o un nombre que no existe en el catálogo actual,
  // pero con imagen_index válido: conservan su recuadro para poder recortar
  // su propia miniatura en el frontend (a diferencia del texto plano de
  // no_identificados, que la IA nunca liga a ninguna foto).
  const sinMatchDetalle: SinMatchDetalle[] = diagnosticoParsed.data.items_detectados
    .filter(d => (d.item_nombre === SIN_MATCH || !nombreAId.has(d.item_nombre)))
    .filter(d => d.imagen_index >= 0 && d.imagen_index < imagenes.length)
    .map(d => ({
      titulo: d.titulo,
      descripcion: d.descripcion,
      cantidad: d.cantidad,
      confianza: d.confianza,
      imagen_index: d.imagen_index,
      bounding_box: d.bounding_box ?? null,
    }))

  // 11. Retornar - la IA solo diagnostica, el humano decide qué hacer con esto
  return NextResponse.json({
    items_detectados: itemsResueltos,
    no_identificados: diagnosticoParsed.data.no_identificados,
    sin_match_detalle: sinMatchDetalle,
    observaciones_visuales: diagnosticoParsed.data.observaciones_visuales,
    few_shot_usado: fewShotUsado,
    proveedor,
  })
}
