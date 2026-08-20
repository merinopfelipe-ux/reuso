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
      validez_activa, validez_modo, validez_dias, validez_fecha,
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
    .select('titulo, tipo_mueble, cantidad, precio_mueble')
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
    muebles: (muebles ?? []).map((m: { titulo: string | null; tipo_mueble: string; cantidad: number; precio_mueble: number }) => ({
      titulo: m.titulo || m.tipo_mueble, cantidad: m.cantidad, precio_mueble: Number(m.precio_mueble),
    })),
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
