import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dppAuthCheck } from '@/lib/dpp/auth-check'
import { logAuditoria } from '@/lib/audit'
import { getIp } from '@/lib/admin-guard'

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

// ── Tipos ────────────────────────────────────────────────────────────────────

interface IAResult { ok: boolean; json: unknown; proveedor: string }

interface CampoExtraido {
  campo_original: string
  valor_extraido: string
  valor_numerico: number | null
  unidad: string | null
  confianza: number
  campo_destino_dpp: string
  notas: string | null
}

interface DatosExpandidos {
  campos_extraidos: CampoExtraido[]
  tipo_documento_detectado: string
  resumen: string
}

// ── Prompt dinámico por tipo de documento ────────────────────────────────────
// Cada tipo de documento tiene campos destino relevantes distintos.
// Pasar la lista completa de 11 campos confunde al modelo y gasta tokens de más.

function construirPrompt(tipoDoc: string): { system: string; user: string } {
  const mapa: Record<string, { destinos: string; foco: string }> = {
    factura_compra: {
      destinos: 'c_adquisicion | p_virgin_usd_kg | q_circular_kg | peso_total_kg',
      foco: 'precio total pagado, precio unitario por kg si aparece, cantidad en kg',
    },
    recibo_energia: {
      destinos: 'c_operacion | c_mantenimiento',
      foco: 'costo total de la factura de energía o servicio',
    },
    certificado_origen: {
      destinos: 'm_secundario_kg | m_renovable_kg | m_total_input_kg | peso_total_kg',
      foco: 'pesos en kg de materiales, porcentaje reciclado o renovable si aparece',
    },
    foto_objeto: {
      destinos: 'peso_total_kg | m_total_input_kg',
      foco: 'peso visible en etiqueta, placa o ficha técnica del objeto',
    },
  }
  const cfg = mapa[tipoDoc] ?? { destinos: 'c_adquisicion | peso_total_kg', foco: 'precio y peso' }

  const system = `Lees documentos de economía circular en Colombia. Extrae números del documento y asócialos a campos destino. NO calcules ni deduzcas. Si es un PDF de varias páginas, lee ÚNICAMENTE la primera página e ignora el resto.`

  const user = `Extrae ${cfg.foco}.`

  return { system, user }
}

// ── Parseo robusto de JSON ────────────────────────────────────────────────────

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

// ── Expansión de claves abreviadas → campos completos ────────────────────────

function expandirCampos(raw: unknown): DatosExpandidos {
  const r = raw as {
    fields?: { orig: string; val: string; num: number | null; unit: string | null; conf: number; dest: string; note: string | null }[]
    dtype?: string
    sum?: string
  }
  return {
    campos_extraidos: (r.fields ?? []).map((f) => ({
      campo_original: f.orig ?? '',
      valor_extraido: f.val ?? '',
      valor_numerico: f.num ?? null,
      unidad: f.unit ?? null,
      confianza: typeof f.conf === 'number' ? f.conf : 0,
      campo_destino_dpp: f.dest ?? 'otro',
      notas: f.note ?? null,
    })),
    tipo_documento_detectado: r.dtype ?? 'desconocido',
    resumen: r.sum ?? '',
  }
}

// ── IA 1-texto: Gemini — extractor de texto puro (PDF ya convertido a TXT) ───

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sum: { type: 'STRING', description: 'Un resumen de 1 línea del documento.' },
    dtype: { type: 'STRING', description: 'El tipo de documento.' },
    fields: {
      type: 'ARRAY',
      description: 'Campos de datos extraídos del documento.',
      items: {
        type: 'OBJECT',
        properties: {
          orig: { type: 'STRING', description: 'Nombre del campo original en el documento.' },
          val:  { type: 'STRING', description: 'Valor extraído como texto.' },
          num:  { type: 'NUMBER', description: 'Valor convertido a número, o null.' },
          unit: { type: 'STRING', description: 'Unidad de medida (COP, USD, kg, kWh, etc.) o null.' },
          conf: { type: 'NUMBER', description: 'Nivel de confianza de la extracción entre 0.0 y 1.0.' },
          dest: { type: 'STRING', description: 'El campo de destino circular o "otro".' },
        },
        required: ['orig', 'val', 'num', 'unit', 'conf', 'dest'],
      },
    },
  },
  required: ['sum', 'dtype', 'fields'],
}

async function llamarGeminiTexto(textoDoc: string, system: string, user: string): Promise<IAResult> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, json: null, proveedor: 'gemini' }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: `${user}\n\nDocumento:\n${textoDoc}` }] }],
        generationConfig: {
          maxOutputTokens: 512, temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      }),
    })
    if (!res.ok) return { ok: false, json: null, proveedor: 'gemini' }
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] }
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const parsed = parsearJSON(txt)
    return parsed ? { ok: true, json: parsed, proveedor: 'gemini' } : { ok: false, json: null, proveedor: 'gemini' }
  } catch { return { ok: false, json: null, proveedor: 'gemini' } }
}

// ── IA 2-texto: OpenRouter — fallback texto puro ─────────────────────────────

async function llamarOpenRouterTexto(textoDoc: string, system: string, user: string): Promise<IAResult> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, json: null, proveedor: 'openrouter' }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-72b-instruct',
        max_tokens: 512, temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: `${user}\n\nDocumento:\n${textoDoc}` },
        ],
      }),
    })
    if (!res.ok) return { ok: false, json: null, proveedor: 'openrouter' }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    const parsed = parsearJSON(txt)
    return parsed ? { ok: true, json: parsed, proveedor: 'openrouter' } : { ok: false, json: null, proveedor: 'openrouter' }
  } catch { return { ok: false, json: null, proveedor: 'openrouter' } }
}

// ── IA 1: Gemini 2.0 Flash — extractor visual primario ───────────────────────

async function llamarGemini(base64Data: string, mimeType: string, system: string, user: string): Promise<IAResult> {
  const key = process.env.GEMINI_KEY
  if (!key) return { ok: false, json: null, proveedor: 'gemini' }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{
          role: 'user',
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: user },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      }),
    })
    if (!res.ok) return { ok: false, json: null, proveedor: 'gemini' }
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] }
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const parsed = parsearJSON(txt)
    return parsed ? { ok: true, json: parsed, proveedor: 'gemini' } : { ok: false, json: null, proveedor: 'gemini' }
  } catch { return { ok: false, json: null, proveedor: 'gemini' } }
}

// ── IA 2: OpenRouter Qwen-VL — segundo extractor visual (perspectiva diferente) ──

async function llamarOpenRouter(base64Data: string, mimeType: string, system: string, user: string): Promise<IAResult> {
  const key = process.env.OR_KEY
  if (!key) return { ok: false, json: null, proveedor: 'openrouter' }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-vl-7b-instruct',
        max_tokens: 512,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            { type: 'text', text: user },
          ]},
        ],
      }),
    })
    if (!res.ok) return { ok: false, json: null, proveedor: 'openrouter' }
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    const parsed = parsearJSON(txt)
    return parsed ? { ok: true, json: parsed, proveedor: 'openrouter' } : { ok: false, json: null, proveedor: 'openrouter' }
  } catch { return { ok: false, json: null, proveedor: 'openrouter' } }
}

// ── IA 3: Groq LLaMA — validador de coherencia DPP (sin visión, texto puro) ──
// No extrae: ajusta la confianza de los campos ya extraídos según coherencia DPP

async function validarConGroq(campos: CampoExtraido[], tipoActivo: string): Promise<CampoExtraido[]> {
  const key = process.env.GROQ_KEY
  if (!key || campos.length === 0) return campos
  try {
    const GROQ_SYSTEM = `Valida coherencia de campos financieros. Baja conf a 0 si: precio negativo, peso > 10000 kg, total < suma de partes. No cambies valores. Devuelve solo el array JSON recibido con conf ajustada.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 512,
        temperature: 0,
        messages: [
          { role: 'system', content: GROQ_SYSTEM },
          { role: 'user', content: `Activo: "${tipoActivo}". Valida:\n${JSON.stringify(campos)}` },
        ],
      }),
    })
    if (!res.ok) return campos
    const data = await res.json() as { choices?: { message: { content: string } }[] }
    const txt = data.choices?.[0]?.message?.content ?? ''
    // Parsear el array JSON directo
    const match = txt.match(/\[[\s\S]*\]/)
    if (!match) return campos
    try {
      const validados = JSON.parse(match[0]) as CampoExtraido[]
      return Array.isArray(validados) ? validados : campos
    } catch { return campos }
  } catch { return campos }
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await dppAuthCheck(['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No tienes permiso.' },
      { status: auth.status }
    )
  }
  const { empresa_id, adminClient, user_id } = auth
  const ip = getIp(request)

  const body = await request.json().catch(() => null)
  const parsed = z.object({ documento_id: z.uuid('ID de documento inválido.') }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 })
  }
  const { documento_id } = parsed.data

  const { data: doc } = await adminClient
    .from('dpp_documentos_ingesta')
    .select('id, empresa_id, archivo_url, nombre_archivo, estado_ocr, activo_id, tipo')
    .eq('id', documento_id)
    .single()

  if (!doc || doc.empresa_id !== empresa_id) {
    return NextResponse.json({ error: 'No encontramos este documento.' }, { status: 404 })
  }
  if (doc.estado_ocr === 'procesando' || doc.estado_ocr === 'completado') {
    return NextResponse.json({ error: 'Este documento ya fue procesado.' }, { status: 409 })
  }

  // Rate limit: máx 10 documentos procesados por empresa por día
  const hoy = new Date().toISOString().slice(0, 10)
  const { count } = await adminClient
    .from('dpp_documentos_ingesta')
    .select('id', { count: 'exact', head: true })
    .eq('empresa_id', empresa_id)
    .in('estado_ocr', ['completado', 'procesando'])
    .gte('created_at', `${hoy}T00:00:00Z`)

  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: 'Alcanzaste el límite de 10 documentos procesados por día.' },
      { status: 429 }
    )
  }

  // Contexto del activo para el validador Groq
  const { data: activo } = await adminClient
    .from('dpp_activos')
    .select('nombre')
    .eq('id', doc.activo_id)
    .single()
  const tipoActivo = activo?.nombre ?? 'objeto circular'

  await adminClient.from('dpp_documentos_ingesta').update({ estado_ocr: 'procesando' }).eq('id', documento_id)

  try {
    // Descargar archivo vía URL firmada (60s)
    const { data: signedData } = await adminClient.storage.from('dpp').createSignedUrl(doc.archivo_url!, 60)
    if (!signedData?.signedUrl) throw new Error('No se pudo obtener URL del archivo.')

    const archivoRes = await fetch(signedData.signedUrl)
    if (!archivoRes.ok) throw new Error('No se pudo descargar el archivo.')

    // Prompt específico al tipo de documento
    const { system, user } = construirPrompt(doc.tipo ?? 'otro')

    const nombre = doc.nombre_archivo?.toLowerCase() ?? ''
    const esTxt = nombre.endsWith('.txt')

    let extraccion: IAResult

    if (esTxt) {
      // ── Flujo TXT: el PDF ya fue convertido en texto estructurado al subirse.
      // Enviamos texto plano a la IA → sin tokens de visión → más barato.
      const textoDoc = Buffer.from(await archivoRes.arrayBuffer()).toString('utf-8')

      // PASO 1: Gemini modo texto
      extraccion = await llamarGeminiTexto(textoDoc, system, user)

      // PASO 2: OpenRouter texto si Gemini falla o confianza < 0.4
      if (extraccion.ok) {
        const campos = expandirCampos(extraccion.json).campos_extraidos
        const promedio = campos.length > 0 ? campos.reduce((s, c) => s + c.confianza, 0) / campos.length : 0
        if (promedio < 0.4) {
          const fallback = await llamarOpenRouterTexto(textoDoc, system, user)
          if (fallback.ok) extraccion = fallback
        }
      } else {
        const fallback = await llamarOpenRouterTexto(textoDoc, system, user)
        if (fallback.ok) extraccion = fallback
      }
    } else {
      // ── Flujo visión: imágenes JPG/PNG — mantener pipeline original ──
      const base64Data = Buffer.from(await archivoRes.arrayBuffer()).toString('base64')
      let mimeType = 'image/jpeg'
      if (nombre.endsWith('.png')) mimeType = 'image/png'
      else if (nombre.endsWith('.webp')) mimeType = 'image/webp'

      // PASO 1: Gemini visual primario
      extraccion = await llamarGemini(base64Data, mimeType, system, user)

      // PASO 2: OpenRouter/Qwen si Gemini falla o confianza promedio < 0.4
      if (extraccion.ok) {
        const campos = expandirCampos(extraccion.json).campos_extraidos
        const promedio = campos.length > 0 ? campos.reduce((s, c) => s + c.confianza, 0) / campos.length : 0
        if (promedio < 0.4) {
          const fallback = await llamarOpenRouter(base64Data, mimeType, system, user)
          if (fallback.ok) extraccion = fallback
        }
      } else {
        const fallback = await llamarOpenRouter(base64Data, mimeType, system, user)
        if (fallback.ok) extraccion = fallback
      }
    }

    // ── PASO 3: Groq valida coherencia — SOLO si hay confianza baja < 0.7 ──
    // Si todos los campos tienen buena confianza, omitir la llamada a Groq (ahorra 1 API call)
    const datosExpandidos = extraccion.ok ? expandirCampos(extraccion.json) : null
    let camposFinales = datosExpandidos?.campos_extraidos ?? []
    if (camposFinales.length > 0) {
      const promedio = camposFinales.reduce((s, c) => s + c.confianza, 0) / camposFinales.length
      const camposCriticos = ['c_adquisicion', 'peso_total_kg', 'q_circular_kg']
      const criticoConBajaConfianza = camposFinales.some(c => camposCriticos.includes(c.campo_destino_dpp) && c.confianza < 0.5)

      if (promedio < 0.5 || criticoConBajaConfianza) {
        camposFinales = await validarConGroq(camposFinales, tipoActivo)
      }
    }

    const resultadoFinal: DatosExpandidos = extraccion.ok && datosExpandidos
      ? { ...datosExpandidos, campos_extraidos: camposFinales }
      : {
          campos_extraidos: [],
          tipo_documento_detectado: 'desconocido',
          resumen: 'No fue posible extraer datos automáticamente. Ingresa los valores manualmente en el tab de Métricas.',
        }

    await adminClient.from('dpp_documentos_ingesta').update({
      estado_ocr: extraccion.ok ? 'completado' : 'error',
      resultado_json: resultadoFinal,
    }).eq('id', documento_id)

    await logAuditoria(adminClient, {
      user_id,
      accion: 'dpp_ingesta_ia_completada',
      detalle: { documento_id, proveedor: extraccion.proveedor, campos: camposFinales.length, ok: extraccion.ok },
      ip,
    })

    return NextResponse.json({
      data: {
        id: documento_id,
        estado_ocr: extraccion.ok ? 'completado' : 'error',
        resultado_json: resultadoFinal,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno.'
    await adminClient.from('dpp_documentos_ingesta').update({
      estado_ocr: 'error',
      resultado_json: { campos_extraidos: [], tipo_documento_detectado: 'desconocido', resumen: msg },
    }).eq('id', documento_id)
    return NextResponse.json({ error: 'Error al procesar el documento.' }, { status: 500 })
  }
}
