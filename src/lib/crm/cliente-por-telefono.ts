import type { createAdminClient } from '@/lib/supabase/admin'
import { guardarTelefono, huellaTelefono } from '@/lib/crm/telefono-seguro'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

export async function buscarOCrearClientePorTelefono(
  adminClient: AdminClient,
  empresaId: string,
  datos: { nombre: string; indicativo: string; numero: string }
): Promise<{ id: string; creado: boolean }> {
  const hash = huellaTelefono(datos.indicativo, datos.numero)
  if (!hash) throw new Error('Número vacío.')

  const buscar = () =>
    adminClient
      .from('crm_clientes')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('telefono_hash', hash)
      .is('duplicado_de_id', null)
      .maybeSingle()

  const { data: existente } = await buscar()
  if (existente) return { id: existente.id, creado: false }

  const tel = await guardarTelefono(datos.indicativo, datos.numero)
  const nombre = datos.nombre.trim() || `Cliente ${datos.numero.slice(-4)}`
  const { data, error } = await adminClient
    .from('crm_clientes')
    .insert({
      empresa_id: empresaId,
      tipo: 'persona',
      es_contacto_real: true,
      nombre,
      telefono_indicativo: datos.indicativo,
      ...tel,
    })
    .select('id')
    .single()

  if (error?.code === '23505') {
    const { data: ganador } = await buscar()
    if (ganador) return { id: ganador.id, creado: false }
  }
  if (error || !data) throw error ?? new Error('No se pudo crear el cliente.')
  return { id: data.id, creado: true }
}
