import { z } from 'zod'
import { fetchConTimeout } from './fetch-con-timeout'

// Estimación del peso de 1 unidad de un insumo (ej. "1 litro de barniz
// poliuretano") — mismo patrón anti-invención que precio-mercado.ts: nunca
// se persiste un peso sin una fuente URL bien formada, validada con Zod.
// A diferencia del precio de mercado, el peso de un insumo es casi una
// constante física (no varía por empresa ni con el tiempo) — el caché de
// 2 capas que usa esta función vive en el endpoint que la llama, no aquí.

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

const pesoInsumoSchema = z.object({
  peso_kg_estimado: z.number(),
  fuente_url: z.string().nullable().optional(),
  fuente_titulo: z.string().nullable().optional(),
  confianza: z.enum(['alta', 'media', 'baja']).nullable().optional(),
})

export type PesoInsumoSugerido = z.infer<typeof pesoInsumoSchema> & {
  proveedor: 'perplexity' | 'gemini' | 'openrouter'
}

export type ResultadoPesoInsumo =
  | ({ ok: true } & PesoInsumoSugerido)
  | { ok: false }

function parsearJSON(raw: string): unknown | null {
  if (!raw) return null
  const limpiarTrailingCommas = (str: string) => str.replace(/[\n\r\t]+/g, ' ').replace(/,\s*([}\]])/g, '$1')
  try {
    const mdMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const t = (mdMatch ? mdMatch[1] : raw).trim()
    const start = t.indexOf('{')
    if (start === -1) return null
    try { return JSON.parse(limpiarTrailingCommas(t.slice(start))) } catch { /* continúa */ }
    const end = t.lastIndexOf('}')
    if (end <= start) return null
    return JSON.parse(limpiarTrailingCommas(t.slice(start, end + 1)))
  } catch { return null }
}

function construirPrompt(nombre: string, unidad: string, contextoItem?: string): string {
  const pista = contextoItem
    ? `\nContexto: este insumo se usará en "${contextoItem}". Úsalo ÚNICAMENTE para desambiguar si el nombre del insumo es genérico (ej. "tela", "espuma", "barniz" — hay muchos tipos distintos según el uso); nunca cambies el resultado solo por el contexto, el peso de 1 ${unidad} del producto correcto es el mismo sin importar en qué ítem se use.\n`
    : ''
  return `Eres un investigador de materiales y suministros de tapicería/carpintería/restauración. Busca en internet cuánto pesa 1 ${unidad} de: "${nombre}".
${pista}
Busca primero en Colombia. Si no encuentras, amplía a nivel Global contrastando fuentes en español e inglés, yendo de lo micro a lo macro.
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

async function llamarPerplexity(nombre: string, unidad: string, contextoItem?: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.PERPLEXITY_KEY
  if (!key) return { ok: false, raw: '' }

  try {
    const res = await fetchConTimeout('https://api.perplexity.ai/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'perplexity/sonar',
        input: construirPrompt(nombre, unidad, contextoItem),
        tools: [{ type: 'web_search' }],
        temperature: 0.1,
        max_output_tokens: 1500,
      }),
    }, 15_000)
    if (!res.ok) return { ok: false, raw: '' }

    const data = await res.json() as {
      output?: { type: string; content?: { type: string; text: string }[] }[]
    }
    const mensaje = data.output?.find(o => o.type === 'message')
    const texto = mensaje?.content?.find(c => c.type === 'output_text')?.text ?? ''
    return { ok: !!texto, raw: texto }
  } catch {
    return { ok: false, raw: '' }
  }
}

async function llamarGemini(nombre: string, unidad: string, contextoItem?: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, raw: '' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetchConTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: construirPrompt(nombre, unidad, contextoItem) }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }, 10_000)
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] }
    const txt = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

async function llamarOpenRouter(nombre: string, unidad: string, contextoItem?: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, raw: '' }
  try {
    const res = await fetchConTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen3-235b-a22b:online',
        max_tokens: 1500,
        temperature: 0.1,
        reasoning: { enabled: false },
        messages: [{ role: 'user', content: construirPrompt(nombre, unidad, contextoItem) }],
      }),
    }, 12_000)
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

export async function buscarPesoInsumo(nombre: string, unidad: string, contextoItem?: string): Promise<ResultadoPesoInsumo> {
  // Cascada: 1. Perplexity -> 2. Gemini -> 3. OpenRouter
  // contextoItem (ej. "Silla Reina Ana, retapizado") es solo una pista de
  // búsqueda para desambiguar productos genéricos — nunca participa en la
  // clave de caché (peso-insumo-cache.ts sigue cacheando por nombre+unidad),
  // porque el peso de 1 unidad del insumo correcto no cambia según el ítem.
  let proveedor: 'perplexity' | 'gemini' | 'openrouter' = 'perplexity'
  let resultado = await llamarPerplexity(nombre, unidad, contextoItem)
  if (!resultado.ok) {
    proveedor = 'gemini'
    resultado = await llamarGemini(nombre, unidad, contextoItem)
  }
  if (!resultado.ok) {
    proveedor = 'openrouter'
    resultado = await llamarOpenRouter(nombre, unidad, contextoItem)
  }
  if (!resultado.ok) return { ok: false }

  const json = parsearJSON(resultado.raw)
  if (!json || typeof json !== 'object') return { ok: false }
  if ('sin_resultado' in json) return { ok: false }

  const parsed = pesoInsumoSchema.safeParse(json)
  if (!parsed.success) {
    console.error('Error parseando IA insumo:', parsed.error)
    return { ok: false }
  }

  return { ok: true, ...parsed.data, proveedor }
}
