import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { rateLimit } from '@/lib/rate-limit'

// ── Schemas ──────────────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

const bodySchema = z.object({
  imagen_base64: z.string().max(5_600_000, 'Imagen demasiado grande (máx 4 MB).').optional(),
  imagen_url: z.string().regex(/^https?:\/\//, 'URL de imagen inválida.').optional(),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
  contexto_humano: z.string().max(500).optional(),
}).refine(
  d => d.imagen_base64 || d.imagen_url,
  { message: 'Debes enviar imagen_base64 o imagen_url.' }
)

const diagnosticoSchema = z.object({
  es_viable: z.boolean(),
  motivo: z.string().nullable(),
  categoria: z.string().nullable(),
  tipo: z.string().nullable(),
  oficios: z.object({
    tapiceria: z.boolean(),
    pintura: z.boolean(),
    carpinteria_superficial: z.boolean(),
  }),
  confianza: z.number().min(0).max(1),
  observaciones_visuales: z.string(),
})

export type DiagnosticoIA = z.infer<typeof diagnosticoSchema>

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

// ── System prompt del perito visual ──────────────────────────────────────────

const SYSTEM_PROMPT = `Eres perito visual de muebles para restauración. Solo clasifica lo que ves. No estimes precios.

Rechaza si detectas: Aglomerado, MDF, Melamina, MDP o daños estructurales irreparables (bastidores partidos, resortes reventados, estructura podrida). Devuelve es_viable false con motivo claro.

Si es viable: identifica categoria (Sala, Comedor, Alcoba…), tipo (Sofá 3 puestos, Silla…) y oficios superficiales como booleanos. confianza entre 0 y 1.`

// ── Llamada a Gemini 2.0 Flash ────────────────────────────────────────────────

async function llamarGemini(
  base64Data: string,
  mimeType: string,
  userText: string
): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, raw: '' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: 'user',
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: userText },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              es_viable: { type: 'BOOLEAN', description: 'Si el mueble es viable para restauración.' },
              motivo: { type: 'STRING', description: 'Motivo del rechazo si no es viable, de lo contrario null.' },
              categoria: { type: 'STRING', description: 'Categoría del mueble (ej. Sala, Comedor, Alcoba) o null.' },
              tipo: { type: 'STRING', description: 'Tipo del mueble (ej. Sofá 3 puestos, Silla, Mesa) o null.' },
              oficios: {
                type: 'OBJECT',
                description: 'Oficios requeridos.',
                properties: {
                  tapiceria: { type: 'BOOLEAN' },
                  pintura: { type: 'BOOLEAN' },
                  carpinteria_superficial: { type: 'BOOLEAN' }
                },
                required: ['tapiceria', 'pintura', 'carpinteria_superficial']
              },
              confianza: { type: 'NUMBER', description: 'Nivel de confianza del diagnóstico entre 0.0 y 1.0.' },
              observaciones_visuales: { type: 'STRING', description: 'Observaciones visuales sobre el estado del mueble.' }
            },
            required: ['es_viable', 'motivo', 'categoria', 'tipo', 'oficios', 'confianza', 'observaciones_visuales']
          }
        },
      }),
    })
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] }
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

// ── Fallback: OpenRouter Qwen-VL ─────────────────────────────────────────────

async function llamarOpenRouter(
  base64Data: string,
  mimeType: string,
  userText: string
): Promise<{ ok: boolean; raw: string }> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, raw: '' }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-7b-instruct',
        max_tokens: 300,
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            { type: 'text', text: userText },
          ]},
        ],
      }),
    })
    if (!res.ok) return { ok: false, raw: '' }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    return { ok: !!txt, raw: txt }
  } catch { return { ok: false, raw: '' } }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Auth — empresa_admin o empleado
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'No autenticado.' : 'Sin permiso para usar el Cotizador.' },
      { status: auth.status }
    )
  }

  // 2. Rate limit — 5 diagnósticos por usuario por minuto
  const allowed = await rateLimit(`cotizador_diag:${auth.user_id}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un momento antes de analizar otra foto.' },
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
  const { imagen_base64, imagen_url, mime_type, contexto_humano } = parsed.data

  // 4. Resolver imagen a base64
  let base64: string
  if (imagen_base64) {
    base64 = imagen_base64
  } else {
    // Anti-SSRF: solo se permiten URLs del dominio Supabase del proyecto
    try {
      const parsedUrl = new URL(imagen_url!)
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
      const imgRes = await fetch(imagen_url!, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (!imgRes.ok) throw new Error('No se pudo descargar la imagen.')
      const buffer = await imgRes.arrayBuffer()
      if (buffer.byteLength > 4 * 1024 * 1024) {
        return NextResponse.json({ error: 'La imagen supera 4 MB.' }, { status: 400 })
      }
      base64 = Buffer.from(buffer).toString('base64')
    } catch {
      clearTimeout(timeoutId)
      return NextResponse.json({ error: 'No se pudo acceder a la imagen indicada.' }, { status: 400 })
    }
  }

  // 5. Few-shot: correcciones previas de esta empresa
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
        return `Caso ${i + 1}: Diagnosticaste tipo="${orig?.tipo ?? '?'}", categoria="${orig?.categoria ?? '?'}". El humano corrigió a tipo="${final?.tipo ?? '?'}", categoria="${final?.categoria ?? '?'}".`
      }).join('\n')
      fewShotTexto = `\n\nEJEMPLOS DE CORRECCIONES PREVIAS (aprende de estos errores):\n${ejemplos}`
    }
  } catch { /* no interrumpir el flujo si falla la consulta de few-shot */ }

  // 6. Construir texto del usuario
  const partes: string[] = []
  if (contexto_humano) partes.push(`Contexto del cliente: "${contexto_humano}"`)
  if (fewShotTexto) partes.push(fewShotTexto)
  partes.push('Analiza este mueble y devuelve el JSON.')
  const userText = partes.join('\n')

  // 7. Llamar a Gemini; si falla, reintentar con OpenRouter
  let iaResult = await llamarGemini(base64, mime_type, userText)
  let proveedor = 'gemini'
  if (!iaResult.ok) {
    iaResult = await llamarOpenRouter(base64, mime_type, userText)
    proveedor = 'openrouter'
  }
  if (!iaResult.ok) {
    return NextResponse.json(
      { error: 'No fue posible analizar la imagen. Intenta de nuevo en unos segundos.' },
      { status: 503 }
    )
  }

  // 8. Parsear y validar respuesta
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

  // 9. Retornar — la IA solo diagnostica, el humano decide qué hacer con esto
  return NextResponse.json({
    diagnostico: diagnosticoParsed.data,
    few_shot_usado: fewShotUsado,
    proveedor,
  })
}

// IP disponible para auditoría futura
// (getIp se importa localmente y no se exporta para cumplir con las directrices de Next.js Route)
