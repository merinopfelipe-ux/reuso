import { z } from 'zod'
import { fetchConTimeout } from './fetch-con-timeout'

// A diferencia de peso-insumo.ts/peso-materiales-item.ts (Gemini+OpenRouter),
// esta función usa la Agent API de Perplexity con la herramienta web_search
// porque el factor de un material de categoría se comparte entre TODOS sus
// ítems — vale la pena una búsqueda real más lenta y cara para acertar aquí.
// Deliberadamente sin respaldo a otro proveedor: es una capacidad nueva y
// separada, no un tercer nivel del patrón existente. El caché (que sí ahorra
// costo real) vive en el endpoint que la llama, no aquí — ver
// factor-material-cache.ts.

const materialFactorSchema = z.object({
  nombre: z.string().min(1),
  factor_co2_kg: z.number().positive().nullable(),
  factor_agua_l_kg: z.number().positive().nullable(),
  confianza: z.enum(['alta', 'media', 'baja']).nullable(),
  fuente_titulo: z.string().min(1).max(200).nullable(),
  fuente_url: z.string().regex(/^https?:\/\//).nullable().optional(),
})

const respuestaSchema = z.object({
  materiales: z.array(materialFactorSchema),
})

export type MaterialFactorEstimado = z.infer<typeof materialFactorSchema>

export type ResultadoFactoresMaterial =
  | { ok: true; materiales: MaterialFactorEstimado[] }
  | { ok: false }

export interface MaterialConsulta {
  nombre: string
  factor_co2_kg_actual: number | null
  factor_agua_l_kg_actual: number | null
}

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

function construirPrompt(materiales: MaterialConsulta[], categoriaNombre?: string): string {
  const lista = materiales
    .map(m => {
      const actual = m.factor_co2_kg_actual != null
        ? ` (valor actual registrado: ${m.factor_co2_kg_actual} kg CO2 eq/kg)`
        : ' (sin valor todavía)'
      return `- ${m.nombre}${actual}`
    })
    .join('\n')

  const pista = categoriaNombre
    ? `\nContexto: estos materiales se usan en la categoría "${categoriaNombre}". Úsalo ÚNICAMENTE para desambiguar materiales genéricos (ej. "espuma" en colchones vs. en sofás tiene composiciones distintas); nunca inventes un factor distinto solo porque cambió la categoría — el factor de un material real (ej. "acero inoxidable 304") es el mismo sin importar dónde se use.\n`
    : ''

  return `Eres un especialista en factores de emisión de gases de efecto invernadero y huella hídrica de materiales, según bases científicas reconocidas (ecoinvent, DEFRA, IPCC, EPA). Busca en internet el factor de CO2 (kg CO2 eq por 1 kg del material) y el factor de agua (L de agua por 1 kg del material) para cada uno de estos materiales:
${lista}
${pista}
Para cada material:
1. Si encuentras un dato técnico real de una base reconocida, usa confianza "alta" o "media", con fuente_url real y fuente_titulo con el nombre de esa base o ficha.
2. Si no encuentras nada específico pero puedes dar una estimación razonada por el tipo de material, usa confianza "baja", fuente_url: null, fuente_titulo explicando el razonamiento.
3. Si de verdad no hay manera de estimar nada, pon factor_co2_kg: null, factor_agua_l_kg: null, confianza: null, fuente_titulo: null.

Responde ÚNICAMENTE con este JSON, un objeto por cada material EN EL MISMO ORDEN en que se listaron arriba, sin texto adicional:
{ "materiales": [ { "nombre": "...", "factor_co2_kg": <número o null>, "factor_agua_l_kg": <número o null>, "confianza": "alta"|"media"|"baja"|null, "fuente_titulo": "..."|null, "fuente_url": "https://..."|null } ] }`
}

export async function buscarFactoresMaterial(materiales: MaterialConsulta[], categoriaNombre?: string): Promise<ResultadoFactoresMaterial> {
  if (materiales.length === 0) return { ok: false }
  const key = process.env.PERPLEXITY_KEY
  if (!key) return { ok: false }

  try {
    const res = await fetchConTimeout('https://api.perplexity.ai/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'perplexity/sonar',
        input: construirPrompt(materiales, categoriaNombre),
        tools: [{ type: 'web_search' }],
        temperature: 0.1,
        max_output_tokens: 800,
      }),
    }, 25_000)
    if (!res.ok) return { ok: false }

    const data = await res.json() as {
      output?: { type: string; content?: { type: string; text: string }[] }[]
    }
    const mensaje = data.output?.find(o => o.type === 'message')
    const texto = mensaje?.content?.find(c => c.type === 'output_text')?.text ?? ''
    if (!texto) return { ok: false }

    const json = parsearJSON(texto)
    if (!json || typeof json !== 'object') return { ok: false }

    const parsed = respuestaSchema.safeParse(json)
    if (!parsed.success) return { ok: false }

    return { ok: true, materiales: parsed.data.materiales }
  } catch {
    return { ok: false }
  }
}
