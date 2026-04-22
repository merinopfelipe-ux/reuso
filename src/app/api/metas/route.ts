import { NextRequest, NextResponse } from 'next/server'
// NextRequest usado solo en POST
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const POST_SCHEMA = z.object({
  titulo: z.string().min(3).max(100),
  descripcion: z.string().max(255).optional(),
  metrica: z.enum(['co2_kg', 'peso_kg', 'agua_l', 'num_calculos']),
  valor_objetivo: z.number().positive(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // GET the user's company
  const { data: profile } = await supabase.from('profiles').select('empresa_id').eq('user_id', user.id).single()
  if (!profile?.empresa_id) {
    return NextResponse.json({ error: 'Usuario no pertenece a ninguna empresa.' }, { status: 403 })
  }

  // Admin Client to fetch metas AND the cumulative progress
  const adminClient = await createAdminClient()
  
  const { data: metas } = await adminClient
    .from('metas')
    .select('*')
    .eq('empresa_id', profile.empresa_id)
    .order('created_at', { ascending: false })

  if (!metas) return NextResponse.json([])

  // Calculate actual progress for each goal dynamically
  const metasWithProgress = await Promise.all(metas.map(async (meta) => {
    // We only need to sum up `total_co2` / `total_agua` / etc inside the date range globally for the company
    let progreso_actual = 0

    if (meta.metrica === 'num_calculos') {
      const { count } = await adminClient
        .from('calculos')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', meta.empresa_id)
        .gte('fecha', meta.fecha_inicio)
        .lte('fecha', meta.fecha_fin + 'T23:59:59')
      progreso_actual = count || 0
    } else {
      const { data: calculos } = await adminClient
        .from('calculos')
        .select('total_co2, total_agua, detalle_json')
        .eq('empresa_id', meta.empresa_id)
        .gte('fecha', meta.fecha_inicio)
        .lte('fecha', meta.fecha_fin + 'T23:59:59')
      
      if (calculos) {
        progreso_actual = calculos.reduce((acc, curr) => {
          if (meta.metrica === 'co2_kg') return acc + (curr.total_co2 || 0)
          if (meta.metrica === 'agua_l') return acc + (curr.total_agua || 0)
          if (meta.metrica === 'peso_kg') {
            // Sumar peso_kg de cada item dentro de detalle_json
            const detalle = (curr as Record<string, unknown>).detalle_json as Record<string, unknown> | null
            if (!detalle) return acc
            const pesoItems = Object.entries(detalle)
              .filter(([k, v]) => !k.startsWith('_') && typeof v === 'object' && v !== null)
              .reduce((s, [, v]) => {
                const item = v as { peso_kg?: number }
                return s + (item.peso_kg ?? 0)
              }, 0)
            return acc + pesoItems
          }
          return acc
        }, 0)
      }
    }

    return {
      ...meta,
      progreso_actual
    }
  }))

  return NextResponse.json(metasWithProgress)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('empresa_id, rol').eq('user_id', user.id).single()
  if (!profile?.empresa_id || profile.rol !== 'empresa_admin') {
    return NextResponse.json({ error: 'Solo los administradores de la empresa pueden crear metas.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = POST_SCHEMA.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const adminClient = await createAdminClient()
  
  // Create goal
  const { data: newMeta, error } = await adminClient
    .from('metas')
    .insert({
      empresa_id: profile.empresa_id,
      ...parsed.data
    })
    .select()
    .single()

  if (error || !newMeta) {
    return NextResponse.json({ error: 'Error interno guardando la meta.' }, { status: 500 })
  }

  return NextResponse.json(newMeta)
}
