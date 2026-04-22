import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PARAM_EQUIV } from '@/lib/calculos/co2'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, empresa_id')
    .eq('user_id', user.id)
    .single()

  if (perfil?.rol !== 'empresa_admin') {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
  }

  if (!perfil.empresa_id) {
    return NextResponse.json({ error: 'No tienes empresa asociada.' }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  // Verificar plan ilimitado
  const { data: empresa } = await adminClient
    .from('empresas')
    .select('plan, nombre')
    .eq('id', perfil.empresa_id)
    .single()

  if (empresa?.plan !== 'ilimitado') {
    return NextResponse.json(
      { error: 'La exportación CSV solo está disponible en el plan Impacto Ilimitado.' },
      { status: 403 }
    )
  }

  // Obtener todos los cálculos de la empresa
  const { data: calculos } = await adminClient
    .from('calculos')
    .select('id, user_id, fecha, total_co2, total_agua, detalle_json, created_at')
    .eq('empresa_id', perfil.empresa_id)
    .order('fecha', { ascending: false })

  const listaCalculos = calculos ?? []

  // Resolver nombres de usuario
  const userIds = Array.from(new Set(listaCalculos.map((c) => c.user_id).filter(Boolean)))
  let nombresMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('user_id, nombre')
      .in('user_id', userIds)
    nombresMap = new Map((profiles ?? []).map((p) => [p.user_id, p.nombre]))
  }

  // Generar CSV
  const cabeceras = ['fecha', 'usuario', 'objetos', 'co2_kg', 'agua_litros', 'arbol_equiv']
  const filas = listaCalculos.map((c) => {
    const detalle = c.detalle_json as Record<string, unknown> | null
    const objetos = detalle ? Object.keys(detalle).length : 0
    const arbolEquiv = Math.round((c.total_co2 ?? 0) / PARAM_EQUIV.CO2_arbol_anual_kg)
    const fecha = c.fecha ? new Date(c.fecha).toISOString().slice(0, 10) : ''
    const usuario = nombresMap.get(c.user_id) ?? c.user_id ?? ''
    return [
      fecha,
      `"${usuario.replace(/"/g, '""')}"`,
      objetos,
      (c.total_co2 ?? 0).toFixed(4),
      (c.total_agua ?? 0).toFixed(2),
      arbolEquiv,
    ].join(',')
  })

  const csvContent = [cabeceras.join(','), ...filas].join('\n')
  const nombreArchivo = `reuso-calculos-${empresa.nombre.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}.csv`

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    },
  })
}
