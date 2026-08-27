import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('rol')
      .eq('user_id', user.id)
      .single()

    if (perfil?.rol !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { segmento, empresaId, manualEmails } = body

    const adminClient = await createAdminClient()

    if (segmento === 'manual') {
      const raw = typeof manualEmails === 'string' ? manualEmails : ''
      const emails = raw
        .split(/[,;\n\s]+/)
        .map(e => e.trim().toLowerCase())
        .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

      const unique = Array.from(new Set(emails))
      return NextResponse.json({
        total: unique.length,
        destinatarios: unique.map(email => ({ email, nombre: email.split('@')[0], empresaNombre: null }))
      })
    }

    if (segmento === 'leads') {
      const { data: leads, error } = await adminClient
        .from('leads')
        .select('email, nombre, empresa')
        .not('email', 'is', null)

      if (error) throw error

      const uniqueMap = new Map<string, { email: string; nombre: string; empresaNombre: string | null }>()
      for (const l of leads ?? []) {
        if (l.email && !uniqueMap.has(l.email.toLowerCase())) {
          uniqueMap.set(l.email.toLowerCase(), {
            email: l.email.toLowerCase(),
            nombre: l.nombre || l.email.split('@')[0],
            empresaNombre: l.empresa || null,
          })
        }
      }

      const list = Array.from(uniqueMap.values())
      return NextResponse.json({
        total: list.length,
        destinatarios: list
      })
    }

    // Consultas sobre profiles
    let query = adminClient
      .from('profiles')
      .select('email, nombre, apellido, rol, empresa_id, empresas(nombre)')
      .not('email', 'is', null)

    if (segmento === 'empresa_admin') {
      query = query.eq('rol', 'empresa_admin')
    } else if (segmento === 'empleado') {
      query = query.eq('rol', 'empleado')
    } else if (segmento === 'usuario_libre') {
      query = query.eq('rol', 'usuario_libre')
    } else if (segmento === 'empresa_especifica' && empresaId) {
      query = query.eq('empresa_id', empresaId)
    }

    const { data: perfiles, error } = await query

    if (error) throw error

    const uniqueMap = new Map<string, { email: string; nombre: string; empresaNombre: string | null }>()
    for (const p of perfiles ?? []) {
      if (p.email && !uniqueMap.has(p.email.toLowerCase())) {
        const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(' ') || p.email.split('@')[0]
        const emp = (p.empresas as unknown as { nombre: string }[] | { nombre: string } | null)
        const empresaNombre = Array.isArray(emp) ? emp[0]?.nombre : emp?.nombre

        uniqueMap.set(p.email.toLowerCase(), {
          email: p.email.toLowerCase(),
          nombre: nombreCompleto,
          empresaNombre: empresaNombre || null,
        })
      }
    }

    const list = Array.from(uniqueMap.values())
    return NextResponse.json({
      total: list.length,
      destinatarios: list
    })
  } catch (err: unknown) {
    console.error('Error al resolver destinatarios:', err)
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
