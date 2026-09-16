import { z } from 'zod'

// Estimación del peso de 1 unidad de un insumo (ej. "1 litro de barniz
// poliuretano") — mismo patrón anti-invención que precio-mercado.ts: nunca
// se persiste un peso sin una fuente URL bien formada, validada con Zod.
// A diferencia del precio de mercado, el peso de un insumo es casi una
// constante física (no varía por empresa ni con el tiempo) — el caché de
// 2 capas que usa esta función vive en el endpoint que la llama, no aquí.

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

const pesoInsumoSchema = z.object({
  peso_kg_estimado: z.number().positive(),
  fuente_url: z.string().regex(/^https?:\/\//, 'La fuente debe ser una URL válida.'),
  fuente_titulo: z.string().min(1).max(200),
  confianza: z.enum(['alta', 'media', 'baja']),
})

export type PesoInsumoSugerido = z.infer<typeof pesoInsumoSchema> & {
  proveedor: 'gemini' | 'openrouter'
}

export type ResultadoPesoInsumo =
  | ({ ok: true } & PesoInsumoSugerido)
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

function construirPrompt(nombre: string, unidad: string): string {
  return `Eres un investigador de materiales y suministros de tapicería/carpintería/restauración en Colombia. Busca en internet cuánto pesa 1 ${unidad} de: "${nombre}".

Busca en fichas técnicas de fabricantes, tiendas en línea o datos de densidad de materiales conocidos. Si encuentras varios valores, usa uno representativo, nunca el más alto ni el más bajo como excepción.

Responde ÚNICAMENTE con este JSON, sin texto adicional:
{
  "peso_kg_estimado": <número, peso en kg de 1 ${unidad} de este insumo>,
  "fuente_url": "<URL real de la página donde viste el dato>",
  "fuente_titulo": "<nombre corto de la fuente>",
  "confianza": "<alta si el dato es de una ficha técnica específica, media si es una estimación razonable, baja si es una aproximación genérica>"
}

Si no encuentras ningún dato confiable, responde exactamente: { "sin_resultado": true }`
}

async function llamarGemini(nombre: string, unidad: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, raw: '' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: construirPrompt(nombre, unidad) }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          maxOutputTokens: 300,
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

async function llamarOpenRouter(nombre: string, unidad: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, raw: '' }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-72b-instruct:online',
        max_tokens: 300,
        temperature: 0.1,
        messages: [{ role: 'user', content: construirPrompt(nombre, unidad) }],
      }),
    })
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

export async function buscarPesoInsumo(nombre: string, unidad: string): Promise<ResultadoPesoInsumo> {
  let resultado = await llamarGemini(nombre, unidad)
  let proveedor: 'gemini' | 'openrouter' = 'gemini'
  if (!resultado.ok) {
    resultado = await llamarOpenRouter(nombre, unidad)
    proveedor = 'openrouter'
  }
  if (!resultado.ok) return { ok: false }

  const json = parsearJSON(resultado.raw)
  if (!json || typeof json !== 'object') return { ok: false }
  if ('sin_resultado' in json) return { ok: false }

  const parsed = pesoInsumoSchema.safeParse(json)
  if (!parsed.success) return { ok: false }

  return { ok: true, ...parsed.data, proveedor }
}
