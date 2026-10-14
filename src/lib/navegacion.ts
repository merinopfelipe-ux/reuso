// Menú de navegación: fuente única para el sidebar de escritorio y el menú del
// celular. Antes cada uno tenía su propia lista y se desfasaban. Cambiar una
// entrada aquí la cambia en los dos.
//
// Estructura fija para todos los roles: Resumen · Cotizador · DPP · Informes · Sistema.
// Chat solo lo ve el super admin: hoy no se ofrece a las empresas. Cuando se
// elijan empresas y se les cree su chat, se les mostrará a esas empresas.
//
// Si un módulo no está en el plan, la entrada sigue visible: lleva al aviso
// "no está en tu plan" (ver modulo-bloqueado-banner.tsx), que pide pasar de plan.

import type { ElementType } from 'react'
import {
  ChatCircle,
  ClipboardList,
  Home as Inicio,
  IdCard as IdentificationCard,
  LayoutGrid,
  PottedPlant,
  Settings as Gear,
} from '@/components/ui/icons'
import type { Rol } from '@/types'

export const URL_CHAT = 'https://chat.calculadoradereuso.com'

export interface SubItem {
  href: string
  label: string
  // Encabezado del grupo dentro del submenú. Un ítem sin grupo hereda el último visto.
  grupo?: string
}

export interface Entrada {
  label: string
  icon: ElementType
  // Enlace directo, sin submenú.
  href?: string
  // Se abre en una pestaña nueva (Chat).
  externa?: boolean
  subItems?: SubItem[]
}

export interface ItemRapido {
  href: string
  label: string
  icon: ElementType
  // Todas las rutas que cuentan como "activa" para esta entrada.
  hrefs: string[]
}

export interface ItemCajon {
  href: string
  label: string
  grupo: string
  externa?: boolean
}

const CHAT: Entrada = { label: 'Chat', icon: ChatCircle, href: URL_CHAT, externa: true }

const COTIZADOR: Entrada = {
  label: 'Cotizador',
  icon: ClipboardList,
  subItems: [
    { href: '/empresa/cotizador', label: 'Cotizaciones', grupo: 'Cotizador' },
    { href: '/empresa/cotizador/nueva', label: 'Nueva cotización' },
    { href: '/empresa/clientes', label: 'Clientes' },
  ],
}

const DPP: Entrada = {
  label: 'DPP',
  icon: IdentificationCard,
  subItems: [
    { href: '/empresa/dpp', label: 'Listado', grupo: 'DPP' },
    { href: '/empresa/dpp/nuevo', label: 'Nuevo DPP' },
  ],
}

const RESUMEN_ADMIN: Entrada = { label: 'Resumen', icon: LayoutGrid, href: '/admin' }
const RESUMEN_EMPRESA: Entrada = { label: 'Resumen', icon: Inicio, href: '/empresa' }
const RESUMEN_PERSONAL: Entrada = { label: 'Resumen', icon: Inicio, href: '/dashboard' }

const INFORMES_ADMIN: Entrada = {
  label: 'Informes',
  icon: PottedPlant,
  subItems: [
    { href: '/empresa/calculos', label: 'Cálculos', grupo: 'Ambiental' },
    { href: '/empresa/objetos', label: 'Objetos reutilizados' },
    { href: '/empresa/metas', label: 'Metas' },
    { href: '/empresa/informes', label: 'Informes' },
    { href: '/empresa/reportes', label: 'Reportes' },
    { href: '/admin/calculos', label: 'Cálculos de la plataforma', grupo: 'Plataforma' },
    { href: '/admin/reportes', label: 'Reportes de la plataforma' },
  ],
}

const INFORMES_EMPRESA: Entrada = {
  label: 'Informes',
  icon: PottedPlant,
  subItems: [
    { href: '/empresa/calculos', label: 'Cálculos', grupo: 'Ambiental' },
    { href: '/empresa/objetos', label: 'Objetos reutilizados' },
    { href: '/empresa/metas', label: 'Metas' },
    { href: '/empresa/informes', label: 'Informes' },
    { href: '/empresa/reportes', label: 'Reportes' },
  ],
}

const INFORMES_PERSONAL: Entrada = {
  label: 'Informes',
  icon: PottedPlant,
  subItems: [
    { href: '/dashboard/objetos', label: 'Calcular', grupo: 'Ambiental' },
    { href: '/dashboard/historial', label: 'Historial' },
    { href: '/dashboard/informes', label: 'Informes' },
  ],
}

const SISTEMA_ADMIN: Entrada = {
  label: 'Sistema',
  icon: Gear,
  subItems: [
    { href: '/admin/empresas', label: 'Empresas', grupo: 'Empresas' },
    { href: '/admin/leads', label: 'Leads' },
    { href: '/empresa/nueva', label: 'Nueva empresa' },
    { href: '/empresa', label: 'Panel de empresa' },
    { href: '/empresa/equipo', label: 'Equipo' },
    { href: '/empresa/configuracion', label: 'Configuración de empresa' },
    { href: '/empresa/configuracion/marca', label: 'Marca' },
    { href: '/empresa/configuracion/modulos', label: 'Módulos de empresa' },
    { href: '/admin/categorias', label: 'Categorías', grupo: 'Catálogo' },
    { href: '/admin/catalogo-pendientes', label: 'Catálogo pendientes' },
    { href: '/admin/catalogo-restringido', label: 'Catálogo restringido' },
    { href: '/admin/modulos', label: 'Módulos' },
    { href: '/admin/planes', label: 'Planes' },
    { href: '/admin/usuarios', label: 'Usuarios', grupo: 'Monitoreo' },
    { href: '/admin/logs', label: 'Auditoría' },
    { href: '/admin/alertas', label: 'Alertas' },
    { href: '/admin/qa', label: 'QA' },
    { href: '/admin/status', label: 'Estado' },
    { href: '/admin/configuracion', label: 'Configuración', grupo: 'Contenido' },
    { href: '/admin/contenido', label: 'Contenido' },
    { href: '/admin/plantillas', label: 'Plantillas' },
    { href: '/admin/legal', label: 'Documentos' },
    { href: '/admin/firmas', label: 'Firmas' },
    { href: '/admin/firmas/nueva', label: 'Nueva firma' },
    { href: '/admin/tickets', label: 'Tickets', grupo: 'Soporte' },
    { href: '/empresa/soporte', label: 'Soporte de empresa' },
    { href: '/settings', label: 'Ajustes', grupo: 'Cuenta' },
    { href: '/ayuda', label: 'Ayuda' },
  ],
}

const SISTEMA_EMPRESA: Entrada = {
  label: 'Sistema',
  icon: Gear,
  subItems: [
    { href: '/empresa/equipo', label: 'Equipo', grupo: 'Empresa' },
    { href: '/empresa/configuracion', label: 'Configuración' },
    { href: '/empresa/configuracion/marca', label: 'Marca' },
    { href: '/empresa/configuracion/modulos', label: 'Módulos' },
    { href: '/empresa/soporte', label: 'Soporte', grupo: 'Cuenta' },
    { href: '/settings', label: 'Ajustes' },
    { href: '/ayuda', label: 'Ayuda' },
  ],
}

const SISTEMA_EMPLEADO: Entrada = {
  label: 'Sistema',
  icon: Gear,
  subItems: [
    { href: '/dashboard/empresa', label: 'Mi empresa', grupo: 'Empresa' },
    { href: '/settings', label: 'Ajustes', grupo: 'Cuenta' },
    { href: '/dashboard/soporte', label: 'Soporte' },
    { href: '/ayuda', label: 'Ayuda' },
  ],
}

const SISTEMA_LIBRE: Entrada = {
  label: 'Sistema',
  icon: Gear,
  subItems: [
    { href: '/empresa/nueva', label: 'Planes', grupo: 'Cuenta' },
    { href: '/settings', label: 'Ajustes' },
    { href: '/dashboard/soporte', label: 'Soporte' },
    { href: '/ayuda', label: 'Ayuda' },
  ],
}

// Sin plan para el módulo: la entrada sigue visible y lleva al aviso de plan.
const COTIZADOR_BLOQUEADO: Entrada = { label: 'Cotizador', icon: ClipboardList, href: '/dashboard?modulo_bloqueado=cotizador' }
const DPP_BLOQUEADO: Entrada = { label: 'DPP', icon: IdentificationCard, href: '/dashboard?modulo_bloqueado=dpp' }

export function menuPorRol(rol: Rol): Entrada[] {
  switch (rol) {
    case 'super_admin':
      return [RESUMEN_ADMIN, COTIZADOR, DPP, INFORMES_ADMIN, SISTEMA_ADMIN, CHAT]
    case 'empresa_admin':
      return [RESUMEN_EMPRESA, COTIZADOR, DPP, INFORMES_EMPRESA, SISTEMA_EMPRESA]
    case 'empleado':
      return [RESUMEN_PERSONAL, COTIZADOR, DPP, INFORMES_PERSONAL, SISTEMA_EMPLEADO]
    default:
      return [RESUMEN_PERSONAL, COTIZADOR_BLOQUEADO, DPP_BLOQUEADO, INFORMES_PERSONAL, SISTEMA_LIBRE]
  }
}

// Vista del celular: 5 accesos rápidos en la barra y el resto en el cajón.
export function configMovil(rol: Rol): { rapidos: ItemRapido[]; cajon: ItemCajon[] } {
  const entradas = menuPorRol(rol)

  const rapidos: ItemRapido[] = entradas
    .filter((e) => !e.externa)
    .map((e) => {
      const hrefs = e.href ? [e.href] : (e.subItems ?? []).map((s) => s.href)
      return { href: e.href ?? hrefs[0], label: e.label, icon: e.icon, hrefs }
    })

  const cajon: ItemCajon[] = []
  entradas.forEach((e, i) => {
    if (e.externa && e.href) {
      cajon.push({ href: e.href, label: e.label, grupo: 'Soporte', externa: true })
      return
    }
    if (e.href) {
      cajon.push({ href: e.href, label: e.label, grupo: i === 0 ? 'Principal' : e.label })
      return
    }
    let ultimoGrupo: string | undefined
    for (const s of e.subItems ?? []) {
      if (s.grupo) ultimoGrupo = s.grupo
      cajon.push({ href: s.href, label: s.label, grupo: ultimoGrupo ?? e.label })
    }
  })

  return { rapidos, cajon }
}
