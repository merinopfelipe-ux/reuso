import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { verificarFirmaChatwoot } from '@/lib/chatwoot-firma'
import { cargarIntegracionChatwoot, sendMessage, actualizarTelefonoContacto } from '@/lib/chatwoot-client'
import { parseE164 } from '@/lib/crm/e164'
import { buscarOCrearClientePorTelefono } from '@/lib/crm/cliente-por-telefono'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PEDIR_DATOS = 'Hola, para generar tu cotización formal y analizar los detalles, por favor confírmanos tu número de contacto (WhatsApp) y tu nombre completo.'
const PEDIR_FORMATO = 'No pudimos leer el número. Escríbelo con el indicativo, por ejemplo +57 300 123 4567.'
const PREGUNTA_TIPO_CLIENTE = '¿Es persona o empresa? Responde en esta conversación: persona, empresa, o no sé.'
const PREGUNTA_TIPO_AL_CLIENTE = '¿Eres persona o empresa? Respóndenos con una sola palabra: persona o empresa.'
const REGEX_RESPUESTA_AGENTE = /\b(persona|empresa)\b|\bno s[eé]\b/i

const payloadSchema = z.object({
  event: z.string(),
  id: z.number().optional(),
  content: z.string().nullish(),
  message_type: z.string().nullish(),
  private: z.boolean().nullish(),
  account: z.object({ id: z.number() }),
  conversation: z.object({
    id: z.number(),
    meta: z.object({ sender: z.object({ id: z.number() }).nullish() }).nullish(),
  }),
  sender: z
    .object({
      id: z.number().nullish(),
      name: z.string().nullish(),
      phone_number: z.string().nullish(),
    })
    .nullish(),
  attachments: z.array(z.object({ file_type: z.string().nullish() })).nullish(),
})
type Payload = z.infer<typeof payloadSchema>
type Admin = Awaited<ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>>
type Integracion = NonNullable<Awaited<ReturnType<typeof cargarIntegracionChatwoot>>>
type Contexto = { admin: Admin; integracion: Integracion; b: Payload; acc: number; conv: number }

const ok = () => NextResponse.json({ ok: true })

export async function POST(request: NextRequest) {
  const cuerpo = await request.text()
  let json: unknown
  try {
    json = JSON.parse(cuerpo)
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(json)
  if (!parsed.success) return ok()
  const b = parsed.data

  if (b.event !== 'message_created' || b.private === true) return ok()
  const esCliente = b.message_type === 'incoming'
  const esAgente = b.message_type === 'outgoing' && REGEX_RESPUESTA_AGENTE.test(b.content ?? '')
  if (!esCliente && !esAgente) return ok()

  const admin = await createAdminClient()
  const integracion = await cargarIntegracionChatwoot(admin, String(b.account.id))
  if (!integracion) return NextResponse.json({ error: 'Cuenta no configurada.' }, { status: 401 })

  const firmaOk = verificarFirmaChatwoot({
    cuerpo,
    timestamp: request.headers.get('x-chatwoot-timestamp') ?? '',
    firma: request.headers.get('x-chatwoot-signature') ?? '',
    secreto: integracion.webhookSecret,
  })
  if (!firmaOk) return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 })

  if (b.id !== undefined) {
    const nuevo = await reclamarEvento(admin, `msg:${b.account.id}:${b.id}`, 'decidido')
    if (!nuevo) return ok()
  }

  const contexto: Contexto = { admin, integracion, b, acc: b.account.id, conv: b.conversation.id }
  try {
    if (esAgente) await responderAgente(contexto)
    else await procesarCliente(contexto)
  } catch (err) {
    console.error('[webhooks/chatwoot]', err instanceof Error ? err.message : err)
  }
  return ok()
}

async function reclamarEvento(admin: Admin, clave: string, estado: 'pendiente' | 'decidido'): Promise<boolean> {
  const { error } = await admin.from('integraciones_eventos').insert({ clave, estado })
  if (error?.code === '23505') return false
  if (error) throw error
  return true
}

async function pendienteConPrefijo(admin: Admin, prefijo: string): Promise<string | null> {
  const { data } = await admin
    .from('integraciones_eventos')
    .select('clave')
    .like('clave', `${prefijo}%`)
    .eq('estado', 'pendiente')
    .limit(1)
    .maybeSingle()
  return data?.clave ?? null
}

async function estaPendiente(admin: Admin, clave: string): Promise<boolean> {
  const { data } = await admin
    .from('integraciones_eventos')
    .select('clave')
    .eq('clave', clave)
    .eq('estado', 'pendiente')
    .maybeSingle()
  return !!data
}

async function marcarDecidido(admin: Admin, clave: string) {
  await admin.from('integraciones_eventos').update({ estado: 'decidido' }).eq('clave', clave)
}

async function responderAgente(c: Contexto) {
  const contenido = c.b.content ?? ''
  if (contenido === PREGUNTA_TIPO_AL_CLIENTE) return
  const clave = await pendienteConPrefijo(c.admin, `tipo:${c.acc}:${c.conv}:`)
  if (!clave) return
  const texto = contenido.toLowerCase()

  if (/\bempresa\b/.test(texto)) {
    await sendMessage(c.integracion.config, c.conv, 'Marcado como empresa. Para convertirlo, abre la ficha del cliente en el CRM y usa Convertir en empresa, con el NIT.', true)
    await marcarDecidido(c.admin, clave)
  } else if (/\bpersona\b/.test(texto)) {
    await sendMessage(c.integracion.config, c.conv, 'Queda como persona.', true)
    await marcarDecidido(c.admin, clave)
  } else if (/no s[eé]/.test(texto)) {
    await sendMessage(c.integracion.config, c.conv, PREGUNTA_TIPO_AL_CLIENTE, false)
  }
}

async function procesarCliente(c: Contexto) {
  const contenido = (c.b.content ?? '').trim()

  const claveTipo = await pendienteConPrefijo(c.admin, `tipo:${c.acc}:${c.conv}:`)
  if (claveTipo && /\b(persona|empresa)\b/i.test(contenido)) {
    const respuesta = /\bempresa\b/i.test(contenido) ? 'empresa' : 'persona'
    await sendMessage(c.integracion.config, c.conv, `El cliente indicó que es ${respuesta}. Confírmalo en el CRM.`, true)
    await marcarDecidido(c.admin, claveTipo)
    return
  }

  const telefono = parseE164(c.b.sender?.phone_number)
  if (telefono) {
    await registrarCliente(c, telefono, c.b.sender?.name ?? '')
    return
  }
  await pedirTelefono(c, contenido)
}

async function pedirTelefono(c: Contexto, contenido: string) {
  const claveReq = `telreq:${c.acc}:${c.conv}`
  const primeraVez = await reclamarEvento(c.admin, claveReq, 'pendiente')

  if (primeraVez) {
    try {
      await sendMessage(c.integracion.config, c.conv, PEDIR_DATOS, false)
    } catch (err) {
      await c.admin.from('integraciones_eventos').delete().eq('clave', claveReq)
      throw err
    }
    return
  }

  if (!(await estaPendiente(c.admin, claveReq))) return
  if (!contenido) return

  const numero = parseE164(extraerTelefono(contenido))
  if (!numero) {
    await sendMessage(c.integracion.config, c.conv, PEDIR_FORMATO, false)
    return
  }
  const contactoId = c.b.conversation.meta?.sender?.id ?? c.b.sender?.id
  if (contactoId) await actualizarTelefonoContacto(c.integracion.config, contactoId, numero.e164)
  await registrarCliente(c, numero, c.b.sender?.name ?? '')
  await marcarDecidido(c.admin, claveReq)
}

async function registrarCliente(c: Contexto, telefono: { indicativo: string; numero: string }, nombreChatwoot: string) {
  const nombre = nombreChatwoot.trim()
  const cliente = await buscarOCrearClientePorTelefono(c.admin, c.integracion.empresaId, {
    nombre,
    indicativo: telefono.indicativo,
    numero: telefono.numero,
  })

  const hayImagenes = (c.b.attachments ?? []).some(a => a.file_type === 'image')
  if (hayImagenes) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://calculadoradereuso.com'
    const enlace = `${base}/empresa/cotizador/nueva?cliente_id=${cliente.id}`
    await sendMessage(
      c.integracion.config,
      c.conv,
      `📸 [CRM & CALCULADORA] Elementos visuales recibidos de ${nombre || 'el cliente'}. ¿Deseas importarlos a la Calculadora para cotizar? -> [Enlace directo: ${enlace}]`,
      true
    )
  }

  if (cliente.creado) {
    await sendMessage(c.integracion.config, c.conv, PREGUNTA_TIPO_CLIENTE, true)
    await reclamarEvento(c.admin, `tipo:${c.acc}:${c.conv}:${cliente.id}`, 'pendiente')
  }
}

function extraerTelefono(texto: string): string {
  const limpio = texto.trim()
  const digitos = limpio.replace(/\D/g, '')
  if (limpio.startsWith('+')) return `+${digitos}`
  if (digitos.length === 10) return `+57${digitos}`
  return `+${digitos}`
}
