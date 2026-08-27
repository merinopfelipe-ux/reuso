import type { SupabaseClient } from '@supabase/supabase-js'
import { generarPDFCotizacion, fetchImageAsBase64 } from './generar-pdf-cotizacion'

// Construye el PDF de una cotización a partir de su id — usado tanto por la
// descarga pública (token) como por la descarga autenticada desde /empresa,
// para no duplicar el mapeo de campos en dos rutas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function construirPdfCotizacion(cotizacionId: string, adminClient: SupabaseClient<any>): Promise<Uint8Array | null> {
  const { data: cot } = await adminClient
    .from('crm_cotizaciones')
    .select(`
      id, codigo_cotizacion, subtotal, descuento_activo, descuento, descuento_tipo,
      transporte_activo, transporte_valor, iva_activo, iva_porcentaje,
      validez_activa, validez_modo, validez_dias, validez_fecha, validez_mostrar_lista,
      anticipo_activo, anticipo_porcentaje,
      forma_pago_activo, forma_pago_tipo, forma_pago_dias, forma_pago_mostrar_lista,
      tiempo_entrega_activo, tiempo_entrega, tiempo_entrega_mostrar_lista,
      garantia_activo, garantia, garantia_mostrar_lista,
      envio_gratis_activo, envio_gratis_texto, envio_gratis_mostrar_lista,
      nota_mostrar_lista, destacados_json, legales_json,
      observaciones, created_at,
      crm_clientes (
        id, tipo, nombre, apellido, identificacion, telefono, telefono_indicativo, email, direccion, es_contacto_real,
        crm_empresas_clientes ( id, nit, razon_social, nombre_comercial, direccion )
      ),
      empresas ( nombre, logo_url, logo_propuesta_url )
    `)
    .eq('id', cotizacionId)
    .single()

  if (!cot) return null

  const { data: muebles } = await adminClient
    .from('crm_muebles_cotizados')
    .select('titulo, descripcion, tipo_mueble, cantidad, precio_mueble, imagen_url')
    .eq('cotizacion_id', cot.id)
    .eq('oculto', false)
    .order('created_at')

  const cliente = Array.isArray(cot.crm_clientes) ? cot.crm_clientes[0] : cot.crm_clientes
  const empresa = Array.isArray(cot.empresas) ? cot.empresas[0] : cot.empresas
  const logoUrl = empresa?.logo_propuesta_url ?? empresa?.logo_url ?? null
  const logoBase64 = logoUrl ? await fetchImageAsBase64(logoUrl) : null

  const telefonoDigits = cliente?.telefono?.replace(/\D/g, '') ?? ''
  const clienteTelefono = telefonoDigits
    ? telefonoDigits.length === 10
      ? `${cliente?.telefono_indicativo ?? '+57'} (${telefonoDigits.slice(0, 3)}) ${telefonoDigits.slice(3, 6)} ${telefonoDigits.slice(6)}`
      : `${cliente?.telefono_indicativo ?? '+57'} ${telefonoDigits}`
    : null

  const fechaValidez = cot.validez_modo === 'fecha' && cot.validez_fecha
    ? new Date(`${cot.validez_fecha}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date(new Date(cot.created_at).getTime() + (cot.validez_dias ?? 30) * 86_400_000)
        .toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

  const pathsToSign: string[] = []
  const mueblesArray = muebles ?? []
  mueblesArray.forEach(m => {
    if (m.imagen_url && !m.imagen_url.startsWith('http')) {
      pathsToSign.push(m.imagen_url)
    }
  })

  const signedUrlsMap: Record<string, string> = {}
  if (pathsToSign.length > 0) {
    const { data: signedData } = await adminClient.storage
      .from('cotizador')
      .createSignedUrls(pathsToSign, 3600)
    if (signedData) {
      signedData.forEach((item) => {
        if (!item.error && item.signedUrl && item.path) {
          signedUrlsMap[item.path] = item.signedUrl
        }
      })
    }
  }

  // Fetch all furniture images in parallel
  const mueblesConBase64 = await Promise.all(mueblesArray.map(async (m) => {
    let finalUrl = m.imagen_url
    if (m.imagen_url && !m.imagen_url.startsWith('http')) {
      finalUrl = signedUrlsMap[m.imagen_url] ?? null
    }
    const base64 = finalUrl ? await fetchImageAsBase64(finalUrl).catch(() => null) : null
    return {
      titulo: m.titulo || m.tipo_mueble,
      descripcion: m.descripcion,
      cantidad: m.cantidad,
      precio_mueble: Number(m.precio_mueble),
      imagen_base64: base64
    }
  }))

  const empCliente = cliente?.crm_empresas_clientes
    ? (Array.isArray(cliente.crm_empresas_clientes) ? cliente.crm_empresas_clientes[0] : cliente.crm_empresas_clientes)
    : null

  return generarPDFCotizacion({
    codigo_cotizacion: cot.codigo_cotizacion,
    fecha: new Date(cot.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
    cliente_nombre: cliente?.nombre ?? 'Cliente',
    cliente_apellido: cliente?.apellido ?? null,
    cliente_identificacion: cliente?.identificacion ?? null,
    cliente_telefono: clienteTelefono,
    cliente_email: cliente?.email ?? null,
    cliente_direccion: cliente?.direccion ?? null,
    cliente_tipo: cliente?.tipo ?? (empCliente ? 'empresa' : 'persona'),
    cliente_es_contacto_real: cliente?.es_contacto_real ?? true,
    empresa_cliente_razon_social: empCliente?.razon_social ?? empCliente?.nombre_comercial ?? null,
    empresa_cliente_nit: empCliente?.nit ?? null,
    empresa_cliente_direccion: empCliente?.direccion ?? null,
    empresa_nombre: empresa?.nombre ?? 'Lurdes',
    empresa_logo_base64: logoBase64,
    observaciones: cot.observaciones,
    validez_activa: cot.validez_activa ?? true,
    fecha_validez: fechaValidez,
    validez_mostrar_lista: cot.validez_mostrar_lista ?? true,
    anticipo_activo: cot.anticipo_activo ?? true,
    anticipo_porcentaje: cot.anticipo_porcentaje ?? 60,
    forma_pago_activo: cot.forma_pago_activo ?? true,
    forma_pago_tipo: cot.forma_pago_tipo ?? 'anticipo',
    forma_pago_dias: cot.forma_pago_dias ?? 30,
    forma_pago_mostrar_lista: cot.forma_pago_mostrar_lista ?? true,
    tiempo_entrega_activo: cot.tiempo_entrega_activo ?? true,
    tiempo_entrega: cot.tiempo_entrega ?? null,
    tiempo_entrega_mostrar_lista: cot.tiempo_entrega_mostrar_lista ?? true,
    garantia_activo: cot.garantia_activo ?? true,
    garantia: cot.garantia ?? null,
    garantia_mostrar_lista: cot.garantia_mostrar_lista ?? true,
    envio_gratis_activo: cot.envio_gratis_activo ?? false,
    envio_gratis_texto: cot.envio_gratis_texto ?? null,
    envio_gratis_mostrar_lista: cot.envio_gratis_mostrar_lista ?? true,
    nota_mostrar_lista: cot.nota_mostrar_lista ?? true,
    destacados_json: cot.destacados_json ?? [],
    legales_json: cot.legales_json ?? [],
    muebles: mueblesConBase64,
    subtotal: Number(cot.subtotal) || 0,
    transporte_activo: cot.transporte_activo ?? false,
    transporte_valor: Number(cot.transporte_valor) || 0,
    descuento_activo: cot.descuento_activo ?? false,
    descuento: Number(cot.descuento) || 0,
    descuento_tipo: (cot.descuento_tipo ?? 'valor') as 'valor' | 'porcentaje',
    iva_activo: cot.iva_activo ?? false,
    iva_porcentaje: Number(cot.iva_porcentaje) || 0,
  })
}
