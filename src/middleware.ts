import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import type { Rol } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Verificación de módulo cotizador_crm ─────────────────────────────────────
// Consulta directa para no importar server-only code en el middleware edge runtime

async function verificarAccesoCotizador(
  supabase: SupabaseClient,
  userId: string,
  empresaId: string | null,
  rol: string
): Promise<boolean> {
  if (rol === 'super_admin') return true
  if (!empresaId) return false

  // Buscar id del módulo
  const { data: modulo } = await supabase
    .from('modulos')
    .select('id')
    .eq('clave', 'cotizador_crm')
    .eq('activo', true)
    .single()
  if (!modulo) return false

  // Verificar empresa
  const { data: me } = await supabase
    .from('modulos_empresas')
    .select('activo')
    .eq('modulo_id', modulo.id)
    .eq('empresa_id', empresaId)
    .single()
  if (!me || !me.activo) return false

  // Verificar usuario (si existe restricción explícita)
  const { data: mu } = await supabase
    .from('modulos_usuarios')
    .select('activo')
    .eq('user_id', userId)
    .eq('modulo_id', modulo.id)
    .eq('empresa_id', empresaId)
    .single()
  if (!mu) return true   // sin restricción → hereda acceso empresa
  return mu.activo === true
}

const PUBLIC_ROUTES = ['/', '/login', '/registro', '/confirmar-email', '/recuperar']
const REDIRECT_BY_ROL: Record<Rol, string> = {
  super_admin: '/admin',
  empresa_admin: '/empresa',
  empleado: '/dashboard',
  usuario_libre: '/dashboard',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas sin sesión requerida o protegidas que no deben redirigir a sesión
  if (
    pathname.startsWith('/verificar') ||
    pathname.startsWith('/invitacion/') ||
    pathname.startsWith('/propuesta/') ||
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

  if (
    user &&
    (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/empresa/equipo') ||
      pathname.startsWith('/empresa/configuracion') ||
      pathname.startsWith('/empresa/cotizador')
    )
  ) {
    const { data: perfil } = await supabase
      .from('profiles')
      .select('rol, empresa_id')
      .eq('user_id', user.id)
      .single()

    const rol = (perfil?.rol ?? 'usuario_libre') as Rol

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
      const empresaId = perfil?.empresa_id ?? null
      const tiene = await verificarAccesoCotizador(supabase, user.id, empresaId, rol)
      if (!tiene) {
        const url = new URL('/empresa', request.url)
        url.searchParams.set('modulo_bloqueado', 'cotizador')
        return NextResponse.redirect(url)
      }
    }
  }

  // También: propuesta pública no requiere sesión
  if (pathname.startsWith('/propuesta/')) {
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-icono.svg|logo-completo.svg|diseno/|api/).*)',
  ],
}
