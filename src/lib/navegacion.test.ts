import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { menuPorRol, configMovil, URL_CHAT_BASE, URL_CHAT_EMPRESA, type Entrada } from './navegacion'
import type { Rol } from '@/types'

const ROLES: Rol[] = ['super_admin', 'empresa_admin', 'empleado', 'usuario_libre']
const RAIZ_APP = path.join(process.cwd(), 'src', 'app')

// Rutas de página sin grupos "(x)", sin API y sin parámetros dinámicos.
function rutasEstaticas(): string[] {
  const rutas: string[] = []
  const recorrer = (dir: string) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name)
      if (entrada.isDirectory()) {
        recorrer(ruta)
        continue
      }
      if (entrada.name !== 'page.tsx') continue
      const segmentos = path
        .relative(RAIZ_APP, path.dirname(ruta))
        .split(path.sep)
        .filter((seg) => seg && !(seg.startsWith('(') && seg.endsWith(')')))
      if (segmentos[0] === 'api' || segmentos.some((seg) => seg.startsWith('['))) continue
      rutas.push('/' + segmentos.join('/'))
    }
  }
  recorrer(RAIZ_APP)
  return rutas
}

// Páginas públicas (sin sesión): no pasan por el menú.
const PUBLICAS = ['/', '/faq', '/legal', '/status', '/eventos', '/ppt', '/sistema-diseno', '/verificar', '/cot', '/pasaporte', '/invitacion', '/login', '/registro', '/recuperar', '/confirmar-email', '/auth']
const esPublica = (ruta: string) => PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + '/'))

function rutasDeMenu(entradas: Entrada[]): string[] {
  return entradas.flatMap((e) => (e.href ? [e.href] : (e.subItems ?? []).map((s) => s.href)))
}

const sinQuery = (href: string) => href.split('?')[0]

describe('menú: estructura por rol', () => {
  it('muestra Resumen, Cotizador, DPP, Informes y Sistema para todos los roles', () => {
    for (const rol of ROLES) {
      const etiquetas = menuPorRol(rol).map((e) => e.label)
      expect(etiquetas.slice(0, 5)).toEqual(['Resumen', 'DPP', 'Cotizador', 'Informes', 'Sistema'])
    }
  })

  it('Chat: el super admin siempre lo ve; la empresa solo con cuenta activa; el empleado nunca', () => {
    const chatDe = (rol: Rol, chatUrl?: string | null) => menuPorRol(rol, chatUrl).find((e) => e.label === 'Chat')

    const admin = chatDe('super_admin')
    expect(admin?.href).toBe(URL_CHAT_BASE)
    expect(admin?.externa).toBe(true)
    expect(menuPorRol('super_admin').at(-1)?.label).toBe('Chat')

    expect(chatDe('empresa_admin')).toBeUndefined()
    const deEmpresa = menuPorRol('empresa_admin', URL_CHAT_EMPRESA)
    expect(deEmpresa.at(-1)?.label).toBe('Chat')
    expect(deEmpresa.at(-1)?.href).toBe(URL_CHAT_EMPRESA)
    expect(deEmpresa.at(-1)?.externa).toBe(true)

    expect(chatDe('empleado', URL_CHAT_EMPRESA)).toBeUndefined()
    expect(chatDe('usuario_libre', URL_CHAT_EMPRESA)).toBeUndefined()
  })

  it('no repite un mismo enlace dentro del menú de un rol', () => {
    for (const rol of ROLES) {
      // Con el parámetro: el usuario libre tiene Cotizador y DPP hacia /dashboard con avisos distintos.
      const hrefs = rutasDeMenu(menuPorRol(rol))
      expect(new Set(hrefs).size, `repetidos en ${rol}`).toBe(hrefs.length)
    }
  })

  it('no usa punto y coma ni guion largo en ningún texto visible', () => {
    for (const rol of ROLES) {
      for (const e of menuPorRol(rol)) {
        const textos = [e.label, ...(e.subItems ?? []).flatMap((s) => [s.label, s.grupo ?? ''])]
        for (const t of textos) {
          expect(t, `texto de ${rol}`).not.toMatch(/[;—]/)
        }
      }
    }
  })
})

describe('menú: cada rol solo ve lo que puede abrir', () => {
  it('el admin llega a todas las páginas autenticadas estáticas', () => {
    const alcanzables = new Set(rutasDeMenu(menuPorRol('super_admin')).map(sinQuery))
    const faltan = rutasEstaticas().filter(
      (r) => !esPublica(r) && !r.startsWith('/dashboard') && !alcanzables.has(r)
    )
    // /dashboard/* queda fuera a propósito: el layout de dashboard manda al admin a /admin.
    expect(faltan).toEqual([])
  })

  it('el empleado solo ve dashboard, Cotizador, Clientes, DPP, Ajustes y Ayuda', () => {
    const permitidas = (h: string) =>
      h.startsWith('/dashboard') || h.startsWith('/empresa/cotizador') || h.startsWith('/empresa/clientes') ||
      h.startsWith('/empresa/dpp') || h === '/settings' || h === '/ayuda'
    for (const h of rutasDeMenu(menuPorRol('empleado')).map(sinQuery)) {
      expect(permitidas(h), `${h} no es de empleado`).toBe(true)
    }
  })

  it('el usuario libre solo ve dashboard, Planes, Ajustes, Soporte y Ayuda', () => {
    const permitidas = (h: string) => h.startsWith('/dashboard') || h === '/empresa/nueva' || h === '/settings' || h === '/ayuda'
    for (const h of rutasDeMenu(menuPorRol('usuario_libre')).map(sinQuery)) {
      expect(permitidas(h), `${h} no es de usuario libre`).toBe(true)
    }
  })

  it('la empresa no llega a rutas del admin', () => {
    for (const h of rutasDeMenu(menuPorRol('empresa_admin')).map(sinQuery)) {
      expect(h.startsWith('/admin'), `${h} es del admin`).toBe(false)
    }
  })
})

describe('menú del celular', () => {
  it('la barra tiene como máximo 5 accesos y ninguno es externo', () => {
    for (const rol of ROLES) {
      const { rapidos } = configMovil(rol)
      expect(rapidos.length).toBeLessThanOrEqual(5)
      expect(rapidos.map((r) => r.label)).toEqual(['Resumen', 'DPP', 'Cotizador', 'Informes', 'Sistema'])
    }
  })

  it('el cajón conserva todo lo del escritorio: ninguna página se pierde en el celular', () => {
    for (const rol of ROLES) {
      const enCajon = new Set(configMovil(rol).cajon.map((c) => sinQuery(c.href)))
      for (const h of rutasDeMenu(menuPorRol(rol)).map(sinQuery)) {
        expect(enCajon.has(h), `${h} falta en el celular (${rol})`).toBe(true)
      }
    }
  })
})
