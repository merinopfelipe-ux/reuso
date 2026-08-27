import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dppAuthCheck } from '@/lib/dpp/auth-check'

const incidentSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido.').max(100),
  descripcion: z.string().max(1000).optional(),
  componente: z.enum(['gemini', 'groq', 'openrouter', 'qwen', 'supabase', 'calculadora']),
  estado: z.enum(['investigando', 'identificado', 'monitoreando', 'resuelto']),
  severidad: z.enum(['menor', 'mayor', 'critico']),
  // 'mantenimiento' = aviso programado nuestro (no es una falla) — cuando
  // está activo reemplaza el banner "Sistemas Operativos" de /status.
  // origen nunca lo manda el cliente: el default de la columna ('admin') ya
  // es correcto para todo lo creado desde este panel.
  tipo: z.enum(['incidente', 'mantenimiento']).default('incidente'),
})

export async function GET() {
  const auth = await dppAuthCheck(['super_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No autorizado.' },
      { status: auth.status }
    )
  }
  const { adminClient } = auth

  try {
    const { data: incidentes, error } = await adminClient
      .from('dpp_incidencias')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ incidentes })
  } catch {
    return NextResponse.json({ error: 'Error al obtener incidencias.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await dppAuthCheck(['super_admin'])
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Inicia sesión para continuar.' : 'No autorizado.' },
      { status: auth.status }
    )
  }
  const { adminClient } = auth

  try {
    const body = await request.json().catch(() => null)
    const parsed = incidentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
        { status: 400 }
      )
    }

    const { titulo, descripcion, componente, estado, severidad, tipo } = parsed.data
    const resolved_at = estado === 'resuelto' ? new Date().toISOString() : null

    const { data: incidente, error } = await adminClient
      .from('dpp_incidencias')
      .insert({
        titulo,
        descripcion: descripcion || '',
        componente,
        estado,
        severidad,
        tipo,
        resolved_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      // 23505 = ya hay una incidencia/mantenimiento activo para este mismo
      // componente (índice único de sql/091) — mensaje claro en vez del
      // genérico "Error al registrar incidencia."
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe un aviso activo (sin resolver) para este componente. Resuélvelo primero o edítalo en vez de crear uno nuevo.' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ data: incidente }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al registrar incidencia.' },
      { status: 500 }
    )
  }
}
