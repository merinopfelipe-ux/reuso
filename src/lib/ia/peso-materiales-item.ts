import { z } from 'zod'

// Peso de cada material de UN ítem específico, estimado por IA en una sola
// llamada (no una por material, para ahorrar tokens). A diferencia de
// peso-insumo.ts, este valor NO es una constante reutilizable entre ítems
// (la madera de una silla pesa distinto que la de un comedor), así que no
// hay tabla de caché — ver src/lib/ia/peso-insumo-cache.ts para contraste.
// factor_co2_kg/factor_agua_l_kg nunca se tocan aquí: son valores curados
// por el super_admin a nivel de categoría, compartidos por todos los ítems.

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

const materialEstimadoSchema = z.object({
  nombre: z.string().min(1),
  peso_kg_estimado: z.number().positive().nullable(),
  confianza: z.enum(['alta', 'media', 'baja']).nullable(),
  fuente_titulo: z.string().min(1).max(200).nullable(),
  fuente_url: z.string().regex(/^https?:\/\//).nullable().optional(),
})

const respuestaSchema = z.object({
  materiales: z.array(materialEstimadoSchema),
})

export type MaterialPesoEstimado = z.infer<typeof materialEstimadoSchema>

export type ResultadoPesosMateriales =
  | { ok: true; materiales: MaterialPesoEstimado[] }
  | { ok: false }

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

function construirPrompt(nombreItem: string, categoriaNombre: string, materiales: string[]): string {
  const lista = materiales.map(m => `- ${m}`).join('\n')
  return `Eres un investigador de materiales de tapicería/carpintería/restauración en Colombia. Para el ítem "${nombreItem}" (categoría: "${categoriaNombre}"), estima el peso en kg de cada uno de estos materiales que lo componen:
${lista}

Para cada material, sigue este orden:
1. Si encuentras datos técnicos confiables (fichas de fabricante, catálogos, densidades conocidas de ese material), úsalos. confianza: "alta" o "media", fuente_url con la URL real.
2. Si no encuentras nada confiable, da un estimado razonado por densidad típica del material y el tamaño típico de un ítem como este. confianza: "baja", fuente_url: null, fuente_titulo explicando el razonamiento (ej. "Estimación por densidad típica de madera de cedro en silla de comedor").
3. Solo si de verdad no puedes estimar nada (ni por densidad ni por tipo de ítem), pon peso_kg_estimado: null, confianza: null, fuente_titulo: null para ese material. Nunca inventes un número sin ningún razonamiento.

Responde ÚNICAMENTE con este JSON, un objeto por cada material EN EL MISMO ORDEN en que se listaron arriba, sin texto adicional:
{ "materiales": [ { "nombre": "...", "peso_kg_estimado": <número o null>, "confianza": "alta"|"media"|"baja"|null, "fuente_titulo": "..."|null, "fuente_url": "https://..."|null } ] }`
}

async function llamarGemini(prompt: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, raw: '' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          maxOutputTokens: 700,
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 100 },
        },
      }),
    })
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] }
    const txt = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

async function llamarOpenRouter(prompt: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, raw: '' }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen3-235b-a22b:online',
        max_tokens: 700,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

export async function buscarPesosMaterialesItem(nombreItem: string, categoriaNombre: string, materiales: string[]): Promise<ResultadoPesosMateriales> {
  if (materiales.length === 0) return { ok: false }

  const prompt = construirPrompt(nombreItem, categoriaNombre, materiales)

  let resultado = await llamarGemini(prompt)
  if (!resultado.ok) {
    resultado = await llamarOpenRouter(prompt)
  }
  if (!resultado.ok) return { ok: false }

  const json = parsearJSON(resultado.raw)
  if (!json || typeof json !== 'object') return { ok: false }

  const parsed = respuestaSchema.safeParse(json)
  if (!parsed.success) return { ok: false }

  return { ok: true, materiales: parsed.data.materiales }
}
