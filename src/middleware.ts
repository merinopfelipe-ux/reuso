import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import type { Rol } from '@/types'

const PUBLIC_ROUTES = ['/', '/login', '/registro', '/confirmar-email', '/recuperar']
const REDIRECT_BY_ROL: Record<Rol, string> = {
  super_admin: '/admin',
  empresa_admin: '/empresa',
  empleado: '/dashboard',
  usuario_libre: '/dashboard',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas sin sesión requerida
  if (
    pathname.startsWith('/verificar') ||
    pathname.startsWith('/invitacion/') ||
    pathname.startsWith('/legal/')
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
      pathname.startsWith('/empresa/configuracion')
    )
  ) {
    const { data: perfil } = await supabase
      .from('profiles')
      .select('rol')
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
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-icono.svg|logo-completo.svg|api/).*)',
  ],
}
