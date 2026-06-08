/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import PropuestaClient from './propuesta-client'

export const dynamic = 'force-dynamic'

interface Props {
  params: { token: string }
}

export default async function PropuestaPublicaPage({ params }: Props) {
  const adminClient = await createAdminClient()

  // Buscar cotización con datos de empresa incluyendo campos de marca
  const { data: cot } = await adminClient
    .from('crm_cotizaciones')
    .select(`
      id, codigo_cotizacion, estado, subtotal, descuento, total,
      co2_evitado_total_kg, agua_evitada_total_l,
      observaciones, fecha_apertura_cliente, veces_abierta,
      enlace_publico_token, created_at, updated_at,
      crm_clientes ( nombre, telefono, email ),
      empresas (
        nombre,
        logo_url,
        logo_propuesta_url,
        nombre_footer_propuesta,
        whatsapp_propuesta,
        mostrar_marca_reuso
      )
    `)
    .eq('enlace_publico_token', params.token)
    .single()

  if (!cot) notFound()

  // Muebles de esta cotización
  const { data: muebles } = await adminClient
    .from('crm_muebles_cotizados')
    .select('id, tipo_mueble, categoria, oficios_json, precio_mueble, co2_evitado_kg, agua_evitada_l, imagen_url')
    .eq('cotizacion_id', cot.id)
    .order('created_at')

  // Generar signed URLs para imágenes de muebles almacenadas como paths de storage
  const mueblesConUrls = await Promise.all(
    (muebles ?? []).map(async (m) => {
      if (m.imagen_url && !m.imagen_url.startsWith('http')) {
        const { data } = await adminClient.storage.from('cotizador').createSignedUrl(m.imagen_url, 3600)
        return { ...m, imagen_url: data?.signedUrl ?? null }
      }
      return m
    })
  )

  // Registrar apertura (no bloquea el render)
  const ahora = new Date().toISOString()
  await adminClient
    .from('crm_cotizaciones')
    .update({
      veces_abierta: (cot.veces_abierta ?? 0) + 1,
      fecha_apertura_cliente: cot.fecha_apertura_cliente ?? ahora,
      updated_at: ahora,
    })
    .eq('id', cot.id)

  // Normalizar arrays de joins → objetos singulares (Supabase devuelve arrays en joins)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cotAny = cot as any
  const crm_clientes = Array.isArray(cotAny.crm_clientes) ? cotAny.crm_clientes[0] ?? null : cotAny.crm_clientes
  const empresaRaw = Array.isArray(cotAny.empresas) ? cotAny.empresas[0] ?? null : cotAny.empresas

  // Seleccionar logo: logo_propuesta_url tiene prioridad; si no, logo_url genérico
  const logoFinal = empresaRaw?.logo_propuesta_url ?? empresaRaw?.logo_url ?? null

  const cotNorm = {
    ...cotAny,
    crm_clientes,
    empresas: empresaRaw
      ? {
          nombre: empresaRaw.nombre,
          logo_url: logoFinal,
          nombre_footer_propuesta: empresaRaw.nombre_footer_propuesta ?? null,
          whatsapp_propuesta: empresaRaw.whatsapp_propuesta ?? null,
          mostrar_marca_reuso: empresaRaw.mostrar_marca_reuso ?? true,
        }
      : null,
  } as Parameters<typeof PropuestaClient>[0]['cotizacion']

  return (
    <PropuestaClient
      cotizacion={cotNorm}
      muebles={mueblesConUrls as Parameters<typeof PropuestaClient>[0]['muebles']}
      token={params.token}
    />
  )
}
