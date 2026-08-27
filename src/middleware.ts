import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { rateLimit } from '@/lib/rate-limit'
import type { Rol } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Verificación genérica de acceso a un módulo (Cotizador/DPP/Cálculo) ──────
// Consulta directa para no importar server-only code en el middleware edge
// runtime. `exentoUsuarioLibre`: usuario_libre no pertenece a ninguna empresa,
// así que el sistema de módulos (que es por empresa) no le aplica — nunca se
// le bloquea el Cálculo de huella por esto.

async function verificarAccesoModulo(
  supabase: SupabaseClient,
  userId: string,
  empresaId: string | null,
  rol: string,
  clave: string,
  opciones: { exentoUsuarioLibre?: boolean } = {}
): Promise<boolean> {
  if (rol === 'super_admin') return true
  if (opciones.exentoUsuarioLibre && rol === 'usuario_libre') return true
  if (!empresaId) return false

  // Buscar id del módulo
  const { data: modulo } = await supabase
    .from('modulos')
    .select('id')
    .eq('clave', clave)
    .eq('activo', true)
    .single()
  if (!modulo) return false

  // Verificar empresa y usuario en paralelo (ambos necesitan modulo.id)
  const [{ data: me }, { data: mu }] = await Promise.all([
    supabase
      .from('modulos_empresas')
      .select('activo')
      .eq('modulo_id', modulo.id)
      .eq('empresa_id', empresaId)
      .single(),
    supabase
      .from('modulos_usuarios')
      .select('activo')
      .eq('user_id', userId)
      .eq('modulo_id', modulo.id)
      .eq('empresa_id', empresaId)
      .single(),
  ])
  if (!me || !me.activo) return false
  if (!mu) return true   // sin restricción → hereda acceso empresa
  return mu.activo === true
}

const PUBLIC_ROUTES = ['/', '/login', '/registro', '/confirmar-email', '/recuperar', '/unsubscribe']
const REDIRECT_BY_ROL: Record<Rol, string> = {
  super_admin: '/admin',
  empresa_admin: '/empresa',
  empleado: '/dashboard',
  usuario_libre: '/dashboard',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  request.headers.set('x-pathname', pathname)

  // Rate limit de /verificar/[codigo] en el middleware (no en la página): la
  // página usa ISR (revalidate 3600) y llamar a rateLimit ahí forzaría
  // renderizado dinámico en cada visita, perdiendo el caché. Aquí no afecta
  // el caché de la página. 10 req/min por IP, ver skill seguridad-reuso.
  if (pathname.startsWith('/verificar/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const allowed = await rateLimit(`verificar_codigo:${ip}`, 10, 60_000)
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, { status: 429 })
    }
    return NextResponse.next()
  }

  // Rutas públicas sin sesión requerida o protegidas que no deben redirigir a sesión
  if (
    pathname.startsWith('/verificar') ||
    pathname.startsWith('/invitacion/') ||
    pathname.startsWith('/cot/') ||
    pathname.startsWith('/pasaporte/') ||
    pathname.startsWith('/status') ||
    pathname === '/legal' ||
    pathname.startsWith('/legal/') ||
    pathname.startsWith('/sistema-diseno') ||
    pathname.startsWith('/landing2') ||
    pathname.startsWith('/pivot-roadmap')
  ) {
    return NextResponse.next()
  }

  const { supabaseResponse, user, supabase } = await updateSession(request)

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  // Sin sesión en ruta protegida → login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Con sesión en ruta pública → redirigir a su panel
  if (user && isPublicRoute) {
    const { data: perfil } = await supabase
      .from('profiles')
      .select('rol')
      .eq('user_id', user.id)
      .single()

    const rol = (perfil?.rol ?? 'usuario_libre') as Rol
    const destino = REDIRECT_BY_ROL[rol]
    return NextResponse.redirect(new URL(destino, request.url))
  }

  const RUTAS_CALCULO = ['/empresa/calculos', '/empresa/objetos', '/dashboard/objetos', '/dashboard/historial']
  const esRutaCalculo = RUTAS_CALCULO.some((r) => pathname.startsWith(r))

  if (
    user &&
    (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/empresa/equipo') ||
      pathname.startsWith('/empresa/configuracion') ||
      pathname.startsWith('/empresa/cotizador') ||
      pathname.startsWith('/empresa/dpp') ||
      esRutaCalculo
    )
  ) {
    const { data: perfil } = await supabase
      .from('profiles')
      .select('rol, empresa_id')
      .eq('user_id', user.id)
      .single()

    const rol = (perfil?.rol ?? 'usuario_libre') as Rol
    const empresaId = perfil?.empresa_id ?? null

    if (pathname.startsWith('/admin') && rol !== 'super_admin') {
      return NextResponse.redirect(new URL(REDIRECT_BY_ROL[rol], request.url))
    }

    if (
      (pathname.startsWith('/empresa/equipo') || pathname.startsWith('/empresa/configuracion')) &&
      rol !== 'empresa_admin'
    ) {
      return NextResponse.redirect(new URL(REDIRECT_BY_ROL[rol], request.url))
    }

    // Control de acceso al Cotizador CRM
    if (pathname.startsWith('/empresa/cotizador')) {
      const tiene = await verificarAccesoModulo(supabase, user.id, empresaId, rol, 'cotizador_crm')
      if (!tiene) {
        const url = new URL('/empresa', request.url)
        url.searchParams.set('modulo_bloqueado', 'cotizador')
        return NextResponse.redirect(url)
      }
    }

    // Control de acceso al Pasaporte Digital (DPP)
    if (pathname.startsWith('/empresa/dpp')) {
      const tiene = await verificarAccesoModulo(supabase, user.id, empresaId, rol, 'dpp')
      if (!tiene) {
        const url = new URL('/empresa', request.url)
        url.searchParams.set('modulo_bloqueado', 'dpp')
        return NextResponse.redirect(url)
      }
    }

    // Control de acceso al Cálculo de huella — usuario_libre exento (no
    // pertenece a ninguna empresa, este sistema de módulos no le aplica).
    if (esRutaCalculo) {
      const tiene = await verificarAccesoModulo(supabase, user.id, empresaId, rol, 'calculo_ambiental', { exentoUsuarioLibre: true })
      if (!tiene) {
        const destino = pathname.startsWith('/dashboard') ? '/dashboard' : '/empresa'
        const url = new URL(destino, request.url)
        url.searchParams.set('modulo_bloqueado', 'calculo')
        return NextResponse.redirect(url)
      }
    }
  }

  // También: propuesta pública no requiere sesión
  if (pathname.startsWith('/cot/')) {
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-icono.svg|logo-completo.svg|diseno/|api/).*)',
  ],
}
