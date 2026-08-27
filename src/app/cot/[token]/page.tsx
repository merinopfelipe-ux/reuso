import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import PropuestaClient from './propuesta-client'
import type { PorQueElegirnos } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

interface Props {
  params: { token: string }
}

export default async function PropuestaPublicaPage({ params }: Props) {
  const adminClient = await createAdminClient()

  // Buscar cotización con datos de empresa incluyendo campos de marca
  const { data: cot } = await adminClient
    .from('crm_cotizaciones')
    .select(`
      id, codigo_cotizacion, estado, subtotal, descuento_activo, descuento, descuento_tipo, total,
      transporte_activo, transporte_valor, iva_activo, iva_porcentaje,
      validez_activa, validez_modo, validez_dias, validez_fecha, validez_mostrar_galeria, validez_mostrar_lista,
      anticipo_activo, anticipo_porcentaje,
      forma_pago_activo, forma_pago_tipo, forma_pago_dias, forma_pago_mostrar_galeria, forma_pago_mostrar_lista,
      tiempo_entrega_activo, tiempo_entrega, tiempo_entrega_mostrar_galeria, tiempo_entrega_mostrar_lista,
      garantia_activo, garantia, garantia_mostrar_galeria, garantia_mostrar_lista,
      envio_gratis_activo, envio_gratis_texto, envio_gratis_icono, envio_gratis_mostrar_galeria, envio_gratis_mostrar_lista,
      nota_mostrar_galeria, nota_mostrar_lista,
      destacados_json, legales_json, version,
      co2_evitado_total_kg, agua_evitada_total_l,
      observaciones, fecha_apertura_cliente, veces_abierta,
      enlace_publico_token, created_at, updated_at, asesor_id,
      crm_clientes (
        id, tipo, nombre, apellido, identificacion, telefono, telefono_indicativo, email, direccion, empresa_cliente_id, es_contacto_real,
        crm_empresas_clientes ( id, nit, razon_social, nombre_comercial, direccion )
      ),
      empresas (
        nombre,
        logo_url,
        logo_propuesta_url,
        logo_svg_url,
        logo_alto_minimo_px,
        nombre_footer_propuesta,
        whatsapp_propuesta,
        mostrar_marca_reuso,
        por_que_elegirnos_json
      )
    `)
    .or(`enlace_publico_token.eq.${params.token},codigo_cotizacion.eq.${params.token}`)
    .single()

  if (!cot) notFound()

  // Muebles de esta cotización
  const { data: muebles } = await adminClient
    .from('crm_muebles_cotizados')
    .select('id, titulo, descripcion, tipo_mueble, categoria, oficios_json, servicios_json, insumos_json, cantidad, precio_mueble, co2_evitado_kg, agua_evitada_l, imagen_url, materiales_json, peso_estandar_kg, precio_mercado_nuevo, precio_mercado_estado')
    .eq('cotizacion_id', cot.id)
    .eq('oculto', false)
    .order('created_at')

  // Generar signed URLs masivo para imágenes de muebles
  const pathsToSign: string[] = []
  const mueblesArray = muebles ?? []
  mueblesArray.forEach(m => {
    if (m.imagen_url && !m.imagen_url.startsWith('http')) {
      pathsToSign.push(m.imagen_url)
    }
  })

  const signedUrlsMap: Record<string, string> = {}
  if (pathsToSign.length > 0) {
    const { data: signedData, error: signError } = await adminClient.storage
      .from('cotizador')
      .createSignedUrls(pathsToSign, 3600)
    
    if (signError) {
      console.error(`[/cot/[token]] signed URLs masivo falló:`, signError.message)
    } else if (signedData) {
      signedData.forEach((item) => {
        if (!item.error && item.signedUrl && item.path) {
          signedUrlsMap[item.path] = item.signedUrl
        }
      })
    }
  }

  const mueblesConUrls = mueblesArray.map((m) => {
    if (m.imagen_url && !m.imagen_url.startsWith('http')) {
      return { ...m, imagen_url: signedUrlsMap[m.imagen_url] ?? null }
    }
    return m
  })


  interface EmpresaClienteData {
    id: string
    nit: string | null
    razon_social: string
    nombre_comercial: string | null
    direccion: string | null
  }

  interface ClienteCot {
    id?: string
    tipo?: 'persona' | 'empresa' | null
    nombre: string
    apellido: string | null
    identificacion: string | null
    telefono: string | null
    telefono_indicativo: string | null
    email: string | null
    direccion: string | null
    empresa_cliente_id?: string | null
    es_contacto_real?: boolean | null
    crm_empresas_clientes?: EmpresaClienteData | EmpresaClienteData[] | null
  }

  interface EmpresaCot {
    nombre: string
    logo_url: string | null
    logo_propuesta_url: string | null
    logo_svg_url: string | null
    logo_alto_minimo_px: number | null
    nombre_footer_propuesta: string | null
    whatsapp_propuesta: string | null
    mostrar_marca_reuso: boolean | null
    por_que_elegirnos_json: PorQueElegirnos | null
  }

  interface CotizacionData {
    id: string
    codigo_cotizacion: string
    estado: string
    subtotal: number | null
    descuento: number | null
    descuento_activo: boolean | null
    descuento_tipo: 'valor' | 'porcentaje' | null
    transporte_activo: boolean | null
    transporte_valor: number | null
    iva_activo: boolean | null
    iva_porcentaje: number | null
    validez_activa: boolean | null
    validez_modo: 'dias' | 'fecha' | null
    validez_dias: number | null
    validez_fecha: string | null
    validez_mostrar_galeria: boolean | null
    validez_mostrar_lista: boolean | null
    anticipo_activo: boolean | null
    anticipo_porcentaje: number | null
    forma_pago_activo: boolean | null
    forma_pago_tipo: 'anticipo' | 'dias' | null
    forma_pago_dias: number | null
    forma_pago_mostrar_galeria: boolean | null
    forma_pago_mostrar_lista: boolean | null
    tiempo_entrega_activo: boolean | null
    tiempo_entrega: string | null
    tiempo_entrega_mostrar_galeria: boolean | null
    tiempo_entrega_mostrar_lista: boolean | null
    garantia_activo: boolean | null
    garantia: string | null
    garantia_mostrar_galeria: boolean | null
    garantia_mostrar_lista: boolean | null
    envio_gratis_activo: boolean | null
    envio_gratis_texto: string | null
    envio_gratis_icono: string | null
    envio_gratis_mostrar_galeria: boolean | null
    envio_gratis_mostrar_lista: boolean | null
    nota_mostrar_galeria: boolean | null
    nota_mostrar_lista: boolean | null
    destacados_json: { icono: string; texto: string; mostrar_galeria?: boolean; mostrar_lista?: boolean }[] | null
    legales_json: string[] | null
    version: number | null
    total: number | null
    co2_evitado_total_kg: number | null
    agua_evitada_total_l: number | null
    observaciones: string | null
    fecha_apertura_cliente: string | null
    veces_abierta: number | null
    enlace_publico_token: string | null
    created_at: string
    updated_at: string
    crm_clientes: ClienteCot | ClienteCot[] | null
    empresas: EmpresaCot | EmpresaCot[] | null
  }

  const cotTyped = cot as unknown as CotizacionData
  const crm_clientes = Array.isArray(cotTyped.crm_clientes) ? cotTyped.crm_clientes[0] ?? null : cotTyped.crm_clientes
  const empresaRaw = Array.isArray(cotTyped.empresas) ? cotTyped.empresas[0] ?? null : cotTyped.empresas

  // Seleccionar logo: logo_propuesta_url tiene prioridad; si no, logo_url genérico
  const logoFinal = empresaRaw?.logo_propuesta_url ?? empresaRaw?.logo_url ?? null

  const cotNorm = {
    id: cotTyped.id,
    codigo_cotizacion: cotTyped.codigo_cotizacion,
    estado: cotTyped.estado,
    subtotal: cotTyped.subtotal,
    descuento: cotTyped.descuento,
    descuento_activo: cotTyped.descuento_activo ?? false,
    descuento_tipo: cotTyped.descuento_tipo ?? 'valor',
    transporte_activo: cotTyped.transporte_activo ?? false,
    transporte_valor: cotTyped.transporte_valor ?? 0,
    iva_activo: cotTyped.iva_activo ?? false,
    iva_porcentaje: cotTyped.iva_porcentaje ?? 0,
    validez_activa: cotTyped.validez_activa ?? true,
    validez_modo: cotTyped.validez_modo ?? 'dias',
    validez_dias: cotTyped.validez_dias ?? 30,
    validez_fecha: cotTyped.validez_fecha ?? null,
    validez_mostrar_galeria: cotTyped.validez_mostrar_galeria ?? true,
    validez_mostrar_lista: cotTyped.validez_mostrar_lista ?? true,
    anticipo_activo: cotTyped.anticipo_activo ?? true,
    anticipo_porcentaje: cotTyped.anticipo_porcentaje ?? 60,
    forma_pago_activo: cotTyped.forma_pago_activo ?? true,
    forma_pago_tipo: cotTyped.forma_pago_tipo ?? 'anticipo',
    forma_pago_dias: cotTyped.forma_pago_dias ?? 30,
    forma_pago_mostrar_galeria: cotTyped.forma_pago_mostrar_galeria ?? true,
    forma_pago_mostrar_lista: cotTyped.forma_pago_mostrar_lista ?? true,
    tiempo_entrega_activo: cotTyped.tiempo_entrega_activo ?? true,
    tiempo_entrega: cotTyped.tiempo_entrega ?? null,
    tiempo_entrega_mostrar_galeria: cotTyped.tiempo_entrega_mostrar_galeria ?? true,
    tiempo_entrega_mostrar_lista: cotTyped.tiempo_entrega_mostrar_lista ?? true,
    garantia_activo: cotTyped.garantia_activo ?? true,
    garantia: cotTyped.garantia ?? null,
    garantia_mostrar_galeria: cotTyped.garantia_mostrar_galeria ?? true,
    garantia_mostrar_lista: cotTyped.garantia_mostrar_lista ?? true,
    envio_gratis_activo: cotTyped.envio_gratis_activo ?? false,
    envio_gratis_texto: cotTyped.envio_gratis_texto ?? null,
    envio_gratis_icono: cotTyped.envio_gratis_icono ?? null,
    envio_gratis_mostrar_galeria: cotTyped.envio_gratis_mostrar_galeria ?? true,
    envio_gratis_mostrar_lista: cotTyped.envio_gratis_mostrar_lista ?? true,
    nota_mostrar_galeria: cotTyped.nota_mostrar_galeria ?? true,
    nota_mostrar_lista: cotTyped.nota_mostrar_lista ?? true,
    destacados_json: cotTyped.destacados_json ?? [],
    legales_json: cotTyped.legales_json ?? [],
    version: cotTyped.version ?? 1,
    total: cotTyped.total,
    co2_evitado_total_kg: cotTyped.co2_evitado_total_kg,
    agua_evitada_total_l: cotTyped.agua_evitada_total_l,
    observaciones: cotTyped.observaciones,
    fecha_apertura_cliente: cotTyped.fecha_apertura_cliente,
    veces_abierta: cotTyped.veces_abierta,
    enlace_publico_token: cotTyped.enlace_publico_token,
    created_at: cotTyped.created_at,
    updated_at: cotTyped.updated_at,
    crm_clientes,
    empresas: empresaRaw
      ? {
          nombre: empresaRaw.nombre,
          logo_url: logoFinal,
          logo_svg_url: empresaRaw.logo_svg_url ?? null,
          logo_alto_minimo_px: empresaRaw.logo_alto_minimo_px ?? 60,
          nombre_footer_propuesta: empresaRaw.nombre_footer_propuesta ?? null,
          whatsapp_propuesta: empresaRaw.whatsapp_propuesta ?? null,
          mostrar_marca_reuso: empresaRaw.mostrar_marca_reuso ?? true,
          por_que_elegirnos_json: empresaRaw.por_que_elegirnos_json ?? null,
        }
      : null,
  } as Parameters<typeof PropuestaClient>[0]['cotizacion']

  return (
    <PropuestaClient
      cotizacion={cotNorm}
      muebles={mueblesConUrls as Parameters<typeof PropuestaClient>[0]['muebles']}
      token={params.token}
      aperturaId={null}
    />
  )
}
