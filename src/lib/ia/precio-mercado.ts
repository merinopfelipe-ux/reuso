import { z } from 'zod'

// Sugerencia de "precio de mercado nuevo" con búsqueda web — alimenta el
// Ahorro Neto CAPEX del Reporte 1 (Rentabilidad, dominio A). Mecanismo
// anti-invención: nunca se persiste un precio sin una fuente URL bien
// formada, validada con Zod antes de devolver el resultado.

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

const precioMercadoSchema = z.object({
  precio_estimado_cop: z.number().positive(),
  fuente_url: z.string().regex(/^https?:\/\//, 'La fuente debe ser una URL válida.'),
  fuente_titulo: z.string().min(1).max(200),
  confianza: z.enum(['alta', 'media', 'baja']),
})

export type PrecioMercadoSugerido = z.infer<typeof precioMercadoSchema> & {
  proveedor: 'gemini' | 'openrouter'
}

export type ResultadoPrecioMercado =
  | ({ ok: true } & PrecioMercadoSugerido)
  | { ok: false }

// ── Parseo seguro de JSON desde texto libre del modelo ───────────────────────
// Mismo patrón que src/app/api/cotizador/diagnostico/route.ts y
// src/app/api/dpp/ingesta/procesar-ia/route.ts (no hay un util compartido en
// el proyecto para esto, se replica igual en cada archivo de IA).

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

function construirPrompt(itemNombre: string, titulo: string): string {
  return `Eres un investigador de precios de menaje y mobiliario en Colombia. Busca en internet el precio de venta de un mueble NUEVO equivalente a: "${titulo}" (categoría de catálogo: "${itemNombre}").

Busca en tiendas en línea colombianas reales (Falabella, Homecenter, Linio, MercadoLibre Colombia, tiendas de fábrica) el precio de un mueble nuevo comparable. Si encuentras varios precios, usa uno representativo, nunca el más alto ni el más bajo como excepción.

Responde ÚNICAMENTE con este JSON, sin texto adicional:
{
  "precio_estimado_cop": <número entero, precio en pesos colombianos>,
  "fuente_url": "<URL real de la página donde viste el precio>",
  "fuente_titulo": "<nombre corto de la tienda o página>",
  "confianza": "<alta si el precio es de una fuente clara y específica, media si es una estimación razonable, baja si es una aproximación genérica>"
}

Si no encuentras ninguna fuente confiable, responde exactamente: { "sin_resultado": true }`
}

// ── Gemini con grounding nativo (Google Search) ──────────────────────────────
// Sin responseSchema a propósito: forzar JSON estructurado junto con
// grounding en la misma llamada es un riesgo conocido de que los metadatos
// de la fuente citada lleguen vacíos. Se pide el JSON por instrucción de
// texto y se parsea de forma tolerante, igual que el resto del proyecto.

async function llamarGemini(itemNombre: string, titulo: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, raw: '' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: construirPrompt(itemNombre, titulo) }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 150 },
        },
      }),
    })
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] }
    const txt = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

// ── Fallback: OpenRouter con sufijo :online (búsqueda web vía Exa) ──────────
// Mismo modelo texto que ya usa el proyecto como fallback en diagnostico/
// route.ts, con :online agregado. Misma OR_KEY ya provisionada, sin agregar
// proveedor nuevo. Revisar el costo adicional vigente en OpenRouter antes de
// depender de esto en volumen alto.

async function llamarOpenRouter(itemNombre: string, titulo: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, raw: '' }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-72b-instruct:online',
        max_tokens: 500,
        temperature: 0.1,
        messages: [{ role: 'user', content: construirPrompt(itemNombre, titulo) }],
      }),
    })
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

export async function buscarPrecioMercado(itemNombre: string, titulo: string): Promise<ResultadoPrecioMercado> {
  let resultado = await llamarGemini(itemNombre, titulo)
  let proveedor: 'gemini' | 'openrouter' = 'gemini'
  if (!resultado.ok) {
    resultado = await llamarOpenRouter(itemNombre, titulo)
    proveedor = 'openrouter'
  }
  if (!resultado.ok) return { ok: false }

  const json = parsearJSON(resultado.raw)
  if (!json || typeof json !== 'object') return { ok: false }
  if ('sin_resultado' in json) return { ok: false }

  const parsed = precioMercadoSchema.safeParse(json)
  if (!parsed.success) return { ok: false }

  return { ok: true, ...parsed.data, proveedor }
}
