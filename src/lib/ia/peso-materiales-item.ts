import { z } from 'zod'
import { fetchConTimeout } from './fetch-con-timeout'

// Peso de cada material de UN ítem específico, estimado por IA en una sola
// llamada (no una por material, para ahorrar tokens). A diferencia de
// peso-insumo.ts, este valor NO es una constante reutilizable entre ítems
// (la madera de una silla pesa distinto que la de un comedor), así que no
// hay tabla de caché — ver src/lib/ia/peso-insumo-cache.ts para contraste.
// factor_co2_kg/factor_agua_l_kg nunca se tocan aquí: son valores curados
// por el super_admin a nivel de categoría, compartidos por todos los ítems.

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

const materialEstimadoSchema = z.object({
  nombre: z.string(),
  peso_kg_estimado: z.number().nullable().optional(),
  confianza: z.enum(['alta', 'media', 'baja']).nullable().optional(),
  fuente_titulo: z.string().nullable().optional(),
  fuente_url: z.string().nullable().optional(),
  // Rol del material frente a la acción de restauración descrita en el
  // título (ej. "retapizado" reemplaza tela/espuma, conserva la madera de
  // la estructura). Cierra un hueco de dato para el futuro cálculo de F_U
  // (fracción de masa preservada, MCI) — no calcula F_U aquí, solo lo
  // marca. Ver sql/137_rol_conservacion_material.sql.
  rol: z.enum(['se_conserva', 'se_reemplaza', 'desconocido']).nullable().optional(),
})

const respuestaSchema = z.object({
  materiales: z.array(materialEstimadoSchema),
})

export type MaterialPesoEstimado = z.infer<typeof materialEstimadoSchema>

export type ResultadoPesosMateriales =
  | { ok: true; materiales: MaterialPesoEstimado[]; proveedor: 'perplexity' | 'gemini' | 'openrouter' }
  | { ok: false; error?: string }

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

function construirPrompt(nombreItem: string, categoriaNombre: string, materiales: string[]): string {
  const lista = materiales.map(m => `- ${m}`).join('\n')
  return `Eres un experto investigador en materiales y procesos de tapicería, carpintería y restauración de muebles.

Atención: El título del ítem a analizar es "${nombreItem}" (categoría: "${categoriaNombre}"). Este título suele describir DOS cosas a la vez: (1) el mueble u objeto físico subyacente, y (2) el servicio o acción que se le va a realizar (por ejemplo, "Restauración de...", "Retapizado de...", "Cambio de patas de..."). Enfócate en el objeto físico subyacente para estimar su peso real, PERO usa la acción descrita (si la hay) para decidir, material por material, si esa acción lo conserva o lo reemplaza.

Tu objetivo es hacer un match lógico entre el objeto físico real descrito en el título y la siguiente lista de materiales, estimando el peso total en kg que cada uno de estos materiales aporta a la composición de un (1) mueble/ítem completo de ese tipo, Y clasificando su rol frente a la acción del título:

${lista}

Para cada material, sigue este orden:
1. Busca datos en Colombia. Si no encuentras, amplía a nivel Global contrastando fuentes en español e inglés, yendo de lo micro a lo macro.
2. Si encuentras datos técnicos confiables (fichas de fabricante, catálogos, densidades conocidas de ese material), úsalos. confianza: "alta" o "media", fuente_url con la URL real.
3. Si no encuentras nada confiable, da un estimado razonado cruzando la densidad típica del material con el volumen o tamaño típico que ocupa en ese mueble en particular. confianza: "baja", fuente_url: null, fuente_titulo explicando tu razonamiento matemático.
4. Solo si es un material completamente desconocido o inaplicable al ítem, pon peso_kg_estimado: null. NUNCA inventes un número sin ningún razonamiento o cálculo base.

Además, para el campo "rol" de cada material:
- Si el título describe una acción de restauración/servicio reconocible (ej. "retapizado", "restauración", "cambio de X"), decide si ESE material típicamente se conserva (parte de la estructura o base que la acción no toca) o se reemplaza/afecta (lo que la acción específicamente cambia o repara). Usa "se_conserva" o "se_reemplaza".
- Si el título NO describe ninguna acción reconocible (ej. solo "Silla", sin verbo de servicio), o no puedes inferir el rol de ese material con la acción dada, responde "desconocido". Nunca inventes una acción que no está en el título.

Responde ÚNICAMENTE con este JSON, un objeto por cada material EN EL MISMO ORDEN en que se listaron arriba, sin texto adicional:
{ "materiales": [ { "nombre": "...", "peso_kg_estimado": <número o null>, "confianza": "alta"|"media"|"baja"|null, "fuente_titulo": "..."|null, "fuente_url": "https://..."|null, "rol": "se_conserva"|"se_reemplaza"|"desconocido" } ] }`
}

async function llamarPerplexity(prompt: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.PERPLEXITY_KEY
  if (!key) return { ok: false, raw: '' }

  try {
    const res = await fetchConTimeout('https://api.perplexity.ai/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'perplexity/sonar',
        input: prompt,
        tools: [{ type: 'web_search' }],
        temperature: 0.1,
        max_output_tokens: 3000,
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

async function llamarGemini(prompt: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, raw: '' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetchConTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          maxOutputTokens: 2500,
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

async function llamarOpenRouter(prompt: string): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, raw: '' }
  try {
    const res = await fetchConTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen3-235b-a22b:online',
        max_tokens: 2500,
        temperature: 0.1,
        reasoning: { enabled: false },
        messages: [{ role: 'user', content: prompt }],
      }),
    }, 12_000)
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

export async function buscarPesosMaterialesItem(nombreItem: string, categoriaNombre: string, materiales: string[]): Promise<ResultadoPesosMateriales> {
  if (materiales.length === 0) return { ok: false, error: 'No se enviaron materiales.' }

  const prompt = construirPrompt(nombreItem, categoriaNombre, materiales)

  // Cascada: 1. Perplexity -> 2. Gemini -> 3. OpenRouter
  let proveedor: 'perplexity' | 'gemini' | 'openrouter' = 'perplexity'
  let resultado = await llamarPerplexity(prompt)
  if (!resultado.ok) {
    proveedor = 'gemini'
    resultado = await llamarGemini(prompt)
  }
  if (!resultado.ok) {
    proveedor = 'openrouter'
    resultado = await llamarOpenRouter(prompt)
  }
  if (!resultado.ok) return { ok: false, error: 'No se pudo obtener respuesta de los servicios de IA.' }

  const json = parsearJSON(resultado.raw)
  if (!json || typeof json !== 'object') {
    console.error('Error parsearJSON, raw:', resultado.raw)
    return { ok: false, error: 'Respuesta con formato no parseable. RAW: ' + resultado.raw.substring(0, 150) + '...' }
  }

  const parsed = respuestaSchema.safeParse(json)
  if (!parsed.success) return { ok: false, error: 'Esquema inválido: ' + parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') }

  return { ok: true, materiales: parsed.data.materiales, proveedor }
}
