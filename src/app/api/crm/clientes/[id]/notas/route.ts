import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import { cotizadorAuthCheck } from '@/lib/dpp/auth-check'
import { NOTA_SANITIZE_CONFIG } from '@/lib/sanitize-notas'

// Bitácora general del cliente — independiente de crm_cotizaciones_notas
// (esa es por cotización puntual; esta acompaña al cliente en el tiempo).
//
// El autor se resuelve con una consulta aparte a profiles (nunca con el
// embed implícito `profiles:user_id(...)`): crm_clientes_notas.user_id
// referencia auth.users(id), no profiles(id), así que PostgREST no tiene una
// relación directa que pueda resolver — el embed fallaría con un error de
// "no se encontró relación" y tumbaría toda la petición. Trae nombre,
// apellido y apodo completos para que el frontend aplique displayName()
// (apodo si es real, si no el primer nombre) — nunca el nombre completo
// crudo en temas de trazabilidad.
interface PerfilAutor { nombre: string; apellido: string | null; apodo: string | null }
async function resolverAutores(adminClient: Awaited<ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>>, userIds: string[]): Promise<Map<string, PerfilAutor>> {
  if (userIds.length === 0) return new Map()
  const { data } = await adminClient.from('profiles').select('user_id, nombre, apellido, apodo').in('user_id', userIds)
  return new Map((data ?? []).map(p => [p.user_id as string, { nombre: p.nombre, apellido: p.apellido, apodo: p.apodo } as PerfilAutor]))
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
  }
  const { empresa_id, adminClient } = auth

  const { data: cliente } = await adminClient.from('crm_clientes').select('id').eq('id', params.id).eq('empresa_id', empresa_id).maybeSingle()
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })

  const { data: notas, error } = await adminClient
    .from('crm_clientes_notas')
    .select('id, nota, created_at, user_id')
    .eq('cliente_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'Error al cargar las notas.' }, { status: 500 })

  const autores = await resolverAutores(adminClient, Array.from(new Set((notas ?? []).map(n => n.user_id))))
  const data = (notas ?? []).map(n => ({
    id: n.id, nota: n.nota, created_at: n.created_at,
    profiles: autores.get(n.user_id) ?? { nombre: 'Usuario', apellido: null, apodo: null },
  }))

  return NextResponse.json({ data })
}

// max 4000 (no 2000): el HTML del editor enriquecido (spans de formato,
// emojis) pesa más por carácter visible que texto plano.
const schema = z.object({
  nota: z.string().min(1, 'La nota no puede estar vacía.').max(4000),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await cotizadorAuthCheck(request, ['empresa_admin', 'empleado'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'Sin permiso.' }, { status: auth.status === 400 ? 401 : auth.status })
  }
  const { user_id, empresa_id, adminClient } = auth

  const { data: cliente } = await adminClient.from('crm_clientes').select('id').eq('id', params.id).eq('empresa_id', empresa_id).maybeSingle()
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Nota inválida.' }, { status: 400 })
  }

  const { data: nota, error } = await adminClient
    .from('crm_clientes_notas')
    .insert({ cliente_id: params.id, user_id, nota: DOMPurify.sanitize(parsed.data.nota, NOTA_SANITIZE_CONFIG) })
    .select('id, nota, created_at, user_id')
    .single()

  if (error || !nota) {
    console.error('[POST /api/crm/clientes/[id]/notas]', error)
    return NextResponse.json({ error: 'Error al guardar la nota.' }, { status: 500 })
  }

  const autores = await resolverAutores(adminClient, [nota.user_id])
  const data = { id: nota.id, nota: nota.nota, created_at: nota.created_at, profiles: autores.get(nota.user_id) ?? { nombre: 'Usuario', apellido: null, apodo: null } }

  return NextResponse.json({ data }, { status: 201 })
}
