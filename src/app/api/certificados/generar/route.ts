import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generarPDF } from '@/lib/pdf/generar-pdf'
import type { DesgloseCategoría } from '@/lib/pdf/generar-pdf'
import { checkLimiteCertificados, checkLimiteInformes } from '@/lib/plan-limits'
import type { Plan } from '@/types'
import crypto from 'crypto'
import { rateLimit } from '@/lib/rate-limit'

// ── Validación ───────────────────────────────────────────────────
const schema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('certificado'),
    empresa_id: z.uuid().nullable().optional(),
  }),
  z.object({
    tipo: z.literal('informe'),
    empresa_id: z.uuid().nullable().optional(),
    fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
])

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // ── Rate limit ────────────────────────────────────────────────
  const allowed = await rateLimit(`certificados_generar:${user.id}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Límite alcanzado. Genera hasta 5 documentos por hora.' },
      { status: 429 }
    )
  }

  // ── Validar body ──────────────────────────────────────────────
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const input = parsed.data

  const adminClient = await createAdminClient()

  // ── Perfil del usuario ────────────────────────────────────────
  const { data: perfil } = await supabase
    .from('profiles')
    .select('nombre, empresa_id, rol')
    .eq('user_id', user.id)
    .single()

  const rolUsuario = (perfil?.rol ?? 'usuario_libre') as string
  const empresaId = input.empresa_id ?? perfil?.empresa_id ?? null

  // Validar que el solicitante puede generar documentos de empresa
  const puedeGenerarEmpresa = rolUsuario === 'empresa_admin' || rolUsuario === 'super_admin'
  if (input.empresa_id && !puedeGenerarEmpresa) {
    return NextResponse.json({ error: 'Sin autorización para generar documentos de empresa.' }, { status: 403 })
  }
  // empresa_admin solo puede generar para su propia empresa
  if (rolUsuario === 'empresa_admin' && input.empresa_id && input.empresa_id !== perfil?.empresa_id) {
    return NextResponse.json({ error: 'Sin autorización para generar documentos de otra empresa.' }, { status: 403 })
  }

  // ── Empresa ───────────────────────────────────────────────────
  let empresaNombre: string | null = null
  let empresaLogoUrl: string | null = null
  let empresaPlan: Plan = 'free'

  if (!empresaId) {
    // usuario_libre sin empresa: retornar mensaje del plan (plan free = Explora)
    const tipoCap = input.tipo === 'informe' ? 'informes' : 'certificados'
    return NextResponse.json(
      { error: `El plan Explora no incluye generación de ${tipoCap}. Contacta a reuso.lurdes.co para ampliar tu plan.` },
      { status: 429 }
    )
  }

  const { data: empresa } = await adminClient
    .from('empresas')
    .select('nombre, logo_url, plan')
    .eq('id', empresaId)
    .single()
  empresaNombre = empresa?.nombre ?? null
  empresaLogoUrl = empresa?.logo_url ?? null
  empresaPlan = (empresa?.plan ?? 'free') as Plan

  // Verificar límite según tipo de documento
  const errorLimite = input.tipo === 'informe'
    ? await checkLimiteInformes(empresaId, empresaPlan)
    : await checkLimiteCertificados(empresaId, empresaPlan)
  if (errorLimite) {
    return NextResponse.json({ error: errorLimite }, { status: 429 })
  }

  // ── Obtener cálculos del período ──────────────────────────────
  // Documentos de empresa agregan por empresa_id; personales por user_id
  const esDocumentoEmpresa = puedeGenerarEmpresa && !!empresaId && !!input.empresa_id
  let calculosQuery = adminClient
    .from('calculos')
    .select('id, total_co2, total_agua, detalle_json, fecha')
    .order('fecha', { ascending: true })

  if (esDocumentoEmpresa) {
    calculosQuery = calculosQuery.eq('empresa_id', empresaId)
  } else {
    calculosQuery = calculosQuery.eq('user_id', user.id)
  }

  let fechaInicio: string
  let fechaFin: string

  if (input.tipo === 'certificado') {
    // Todo el historial
    const primerBase = adminClient
      .from('calculos')
      .select('fecha')
      .order('fecha', { ascending: true })
      .limit(1)

    const { data: primero } = await (esDocumentoEmpresa
      ? primerBase.eq('empresa_id', empresaId).single()
      : primerBase.eq('user_id', user.id).single())

    fechaInicio = primero?.fecha
      ? new Date(primero.fecha).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    fechaFin = new Date().toISOString().slice(0, 10)
  } else {
    fechaInicio = input.fecha_inicio
    fechaFin = input.fecha_fin
    calculosQuery = calculosQuery
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin + 'T23:59:59')
  }

  const { data: calculos } = await calculosQuery

  const listaCalculos = calculos ?? []
  const co2Total = listaCalculos.reduce((s, c) => s + (c.total_co2 ?? 0), 0)
  const aguaTotal = listaCalculos.reduce((s, c) => s + (c.total_agua ?? 0), 0)

  // ── Desglose por categoría ────────────────────────────────────
  const categoriaMap = new Map<string, { cantidad: number; co2: number }>()
  for (const calc of listaCalculos) {
    const detalle = calc.detalle_json as Record<string, { categoria?: string; cantidad?: number; co2?: number }> | null
    if (!detalle) continue
    for (const item of Object.values(detalle)) {
      const cat = item?.categoria ?? 'Sin categoría'
      const prev = categoriaMap.get(cat) ?? { cantidad: 0, co2: 0 }
      categoriaMap.set(cat, {
        cantidad: prev.cantidad + (item?.cantidad ?? 1),
        co2: prev.co2 + (item?.co2 ?? 0),
      })
    }
  }

  const desglose: DesgloseCategoría[] = Array.from(categoriaMap.entries()).map(
    ([categoria, v]) => ({ categoria, cantidad: v.cantidad, co2_kg: v.co2 })
  )

  // Si no hay desglose, usar el total como una sola fila
  if (desglose.length === 0 && listaCalculos.length > 0) {
    desglose.push({ categoria: 'Objetos reutilizados', cantidad: listaCalculos.length, co2_kg: co2Total })
  }

  // ── Generar código de verificación provisional ───────────────
  const codigoUUID = crypto.randomUUID()
  
  const payloadToHash = JSON.stringify({
    co2: co2Total, wg: aguaTotal, beneficiario: (esDocumentoEmpresa ? (empresaNombre ?? perfil?.nombre ?? user.email ?? 'Empresa') : (perfil?.nombre ?? user.email ?? 'Usuario')), emision: new Date().toISOString()
  }) + codigoUUID
  
  const hashIntegridad = crypto.createHash('sha256').update(payloadToHash).digest('hex')

  // ── Generar PDF ───────────────────────────────────────────────
  const hoy = new Date()
  const fechaEmision = hoy.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generarPDF({
    tipo: input.tipo,
    beneficiario: esDocumentoEmpresa ? (empresaNombre ?? perfil?.nombre ?? user.email ?? 'Empresa') : (perfil?.nombre ?? user.email ?? 'Usuario'),
    empresa_nombre: empresaNombre,
    empresa_logo_url: empresaLogoUrl,
    fecha_inicio: formatFecha(fechaInicio),
    fecha_fin: formatFecha(fechaFin),
    co2_total_kg: co2Total,
    agua_total_litros: aguaTotal,
    desglose,
    codigo_verificacion: codigoUUID,
    hash_integridad: hashIntegridad,
    fecha_emision: fechaEmision,
  })
  } catch {
    return NextResponse.json({ error: 'Error al generar el PDF. Intenta de nuevo.' }, { status: 500 })
  }

  // ── Subir a Supabase Storage (primero) ────────────────────────
  const carpeta = esDocumentoEmpresa ? `empresa/${empresaId}` : `usuario/${user.id}`
  const fileName = `${input.tipo}_${codigoUUID}.pdf`
  const storagePath = `certificados/${carpeta}/${fileName}`

  const { error: storageError } = await adminClient.storage
    .from('documentos')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (storageError) {
    return NextResponse.json({ error: 'Error al subir el documento. Intenta de nuevo.' }, { status: 500 })
  }

  const { data: urlData } = await adminClient.storage
    .from('documentos')
    .createSignedUrl(storagePath, 3600)
  const pdfUrl = urlData?.signedUrl ?? ''

  // ── Persistir registro solo si storage tuvo éxito ────────────
  const { data: certRow, error: insertError } = await adminClient
    .from('certificados')
    .insert({
      tipo: input.tipo,
      user_id: user.id,
      empresa_id: empresaId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      co2_total: co2Total,
      agua_total: aguaTotal,
      pdf_url: storagePath,
      codigo_verificacion: codigoUUID,
      hash_integridad: hashIntegridad,
      beneficiario: esDocumentoEmpresa ? (empresaNombre ?? perfil?.nombre ?? user.email ?? 'Empresa') : (perfil?.nombre ?? user.email ?? 'Usuario'),
      metadata_json: { desglose, calculos_count: listaCalculos.length, es_empresa: esDocumentoEmpresa },
    })
    .select('id, codigo_verificacion')
    .single()

  if (insertError || !certRow) {
    // El PDF ya existe en storage pero el registro falló — limpiar
    const { error: removeError } = await adminClient.storage.from('documentos').remove([storagePath])
    if (removeError) {
      console.error('[cert/generar] PDF huérfano en storage — limpieza fallida:', storagePath, removeError)
    }
    return NextResponse.json({ error: 'Error creando el registro del documento.' }, { status: 500 })
  }

  // ── Log auditoría ─────────────────────────────────────────────
  await adminClient.from('logs_auditoria').insert({
    user_id: user.id,
    accion: `generar_${input.tipo}`,
    detalle_json: { cert_id: certRow.id, co2_total: co2Total, empresa_id: empresaId, es_empresa: esDocumentoEmpresa },
    ip: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
  })

  return NextResponse.json({
    ok: true,
    cert_id: certRow.id,
    codigo_verificacion: certRow.codigo_verificacion,
    hash_integridad: hashIntegridad,
    pdf_url: pdfUrl,
    co2_total: co2Total,
  })
}
