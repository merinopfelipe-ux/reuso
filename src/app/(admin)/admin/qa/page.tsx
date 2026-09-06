'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { LogoSpinner } from '@/components/ui/logo-spinner'
import { CheckCircle, XCircle, Circle, ClipboardList as ClipboardText, Download as DownloadSimple, RotateCcw as ArrowCounterClockwise, Zap as Lightning, Lock, Moon, BarChart2 as ChartBar, Bot as Robot, FileText, Store as Storefront, Building2 as Buildings, Bell, ShieldCheck, Globe, Settings as Gear, BookOpen, Search as MagnifyingGlass, ChevronDown as CaretDown, ChevronUp as CaretUp, Save as FloppyDisk, X, MinusCircle, CircleHelp as Question, Trash, AlertCircle } from '@/components/ui/icons'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Estado = 'pendiente' | 'ok' | 'parcial' | 'no_se_entiende' | 'falla'

// ── Categorías con colores ─────────────────────────────────────────────────────

const CATEGORIAS = [
  { key: 'Autenticación',       icono: Lock,        color: '#59A6E4' },
  { key: 'Cotizador IA',        icono: Robot,        color: '#AD7C43' },
  { key: 'Panel Admin',         icono: Buildings,    color: '#F6BF3E' },
  { key: 'Panel Empresa',       icono: Storefront,   color: '#00827C' },
  { key: 'Dashboard',           icono: ChartBar,     color: '#38B98E' },
  { key: 'DPP / Pasaporte',     icono: ClipboardText,color: '#8AD0B2' },
  { key: 'Páginas Públicas',    icono: Globe,        color: '#F3BBD3' },
  { key: 'Modo Noche',          icono: Moon,         color: '#6C8E24' }, // Pistacho Intenso (legible en modo día derivado de #D6F391)
  { key: 'Rendimiento',         icono: Lightning,    color: '#FF5E4B' },
  { key: 'Seguridad',           icono: ShieldCheck,  color: '#985fa1' }, // Violeta Trazabilidad
  { key: 'Alertas',             icono: Bell,         color: '#FF8A65' }, // Coral
  { key: 'Settings',            icono: Gear,         color: '#849696' },
  { key: 'Ayuda',               icono: BookOpen,     color: '#00C2D1' }, // Cyan
  { key: 'APIs & Validaciones', icono: FileText,     color: '#5C6BC0' }, // Indigo
]

const ESTADO_CFG: Record<Estado, { label: string; color: string; icono: typeof CheckCircle }> = {
  pendiente:      { label: 'Pendiente',      color: 'rgba(128,128,128,0.4)', icono: Circle },
  ok:             { label: 'Aprobada',       color: '#38B98E',               icono: CheckCircle },
  parcial:        { label: 'Cumple parcial', color: '#F59E0B',               icono: MinusCircle },
  no_se_entiende: { label: 'No se entiende', color: '#985fa1',               icono: Question },
  falla:          { label: 'Falla',          color: '#FF5E4B',               icono: XCircle },
}

interface QAIntento {
  id: string
  ts: string
  etiqueta: string
  alcance: 'completo' | string
  tareas: { id: string; estado: Estado; notas: string }[]
}

const LS_KEY_V5 = 'reuso_qa_v5'
const LS_KEY_V4 = 'reuso_qa_v4'
const LS_KEY_V3 = 'reuso_qa_v3'
const LS_KEY = 'reuso_qa_v2'
type RolPrueba = 'super_admin' | 'empresa_admin' | 'empleado' | 'usuario_libre' | 'sin_sesion'

type Journey = 'Admin Operativa' | 'Empleado' | 'Directivo' | 'Cliente Final'

interface Tarea {
  id: string
  categoria: string
  ruta: string
  titulo: string
  descripcion: string
  pasos: string[]
  esperado: string
  estado: Estado
  notas: string
  critica: boolean
  journeys?: Journey[]
  roles: RolPrueba[]
  rolesProbados?: RolPrueba[]
  resultado_dia?: Estado
  resultado_noche?: Estado
}

const ROL_LABELS: Record<RolPrueba, string> = {
  super_admin: 'Superadmin',
  empresa_admin: 'Empresa Admin',
  empleado: 'Empleado',
  usuario_libre: 'Usuario Libre',
  sin_sesion: 'Sin sesión (Público)'
}

function getRolesForTaskId(id: string, categoria: string): RolPrueba[] {
  // Panel Admin
  if (categoria === 'Panel Admin' || id.startsWith('adm-')) return ['super_admin']
  
  // Panel Empresa
  if (categoria === 'Panel Empresa' || id.startsWith('emp-')) {
    if (id === 'emp-05' || id === 'emp-06') return ['empresa_admin', 'empleado']
    return ['empresa_admin']
  }
  
  // Dashboard
  if (categoria === 'Dashboard' || id.startsWith('dash-')) {
    // dash-02: límite del plan Explora. Un empleado nunca tiene ese plan
    // (lo hereda de su empresa) — el camino real y probable es usuario_libre
    // (bug real corregido 2026-09-02, encontrado al construir la versión
    // automatizada equivalente en e2e/10-dashboard.spec.ts).
    if (id === 'dash-02') return ['usuario_libre']
    return ['empleado']
  }
  
  // Cotizador IA
  if (categoria === 'Cotizador IA' || id.startsWith('cot-')) {
    if (id === 'cot-07') return ['empresa_admin', 'sin_sesion']
    return ['empresa_admin']
  }
  
  // DPP / Pasaporte
  if (categoria === 'DPP / Pasaporte' || id.startsWith('dpp-')) {
    if (id === 'dpp-04' || id === 'dpp-07') return ['sin_sesion']
    if (id === 'dpp-06') return ['empresa_admin', 'sin_sesion']
    return ['empresa_admin']
  }
  
  // Páginas Públicas
  if (categoria === 'Páginas Públicas' || id.startsWith('pub-')) {
    if (id === 'pub-01') return ['sin_sesion', 'super_admin']
    if (id === 'pub-07') return ['usuario_libre']
    return ['sin_sesion']
  }
  
  // Modo Noche
  if (categoria === 'Modo Noche' || id.startsWith('dark-')) {
    if (id === 'dark-01') return ['sin_sesion']
    if (id === 'dark-02' || id === 'dark-07') return ['empleado']
    if (id === 'dark-03' || id === 'dark-04' || id === 'dark-05' || id === 'dark-08') return ['empresa_admin']
    if (id === 'dark-06') return ['super_admin']
    return ['empleado']
  }
  
  // Rendimiento
  if (categoria === 'Rendimiento' || id.startsWith('perf-')) {
    if (id === 'perf-01') return ['empleado']
    if (id === 'perf-05') return ['sin_sesion']
    return ['empresa_admin']
  }
  
  // Seguridad
  if (categoria === 'Seguridad' || id.startsWith('seg-')) {
    if (id === 'seg-01' || id === 'seg-03' || id === 'seg-06' || id === 'seg-08' || id === 'seg-09' || id === 'seg-10' || id === 'seg-11' || id === 'seg-12') return ['empleado']
    if (id === 'seg-02' || id === 'seg-05') return ['sin_sesion']
    if (id === 'seg-04') return ['empresa_admin']
    if (id === 'seg-07') return ['super_admin', 'empresa_admin']
    return ['empleado']
  }
  
  // Alertas
  if (categoria === 'Alertas' || id.startsWith('alerta-')) {
    if (id === 'alerta-01') return ['super_admin', 'empleado']
    return ['empleado']
  }
  
  // Settings
  if (categoria === 'Settings' || id.startsWith('set-')) return ['empleado']
  
  // Ayuda
  if (categoria === 'Ayuda' || id.startsWith('ayuda-')) return ['empleado']
  
  // APIs & Validaciones. Los IDs con prefijo emp-/auth- ya se resuelven en
  // bloques anteriores de esta misma función (Panel Empresa arriba,
  // Autenticación justo abajo) — esta condición solo necesita cubrir
  // api-/dpl- de verdad. Antes incluía también emp-/auth- por error: como
  // esos bloques anteriores devuelven primero, esa parte nunca se
  // ejecutaba, y dejaba a 'auth-12' cayendo en el valor por defecto
  // equivocado del bloque de Autenticación (bug real corregido 2026-09-02).
  if (categoria === 'APIs & Validaciones' || id.startsWith('api-') || id.startsWith('dpl-')) {
    if (id === 'api-01' || id === 'api-07') return ['empleado']
    if (id === 'api-02' || id === 'api-04' || id === 'api-06') return ['empresa_admin']
    if (id === 'api-03') return ['super_admin']
    if (id === 'api-05' || id === 'dpl-09') return ['sin_sesion']
  }

  // Autenticación
  if (categoria === 'Autenticación' || id.startsWith('auth-')) {
    if (id === 'auth-01') return ['empresa_admin']
    if (id === 'auth-07') return ['sin_sesion', 'empleado']
    if (id === 'auth-10') return ['usuario_libre']
    // auth-12: concurrencia de sesión multi-pestaña, se prueba con una
    // sesión de empleado activa (bug real corregido 2026-09-02 — esta
    // rama nunca se alcanzaba porque el bloque de APIs de arriba
    // interceptaba 'auth-*' primero y devolvía sin_sesion por defecto).
    if (id === 'auth-12') return ['empleado']
    return ['sin_sesion']
  }
  
  return ['empleado']
}

// ── Definición completa de tareas ─────────────────────────────────────────────

const TAREAS_INICIALES: Omit<Tarea, 'estado' | 'notas' | 'roles'>[] = [


  // ══════════════════════════════════════════════════════════════════
  // AUTENTICACIÓN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'auth-01', categoria: 'Autenticación', ruta: '/login', critica: true,
    titulo: 'Login rápido y sin fricción',
    descripcion: 'Asegura que cuando el usuario ingresa sus credenciales, el sistema responda de inmediato y no lo deje esperando en una pantalla de carga eterna.',
    pasos: [
      'Entra a la pantalla de inicio de sesión.',
      'Pon el correo y contraseña correctos de una cuenta existente y haz clic en "Ingresar".',
      'Observa qué tan rápido pasas de esa pantalla al panel principal.'
    ],
    esperado: 'El ingreso debe sentirse instantáneo (menos de 1 segundo) y llevarte directo al panel sin errores visuales.',
    journeys: ['Admin Operativa', 'Empleado', 'Directivo']
  },
  {
    id: 'auth-02', categoria: 'Autenticación', ruta: '/login', critica: true,
    titulo: 'Manejo seguro de contraseñas incorrectas',
    descripcion: 'Verifica que si el usuario se equivoca de contraseña, el sistema le avise amablemente pero sin revelar a posibles atacantes si ese correo existe o no en nuestra base de datos.',
    pasos: [
      'Intenta ingresar con un correo que sí exista, pero pon una contraseña inventada.',
      'Luego, intenta con un correo que no exista y cualquier contraseña.',
      'Fíjate en el mensaje rojo que aparece abajo.'
    ],
    esperado: 'En ambos casos el sistema debe decir lo mismo: "Verifica tus datos e intenta de nuevo", protegiendo la privacidad de las cuentas.',
    journeys: ['Admin Operativa', 'Empleado', 'Directivo']
  },
  {
    id: 'auth-04', categoria: 'Autenticación', ruta: '/login', critica: false,
    titulo: 'Comodidad: Recordar correo',
    descripcion: 'Asegura que el usuario no tenga que escribir su correo electrónico completo cada vez que vuelve a usar la calculadora en su misma computadora.',
    pasos: [
      'Escribe tu correo, marca la casilla "Recuérdame" y entra al sistema normalmente.',
      'Cierra la pestaña y vuelve a abrir la página de inicio de sesión.'
    ],
    esperado: 'Tu correo debe aparecer ya escrito en la casilla, listo para que solo pongas la contraseña.',
    journeys: ['Admin Operativa', 'Empleado', 'Directivo']
  },
  {
    id: 'auth-05', categoria: 'Autenticación', ruta: '/registro', critica: true,
    titulo: 'Registro fluido de nuevas cuentas',
    descripcion: 'Valida que un nuevo interesado pueda crear su cuenta gratuita sin barreras, aceptando los términos y pasando la validación de seguridad de forma sencilla.',
    pasos: [
      'Abre una ventana en modo incógnito y ve a crear una cuenta nueva.',
      'Llena todos tus datos, inventa una buena contraseña y marca las dos casillas obligatorias de términos y datos.',
      'Asegúrate de que la caja de verificación de seguridad esté en verde y presiona "Crear cuenta".'
    ],
    esperado: 'El sistema debe crearte la cuenta sin arrojar alertas rojas y llevarte a una pantalla que te pide revisar tu correo.',
    journeys: ['Admin Operativa', 'Cliente Final']
  },
  {
    id: 'auth-06', categoria: 'Autenticación', ruta: '/recuperar', critica: false,
    titulo: 'Recuperar el acceso sin estrés',
    descripcion: 'Comprueba que si un usuario olvida su contraseña, pueda pedir un enlace a su correo para entrar y cambiarla rápidamente.',
    pasos: [
      'Entra a "¿Olvidaste tu contraseña?" y pon un correo que sí esté registrado.',
      'Haz clic en enviar y revisa esa bandeja de entrada.'
    ],
    esperado: 'Debe llegarte un correo casi de inmediato con un enlace especial para que puedas cambiar tu contraseña y volver a entrar.',
    journeys: ['Admin Operativa', 'Empleado', 'Directivo']
  },
  {
    id: 'auth-07', categoria: 'Autenticación', ruta: '/invitacion/[token]', critica: true,
    titulo: 'Bienvenida a un nuevo miembro del equipo',
    descripcion: 'Asegura que cuando la líder invita a un empleado nuevo a la empresa, él reciba un enlace fácil de usar para configurar su cuenta y unirse de inmediato.',
    pasos: [
      'Como administrador, ve a tu equipo y envíale una invitación a un correo de prueba.',
      'Abre ese correo, haz clic en el enlace de invitación (en modo incógnito).',
      'Pon una contraseña nueva y finaliza el registro.'
    ],
    esperado: 'El empleado nuevo debe quedar registrado al instante y entrar al sistema listo para trabajar.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'auth-08', categoria: 'Autenticación', ruta: '/middleware', critica: true,
    titulo: 'Privacidad de la información y rutas protegidas',
    descripcion: 'Asegura que ninguna persona sin iniciar sesión pueda entrar a ver los reportes, cotizaciones o datos de tu empresa, ni siquiera escribiendo enlaces directos.',
    pasos: [
      'Cierra tu sesión por completo.',
      'Intenta escribir en la barra de direcciones las rutas privadas, por ejemplo: /dashboard, /empresa o /admin.'
    ],
    esperado: 'El sistema no permite el ingreso a zonas privadas y te redirige de inmediato a la pantalla de inicio de sesión.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'auth-09', categoria: 'Autenticación', ruta: '/login', critica: false,
    titulo: 'Protección contra intentos insistentes de acceso',
    descripcion: 'Evita que personas malintencionadas intenten adivinar contraseñas repetidamente, pausando los intentos tras varios errores seguidos.',
    pasos: [
      'Ve a la pantalla de inicio de sesión.',
      'Escribe credenciales incorrectas 5 veces seguidas de forma rápida.',
      'Observa el mensaje que aparece en el siguiente intento.'
    ],
    esperado: 'El sistema muestra un mensaje claro indicando que se han realizado demasiados intentos y pide esperar un momento para proteger la cuenta.',
    journeys: ['Admin Operativa', 'Empleado', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // PANEL ADMIN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'adm-01', categoria: 'Panel Admin', ruta: '/admin', critica: true,
    titulo: 'Indicadores globales y resumen de impacto',
    descripcion: 'Permite a los líderes supervisar los números más importantes de la plataforma: organizaciones activas, cálculos realizados y volumen de residuos evitados.',
    pasos: [
      'Ingresa al panel principal de administración.',
      'Revisa las tarjetas superiores con las cifras de impacto y actividad.',
      'Comprueba que las gráficas muestren la tendencia de los últimos 30 días.'
    ],
    esperado: 'Los indicadores cargan con cifras reales y actualizadas sin mostrar ceros o espacios vacíos.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-02', categoria: 'Panel Admin', ruta: '/admin/usuarios', critica: true,
    titulo: 'Directorio de personas y asignación de roles',
    descripcion: 'Facilita buscar a cualquier integrante registrado, filtrar por su rol y actualizar sus datos o permisos de forma sencilla.',
    pasos: [
      'Entra a la sección de usuarios del panel.',
      'Escribe el nombre o correo de una persona en el buscador.',
      'Filtra por tipo de rol y abre el panel de edición para actualizar su nombre o rol.'
    ],
    esperado: 'La lista se actualiza al instante con la búsqueda y los cambios guardados se reflejan inmediatamente.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-03', categoria: 'Panel Admin', ruta: '/admin/empresas', critica: true,
    titulo: 'Directorio de empresas aliadas y sus detalles',
    descripcion: 'Permite revisar la lista completa de empresas registradas, su plan actual y los miembros que forman parte de cada una.',
    pasos: [
      'Ve al listado de empresas en el panel de control.',
      'Haz clic sobre una de las empresas para desplegar su ficha completa.',
      'Revisa sus datos de contacto, plan contratado y colaboradores asociados.'
    ],
    esperado: 'La ficha de la empresa muestra su información de forma ordenada y clara.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-04', categoria: 'Panel Admin', ruta: '/admin/empresas/[id]', critica: false,
    titulo: 'Habilitar o pausar herramientas por empresa',
    descripcion: 'Permite activar o desactivar módulos como el cotizador inteligente o el pasaporte digital para una empresa en particular.',
    pasos: [
      'Abre la ficha de una empresa en administración.',
      'En la lista de herramientas, activa o apaga un módulo (por ejemplo, el Cotizador).',
      'Inicia sesión con un usuario de esa empresa para verificar el menú.'
    ],
    esperado: 'El colaborador de la empresa ve o deja de ver la herramienta en su menú según lo configurado.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-05', categoria: 'Panel Admin', ruta: '/admin/categorias', critica: true,
    titulo: 'Catálogo de materiales y categorías de reuso',
    descripcion: 'Permite dar de alta nuevos tipos de residuos o materiales reciclables y ajustar factores de impacto ambiental.',
    pasos: [
      'Ingresa a la sección de categorías de materiales.',
      'Crea una nueva categoría asignándole nombre, icono y factor de cálculo.',
      'Edita una categoría existente o desactiva temporalmente la que no esté en uso.'
    ],
    esperado: 'Las categorías se guardan de inmediato y quedan listas para que los colaboradores las elijan en sus cálculos.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'adm-06', categoria: 'Panel Admin', ruta: '/admin/calculos', critica: false,
    titulo: 'Historial general de cálculos realizados',
    descripcion: 'Supervisa todas las mediciones ambientales registradas en el sistema con opciones de filtrado por empresa o fecha.',
    pasos: [
      'Dirígete al historial general de cálculos.',
      'Filtra por una empresa o periodo de fechas específico.',
      'Revisa el desglose de emisiones evitadas y materiales reutilizados.'
    ],
    esperado: 'La tabla presenta los cálculos filtrados con claridad y permite consultar el detalle de cada medición.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-08', categoria: 'Panel Admin', ruta: '/admin/tickets', critica: true,
    titulo: 'Atención y respuesta a solicitudes de ayuda',
    descripcion: 'Permite a los administradores revisar preguntas o problemas reportados por los usuarios y responderles con amabilidad.',
    pasos: [
      'Abre la bandeja de solicitudes de soporte.',
      'Selecciona un ticket pendiente y escribe una respuesta de ayuda.',
      'Marca el estado del ticket como resuelto.'
    ],
    esperado: 'El usuario recibe la respuesta en su panel y el ticket queda archivado como atendido.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'adm-09', categoria: 'Panel Admin', ruta: '/admin/leads', critica: false,
    titulo: 'Contactos interesados y nuevas oportunidades',
    descripcion: 'Organiza la información de personas u organizaciones interesadas que dejaron sus datos en la página de inicio.',
    pasos: [
      'Ve a la lista de contactos comerciales.',
      'Revisa los mensajes recibidos y filtra por fecha de recepción.',
      'Exporta la lista a una hoja de cálculo si necesitas compartirla con el equipo comercial.'
    ],
    esperado: 'Los contactos se visualizan con nombre, empresa y mensaje, y la descarga se genera sin fallos.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-10', categoria: 'Panel Admin', ruta: '/admin/alertas', critica: false,
    titulo: 'Avisos importantes y comunicados para el equipo',
    descripcion: 'Permite publicar avisos destacados o alertas de mantenimiento para que aparezcan en los paneles de los usuarios.',
    pasos: [
      'Crea una nueva alerta indicando título, mensaje y nivel de importancia.',
      'Publica la alerta y verifica cómo se visualiza en la parte superior de los paneles.',
      'Marca la alerta como finalizada cuando ya no sea necesaria.'
    ],
    esperado: 'El banner de aviso se muestra de forma visible y desaparece cuando el usuario lo cierra o se desactiva.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-11', categoria: 'Panel Admin', ruta: '/admin/modulos', critica: false,
    titulo: 'Control general de disponibilidad de herramientas',
    descripcion: 'Supervisa qué herramientas están habilitadas a nivel global en la plataforma y cuáles están en fase de prueba.',
    pasos: [
      'Ingresa a la gestión de módulos globales.',
      'Revisa el estado de cada herramienta (activa, mantenimiento o próxima).',
      'Guarda los cambios de disponibilidad.'
    ],
    esperado: 'Los cambios aplican de forma ordenada en toda la plataforma según la política establecida.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-12', categoria: 'Panel Admin', ruta: '/admin/logs', critica: false,
    titulo: 'Registro transparente de cambios importantes',
    descripcion: 'Mantiene una bitácora clara de quién realizó acciones sensibles, como cambios de planes, eliminación de registros o ajustes de permisos.',
    pasos: [
      'Abre la bitácora de auditoría.',
      'Filtra por persona o por tipo de acción realizada.',
      'Revisa la fecha, hora y detalle de la modificación.'
    ],
    esperado: 'El registro muestra la cronología de eventos con transparencia para respaldo del equipo.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-13', categoria: 'Panel Admin', ruta: '/admin/reportes', critica: false,
    titulo: 'Resumen ejecutivo de huella y sostenibilidad',
    descripcion: 'Ofrece un balance consolidado del impacto positivo acumulado por todas las organizaciones vinculadas a Reúso.',
    pasos: [
      'Ve a la sección de reportes de impacto.',
      'Selecciona el periodo anual o mensual a consultar.',
      'Revisa el total de kilogramos de residuos valorizados y el CO2 equivalente mitigado.'
    ],
    esperado: 'Las cifras se calculan con consistencia y permiten una lectura ejecutiva clara.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-14', categoria: 'Panel Admin', ruta: '/admin/configuracion', critica: false,
    titulo: 'Ajustes generales y comunicación institucional',
    descripcion: 'Centraliza los parámetros operativos del sistema y te guía hacia las plantillas de comunicación oficial.',
    pasos: [
      'Navega a la configuración general.',
      'Comprueba que el acceso te lleve a las plantillas y mensajes institucionales.'
    ],
    esperado: 'La navegación es fluida y permite personalizar la comunicación corporativa.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-15', categoria: 'Panel Admin', ruta: '/admin/plantillas', critica: false,
    titulo: 'Mensajes y correos amigables del sistema',
    descripcion: 'Permite redactar y previsualizar los correos automáticos (bienvenidas, confirmaciones, invitaciones) con tono cálido y profesional.',
    pasos: [
      'Entra a la vista de plantillas de correo.',
      'Selecciona una plantilla (por ejemplo, bienvenida a nuevo usuario).',
      'Edita el texto del mensaje y observa la vista previa de cómo lo recibirá el destinatario.'
    ],
    esperado: 'La vista previa muestra el diseño final del correo y los cambios se guardan correctamente.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-16', categoria: 'Panel Admin', ruta: '/admin/logs', critica: false,
    titulo: 'Navegación ágil en listas con muchos registros',
    descripcion: 'Asegura que al consultar listas extensas de personas o empresas, las páginas pasen suavemente sin lentitud.',
    pasos: [
      'Ve a una lista extensa de registros en administración.',
      'Cambia de página o haz scroll para cargar más elementos.',
      'Comprueba la rapidez con la que se muestran los siguientes datos.'
    ],
    esperado: 'La carga es casi imperceptible y la pantalla permanece estable sin parpadeos.',
    journeys: ['Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // PANEL EMPRESA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'emp-01', categoria: 'Panel Empresa', ruta: '/empresa', critica: true,
    titulo: 'Tablero de impacto y metas de la empresa',
    descripcion: 'Muestra el panorama general del esfuerzo de sostenibilidad de la empresa: total de emisiones evitadas, avance hacia metas y actividad reciente del equipo.',
    pasos: [
      'Ingresa al panel de la empresa.',
      'Revisa las tarjetas superiores con los indicadores consolidados de huella y reuso.',
      'Examina la gráfica de avance mensual para ver la tendencia de tu equipo.'
    ],
    esperado: 'Los números y gráficas cargan con claridad, transmitiendo el valor del aporte ambiental de la empresa.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'emp-02', categoria: 'Panel Empresa', ruta: '/empresa/calculos', critica: false,
    titulo: 'Historial de reutilización de toda la organización',
    descripcion: 'Centraliza todos los cálculos y valorizaciones realizados por los colaboradores de la empresa, permitiendo buscar y auditar cada registro.',
    pasos: [
      'Ve a la sección de cálculos del panel de empresa.',
      'Usa el buscador para localizar un ítem o material específico.',
      'Filtra por colaborador o fecha para analizar los resultados.'
    ],
    esperado: 'La lista responde rápidamente a los filtros y muestra el detalle de cada cálculo con sus ahorros ambientales.',
    journeys: ['Admin Operativa', 'Empleado', 'Directivo']
  },
  {
    id: 'emp-03', categoria: 'Panel Empresa', ruta: '/empresa/informes', critica: true,
    titulo: 'Informe oficial de sostenibilidad por periodo',
    descripcion: 'Genera un informe con rigor metodológico y listo para presentar a la junta directiva o clientes, filtrado por las fechas que elijas.',
    pasos: [
      'Entra a la sección de informes ambientales.',
      'Elige el rango de fechas (por ejemplo, último trimestre).',
      'Haz clic en generar informe y previsualiza los resultados.'
    ],
    esperado: 'El informe resume los kilogramos de residuos valorizados y CO2 evitado de forma clara y profesional.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'emp-04', categoria: 'Panel Empresa', ruta: '/empresa/reportes', critica: false,
    titulo: 'Descarga del reporte de impacto en formato PDF',
    descripcion: 'Permite descargar el balance de impacto ambiental en un documento PDF de alta calidad estética con el sello de la empresa.',
    pasos: [
      'Genera un informe por fechas.',
      'Presiona el botón de descarga en PDF.',
      'Abre el archivo descargado para comprobar su presentación.'
    ],
    esperado: 'El documento PDF se descarga en pocos segundos y presenta gráficos legibles y logotipo nítido.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'emp-05', categoria: 'Panel Empresa', ruta: '/empresa/equipo', critica: true,
    titulo: 'Directorio del equipo de trabajo y colaboración',
    descripcion: 'Facilita a la administradora ver a todos los colaboradores de la empresa, invitar nuevos compañeros o pausar accesos cuando alguien cambia de rol.',
    pasos: [
      'Abre la sección de equipo en la empresa.',
      'Revisa la lista de compañeros activos y sus correos.',
      'Si un colaborador ya no forma parte del equipo, puedes desactivar su acceso de forma respetuosa y segura.'
    ],
    esperado: 'La lista de personas se mantiene actualizada y los permisos se reflejan al instante.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'emp-06', categoria: 'Panel Empresa', ruta: '/empresa/metas', critica: false,
    titulo: 'Definición y seguimiento de metas ecológicas',
    descripcion: 'Permite al equipo fijar objetivos motivadores de reducción de residuos (ej. evitar 5 toneladas de CO2 este semestre) y ver la barra de progreso.',
    pasos: [
      'Dirígete a la sección de metas ambientales.',
      'Crea una nueva meta con fecha de inicio, fin y objetivo numérico.',
      'Observa cómo el porcentaje de avance se actualiza a medida que el equipo registra cálculos.'
    ],
    esperado: 'La barra de progreso avanza con cada acción y motiva al equipo a alcanzar el objetivo común.',
    journeys: ['Admin Operativa', 'Directivo', 'Empleado']
  },
  {
    id: 'emp-07', categoria: 'Panel Empresa', ruta: '/empresa/objetos', critica: false,
    titulo: 'Inventario de activos y muebles en circulación',
    descripcion: 'Permite consultar el catálogo de muebles, materias primas o productos que la empresa ha medido o tiene en proceso de recuperación.',
    pasos: [
      'Entra a la vista de objetos registrados.',
      'Revisa la lista con fotos y categorías de cada ítem.',
      'Haz clic en un objeto para ver su historia de cálculo y estado actual.'
    ],
    esperado: 'El inventario muestra los activos de forma visual y atractiva, facilitando su consulta diaria.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'emp-08', categoria: 'Panel Empresa', ruta: '/empresa/soporte', critica: false,
    titulo: 'Canal directo de atención y resolución de dudas',
    descripcion: 'Permite a la administradora o al equipo enviar consultas técnicas o comerciales al soporte de Reúso y seguir su evolución.',
    pasos: [
      'Abre la sección de soporte de la empresa.',
      'Redacta un mensaje detallando tu consulta o sugerencia.',
      'Envía la solicitud y revisa el número de seguimiento asignado.'
    ],
    esperado: 'El mensaje se envía con éxito y el equipo recibe confirmación de que pronto recibirá respuesta.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'emp-09', categoria: 'Panel Empresa', ruta: '/empresa/configuracion', critica: false,
    titulo: 'Datos generales y fiscales de la empresa',
    descripcion: 'Mantiene actualizados los datos clave de la organización: razón social, número de identificación tributaria, dirección y sector económico.',
    pasos: [
      'Ve a la configuración de la empresa.',
      'Actualiza el teléfono de contacto, dirección o persona responsable.',
      'Guarda los cambios y verifica que queden registrados.'
    ],
    esperado: 'Los datos de la empresa se guardan de forma duradera y se reflejan en los reportes emitidos.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'emp-10', categoria: 'Panel Empresa', ruta: '/empresa/configuracion/modulos', critica: false,
    titulo: 'Herramientas disponibles para tu empresa',
    descripcion: 'Muestra con transparencia qué funcionalidades tiene contratadas la empresa (Cotizador IA, Pasaporte Digital, Reportes) y cuáles puede sumar.',
    pasos: [
      'Abre la vista de herramientas de la empresa.',
      'Revisa cuáles módulos están encendidos para tu equipo.',
      'Si te interesa sumar una herramienta nueva, solicita información en un clic.'
    ],
    esperado: 'La vista explica de forma amena el valor de cada herramienta y facilita solicitar activaciones.',
    journeys: ['Admin Operativa', 'Directivo', 'Empleado']
  },
  {
    id: 'emp-11', categoria: 'Panel Empresa', ruta: '/empresa/configuracion/marca', critica: false,
    titulo: 'Personalización de marca: Logotipo y WhatsApp',
    descripcion: 'Permite subir el logotipo corporativo y el número de atención por WhatsApp para que las cotizaciones y pasaportes luzcan profesionales.',
    pasos: [
      'Entra a la personalización de marca.',
      'Sube una imagen con el logotipo de tu empresa.',
      'Configura el número de WhatsApp comercial y guarda los cambios.'
    ],
    esperado: 'El logotipo se previsualiza correctamente y acompañará las propuestas que compartas con tus clientes.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'emp-12', categoria: 'Panel Empresa', ruta: '/empresa/equipo', critica: false,
    titulo: 'Invitación ágil de compañeros al espacio de trabajo',
    descripcion: 'Permite sumar colaboradores de forma sencilla ingresando sus correos electrónicos sin generar duplicados si ya estaban registrados.',
    pasos: [
      'Presiona el botón "Invitar miembro" en el panel de equipo.',
      'Escribe el correo de tu compañero y asígnale su rol.',
      'Envía la invitación y verifica que quede en estado pendiente hasta que la acepte.'
    ],
    esperado: 'Tu compañero recibe un enlace de bienvenida en su correo y puede comenzar a utilizar la plataforma al instante.',
    journeys: ['Admin Operativa', 'Empleado']
  },

  // ══════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'dash-01', categoria: 'Dashboard', ruta: '/dashboard', critica: true,
    titulo: 'Registro ágil de cálculo de reuso',
    descripcion: 'Permite al colaborador registrar en segundos el tipo de residuo, peso y destino para calcular inmediatamente el impacto positivo en CO2 y agua.',
    pasos: [
      'Entra a tu calculadora en el panel principal.',
      'Selecciona el material (madera, metal, plástico, etc.), escribe el peso y elige el tipo de valorización.',
      'Haz clic en "Calcular y guardar".'
    ],
    esperado: 'El cálculo se añade al instante a tu historial visible abajo y los contadores de impacto suben al momento.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'dash-02', categoria: 'Dashboard', ruta: '/dashboard', critica: false,
    titulo: 'Aviso amigable al alcanzar el límite mensual',
    descripcion: 'Si estás en el plan inicial gratuito y llegas a tu límite de cálculos del mes, el sistema te avisa con calidez y te invita a mejorar tu plan.',
    pasos: [
      'Alcanza el número máximo de cálculos permitidos para el periodo en una cuenta básica.',
      'Intenta realizar un nuevo cálculo.',
      'Observa el mensaje que se despliega.'
    ],
    esperado: 'Aparece una ventana amigable felicitándote por tu actividad y ofreciéndote contactar a administración para ampliar el plan.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'dash-03', categoria: 'Dashboard', ruta: '/dashboard/historial', critica: false,
    titulo: 'Consulta y búsqueda en tu historial de cálculos',
    descripcion: 'Facilita al colaborador encontrar mediciones que hizo días o semanas atrás mediante un buscador por palabra o filtro de categoría.',
    pasos: [
      'Abre tu historial de cálculos personales.',
      'Escribe en el buscador el nombre de un material que registraste antes.',
      'Filtra por tipo de material para acotar la lista.'
    ],
    esperado: 'Los resultados se filtran en tiempo real facilitando revisar o reutilizar datos anteriores.',
    journeys: ['Empleado']
  },
  {
    id: 'dash-04', categoria: 'Dashboard', ruta: '/dashboard/informes', critica: false,
    titulo: 'Tus reportes personales de aporte ambiental',
    descripcion: 'Muestra el acumulado de tu esfuerzo personal en sostenibilidad, permitiéndote ver cuánto has contribuido a las metas de la empresa.',
    pasos: [
      'Ve a la sección de tus informes personales.',
      'Revisa el balance gráfico de tus mediciones en el último mes.',
      'Comprueba que puedas consultar el desglose por tipo de residuo.'
    ],
    esperado: 'Tus métricas se muestran de forma clara y motivadora para reconocer tu compromiso ecológico.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'dash-05', categoria: 'Dashboard', ruta: '/dashboard/objetos', critica: false,
    titulo: 'Tus objetos y materiales registrados',
    descripcion: 'Permite al colaborador revisar los muebles, productos o lotes de material que ha dado de alta para darles seguimiento.',
    pasos: [
      'Entra a la vista de tus objetos.',
      'Revisa las tarjetas de cada ítem registrado con sus fotografías y estado.',
      'Haz clic en un objeto para ver su ficha y detalles.'
    ],
    esperado: 'La vista presenta tus objetos organizados y permite acceder a su información sin demoras.',
    journeys: ['Empleado']
  },
  {
    id: 'dash-06', categoria: 'Dashboard', ruta: '/dashboard/soporte', critica: false,
    titulo: 'Pedir ayuda rápida al equipo de soporte',
    descripcion: 'Si tienes una duda sobre cómo clasificar un residuo o experimentas un inconveniente, puedes escribir directamente al equipo de soporte.',
    pasos: [
      'Abre la sección de soporte en tu panel.',
      'Escribe tu pregunta en el formulario y envíala.',
      'Revisa la lista de tus preguntas anteriores para ver si ya fueron respondidas.'
    ],
    esperado: 'El mensaje se envía al instante y puedes consultar el estado de tu consulta en cualquier momento.',
    journeys: ['Empleado']
  },
  {
    id: 'dash-07', categoria: 'Dashboard', ruta: '/dashboard', critica: false,
    titulo: 'Respuesta instantánea al guardar un cálculo',
    descripcion: 'Asegura que al presionar el botón de calcular, el sistema guarde la información de inmediato sin bloquear tu pantalla ni hacerte esperar.',
    pasos: [
      'Llena los datos de un cálculo en tu calculadora.',
      'Haz clic en el botón de guardar.',
      'Observa el tiempo que tarda en confirmarse la operación.'
    ],
    esperado: 'La confirmación aparece casi de inmediato y la pantalla queda limpia y lista para tu siguiente cálculo.',
    journeys: ['Empleado', 'Admin Operativa']
  },

  // ══════════════════════════════════════════════════════════════════
  // COTIZADOR IA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'cot-01', categoria: 'Cotizador IA', ruta: '/empresa/cotizador', critica: true,
    titulo: 'Bandeja de cotizaciones y búsqueda rápida',
    descripcion: 'Organiza todas las propuestas comerciales de restauración de muebles en una vista clara con filtros por estado: borrador, enviada, aprobada o declinada.',
    pasos: [
      'Entra al panel del cotizador inteligente.',
      'Usa los botones superiores para filtrar cotizaciones por su estado.',
      'Escribe el nombre de un cliente en el buscador para encontrar su presupuesto.'
    ],
    esperado: 'La lista responde con agilidad y muestra el estado y monto de cada propuesta con claridad.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'cot-02', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: true,
    titulo: 'Evaluación visual de mueble recuperable',
    descripcion: 'El colaborador sube una fotografía del mueble y la inteligencia artificial reconoce su tipología, materiales y propone el valor estimado de rescate.',
    pasos: [
      'Inicia una nueva cotización.',
      'Sube una fotografía nítida de un mueble de madera o metal.',
      'Presiona "Analizar con IA" y revisa la propuesta generada.'
    ],
    esperado: 'La herramienta sugiere el tipo de mueble, horas de trabajo estimadas e impacto ambiental evitado de forma coherente.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'cot-03', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: true,
    titulo: 'Orientación honesta ante materiales no aptos',
    descripcion: 'Si se sube la foto de un material no restaurable (como aglomerado o plástico deteriorado), el sistema orienta con honestidad en lugar de generar falsas expectativas.',
    pasos: [
      'Sube una foto de un mueble roto de aglomerado de baja calidad.',
      'Solicita el análisis con IA.',
      'Observa las recomendaciones que aparecen.'
    ],
    esperado: 'El sistema explica amablemente por qué el material no es viable para retapizado o restauración y sugiere alternativas responsables de reciclaje.',
    journeys: ['Empleado', 'Cliente Final']
  },
  {
    id: 'cot-04', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: false,
    titulo: 'Guía para subir fotografías de buen tamaño',
    descripcion: 'Orienta al usuario si intenta subir una foto demasiado pesada (mayor a 10 megabytes), sugiriendo comprimirla o tomarla con menor resolución.',
    pasos: [
      'Intenta adjuntar una imagen con un peso superior a 10 megabytes.',
      'Observa el aviso que muestra la pantalla.'
    ],
    esperado: 'Aparece un mensaje comprensible recomendando reducir el tamaño de la foto antes de enviarla.',
    journeys: ['Empleado', 'Cliente Final']
  },
  {
    id: 'cot-05', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: false,
    titulo: 'Ritmo equilibrado en consultas de diagnóstico',
    descripcion: 'Mantiene un flujo ordenado evitando que solicitudes repetidas en pocos segundos saturen la herramienta o generen cobros imprevistos.',
    pasos: [
      'Intenta presionar el botón de diagnóstico muchas veces de forma consecutiva.',
      'Observa la respuesta del sistema.'
    ],
    esperado: 'El sistema procesa la primera solicitud con calma y pide esperar unos segundos antes de lanzar la siguiente.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'cot-06', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: true,
    titulo: 'Flujo completo: foto, valoración y cotización',
    descripcion: 'Permite recorrer el proceso integral desde que se carga la foto del mueble, se ajustan los precios manualmente y se guarda la cotización final para el cliente.',
    pasos: [
      'Sube una imagen y obtén la sugerencia inicial de la IA.',
      'Ajusta los materiales, costo de mano de obra y margen comercial según tu criterio.',
      'Guarda la cotización y revisa la ficha generada.'
    ],
    esperado: 'La cotización queda registrada con todos los costos calculados y lista para compartir.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'cot-07', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/[id]', critica: true,
    titulo: 'Enlace compartible de la propuesta con el cliente',
    descripcion: 'Genera un enlace elegante y seguro para que el cliente final pueda ver la propuesta desde su celular o computadora y decidir si la aprueba.',
    pasos: [
      'Abre una cotización guardada.',
      'Haz clic en "Compartir enlace con cliente".',
      'Abre ese enlace en una pestaña nueva para revisar lo que verá tu cliente.'
    ],
    esperado: 'Se abre una página atractiva con los datos de tu empresa, el desglose amigable del trabajo y botones para aceptar o consultar.',
    journeys: ['Empleado', 'Cliente Final', 'Admin Operativa']
  },
  {
    id: 'cot-08', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/[id]', critica: false,
    titulo: 'Cierre o archivo claro de una cotización',
    descripcion: 'Permite marcar una cotización como aceptada o rechazada por el cliente, pidiendo confirmación para evitar cambios accidentales.',
    pasos: [
      'En la ficha de la cotización, selecciona cambiar el estado a "Aprobada" o "Declinada".',
      'Confirma la acción en la ventana que aparece.'
    ],
    esperado: 'El estado cambia ordenadamente y se actualiza el resumen comercial de la empresa.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'cot-09', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/[id]', critica: false,
    titulo: 'Mensaje listo para compartir por WhatsApp',
    descripcion: 'Copia con un solo clic un texto redactado con calidez y profesionalismo con el enlace de la cotización, listo para pegarlo en WhatsApp.',
    pasos: [
      'Presiona el botón "Copiar para WhatsApp" en la cotización.',
      'Pega el contenido en un bloc de notas o chat de prueba.',
      'Comprueba que el saludo, monto y enlace estén bien presentados.'
    ],
    esperado: 'El texto se copia al portapapeles con formato impecable facilitando la atención rápida al cliente.',
    journeys: ['Empleado', 'Cliente Final']
  },
  {
    id: 'cot-10', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: false,
    titulo: 'Subida sin tropiezos de varias fotos del mueble',
    descripcion: 'Permite adjuntar varias fotografías de distintos ángulos del mueble (frente, laterales, detalle de tela) simultáneamente.',
    pasos: [
      'Selecciona 3 o 4 imágenes del mueble al mismo tiempo.',
      'Observa cómo se van mostrando las miniaturas de cada foto en pantalla.'
    ],
    esperado: 'Todas las fotos se cargan de manera ordenada y permiten eliminarlas o reorganizarlas si lo deseas.',
    journeys: ['Empleado', 'Cliente Final']
  },

  // ══════════════════════════════════════════════════════════════════
  // DPP / PASAPORTE
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'dpp-01', categoria: 'DPP / Pasaporte', ruta: '/empresa/dpp', critica: true,
    titulo: 'Catálogo de pasaportes digitales emitidos',
    descripcion: 'Muestra el inventario de pasaportes digitales de producto creados por la empresa, con su código único, estado y enlace QR.',
    pasos: [
      'Ingresa a la sección de pasaportes digitales (DPP).',
      'Revisa la lista de productos registrados y sus códigos QR.',
      'Usa el buscador para localizar un producto por su nombre o lote.'
    ],
    esperado: 'La lista se despliega con imágenes y códigos claros, permitiendo abrir la ficha de cualquier producto.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'dpp-02', categoria: 'DPP / Pasaporte', ruta: '/empresa/dpp/nuevo', critica: true,
    titulo: 'Creación de pasaporte digital para un producto',
    descripcion: 'Permite registrar un producto con sus materiales, porcentaje de contenido reciclado, huella de carbono y recomendaciones de cuidado.',
    pasos: [
      'Inicia la creación de un nuevo pasaporte.',
      'Completa los datos del producto: modelo, materiales, origen y vida útil esperada.',
      'Guarda el pasaporte y genera su código QR.'
    ],
    esperado: 'El pasaporte digital queda registrado y su código QR queda listo para imprimir o colocar en la etiqueta del producto.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'dpp-03', categoria: 'DPP / Pasaporte', ruta: '/empresa/dpp/nuevo', critica: false,
    titulo: 'Asistencia inteligente para completar la ficha técnica',
    descripcion: 'Facilita la carga de información analizando una foto o ficha técnica del producto para sugerir automáticamente materiales y componentes.',
    pasos: [
      'En el formulario de nuevo pasaporte, sube la foto de la etiqueta o del producto.',
      'Presiona el botón de auto-llenado con asistencia inteligente.',
      'Revisa los campos sugeridos y aprueba los datos.'
    ],
    esperado: 'Los campos de materiales y dimensiones se rellenan automáticamente, ahorrando tiempo de digitación.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'dpp-04', categoria: 'DPP / Pasaporte', ruta: '/pasaporte/[codigo]', critica: true,
    titulo: 'Consulta pública del pasaporte mediante código QR',
    descripcion: 'Cualquier persona o cliente que escanee el código QR con su teléfono puede ver la historia, materiales y trazabilidad del producto.',
    pasos: [
      'Abre la dirección pública del pasaporte o escanea el QR con tu celular.',
      'Comprueba que la página cargue con diseño moderno y adaptado a móviles.',
      'Revisa los datos de origen, huella ambiental y opciones de reparación.'
    ],
    esperado: 'La página pública brinda una experiencia atractiva y transparente sobre la sostenibilidad del producto.',
    journeys: ['Cliente Final', 'Directivo']
  },
  {
    id: 'dpp-05', categoria: 'DPP / Pasaporte', ruta: '/empresa/dpp/[id]', critica: false,
    titulo: 'Actualización de la historia y ciclos del producto',
    descripcion: 'Permite registrar eventos en la vida del producto, como mantenimientos realizados, cambio de piezas o segundo dueño.',
    pasos: [
      'Abre la ficha del pasaporte digital en el panel.',
      'Agrega un nuevo hito en el ciclo de vida (por ejemplo, "Retapizado y cambio de relleno").',
      'Guarda el nuevo ciclo y revisa la línea de tiempo.'
    ],
    esperado: 'La cronología del producto se actualiza con la nueva acción, reflejando su valor circular en el tiempo.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'dpp-06', categoria: 'DPP / Pasaporte', ruta: '/empresa/dpp/[id]', critica: false,
    titulo: 'Visualización ordenada de historias con muchos ciclos',
    descripcion: 'Asegura que incluso productos que han pasado por muchas reparaciones o dueños muestren su línea de tiempo limpia y fácil de leer.',
    pasos: [
      'Abre un pasaporte con más de 6 eventos o reparaciones registradas.',
      'Recorre la línea de tiempo hacia arriba y abajo.'
    ],
    esperado: 'Los eventos se organizan cronológicamente sin amontonarse ni tapar los datos principales del producto.',
    journeys: ['Cliente Final', 'Admin Operativa']
  },

  // ══════════════════════════════════════════════════════════════════
  // PÁGINAS PÚBLICAS
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'pub-01', categoria: 'Páginas Públicas', ruta: '/', critica: false,
    titulo: 'Portada principal y mensaje de bienvenida',
    descripcion: 'Presenta la propuesta de valor de Reúso a cualquier persona interesada: calculadora de huella, casos de éxito y formulario de contacto.',
    pasos: [
      'Entra a la página de inicio en una ventana de incógnito.',
      'Desplázate por las distintas secciones y revisa los textos e imágenes.',
      'Prueba enviar una duda en el formulario de contacto con datos de prueba.'
    ],
    esperado: 'La página carga de forma rápida y atractiva, y el formulario confirma el mensaje con calidez.',
    journeys: ['Cliente Final', 'Directivo']
  },
  {
    id: 'pub-02', categoria: 'Páginas Públicas', ruta: '/legal', critica: false,
    titulo: 'Acceso transparente a documentos informativos',
    descripcion: 'Asegura que cualquier visitante pueda consultar las políticas de uso, privacidad y medición desde los enlaces del pie de página.',
    pasos: [
      'Ve al pie de página de la web.',
      'Haz clic en los enlaces legales (Términos, Privacidad, Cookies, Metodología).',
      'Comprueba que cada página abra sin demoras y con tipografía descansada.'
    ],
    esperado: 'Todos los documentos legales son accesibles y ofrecen una lectura cómoda y clara.',
    journeys: ['Cliente Final', 'Directivo']
  },
  {
    id: 'pub-03', categoria: 'Páginas Públicas', ruta: '/legal/dudas', critica: false,
    titulo: 'Preguntas y dudas sobre privacidad o términos',
    descripcion: 'Brinda a los usuarios un canal sencillo para consultar dudas específicas sobre el tratamiento de sus datos o condiciones del servicio.',
    pasos: [
      'Abre la sección de dudas legales.',
      'Escribe tu pregunta o comentario en el buzón.',
      'Envía la solicitud.'
    ],
    esperado: 'La pantalla agradece tu mensaje y confirma que el equipo de soporte legal te responderá pronto.',
    journeys: ['Cliente Final', 'Admin Operativa']
  },
  {
    id: 'pub-04', categoria: 'Páginas Públicas', ruta: '/status', critica: false,
    titulo: 'Transparencia en la disponibilidad del servicio',
    descripcion: 'Permite a cualquier usuario consultar en tiempo real si todos los servicios de la plataforma están operando con normalidad.',
    pasos: [
      'Ingresa a la página de estado del sistema.',
      'Revisa los indicadores de los servicios principales.',
      'Verifica el historial de disponibilidad de las últimas semanas.'
    ],
    esperado: 'La página informa con honestidad y claridad sobre el funcionamiento del sistema en todo momento.',
    journeys: ['Admin Operativa', 'Directivo', 'Cliente Final']
  },
  {
    id: 'pub-05', categoria: 'Páginas Públicas', ruta: '/verificar/[codigo]', critica: true,
    titulo: 'Verificación de validez de informes emitidos',
    descripcion: 'Permite a terceros verificar que un informe de sostenibilidad o certificado de reutilización sea genuino ingresando su código.',
    pasos: [
      'Abre un enlace de verificación de informe con un código válido.',
      'Comprueba que la pantalla confirme la autenticidad del documento.',
      'Revisa la empresa emisora, fecha y resumen de impacto certificado.'
    ],
    esperado: 'El sistema confirma que el informe es válido y muestra los datos del emisor de manera transparente.',
    journeys: ['Cliente Final', 'Directivo']
  },
  {
    id: 'pub-06', categoria: 'Páginas Públicas', ruta: '/cot/[token]', critica: true,
    titulo: 'Consulta de propuesta comercial para el cliente',
    descripcion: 'Vista elegante para que el cliente final examine la cotización de restauración que le preparó la empresa, con opción de aceptarla.',
    pasos: [
      'Abre un enlace de cotización compartible.',
      'Revisa las fotografías del antes, los trabajos propuestos y el precio total.',
      'Presiona el botón para aceptar o contactar por WhatsApp.'
    ],
    esperado: 'La propuesta transmite confianza y profesionalismo, y facilita la decisión del cliente con un solo clic.',
    journeys: ['Cliente Final', 'Admin Operativa']
  },
  {
    id: 'pub-07', categoria: 'Páginas Públicas', ruta: '/empresa/nueva', critica: false,
    titulo: 'Registro guiado para nuevas organizaciones',
    descripcion: 'Acompaña a la líder de una nueva empresa en sus primeros pasos para dar de alta su organización y comenzar a medir su impacto.',
    pasos: [
      'Inicia el flujo de registro de una empresa nueva.',
      'Completa el nombre de la organización, sector y país.',
      'Presiona crear empresa y revisa la bienvenida al panel.'
    ],
    esperado: 'El proceso de registro es intuitivo y te deja dentro de tu nuevo panel de control listo para trabajar.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'pub-08', categoria: 'Páginas Públicas', ruta: '/status', critica: false,
    titulo: 'Indicador claro de estabilidad en la conexión',
    descripcion: 'Muestra un aviso amigable si tu conexión a internet se interrumpe momentáneamente para que sepas si una acción tardó en responder.',
    pasos: [
      'En la página de estado, revisa el componente de verificación en vivo.',
      'Observa cómo te indica el estado de respuesta de tu conexión.'
    ],
    esperado: 'El indicador responde con serenidad y te guía si tu internet presenta intermitencias.',
    journeys: ['Empleado', 'Admin Operativa', 'Cliente Final']
  },

  // ══════════════════════════════════════════════════════════════════
  // MODO NOCHE
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'dark-01', categoria: 'Modo Noche', ruta: '/login', critica: false,
    titulo: 'Login en modo noche',
    descripcion: 'Asegura que la pantalla de inicio de sesión ofrezca un fondo oscuro relajante con excelente contraste para cuando accedes de noche.',
    pasos: [
      'Activa el tema oscuro en la pantalla de inicio de sesión usando el botón del sol/luna.',
      'Revisa que los campos de texto, logotipo y botones se lean con nitidez y sin destellos molestos.'
    ],
    esperado: 'La interfaz cambia con suavidad a tonos oscuros elegantes y legibles.',
    journeys: ['Empleado', 'Admin Operativa', 'Directivo']
  },
  {
    id: 'dark-02', categoria: 'Modo Noche', ruta: '/dashboard', critica: false,
    titulo: 'Panel de trabajo diario en tema oscuro uniforme',
    descripcion: 'Permite a los colaboradores trabajar en sus cálculos diarios en ambientes de poca luz sin fatiga visual.',
    pasos: [
      'Ve a tu panel diario con el modo noche activo.',
      'Comprueba las tarjetas de cálculo, selectores de materiales y tabla de historial.'
    ],
    esperado: 'Todos los componentes adoptan fondos oscuros armónicos manteniendo el contraste en textos y números.',
    journeys: ['Empleado']
  },
  {
    id: 'dark-03', categoria: 'Modo Noche', ruta: '/empresa', critica: false,
    titulo: 'Panel corporativo en tonos oscuros elegantes',
    descripcion: 'Asegura que el tablero de la empresa y sus gráficas de impacto mantengan un aspecto refinado y profesional en modo oscuro.',
    pasos: [
      'Entra al panel de la empresa con el modo noche activado.',
      'Revisa las gráficas de emisiones evitadas y barras de progreso.'
    ],
    esperado: 'Las líneas y barras de las gráficas destacan con claridad sobre el fondo oscuro sin perder detalle.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'dark-04', categoria: 'Modo Noche', ruta: '/empresa/cotizador', critica: false,
    titulo: 'Cotizador cómodo para trabajar de noche',
    descripcion: 'Adapta el cotizador inteligente para que revisar fotografías y ajustar presupuestos sea descansado a cualquier hora.',
    pasos: [
      'Abre la bandeja de cotizaciones en tema oscuro.',
      'Abre una cotización y revisa las miniaturas de fotos y campos de precios.'
    ],
    esperado: 'Los elementos del cotizador lucen equilibrados y facilitan la concentración del colaborador.',
    journeys: ['Empleado']
  },
  {
    id: 'dark-05', categoria: 'Modo Noche', ruta: '/empresa/dpp', critica: false,
    titulo: 'Pasaportes digitales con excelente contraste nocturno',
    descripcion: 'Comprueba que las fichas de pasaporte digital y sus códigos QR se muestren perfectamente legibles con tema oscuro.',
    pasos: [
      'Navega a la sección de pasaportes digitales con modo noche.',
      'Abre la ficha de un producto y revisa la línea de tiempo y QR.'
    ],
    esperado: 'El código QR y los textos de trazabilidad conservan su nitidez y facilidad de escaneo.',
    journeys: ['Empleado', 'Cliente Final']
  },
  {
    id: 'dark-06', categoria: 'Modo Noche', ruta: '/admin', critica: false,
    titulo: 'Centro de administración en modo oscuro',
    descripcion: 'Permite a los administradores supervisar las métricas de la plataforma con una atmósfera visual sobria y descansada.',
    pasos: [
      'Accede al panel de administración en modo noche.',
      'Recorre las tablas de usuarios y métricas generales.'
    ],
    esperado: 'El panel administrativo se presenta con contraste equilibrado y bordes suaves.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'dark-07', categoria: 'Modo Noche', ruta: '/settings', critica: false,
    titulo: 'Recordar tu preferencia de modo de visualización',
    descripcion: 'Guarda tu elección de modo claro u oscuro para que al volver en otro momento o en otra sesión encuentres la pantalla como te gusta.',
    pasos: [
      'Cambia tu preferencia a modo noche en la barra superior o en tu perfil.',
      'Cierra el navegador, vuelve a abrir la página e inicia sesión.'
    ],
    esperado: 'El sistema recuerda tu preferencia automáticamente y abre la plataforma en modo noche.',
    journeys: ['Empleado', 'Admin Operativa', 'Directivo']
  },
  {
    id: 'dark-08', categoria: 'Modo Noche', ruta: '/empresa', critica: false,
    titulo: 'Legibilidad clara de gráficas y ventanas en cualquier tema',
    descripcion: 'Verifica que al abrir ventanas emergentes, selectores o modales flotantes en modo noche, ningún texto se vuelva invisible o grisáceo.',
    pasos: [
      'En modo noche, abre un modal de confirmación o un menú desplegable.',
      'Comprueba que todos los textos, iconos y botones sean fáciles de distinguir.'
    ],
    esperado: 'Todos los elementos emergentes conservan una legibilidad impecable y un contraste agradable.',
    journeys: ['Directivo', 'Admin Operativa']
  },

  // ══════════════════════════════════════════════════════════════════
  // RENDIMIENTO
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'perf-01', categoria: 'Rendimiento', ruta: '/dashboard', critica: true,
    titulo: 'Ingreso veloz a tu espacio de trabajo',
    descripcion: 'Asegura que desde que presionas "Ingresar" hasta que ves tu calculadora lista pasen menos de un segundo, sin pantallas en blanco.',
    pasos: [
      'Inicia sesión con tu cuenta.',
      'Cronometra mentalmente el paso de la pantalla de acceso a tu panel principal.'
    ],
    esperado: 'La transición es inmediata (menos de un segundo), permitiéndote comenzar a trabajar al instante.',
    journeys: ['Empleado', 'Admin Operativa', 'Directivo']
  },
  {
    id: 'perf-02', categoria: 'Rendimiento', ruta: '/empresa', critica: false,
    titulo: 'Carga ágil de indicadores y gráficas de la empresa',
    descripcion: 'Asegura que al entrar al resumen de la empresa, todas las tarjetas numéricas y gráficas de impacto aparezcan en menos de dos segundos.',
    pasos: [
      'Entra al panel de la empresa.',
      'Observa la velocidad con la que se llenan las tarjetas de impacto y se dibujan las curvas.'
    ],
    esperado: 'Todo el tablero se muestra de forma completa y fluida en menos de dos segundos.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'perf-03', categoria: 'Rendimiento', ruta: '/empresa/cotizador/nueva', critica: false,
    titulo: 'Preparación rápida de fotos antes de analizarlas',
    descripcion: 'Optimiza automáticamente las fotografías pesadas en tu propio dispositivo para que no gastes tus datos móviles y el análisis empiece de inmediato.',
    pasos: [
      'Sube una fotografía pesada tomada directamente con tu teléfono celular.',
      'Observa qué tan rápido se prepara la miniatura.'
    ],
    esperado: 'La imagen se alista casi instantáneamente, permitiendo un análisis veloz sin sobrecargar tu conexión.',
    journeys: ['Empleado', 'Cliente Final']
  },
  {
    id: 'perf-04', categoria: 'Rendimiento', ruta: '/empresa/informes', critica: false,
    titulo: 'Descarga inmediata del reporte en PDF',
    descripcion: 'Permite a los directivos obtener su informe de sostenibilidad listo para imprimir o enviar por correo en menos de tres segundos.',
    pasos: [
      'Selecciona un rango de fechas y presiona descargar PDF.',
      'Mide el tiempo transcurrido hasta que el archivo comienza a descargarse.'
    ],
    esperado: 'El documento PDF se genera y descarga con fluidez en menos de 3 segundos.',
    journeys: ['Admin Operativa', 'Directivo', 'Empleado']
  },
  {
    id: 'perf-05', categoria: 'Rendimiento', ruta: '/pasaporte/[codigo]', critica: false,
    titulo: 'Consulta instantánea del pasaporte digital en el móvil',
    descripcion: 'Asegura que cuando un cliente escanea la etiqueta en una tienda, la historia del producto abra en su celular en menos de dos segundos.',
    pasos: [
      'Abre un enlace de pasaporte digital simulando conexión móvil.',
      'Comprueba la rapidez de despliegue de la imagen y los ciclos del producto.'
    ],
    esperado: 'La experiencia es ágil y agradable, mostrando toda la información en menos de dos segundos.',
    journeys: ['Cliente Final', 'Empleado']
  },
  {
    id: 'perf-06', categoria: 'Rendimiento', ruta: '/empresa/calculos', critica: false,
    titulo: 'Navegación ágil en listas con cientos de registros',
    descripcion: 'Asegura que al desplazarte por listas con cientos de mediciones históricas, la pantalla responda con suavidad y tu computadora no se vuelva lenta.',
    pasos: [
      'Entra al historial de cálculos y haz un desplazamiento rápido por la lista.',
      'Filtra y busca varias veces seguidas.'
    ],
    esperado: 'La interfaz responde de forma ligera y ágil sin congelamientos ni demoras.',
    journeys: ['Admin Operativa', 'Empleado']
  },

  // ══════════════════════════════════════════════════════════════════
  // SEGURIDAD
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'seg-01', categoria: 'Seguridad', ruta: '/middleware', critica: true,
    titulo: 'Privacidad entre las distintas áreas de la empresa',
    descripcion: 'Asegura que un colaborador operativo solo acceda a sus herramientas de trabajo diario y no pueda entrar a las secciones administrativas o financieras.',
    pasos: [
      'Inicia sesión como colaborador operativo.',
      'Intenta escribir en la barra de direcciones /admin o /empresa/configuracion.',
      'Observa a dónde te redirige el sistema.'
    ],
    esperado: 'El sistema te redirige a tu panel de trabajo diario sin mostrar información reservada a la administración.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'seg-02', categoria: 'Seguridad', ruta: '/api', critica: true,
    titulo: 'Protección de la información ante visitas sin ingresar',
    descripcion: 'Verifica que ningún visitante anónimo pueda consultar listas de clientes, cálculos o datos internos sin haber iniciado sesión debidamente.',
    pasos: [
      'En una ventana privada y sin iniciar sesión, intenta consultar una dirección de datos interna.',
      'Comprueba que el sistema rechace la solicitud amablemente.'
    ],
    esperado: 'La solicitud es denegada protegiendo la confidencialidad de la información institucional.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'seg-03', categoria: 'Seguridad', ruta: '/api/cotizador', critica: false,
    titulo: 'Confidencialidad total entre empresas diferentes',
    descripcion: 'Asegura que los colaboradores de una empresa jamás puedan ver los clientes, presupuestos o proyectos de otra organización aliada.',
    pasos: [
      'Inicia sesión con un usuario de la Empresa A.',
      'Intenta acceder al número de cotización o proyecto de la Empresa B.'
    ],
    esperado: 'El sistema avisa que el elemento no existe o no está disponible, garantizando el aislamiento comercial.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'seg-04', categoria: 'Seguridad', ruta: '/empresa/cotizador', critica: false,
    titulo: 'Acceso ordenado solo a las herramientas contratadas',
    descripcion: 'Comprueba que si una empresa no tiene activo un módulo específico, se le muestre una pantalla explicativa para solicitar su activación.',
    pasos: [
      'Entra con una cuenta cuya empresa no tenga contratado el Cotizador.',
      'Navega hacia esa sección desde el enlace directo.'
    ],
    esperado: 'Se muestra una pantalla clara explicando el valor del módulo e invitando a la líder a activarlo para su equipo.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'seg-05', categoria: 'Seguridad', ruta: '/api/auth', critica: true,
    titulo: 'Protección contra intentos insistentes de adivinar claves',
    descripcion: 'Bloquea temporalmente los intentos si alguien prueba contraseñas de forma desmedida en pocos segundos, protegiendo las cuentas del equipo.',
    pasos: [
      'Realiza varios intentos fallidos rápidos en la pantalla de ingreso.',
      'Observa el aviso de protección que aparece.'
    ],
    esperado: 'El sistema pide una pausa prudente antes del siguiente intento para cuidar la seguridad de las cuentas.',
    journeys: ['Admin Operativa', 'Empleado', 'Directivo']
  },
  {
    id: 'seg-06', categoria: 'Seguridad', ruta: '/api/dpp', critica: true,
    titulo: 'Separación hermética de los datos de cada organización',
    descripcion: 'Valida que los pasaportes digitales en borrador y cálculos de tu empresa permanezcan estrictamente bajo el control de tu equipo.',
    pasos: [
      'Desde la cuenta de una empresa, intenta consultar los borradores de pasaportes de otra.',
      'Revisa la respuesta del sistema.'
    ],
    esperado: 'El sistema muestra únicamente los activos pertenecientes a tu organización.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'seg-07', categoria: 'Seguridad', ruta: '/admin/usuarios', critica: false,
    titulo: 'Seguridad al escribir nombres y términos en el buscador',
    descripcion: 'Comprueba que al escribir caracteres especiales, comillas o símbolos extraños en las casillas de búsqueda, el sistema funcione normalmente.',
    pasos: [
      'En el buscador de usuarios o cálculos, escribe comillas, signos de porcentaje o caracteres poco habituales.',
      'Presiona buscar.'
    ],
    esperado: 'La lista filtra de forma segura o indica "Sin resultados" sin desconfigurarse ni arrojar errores.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'seg-08', categoria: 'Seguridad', ruta: '/admin', critica: false,
    titulo: 'Resguardo de tu sesión activa en el navegador',
    descripcion: 'Asegura que tu inicio de sesión permanezca resguardado y que nadie pueda alterar tus permisos desde las herramientas del navegador.',
    pasos: [
      'Inicia sesión con un rol normal de colaborador.',
      'Intenta modificar manualmente datos locales en el navegador para simular ser administrador.',
      'Intenta realizar una acción administrativa.'
    ],
    esperado: 'El sistema verifica tus permisos reales en el servidor y te mantiene en tu nivel de acceso asignado.',
    journeys: ['Admin Operativa', 'Empleado', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // ALERTAS
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'alerta-01', categoria: 'Alertas', ruta: '/admin/alertas', critica: false,
    titulo: 'Comunicación urgente para todo el equipo',
    descripcion: 'Permite a los administradores difundir un mensaje de alta prioridad que aparecerá en la parte superior de los paneles de todos los usuarios.',
    pasos: [
      'Crea una alerta con nivel "Urgente" desde el panel de administración.',
      'Escribe el comunicado e indícale una fecha de expiración.',
      'Comprueba cómo aparece en el panel de los colaboradores.'
    ],
    esperado: 'La alerta se muestra con fondo visible y tono claro sin interrumpir el trabajo de los usuarios.',
    journeys: ['Admin Operativa', 'Directivo', 'Empleado']
  },
  {
    id: 'alerta-02', categoria: 'Alertas', ruta: '/dashboard', critica: false,
    titulo: 'Confirmación sencilla de lectura de avisos',
    descripcion: 'Permite al usuario cerrar o descartar un aviso una vez que lo ha leído, para que no continúe ocupando espacio en su pantalla.',
    pasos: [
      'Observa el banner de aviso en la parte superior de tu panel.',
      'Haz clic en el botón de cerrar (la cruz o "Marcar como leída").'
    ],
    esperado: 'El aviso desaparece suavemente y no vuelve a mostrarse en esa sesión.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'alerta-03', categoria: 'Alertas', ruta: '/dashboard', critica: false,
    titulo: 'Orden claro cuando hay varios avisos al mismo tiempo',
    descripcion: 'Asegura que si coinciden avisos informativos y uno urgente, este último se muestre de primero para que no pase desapercibido.',
    pasos: [
      'Publica una alerta informativa y una urgente al mismo tiempo.',
      'Entra al panel de usuario.'
    ],
    esperado: 'La alerta urgente encabeza la pantalla con prioridad clara y diseño destacado.',
    journeys: ['Empleado', 'Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // SETTINGS
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'set-01', categoria: 'Settings', ruta: '/settings', critica: false,
    titulo: 'Personalización amigable de tu nombre y saludo',
    descripcion: 'Permite actualizar tu nombre visible y apodo preferido para que el sistema te salude cordialmente cada mañana.',
    pasos: [
      'Ve a tu configuración de perfil.',
      'Modifica tu nombre o apodo de preferencia.',
      'Guarda los cambios y revisa el saludo en la barra superior.'
    ],
    esperado: 'Tu nombre se actualiza de inmediato en toda la plataforma con el saludo personalizado.',
    journeys: ['Empleado', 'Admin Operativa', 'Directivo']
  },
  {
    id: 'set-02', categoria: 'Settings', ruta: '/settings', critica: false,
    titulo: 'Cambio seguro de tu contraseña con código al correo',
    descripcion: 'Permite cambiar tu clave de acceso de forma protegida solicitándote un código de verificación que llega a tu correo.',
    pasos: [
      'Inicia el cambio de contraseña en tu perfil.',
      'Escribe tu nueva clave e introduce el código numérico recibido en tu bandeja.',
      'Guarda los cambios.'
    ],
    esperado: 'El cambio se confirma con calidez y tu nueva clave queda lista para tu próximo ingreso.',
    journeys: ['Empleado', 'Admin Operativa', 'Directivo']
  },
  {
    id: 'set-03', categoria: 'Settings', ruta: '/settings', critica: false,
    titulo: 'Actualización de tu número de teléfono con confirmación',
    descripcion: 'Facilita registrar o cambiar tu número telefónico para recibir soporte o avisos importantes, solicitando confirmar tu clave por seguridad.',
    pasos: [
      'En tu perfil, introduce tu nuevo número de teléfono móvil.',
      'Ingresa tu contraseña actual para confirmar que eres tú.',
      'Guarda los datos.'
    ],
    esperado: 'El número queda registrado de forma confiable y se actualiza en tu ficha de contacto.',
    journeys: ['Empleado', 'Admin Operativa']
  },

  // ══════════════════════════════════════════════════════════════════
  // AYUDA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'ayuda-01', categoria: 'Ayuda', ruta: '/ayuda', critica: false,
    titulo: 'Centro de ayuda y resolución de dudas comunes',
    descripcion: 'Ofrece respuestas claras a las preguntas más frecuentes sobre el uso de la calculadora, cotizador y pasaportes digitales.',
    pasos: [
      'Abre la sección de ayuda desde el menú de navegación.',
      'Explora las preguntas frecuentes desplegables.',
      'Si necesitas atención humana, llena el formulario de contacto integrado.'
    ],
    esperado: 'Las respuestas son sencillas de entender y el formulario te pone en contacto directo con soporte.',
    journeys: ['Empleado', 'Admin Operativa', 'Cliente Final']
  },

  // ══════════════════════════════════════════════════════════════════
  // APIS & VALIDACIONES
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'api-01', categoria: 'APIs & Validaciones', ruta: '/api/calcular', critica: true,
    titulo: 'Guía clara si falta un dato al registrar un cálculo',
    descripcion: 'Asegura que si un colaborador olvida poner el peso o tipo de material, el sistema le indique amablemente qué dato falta sin fallar.',
    pasos: [
      'Intenta guardar un cálculo dejando en blanco la casilla de peso o material.',
      'Observa las indicaciones en pantalla.'
    ],
    esperado: 'La casilla que falta se resalta en color suave y te explica qué información se necesita para continuar.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'api-02', categoria: 'APIs & Validaciones', ruta: '/api/metas', critica: false,
    titulo: 'Validación lógica en las fechas de metas ambientales',
    descripcion: 'Evita equivocaciones al fijar metas, avisándote si accidentalmente pusiste una fecha de fin anterior a la de inicio.',
    pasos: [
      'En el formulario de metas de empresa, elige una fecha de cierre anterior a la fecha actual o de inicio.',
      'Intenta guardar la meta.'
    ],
    esperado: 'El sistema te orienta con serenidad para que elijas un rango de fechas con sentido cronológico.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'api-03', categoria: 'APIs & Validaciones', ruta: '/api/tickets', critica: false,
    titulo: 'Carga ordenada de solicitudes de soporte',
    descripcion: 'Permite a los administradores consultar las preguntas de los usuarios de manera paginada para que la pantalla no se sobrecargue.',
    pasos: [
      'Entra a la bandeja de soporte con múltiples mensajes.',
      'Comprueba que se muestren organizados en bloques de 20 o 50 solicitudes.'
    ],
    esperado: 'Las solicitudes se leen con holgura y la navegación entre páginas es inmediata.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'api-04', categoria: 'APIs & Validaciones', ruta: '/api/cotizador/diagnostico', critica: false,
    titulo: 'Disponibilidad continua en el diagnóstico con IA',
    descripcion: 'Cuenta con respaldo automático para que si el servicio principal de análisis visual tiene una pausa, un motor secundario responda sin que el usuario lo note.',
    pasos: [
      'Solicita un diagnóstico de mueble con fotografía.',
      'Observa la continuidad del servicio de respuesta.'
    ],
    esperado: 'El análisis se completa exitosamente ofreciendo una recomendación oportuna en todo momento.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'api-05', categoria: 'APIs & Validaciones', ruta: '/api/status/check', critica: false,
    titulo: 'Monitoreo automático de salud del servicio',
    descripcion: 'Revisa periódicamente el estado de los componentes vitales de la plataforma y notifica oportunamente si algo requiere atención del equipo técnico.',
    pasos: [
      'Consulta el estado de salud de los servicios en la consola o panel de estado.'
    ],
    esperado: 'Los chequeos se realizan de forma silenciosa y mantienen la plataforma estable para las empresas.',
    journeys: ['Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // SEGURIDAD
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'seg-09', categoria: 'Seguridad', ruta: '/dashboard', critica: true,
    titulo: 'Limpieza de textos en formularios para evitar alteraciones',
    descripcion: 'Verifica que si alguien copia y pega fragmentos con código o estilos desde otra web en una descripción, el texto se guarde como texto limpio.',
    pasos: [
      'En la casilla de notas de un cálculo, escribe un texto con etiquetas o símbolos.',
      'Guarda el cálculo y revisa cómo se muestra en la tarjeta.'
    ],
    esperado: 'El texto se visualiza como texto plano ordinario sin romper el diseño ni ejecutar comandos.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'seg-10', categoria: 'Seguridad', ruta: '/api/admin/status/incidentes/[id]', critica: true,
    titulo: 'Cumplimiento riguroso de los permisos de cada rol',
    descripcion: 'Asegura que solo las personas con facultades de administración puedan publicar o resolver incidencias del estado del sistema.',
    pasos: [
      'Como colaborador de empresa, intenta acceder al panel de incidentes de infraestructura.'
    ],
    esperado: 'El sistema te informa con amabilidad que no posees facultades para editar la infraestructura general.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'seg-11', categoria: 'Seguridad', ruta: '/api/profile', critica: true,
    titulo: 'Protección inmutable de tu rol y permisos asignados',
    descripcion: 'Asegura que los permisos de cada usuario solo puedan ser modificados por la líder de la empresa o superadministradores, no desde el perfil personal.',
    pasos: [
      'Edita tu nombre y datos personales en tu pantalla de perfil.',
      'Comprueba que tu rol asignado permanezca intacto y protegido.'
    ],
    esperado: 'Tus datos de contacto se actualizan pero tu rol se mantiene fiel a lo asignado por tu líder.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'seg-12', categoria: 'Seguridad', ruta: '/api/profile/update-sensitive', critica: true,
    titulo: 'Seguridad en operaciones importantes del perfil',
    descripcion: 'Protege acciones sensibles como el cambio de contraseña o teléfono solicitando confirmación previa para evitar modificaciones accidentales.',
    pasos: [
      'Intenta actualizar tu contraseña o teléfono en tu perfil.',
      'Verifica los pasos de confirmación requeridos.'
    ],
    esperado: 'El sistema solicita ingresar tu clave actual o código de verificación antes de aplicar cambios delicados.',
    journeys: ['Admin Operativa', 'Empleado']
  },

  // ══════════════════════════════════════════════════════════════════
  // APIS & VALIDACIONES
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'api-06', categoria: 'APIs & Validaciones', ruta: '/api/cotizador/diagnostico', critica: true,
    titulo: 'Verificación de archivos auténticos al subir fotos',
    descripcion: 'Asegura que el cargador de imágenes revise el contenido real del archivo para confirmar que sea una fotografía genuina y no un archivo disfrazado.',
    pasos: [
      'Sube una fotografía de un mueble tomada con tu cámara.',
      'Comprueba que el sistema la reciba y comience el análisis.'
    ],
    esperado: 'Las fotos auténticas se reciben con total fluidez mientras que archivos dañados se descartan con amabilidad.',
    journeys: ['Empleado', 'Admin Operativa']
  },

  // ══════════════════════════════════════════════════════════════════
  // RENDIMIENTO
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'perf-07', categoria: 'Rendimiento', ruta: '/empresa/dpp/nuevo', critica: false,
    titulo: 'Protección de tus datos si la conexión parpadea',
    descripcion: 'Si estás completando la ficha de un pasaporte digital y tu internet falla brevemente, la información que ya escribiste no se pierde.',
    pasos: [
      'Comienza a llenar los datos de un nuevo pasaporte digital.',
      'Desconecta tu wifi por 5 segundos y vuelve a conectarte.',
      'Observa si tus datos siguen en las casillas.'
    ],
    esperado: 'Tus textos permanecen a salvo en el formulario y puedes continuar completándolo con tranquilidad.',
    journeys: ['Empleado', 'Admin Operativa']
  },
  {
    id: 'perf-08', categoria: 'Rendimiento', ruta: '/empresa/informes', critica: false,
    titulo: 'Descarga simultánea de reportes sin demoras',
    descripcion: 'Comprueba que si varios compañeros solicitan reportes al mismo tiempo a fin de mes, el sistema entregue cada archivo con rapidez.',
    pasos: [
      'Genera dos reportes de fechas distintas en pestañas paralelas.',
      'Comprueba que ambos se descarguen limpiamente.'
    ],
    esperado: 'Cada descarga se completa con éxito sin interferir una con la otra.',
    journeys: ['Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // COTIZADOR IA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'cot-11', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/[id]', critica: false,
    titulo: 'Protección contra cambios cruzados entre compañeros',
    descripcion: 'Si dos personas del equipo abren la misma cotización y una guarda cambios primero, el sistema avisa a la otra para evitar sobreescribir el trabajo.',
    pasos: [
      'Abre la misma cotización en dos navegadores diferentes.',
      'Modifica el precio y guarda en el primer navegador.',
      'En el segundo navegador intenta guardar otro cambio sin refrescar.'
    ],
    esperado: 'El sistema avisa amablemente que la cotización fue actualizada recientemente y ofrece ver la versión más reciente.',
    journeys: ['Empleado', 'Admin Operativa']
  },

  // ══════════════════════════════════════════════════════════════════
  // DPP / PASAPORTE
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'dpp-07', categoria: 'DPP / Pasaporte', ruta: '/pasaporte/[codigo]', critica: true,
    titulo: 'Certeza de autenticidad en el pasaporte digital',
    descripcion: 'Verifica que la información mostrada al público sea genuina y coincida con la emitido por la empresa fabricante o restauradora.',
    pasos: [
      'Abre un pasaporte público.',
      'Revisa la insignia de verificación y el sello de emisión.'
    ],
    esperado: 'La página exhibe una insignia de autenticidad clara que genera confianza en el consumidor final.',
    journeys: ['Cliente Final', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // AUTENTICACIÓN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'auth-10', categoria: 'Autenticación', ruta: '/empresa/nueva', critica: true,
    titulo: 'Completar datos de empresa antes de continuar',
    descripcion: 'Guía a los nuevos administradores que crean una cuenta para que primero registren los datos de su organización antes de acceder al panel general.',
    pasos: [
      'Inicia sesión con un usuario nuevo que aún no tenga empresa asociada.',
      'Intenta navegar directamente a /dashboard o /empresa.',
      'Observa a qué pantalla te conduce el sistema.'
    ],
    esperado: 'El sistema te lleva amablemente al formulario para crear o registrar tu empresa, evitando pantallas vacías.',
    journeys: ['Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // COTIZADOR IA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'cot-12', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: true,
    titulo: 'Seguridad al adjuntar imágenes de productos',
    descripcion: 'Verifica que los archivos subidos sean imágenes auténticas (como JPG, PNG o WebP) y rechaza archivos dudosos para proteger la plataforma.',
    pasos: [
      'Intenta subir un archivo que no sea una imagen estándar.',
      'Observa la reacción del cargador de archivos.'
    ],
    esperado: 'El sistema rechaza el archivo de forma segura y te solicita adjuntar una fotografía en formato de imagen habitual.',
    journeys: ['Empleado', 'Admin Operativa']
  },

  // ══════════════════════════════════════════════════════════════════
  // APIS & VALIDACIONES
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'api-07', categoria: 'APIs & Validaciones', ruta: '/api/calcular', critica: true,
    titulo: 'Cálculos confiables con números grandes o decimales',
    descripcion: 'Comprueba que al ingresar cifras con muchos decimales o volúmenes industriales elevados, la calculadora presente resultados legibles y redondeados.',
    pasos: [
      'Escribe un peso con varios decimales (por ejemplo, 12.456 kg) o un número alto de toneladas.',
      'Revisa el cálculo de CO2 resultante.'
    ],
    esperado: 'Los resultados se presentan con dos decimales claros y formato amigable.',
    journeys: ['Empleado', 'Admin Operativa', 'Directivo']
  },
  {
    id: 'dpl-09', categoria: 'APIs & Validaciones', ruta: '/legal/firma/[token]', critica: false,
    titulo: 'Firma digital nítida y segura en documentos',
    descripcion: 'Verifica que los trazos de la firma digital sobre la pantalla táctil se guarden de forma nítida, proporcionada y sin deformaciones.',
    pasos: [
      'Dibuja tu firma en el recuadro digital con el dedo o el cursor.',
      'Previsualiza el documento firmado.'
    ],
    esperado: 'La firma se estampa con claridad en la línea correspondiente del convenio legal.',
    journeys: ['Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // AUTENTICACIÓN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'auth-11', categoria: 'Autenticación', ruta: '/registro', critica: true,
    titulo: 'Verificación de seguridad sin interrupciones',
    descripcion: 'Asegura que la casilla de comprobación de seguridad funcione de forma suave y no bloquee a usuarios reales que se están registrando.',
    pasos: [
      'Ve a la página de registro.',
      'Completa los campos y observa cómo se verifica la casilla de seguridad.',
      'Envía el formulario de registro.'
    ],
    esperado: 'La verificación se realiza de manera transparente sin trabas ni demoras para personas reales.',
    journeys: ['Admin Operativa', 'Cliente Final']
  },

  // ══════════════════════════════════════════════════════════════════
  // PANEL EMPRESA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'emp-13', categoria: 'Panel Empresa', ruta: '/empresa/configuracion/marca', critica: false,
    titulo: 'Adaptación visual de logotipos de distintas dimensiones',
    descripcion: 'Asegura que tanto logos horizontales como cuadrados o verticales se muestren armónicos y no se deformen en encabezados ni cotizaciones.',
    pasos: [
      'Sube un logotipo con formato muy ancho o alargado en la configuración de marca.',
      'Revisa la previsualización en la tarjeta de muestra.'
    ],
    esperado: 'El sistema encuadra el logo con proporción natural y fondo limpio sin distorsionar la imagen corporativa.',
    journeys: ['Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // AUTENTICACIÓN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'auth-12', categoria: 'Autenticación', ruta: '/dashboard', critica: true,
    titulo: 'Cierre de sesión coherente en varias pestañas',
    descripcion: 'Si tienes el sistema abierto en varias pestañas y cierras sesión en una, las demás deben reconocer que ya saliste para cuidar tu privacidad.',
    pasos: [
      'Abre el panel en dos pestañas diferentes del mismo navegador.',
      'En la primera pestaña, haz clic en salir o cerrar sesión.',
      'Ve a la segunda pestaña e intenta realizar una acción o cambiar de sección.'
    ],
    esperado: 'La segunda pestaña detecta que la sesión terminó y te lleva a la pantalla de login sin mostrar información confidencial.',
    journeys: ['Admin Operativa', 'Empleado', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // RENDIMIENTO
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'perf-09', categoria: 'Rendimiento', ruta: '/empresa', critica: false,
    titulo: 'Adaptación fluida al girar o cambiar de pantalla',
    descripcion: 'Verifica que al redimensionar la ventana o rotar tu tableta, los gráficos y botones se reorganicen con elegancia sin parpadeos.',
    pasos: [
      'Cambia el ancho de tu navegador rápidamente de pantalla completa a mitad de pantalla.',
      'Observa cómo se acomodan las tarjetas y columnas.'
    ],
    esperado: 'Los elementos se ajustan con armonía y de forma continua sin descuadres visuales.',
    journeys: ['Empleado', 'Admin Operativa', 'Cliente Final']
  },

  // ══════════════════════════════════════════════════════════════════
  // PÁGINAS PÚBLICAS
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'pub-09', categoria: 'Páginas Públicas', ruta: '/legal/medicion', critica: true,
    titulo: 'Explicación clara de cómo calculamos el impacto',
    descripcion: 'Explica en un lenguaje accesible y con base científica cómo convertimos los kilogramos de residuos reutilizados en emisiones de CO2 evitadas.',
    pasos: [
      'Visita la página de metodología de medición.',
      'Lee la explicación de los factores de emisión utilizados por tipo de material.',
      'Consulta las fuentes bibliográficas y estándares internacionales de referencia.'
    ],
    esperado: 'El documento transmite rigor metodológico y comprensión sencilla para cualquier persona interesada.',
    journeys: ['Cliente Final', 'Directivo', 'Admin Operativa']
  },
  {
    id: 'pub-10', categoria: 'Páginas Públicas', ruta: '/legal/ia', critica: false,
    titulo: 'Transparencia sobre el uso ético de la IA',
    descripcion: 'Informa con honestidad cómo utilizamos modelos de visión e inteligencia artificial para asistir en los diagnósticos sin reemplazar el criterio humano.',
    pasos: [
      'Abre la sección de transparencia en inteligencia artificial.',
      'Revisa los principios éticos, privacidad de las imágenes y rol orientativo de la IA.'
    ],
    esperado: 'El texto genera tranquilidad al usuario sobre cómo se procesan sus fotos y datos.',
    journeys: ['Cliente Final', 'Directivo']
  },
  {
    id: 'pub-11', categoria: 'Páginas Públicas', ruta: '/legal/reglamento', critica: false,
    titulo: 'Reglamento y normas de convivencia de la plataforma',
    descripcion: 'Establece pautas de respeto mutuo, uso responsable de las herramientas y buenas prácticas dentro de la comunidad de Reúso.',
    pasos: [
      'Abre el reglamento de la plataforma.',
      'Revisa las normas básicas de convivencia y uso de los servicios.'
    ],
    esperado: 'El documento es accesible y fomenta un entorno de trabajo colaborativo y responsable.',
    journeys: ['Admin Operativa', 'Cliente Final']
  },
  {
    id: 'pub-12', categoria: 'Páginas Públicas', ruta: '/legal/confidencialidad', critica: false,
    titulo: 'Acuerdo de confidencialidad y resguardo de datos',
    descripcion: 'Detalla el compromiso mutuo de confidencialidad respecto a los datos comerciales y de sostenibilidad compartidos en la plataforma.',
    pasos: [
      'Consulta el acuerdo de confidencialidad en la web.',
      'Revisa las cláusulas sobre el resguardo de secretos industriales y datos de clientes.'
    ],
    esperado: 'El acuerdo brinda seguridad jurídica y tranquilidad a las empresas aliadas.',
    journeys: ['Directivo', 'Admin Operativa']
  },
  {
    id: 'pub-13', categoria: 'Páginas Públicas', ruta: '/legal/confidencialidad-firma', critica: false,
    titulo: 'Claridad cuando un enlace temporal ya caducó',
    descripcion: 'Si una persona intenta acceder a un enlace de firma que ya expiró o fue firmado previamente, se le explica la situación con amabilidad.',
    pasos: [
      'Visita un enlace de firma que ya no esté activo.',
      'Observa el mensaje que se despliega en pantalla.'
    ],
    esperado: 'Aparece un mensaje comprensible explicando por qué el enlace ya no está disponible y ofreciendo solicitar uno nuevo.',
    journeys: ['Cliente Final', 'Admin Operativa']
  },
  {
    id: 'pub-14', categoria: 'Páginas Públicas', ruta: '/legal/cookies/preferencias', critica: false,
    titulo: 'Control personalizado de preferencias de privacidad',
    descripcion: 'Permite a cualquier visitante elegir qué tipos de cookies consiente activar (necesarias, analíticas o de preferencia) en cualquier momento.',
    pasos: [
      'Abre el panel de preferencias de cookies.',
      'Activa o desactiva las cookies opcionales a tu gusto.',
      'Guarda tus preferencias y comprueba que se respeten.'
    ],
    esperado: 'Tus decisiones se guardan con respeto y el panel te permite cambiarlas cuando lo desees.',
    journeys: ['Cliente Final', 'Admin Operativa']
  },
  {
    id: 'pub-15', categoria: 'Páginas Públicas', ruta: '/legal/firma/[token]', critica: true,
    titulo: 'Proceso guiado para firmar acuerdos digitales',
    descripcion: 'Acompaña al directivo firmante paso a paso para leer el convenio, estampar su firma digital y descargar su copia firmada.',
    pasos: [
      'Abre el enlace de invitación para firmar un acuerdo.',
      'Lee el texto completo del convenio.',
      'Dibuja o confirma tu firma y presiona finalizar.'
    ],
    esperado: 'El sistema confirma la firma exitosa y te entrega una copia digital para tu archivo.',
    journeys: ['Directivo', 'Admin Operativa']
  },
  {
    id: 'pub-16', categoria: 'Páginas Públicas', ruta: '/verificar', critica: false,
    titulo: 'Búsqueda y verificación de autenticidad de reportes',
    descripcion: 'Buscador público donde cualquier persona puede ingresar el código impreso en un certificado para validar su veracidad.',
    pasos: [
      'Ve a la página principal de verificación.',
      'Escribe un código de informe en la casilla de búsqueda.',
      'Presiona consultar.'
    ],
    esperado: 'El sistema te muestra el informe correspondiente o te avisa si el código ingresado contiene algún error de tipeo.',
    journeys: ['Cliente Final', 'Directivo']
  },
  {
    id: 'pub-17', categoria: 'Páginas Públicas', ruta: '/legal/terminos', critica: false,
    titulo: 'Términos de uso claros y comprensibles',
    descripcion: 'Condiciones generales de uso de la plataforma redactadas con lenguaje humano y sin rodeos innecesarios.',
    pasos: [
      'Visita la página de términos de servicio.',
      'Recorre el índice y revisa los derechos y responsabilidades de los usuarios.'
    ],
    esperado: 'La lectura es amena, ordenada y fácil de comprender para cualquier persona.',
    journeys: ['Cliente Final', 'Admin Operativa']
  },
  {
    id: 'pub-18', categoria: 'Páginas Públicas', ruta: '/legal/privacidad', critica: false,
    titulo: 'Política de privacidad y cuidado de información',
    descripcion: 'Explica con total transparencia qué datos se recolectan, para qué se usan y cómo cuidamos la información privada de cada usuario.',
    pasos: [
      'Abre la política de privacidad.',
      'Comprueba las secciones sobre derechos de rectificación y eliminación de datos.'
    ],
    esperado: 'El documento transmite seriedad, confianza y respeto por la privacidad de las personas.',
    journeys: ['Cliente Final', 'Admin Operativa']
  },
  {
    id: 'pub-19', categoria: 'Páginas Públicas', ruta: '/legal/datos', critica: false,
    titulo: 'Autorización y respeto en el uso de tus datos',
    descripcion: 'Detalla el marco de protección de datos personales conforme a la ley y las garantías que brindamos en su tratamiento.',
    pasos: [
      'Consulta la política de tratamiento de datos.',
      'Revisa los canales oficiales para ejercer tus derechos de consulta o reclamo.'
    ],
    esperado: 'El texto cumple con la normativa vigente y ofrece canales de atención directos y claros.',
    journeys: ['Cliente Final', 'Admin Operativa']
  },
  {
    id: 'pub-20', categoria: 'Páginas Públicas', ruta: '/legal/cookies', critica: false,
    titulo: 'Información sencilla sobre el uso de cookies',
    descripcion: 'Explica qué son las cookies, qué función cumplen para mejorar tu experiencia y cómo puedes gestionarlas en tu navegador.',
    pasos: [
      'Entra a la política de cookies.',
      'Revisa la tabla descriptiva de cada cookie utilizada en el sitio.'
    ],
    esperado: 'La tabla es comprensible y ayuda al usuario a entender el motivo de cada elemento de navegación.',
    journeys: ['Cliente Final', 'Admin Operativa']
  },

  // ══════════════════════════════════════════════════════════════════
  // PANEL ADMIN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'adm-17', categoria: 'Panel Admin', ruta: '/admin/catalogo-pendientes', critica: false,
    titulo: 'Revisión de materiales nuevos propuestos',
    descripcion: 'Revisa aquellos ítems o materiales que los usuarios ingresaron y que no coincidían con el catálogo estándar, para homologarlos.',
    pasos: [
      'Entra a la bandeja de ítems pendientes de catálogo.',
      'Revisa la descripción que escribió el colaborador.',
      'Asócialo a una categoría oficial o crea una nueva con su factor correspondiente.'
    ],
    esperado: 'El material queda homologado y enriquecerá los futuros cálculos del equipo.',
    journeys: ['Admin Operativa', 'Empleado']
  },
  {
    id: 'adm-18', categoria: 'Panel Admin', ruta: '/admin/catalogo-restringido', critica: false,
    titulo: 'Permisos de acceso a catálogos exclusivos',
    descripcion: 'Permite otorgar o retirar acceso a listas de materiales o precios especiales para ciertas empresas aliadas.',
    pasos: [
      'Abre la administración de catálogos restringidos.',
      'Selecciona una empresa y asígnale permiso para consultar el catálogo especial.',
      'Verifica que solo los colaboradores autorizados puedan seleccionarlo.'
    ],
    esperado: 'El acceso se actualiza de inmediato protegiendo la exclusividad de los acuerdos comerciales.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-19', categoria: 'Panel Admin', ruta: '/admin/contenido', critica: false,
    titulo: 'Actualización sencilla de textos de la página web',
    descripcion: 'Permite actualizar titulares, testimonios o preguntas frecuentes de la web pública sin necesidad de tocar código.',
    pasos: [
      'Ingresa al editor de contenido de la página principal.',
      'Modifica un título o texto destacado en el borrador.',
      'Previsualiza el resultado y publica los cambios.'
    ],
    esperado: 'La página pública refleja los nuevos textos con el formato y estilo adecuados.',
    journeys: ['Admin Operativa', 'Cliente Final']
  },
  {
    id: 'adm-21', categoria: 'Panel Admin', ruta: '/admin/firmas', critica: true,
    titulo: 'Invitación a firmar acuerdos de confidencialidad',
    descripcion: 'Permite generar invitaciones digitales para que los representantes de nuevas empresas firmen acuerdos antes de iniciar operaciones.',
    pasos: [
      'Ve a la sección de firmas de acuerdos.',
      'Ingresa el nombre y correo del representante de la empresa.',
      'Envía la invitación digital con enlace seguro para su firma.'
    ],
    esperado: 'El destinatario recibe el correo con su enlace personal para revisar y firmar el documento.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-22', categoria: 'Panel Admin', ruta: '/admin/legal', critica: false,
    titulo: 'Gestión y claridad de documentos legales',
    descripcion: 'Permite actualizar términos y condiciones, políticas de privacidad y acuerdos de medición de forma ordenada y versionada.',
    pasos: [
      'Abre el gestor de documentos legales en el panel.',
      'Selecciona el documento a revisar (por ejemplo, Política de Privacidad).',
      'Actualiza las cláusulas necesarias y guarda la nueva versión.'
    ],
    esperado: 'Los usuarios pueden consultar la versión vigente en las páginas públicas de forma transparente.',
    journeys: ['Admin Operativa', 'Cliente Final']
  },
  {
    id: 'adm-23', categoria: 'Panel Admin', ruta: '/admin/status', critica: false,
    titulo: 'Supervisión de salud y disponibilidad del servicio',
    descripcion: 'Permite verificar que todos los servicios auxiliares (base de datos, correos, inteligencia artificial) estén operando con normalidad.',
    pasos: [
      'Ingresa a la pantalla de estado del sistema.',
      'Comprueba que los indicadores de cada servicio estén en verde.',
      'Si hay un mantenimiento programado, publica un aviso informativo para los usuarios.'
    ],
    esperado: 'La pantalla muestra el estado de salud de la plataforma de manera clara y accesible.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-24', categoria: 'Panel Admin', ruta: '/admin/planes', critica: true,
    titulo: 'Diseño y ajuste de planes de suscripción',
    descripcion: 'Permite crear o ajustar las condiciones y beneficios de los planes en modo borrador antes de ponerlos a disposición de las empresas.',
    pasos: [
      'Ve a la gestión de planes de suscripción.',
      'Crea un nuevo borrador de plan definiendo límite de cálculos y herramientas incluidas.',
      'Revisa los detalles y haz clic en publicar cuando esté listo.'
    ],
    esperado: 'El plan se publica ordenadamente y se ofrece a las empresas interesadas.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-25', categoria: 'Panel Admin', ruta: '/admin/planes', critica: false,
    titulo: 'Acuerdos personalizados de suscripción por empresa',
    descripcion: 'Permite acordar límites o condiciones especiales con una empresa en particular según el volumen de sus operaciones.',
    pasos: [
      'Selecciona una empresa específica dentro de la gestión de planes.',
      'Ajusta la cantidad de cálculos mensuales acordados en su negociación comercial.',
      'Guarda el acuerdo personalizado.'
    ],
    esperado: 'La empresa disfruta de sus condiciones a la medida sin afectar a las demás organizaciones.',
    journeys: ['Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // PANEL EMPRESA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'emp-14', categoria: 'Panel Empresa', ruta: '/empresa/clientes', critica: true,
    titulo: 'Directorio comercial de clientes y aliados B2B',
    descripcion: 'Organiza la lista de empresas y compradores a quienes les envías cotizaciones o informes de reutilización.',
    pasos: [
      'Ve al directorio de clientes de la empresa.',
      'Busca a un cliente por su nombre comercial o persona de contacto.',
      'Revisa el resumen de cotizaciones enviadas a cada uno.'
    ],
    esperado: 'El listado permite acceder ágilmente a los clientes y ver el historial comercial con cada uno.',
    journeys: ['Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // AUTENTICACIÓN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'auth-13', categoria: 'Autenticación', ruta: '/confirmar-email', critica: true,
    titulo: 'Confirmación de correo tras registro',
    descripcion: 'Permite al usuario validar su dirección de correo electrónico mediante el enlace de confirmación recibido tras registrarse.',
    pasos: [
      'Regístrate con un correo nuevo.',
      'Abre el correo de confirmación y haz clic en el botón de confirmación.',
      'Verifica la pantalla a la que llegas en el navegador.'
    ],
    esperado: 'El enlace confirma tu correo exitosamente y te da la bienvenida directa a la plataforma.',
    journeys: ['Admin Operativa', 'Empleado', 'Cliente Final']
  },
  {
    id: 'auth-14', categoria: 'Autenticación', ruta: '/unsubscribe', critica: false,
    titulo: 'Preferencia para dejar de recibir correos',
    descripcion: 'Respeta la decisión de cualquier usuario que desee darse de baja de correos informativos con un solo clic.',
    pasos: [
      'Abre el pie de página de cualquier notificación por correo y haz clic en "Darme de baja" o "Unsubscribe".',
      'Observa el mensaje de confirmación en la página que se abre.'
    ],
    esperado: 'La pantalla confirma de forma clara que tu preferencia ha sido guardada y que no recibirás más correos de esa lista.',
    journeys: ['Admin Operativa', 'Empleado', 'Directivo', 'Cliente Final']
  },

  // ══════════════════════════════════════════════════════════════════
  // PANEL ADMIN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'adm-26', categoria: 'Panel Admin', ruta: '/admin/firmas/nueva', critica: false,
    titulo: 'Preparación de nuevo acuerdo para firma digital',
    descripcion: 'Facilita adjuntar o redactar un nuevo convenio de cooperación para enviarlo a los directivos firmantes.',
    pasos: [
      'Inicia la creación de una nueva solicitud de firma.',
      'Ingresa los datos de los firmantes y adjunta las cláusulas acordadas.',
      'Envía la solicitud para firma electrónica.'
    ],
    esperado: 'El proceso se genera con un enlace seguro y trazabilidad de recepción.',
    journeys: ['Admin Operativa', 'Directivo']
  },
  {
    id: 'adm-20', categoria: 'Panel Admin', ruta: '/admin/qa', critica: false,
    titulo: 'Control continuo de la calidad de experiencia de usuario',
    descripcion: 'Permite al equipo de producto revisar que cada flujo, pantalla y botón funcione con suavidad para cada tipo de persona usuaria.',
    pasos: [
      'Navega por las tarjetas de pruebas del panel de calidad.',
      'Filtra por categoría o busca un flujo específico.',
      'Marca el resultado de la prueba y registra notas si encuentras algo que mejorar.'
    ],
    esperado: 'El tablero de control refleja el estado de calidad en tiempo real y recuerda tu progreso.',
    journeys: ['Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // PANEL EMPRESA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'emp-15', categoria: 'Panel Empresa', ruta: '/empresa/clientes/[id]', critica: false,
    titulo: 'Ficha detallada del cliente y acuerdos comerciales',
    descripcion: 'Revisa el perfil completo de un cliente específico, sus condiciones de servicio y las cotizaciones activas que tiene con tu empresa.',
    pasos: [
      'Haz clic sobre un cliente en el directorio.',
      'Revisa sus datos de contacto y cotizaciones asociadas.',
      'Actualiza notas comerciales o persona de contacto de ser necesario.'
    ],
    esperado: 'La ficha centraliza toda la información comercial de forma ordenada y fácil de consultar.',
    journeys: ['Admin Operativa', 'Directivo']
  },

  // ══════════════════════════════════════════════════════════════════
  // PÁGINAS PÚBLICAS
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'pub-21', categoria: 'Páginas Públicas', ruta: '/sistema-diseno', critica: false,
    titulo: 'Armonía visual y legibilidad en botones y textos',
    descripcion: 'Verifica que la paleta de colores corporativos, tipografía y componentes básicos ofrezcan una lectura descansada y atractiva.',
    pasos: [
      'Abre la guía del sistema de diseño.',
      'Revisa la colección de botones, etiquetas, alertas e inputs.',
      'Comprueba que los contrastes sean agradables y no cansen la vista.'
    ],
    esperado: 'Todos los componentes mantienen una identidad estética cuidada, coherente y accesible.',
    journeys: ['Cliente Final', 'Empleado', 'Admin Operativa']
  },
  {
    id: 'pub-22', categoria: 'Páginas Públicas', ruta: '/sistema-diseno/demo-panel', critica: false,
    titulo: 'Distribución cómoda en pantallas de todo tamaño',
    descripcion: 'Comprueba que las tarjetas, menús y paneles se acomoden con elegancia tanto en teléfonos pequeños como en computadoras de escritorio.',
    pasos: [
      'Abre la demostración de layouts complejos.',
      'Cambia el tamaño de la ventana para simular un móvil, tableta y monitor grande.'
    ],
    esperado: 'Los elementos se adaptan fluidamente manteniendo la legibilidad y el orden en todo momento.',
    journeys: ['Cliente Final', 'Empleado', 'Directivo']
  },

]

// Candado contra IDs duplicados (bug real 2026-09-06): 2 pruebas con el
// mismo `id` en categorías distintas rompían React — al cambiar de
// categoría, React confunde su contabilidad interna de esas 2 tarjetas y
// deja una de ellas "huérfana" en el DOM en vez de quitarla, mezclando
// pruebas de un módulo con las del siguiente. Esto revienta apenas se
// agregue una fila nueva sin revisar que el id sea único, en vez de dejar
// el bug silencioso hasta que alguien lo note navegando.
{
  const vistos = new Map<string, number>()
  for (const t of TAREAS_INICIALES) vistos.set(t.id, (vistos.get(t.id) ?? 0) + 1)
  const duplicados = Array.from(vistos.entries()).filter(([, n]) => n > 1).map(([id]) => id)
  if (duplicados.length > 0) {
    throw new Error(`[admin/qa] IDs de tarea duplicados en TAREAS_INICIALES: ${duplicados.join(', ')}. Cada id debe ser único en todo el archivo, no solo dentro de su categoría.`)
  }
}

// ── Componente ─────────────────────────────────────────────────────────────────

export default function QAPage() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tareas, setTareas] = useState<Tarea[]>(() =>
    TAREAS_INICIALES.map(t => ({
      ...t,
      estado: 'pendiente' as Estado,
      notas: '',
      roles: getRolesForTaskId(t.id, t.categoria),
      rolesProbados: [],
      resultado_dia: 'pendiente' as Estado,
      resultado_noche: 'pendiente' as Estado,
    }))
  )
  const [expandida, setExpandida] = useState<string | null>(null)
  const [mostrarInforme, setMostrarInforme] = useState<'final' | 'parcial' | null>(null)
  const [alcanceParcial, setAlcanceParcial] = useState<string | null>(null)
  const [mostrarHistorial, setMostrarHistorial] = useState<string | null>(null) // null | 'completo' | nombreCategoria
  const [intentos, setIntentos] = useState<QAIntento[]>([])

  // Bloquear scroll de la página y cerrar con tecla Escape cuando un modal esté abierto
  useEffect(() => {
    if (!mostrarInforme && !mostrarHistorial) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMostrarInforme(null)
        setMostrarHistorial(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mostrarInforme, mostrarHistorial])
  const [categoriaActiva, setCategoriaActiva] = useState(CATEGORIAS[0].key)
  // Dos formas de recorrer las mismas 117 pruebas. 'modulo' agrupa por tema
  // (Autenticación, Panel Admin…), que sirve para revisar un área completa.
  // 'pagina' agrupa por la pantalla real que hay que abrir, para dejar una
  // URL terminada antes de pasar a la siguiente en vez de ir saltando entre
  const [modo, setModo] = useState<'modulo' | 'pagina'>('modulo')
  const [rutaActiva, setRutaActiva] = useState<string | null>(null)
  // Diagnóstico automático: lo que una persona no puede revisar a ojo
  // (columnas que faltan por una migración sin correr, buckets que quedaron
  // públicos, consultas que la base rechaza). Corre contra la base real.
  
  const categoriasReactivas = useMemo(() => CATEGORIAS.map(cat => {
    if (cat.key === 'Modo Noche') return { ...cat, color: isDark ? '#D6F391' : '#6C8E24' }
    if (cat.key === 'Páginas Públicas') return { ...cat, color: isDark ? '#F3BBD3' : '#C44D7C' }
    return cat
  }), [isDark])
  const [diagnostico, setDiagnostico] = useState<{
    resumen: { total: number; ok: number; avisos: number; fallas: number }
    comprobaciones: { grupo: string; nombre: string; estado: 'ok' | 'aviso' | 'falla'; detalle: string }[]
  } | null>(null)
  const [diagnosticando, setDiagnosticando] = useState(false)
  const [errorDiagnostico, setErrorDiagnostico] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [ultimoGuardado, setUltimoGuardado] = useState<Date | null>(null)
  const [guardadoReciente, setGuardadoReciente] = useState(false)
  const [segundosRestantes, setSegundosRestantes] = useState(180)
  const tareasPendientesRef = useRef(tareas)

  useEffect(() => { tareasPendientesRef.current = tareas }, [tareas])

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    setMounted(true)
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    try {
      localStorage.removeItem(LS_KEY_V4)
      localStorage.removeItem(LS_KEY_V3)
      localStorage.removeItem(LS_KEY)
      // Cargar v5 (tiene borrador + historial de intentos)
      const savedV5 = localStorage.getItem(LS_KEY_V5)
      if (savedV5) {
        const store = JSON.parse(savedV5) as { intentos?: QAIntento[]; borrador?: { id: string; estado: Estado; notas: string; rolesProbados?: RolPrueba[]; resultado_dia?: Estado; resultado_noche?: Estado; ts?: number }[] }
        if (store.borrador?.length) {
          setTareas(prev => prev.map(t => {
            const s = store.borrador!.find(p => p.id === t.id)
            if (!s) return t
            const rawEstado = s.estado as string
            const estadoValido: Estado = ['ok', 'parcial', 'no_se_entiende', 'falla'].includes(rawEstado) ? (rawEstado as Estado) : 'pendiente'
            const diaRaw = s.resultado_dia as string | undefined
            const diaValido: Estado = diaRaw === 'ok' || diaRaw === 'falla' ? (diaRaw as Estado) : 'pendiente'
            const nocheRaw = s.resultado_noche as string | undefined
            const nocheValido: Estado = nocheRaw === 'ok' || nocheRaw === 'falla' ? (nocheRaw as Estado) : 'pendiente'
            const notasLimpias = estadoValido === 'ok' ? '' : (s.notas || '')
            return {
              ...t,
              estado: estadoValido,
              notas: notasLimpias,
              rolesProbados: s.rolesProbados || [],
              resultado_dia: diaValido,
              resultado_noche: nocheValido
            }
          }))
          const ts = store.borrador[0]?.ts
          if (ts) setUltimoGuardado(new Date(ts))
        }
        if (store.intentos?.length) setIntentos(store.intentos)
        return
      }
    } catch { /* ignorar */ }
  }, [])

  const guardar = useCallback((tareasList?: Tarea[]) => {
    const data = tareasList ?? tareasPendientesRef.current
    const ahora = new Date()
    try {
      const borrador = data.map((t: Tarea) => ({
        id: t.id, estado: t.estado, notas: t.notas,
        rolesProbados: t.rolesProbados || [],
        resultado_dia: t.resultado_dia,
        resultado_noche: t.resultado_noche,
        ts: ahora.getTime()
      }))
      const storeRaw = localStorage.getItem(LS_KEY_V5)
      const storeExistente = storeRaw ? (JSON.parse(storeRaw) as { intentos?: QAIntento[] }) : {}
      localStorage.setItem(LS_KEY_V5, JSON.stringify({ intentos: storeExistente.intentos || [], borrador }))
      setUltimoGuardado(ahora)
      setSegundosRestantes(180)
      setGuardadoReciente(true)
      setTimeout(() => setGuardadoReciente(false), 2000)
    } catch { /* ignorar */ }
  }, [])

  const guardarIntento = useCallback((alcance: 'completo' | string) => {
    const data = tareasPendientesRef.current
    const tareasSnap = alcance === 'completo'
      ? data
      : data.filter(t => t.categoria === alcance)
    setIntentos(prev => {
      const numeroSiguiente = prev.filter(i => i.alcance === alcance).length + 1
      const nuevo: QAIntento = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: new Date().toISOString(),
        etiqueta: `Intento ${numeroSiguiente}`,
        alcance,
        tareas: tareasSnap.map(t => ({ id: t.id, estado: t.estado, notas: t.notas }))
      }
      const actualizados = [nuevo, ...prev]
      try {
        const storeRaw = localStorage.getItem(LS_KEY_V5)
        const storeExistente = storeRaw ? (JSON.parse(storeRaw) as { borrador?: unknown }) : {}
        localStorage.setItem(LS_KEY_V5, JSON.stringify({ ...storeExistente, intentos: actualizados }))
      } catch { /* ignorar */ }
      return actualizados
    })
    
    // Al guardar un intento, resetear todas las tareas (o las del alcance) para una nueva evaluación en blanco, EXCEPTUANDO LAS OK.
    setTareas(prev => prev.map(t => {
      if (alcance !== 'completo' && t.categoria !== alcance) return t
      if (t.estado === 'ok') return t // Si ya pasó, no se reevalúa en la próxima ronda
      return {
        ...t,
        estado: 'pendiente',
        notas: '',
        resultado_dia: undefined,
        resultado_noche: undefined
      }
    }))
  }, [])

  const borrarIntento = useCallback((id: string) => {
    setIntentos(prev => {
      const filtrados = prev.filter(i => i.id !== id)
      try {
        const storeRaw = localStorage.getItem(LS_KEY_V5)
        const storeExistente = storeRaw ? (JSON.parse(storeRaw) as { borrador?: unknown }) : {}
        localStorage.setItem(LS_KEY_V5, JSON.stringify({ ...storeExistente, intentos: filtrados }))
      } catch { /* ignorar */ }
      return filtrados
    })
  }, [])

  const borrarHistoriales = useCallback((alcance: string) => {
    setIntentos(prev => {
      const filtrados = prev.filter(i => i.alcance !== alcance)
      try {
        const storeRaw = localStorage.getItem(LS_KEY_V5)
        const storeExistente = storeRaw ? (JSON.parse(storeRaw) as { borrador?: unknown }) : {}
        localStorage.setItem(LS_KEY_V5, JSON.stringify({ ...storeExistente, intentos: filtrados }))
      } catch { /* ignorar */ }
      return filtrados
    })
  }, [])

  useEffect(() => {
    const ticker = setInterval(() => {
      setSegundosRestantes(s => {
        if (s <= 1) { guardar(); return 180 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(ticker)
  }, [guardar])

  const actualizar = (id: string, campo: 'estado' | 'notas', valor: string) =>
    setTareas(prev => {
      const updated: Tarea[] = prev.map(t => {
        if (t.id !== id) return t
        if (campo === 'notas') {
          return { ...t, notas: valor }
        }
        const nuevoEstado: Estado = t.estado === valor ? 'pendiente' : (valor as Estado)
        if (nuevoEstado === 'ok') {
          return {
            ...t,
            estado: 'ok',
            notas: '', // Cuando se aprueba, se borran los comentarios
            resultado_dia: t.resultado_dia === 'falla' ? 'ok' : t.resultado_dia,
            resultado_noche: t.resultado_noche === 'falla' ? 'ok' : t.resultado_noche,
          }
        }
        return {
          ...t,
          estado: nuevoEstado,
        }
      })
      guardar(updated)
      return updated
    })

  const toggleRolProbado = (id: string, rol: RolPrueba) => {
    setTareas(prev => {
      const updated = prev.map(t => {
        if (t.id !== id) return t
        const curr = t.rolesProbados || []
        const next = curr.includes(rol)
          ? curr.filter(r => r !== rol)
          : [...curr, rol]
        return { ...t, rolesProbados: next }
      })
      guardar(updated)
      return updated
    })
  }

  const actualizarModo = (id: string, modo: 'resultado_dia' | 'resultado_noche', valor: Estado) => {
    setTareas(prev => {
      const updated = prev.map(t => {
        if (t.id !== id) return t
        const valorActual = t[modo]
        const nuevoValor: Estado = valorActual === valor ? 'pendiente' : valor
        const nuevo = { ...t, [modo]: nuevoValor }
        const otroModo = modo === 'resultado_dia' ? nuevo.resultado_noche : nuevo.resultado_dia

        if (nuevoValor === 'falla' || otroModo === 'falla') {
          nuevo.estado = 'falla'
        } else if (nuevoValor === 'ok' && otroModo === 'ok') {
          nuevo.estado = 'ok'
          nuevo.notas = ''
        } else if (nuevoValor === 'ok' && (!otroModo || otroModo === 'pendiente')) {
          nuevo.estado = 'ok'
        } else if (nuevoValor === 'pendiente' && otroModo === 'ok') {
          nuevo.estado = 'ok'
        } else if (nuevoValor === 'pendiente' && (!otroModo || otroModo === 'pendiente')) {
          if (nuevo.estado === 'ok') {
            nuevo.estado = 'pendiente'
          }
        }
        return nuevo
      })
      guardar(updated)
      return updated
    })
  }

  const resetear = () => {
    localStorage.removeItem(LS_KEY_V5)
    localStorage.removeItem(LS_KEY_V4)
    localStorage.removeItem(LS_KEY_V3)
    localStorage.removeItem(LS_KEY)
    const reseteadas = TAREAS_INICIALES.map(t => ({
      ...t,
      estado: 'pendiente' as Estado,
      notas: '',
      roles: getRolesForTaskId(t.id, t.categoria),
      rolesProbados: [],
      resultado_dia: 'pendiente' as Estado,
      resultado_noche: 'pendiente' as Estado,
    }))
    setTareas(reseteadas)
    setIntentos([])
    guardar(reseteadas)
    setMostrarInforme(null)
  }

  // Métricas
  const total          = tareas.length
  const oks            = tareas.filter(t => t.estado === 'ok').length
  const parciales      = tareas.filter(t => t.estado === 'parcial').length
  const noSeEntiende   = tareas.filter(t => t.estado === 'no_se_entiende').length
  const fallas         = tareas.filter(t => t.estado === 'falla').length
  const criticas       = tareas.filter(t => t.critica && t.estado === 'falla').length
  const pendientes     = tareas.filter(t => t.estado === 'pendiente').length
  const revisadas      = total - pendientes
  const progreso       = total > 0 ? Math.round((revisadas / total) * 100) : 0

  // Pantallas del recorrido: una por ruta única, en el orden en que aparecen
  // las pruebas. El Map conserva ese orden de inserción.
  const paginas = (() => {
    const mapa = new Map<string, Tarea[]>()
    for (const t of tareas) {
      if (!mapa.has(t.ruta)) mapa.set(t.ruta, [])
      mapa.get(t.ruta)!.push(t)
    }
    return Array.from(mapa.entries()).map(([ruta, pruebas]) => ({ ruta, pruebas }))
  })()

  const rutaVigente = rutaActiva ?? paginas[0]?.ruta ?? ''
  const indicePagina = Math.max(0, paginas.findIndex(p => p.ruta === rutaVigente))
  const paginaActual = paginas[indicePagina]

  // Tareas visibles según el módulo activo, filtradas por búsqueda
  const tareasCategoria = tareas.filter(t => {
    if (modo === 'pagina') {
      if (t.ruta !== rutaVigente) return false
    } else if (t.categoria !== categoriaActiva) return false
    if (!busqueda) return true
    const b = busqueda.toLowerCase()
    return t.titulo.toLowerCase().includes(b) || t.ruta.includes(b) || t.descripcion.toLowerCase().includes(b)
  })

  // El contenido del lado se considera pequeño si tiene 2 o menos pruebas
  const contenidoLadoPequeno = tareasCategoria.length <= 2

  const alcanceEfectivoParcial = alcanceParcial ?? (modo === 'modulo' ? categoriaActiva : rutaVigente)

  // Generación de informe
  const generarInforme = (tipoParam?: 'final' | 'parcial', alcancesParam?: string, formato: 'completo' | 'compacto' = 'compacto') => {
    const tipo = tipoParam ?? (mostrarInforme ?? 'final')

    const armarLineaPrueba = (t: Tarea) => {
      // El estado NO se repite aquí: cada línea ya vive bajo un encabezado
      // de sección que lo dice ("FALLAS REPORTADAS:", "CUMPLE PARCIAL:"...),
      // así que ponerlo de nuevo en cada fila es puro gasto de tokens sin
      // ningún dato nuevo. Texto plano en vez de emoji: mismo significado,
      // sin el costo de token variable de un emoji.
      const criticaFlag = t.critica && t.estado !== 'ok' ? ' [CRIT]' : ''
      const parts = [`[${t.id}] ${t.ruta} — ${t.titulo}${criticaFlag}`]

      // Solo en las que NO pasaron: sin esto, quien recibe el informe (o
      // quien lo arregla después) no sabe qué se esperaba de verdad, solo
      // que algo falló — obliga a ir a abrir el catálogo a buscar la
      // prueba por su id antes de poder hacer algo con el reporte.
      if (t.estado !== 'ok') parts.push(`Esperado: ${t.esperado}`)

      const rolesStr = (t.rolesProbados || []).map(r => ROL_LABELS[r]).join(',')
      if (rolesStr) parts.push(`Roles: ${rolesStr}`)

      if (t.resultado_dia === 'ok' || t.resultado_dia === 'falla') parts.push(`Día: ${t.resultado_dia}`)
      if (t.resultado_noche === 'ok' || t.resultado_noche === 'falla') parts.push(`Noche: ${t.resultado_noche}`)

      if (t.notas.trim()) parts.push(`Notas: ${t.notas.trim()}`)

      return parts.join(' | ')
    }

    if (tipo === 'parcial') {
      const esPorTema = modo === 'modulo'
      const targetScope = alcancesParam ?? alcanceEfectivoParcial
      const scopeLabel = esPorTema ? `TEMA: ${targetScope}` : `PANTALLA: ${targetScope}`
      const pruebasScope = esPorTema 
        ? tareas.filter(t => t.categoria === targetScope)
        : tareas.filter(t => t.ruta === targetScope)

      const evaluadas = pruebasScope.filter(t => t.estado !== 'pendiente')
      const oks = evaluadas.filter(t => t.estado === 'ok').length
      const parciales = evaluadas.filter(t => t.estado === 'parcial').length
      const dudosas = evaluadas.filter(t => t.estado === 'no_se_entiende').length
      const fallas = evaluadas.filter(t => t.estado === 'falla').length

      const pendientesScope = pruebasScope.length - evaluadas.length
      const lineas = [
        `QA PARCIAL - ${scopeLabel}`,
        `RESUMEN: ${oks} Aprobadas, ${parciales} Cumple parcial, ${dudosas} No se entiende, ${fallas} Fallas, ${pendientesScope} Pendientes. (Evaluadas: ${evaluadas.length}/${pruebasScope.length})`,
      ]

      // Críticas primero: es lo primero que hay que arreglar, no debería
      // depender de en qué orden quedaron en el catálogo.
      const fallidas = evaluadas.filter(t => t.estado === 'falla').sort((a, b) => (b.critica ? 1 : 0) - (a.critica ? 1 : 0))
      const dudosasArr = evaluadas.filter(t => t.estado === 'no_se_entiende')
      const parcialesArr = evaluadas.filter(t => t.estado === 'parcial')
      const aprobadasArr = evaluadas.filter(t => t.estado === 'ok')

      if (fallidas.length > 0) {
        lineas.push(``)
        lineas.push(`FALLAS REPORTADAS:`)
        for (const t of fallidas) {
          lineas.push(`- ${armarLineaPrueba(t)}`)
        }
      }

      if (dudosasArr.length > 0) {
        lineas.push(``)
        lineas.push(`NO SE ENTIENDE:`)
        for (const t of dudosasArr) {
          lineas.push(`- ${armarLineaPrueba(t)}`)
        }
      }

      if (parcialesArr.length > 0) {
        lineas.push(``)
        lineas.push(`CUMPLE PARCIAL:`)
        for (const t of parcialesArr) {
          lineas.push(`- ${armarLineaPrueba(t)}`)
        }
      }

      if (formato === 'completo' && aprobadasArr.length > 0) {
        lineas.push(``)
        lineas.push(`APROBADAS:`)
        for (const t of aprobadasArr) {
          lineas.push(`- ${armarLineaPrueba(t)}`)
        }
      }

      if (evaluadas.length === 0) {
        lineas.push(`\n(Sin pruebas evaluadas en este alcance)`)
      }

      return lineas.join('\n')
    }

    // INFORME FINAL
    const evaluadas = tareas.filter(t => t.estado !== 'pendiente')
    const oksFinal = evaluadas.filter(t => t.estado === 'ok').length
    const parcialesFinal = evaluadas.filter(t => t.estado === 'parcial').length
    const dudosasFinal = evaluadas.filter(t => t.estado === 'no_se_entiende').length
    const fallasFinal = evaluadas.filter(t => t.estado === 'falla').length

    const pendientesFinal = total - evaluadas.length
    const lineas = [
      `QA GLOBAL - REÚSO`,
      `RESUMEN: ${oksFinal} Aprobadas, ${parcialesFinal} Cumple parcial, ${dudosasFinal} No se entiende, ${fallasFinal} Fallas, ${pendientesFinal} Pendientes. (Cobertura: ${evaluadas.length}/${total})`,
    ]

    const fallidas = evaluadas.filter(t => t.estado === 'falla')
    const dudosasArr = evaluadas.filter(t => t.estado === 'no_se_entiende')
    const parcialesArr = evaluadas.filter(t => t.estado === 'parcial')

    if (fallidas.length > 0) {
      lineas.push(``)
      lineas.push(`FALLAS ENCONTRADAS:`)
      for (const t of fallidas) {
        lineas.push(`- ${armarLineaPrueba(t)}`)
      }
    }

    if (dudosasArr.length > 0) {
      lineas.push(``)
      lineas.push(`NO SE ENTIENDE:`)
      for (const t of dudosasArr) {
        lineas.push(`- ${armarLineaPrueba(t)}`)
      }
    }

    if (parcialesArr.length > 0) {
      lineas.push(``)
      lineas.push(`CUMPLE PARCIAL:`)
      for (const t of parcialesArr) {
        lineas.push(`- ${armarLineaPrueba(t)}`)
      }
    }

    if (evaluadas.length === 0) {
      lineas.push(`\n(Sin pruebas evaluadas aún)`)
    } else if (fallidas.length === 0 && dudosasArr.length === 0 && parcialesArr.length === 0) {
      lineas.push(`\n✓ SISTEMA APROBADO: Todas las pruebas evaluadas resultaron exitosas.`)
    }

    if (formato === 'completo') {
      const exitosas = evaluadas.filter(t => t.estado === 'ok')
      if (exitosas.length > 0) {
        lineas.push(``)
        lineas.push(`PRUEBAS APROBADAS (RESUMEN):`)
        for (const t of exitosas) {
          lineas.push(`- ${armarLineaPrueba(t)}`)
        }
      }
    }

    return lineas.join('\n')
  }

  const correrDiagnostico = async () => {
    setDiagnosticando(true)
    setErrorDiagnostico(null)
    try {
      const res = await fetch('/api/admin/qa/diagnostico')
      if (!res.ok) throw new Error(`El servidor respondió ${res.status}`)
      setDiagnostico(await res.json())
    } catch (e) {
      setErrorDiagnostico(e instanceof Error ? e.message : 'No se pudo completar el diagnóstico.')
      setDiagnostico(null)
    } finally {
      setDiagnosticando(false)
    }
  }

  const descargarDiagnostico = () => {
    // El .txt lo arma el servidor, para que el archivo diga exactamente lo
    // mismo que se comprobó y no una copia reconstruida en el navegador.
    window.location.href = '/api/admin/qa/diagnostico?formato=txt'
  }

  const descargar = () => {
    const tipo = mostrarInforme ?? 'final'
    const scopeVal = alcanceEfectivoParcial
    const texto = generarInforme(tipo, scopeVal)
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const suffix = tipo === 'parcial'
      ? `parcial-${scopeVal.replace(/[\/\s]+/g, '-').replace(/^-|-$/g, '') || (modo === 'modulo' ? 'tema' : 'pantalla')}`
      : 'final'
    a.download = `informe-qa-${suffix}-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!mounted) {
    return (
      <div className="h-full min-h-[60vh] bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center font-sans">
        <LogoSpinner size={96} />
      </div>
    )
  }

  // Tema (idéntico a pivot-roadmap)
  const theme = {
    bg:                isDark ? 'bg-[#474747]'                           : 'bg-white',
    textPrimary:       isDark ? 'text-white'                             : 'text-[#474747]',
    textSecondary:     isDark ? 'text-white/70'                          : 'text-[#474747]/70',
    textTitle:         isDark ? 'text-white'                             : 'text-[#474747]',
    headerBg:          isDark ? 'bg-black/10 backdrop-blur-md border-white/10'
                              : 'bg-white/60 backdrop-blur-md border-[rgba(0,130,124,0.12)]',
    cardBg:            isDark ? 'bg-black/5 backdrop-blur-sm border-white/5'
                              : 'bg-white/50 backdrop-blur-sm border-[rgba(0,130,124,0.10)]',
    sidebarActiveBg:   isDark ? 'bg-white/10 border-[#00827C] shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                              : 'bg-white/90 border-[rgba(0,130,124,0.3)] shadow-[0_4px_12px_rgba(0,130,124,0.08)]',
    sidebarInactiveBg: isDark ? 'bg-transparent border-white/[0.05] hover:border-white/10 hover:bg-white/[0.05]'
                              : 'bg-white/30 border-black/5 hover:bg-white hover:border-black/10',
    inputBg:           isDark ? 'bg-black/20 border-white/10' : 'bg-white/60 border-[rgba(0,130,124,0.12)]',
    divider:           isDark ? 'border-white/10'               : 'border-[rgba(0,130,124,0.08)]',
    glowColor:         isDark ? '#00827C'                                : '#38B98E',
    shadow:            isDark ? 'rgba(0,0,0,0.25)'                      : 'rgba(0,130,124,0.06)',
  }

  const catActual = categoriasReactivas.find(c => c.key === categoriaActiva)!

  return (
    <div className={`h-full ${theme.bg} ${theme.textPrimary} font-sans antialiased relative transition-colors duration-500`}>

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* ── Header glass ──────────────────────────────────────────────────── */}
        <header
          className={`mb-6 border ${theme.headerBg} rounded-2xl p-6 relative overflow-hidden transition-all duration-300`}
          style={{ boxShadow: `0 8px 32px 0 ${theme.shadow}` }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div>
              <p className={`text-xs font-medium ${theme.textSecondary} mb-1.5`}>
                Auditoría & QA
              </p>
              <h1 className={`text-3xl font-bold tracking-tight ${theme.textTitle} mb-2`}>
                Panel de Pruebas - Reúso
              </h1>
              <p className={`${theme.textSecondary} text-sm max-w-xl`}>
                {total} pruebas en {categoriasReactivas.length} módulos. Guarda tus apuntes y genera el informe final.
              </p>
            </div>

            {/* Progreso circular + controles */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Progress circular */}
              <div
                className={`border ${theme.cardBg} rounded-xl p-4 flex items-center gap-4 min-w-[240px] transition-all`}
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,130,124,0.06)' }}
              >
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28"
                      className={isDark ? 'stroke-white/10' : 'stroke-[#e2f3f1]'}
                      strokeWidth="6" fill="transparent" />
                    <circle cx="32" cy="32" r="28"
                      className={isDark ? 'stroke-[#00827C]' : 'stroke-[#38B98E]'}
                      strokeWidth="6" fill="transparent"
                      strokeDasharray={175.9}
                      strokeDashoffset={175.9 - (175.9 * progreso) / 100}
                      strokeLinecap="round" />
                  </svg>
                  <span className={`absolute text-sm font-bold ${theme.textTitle}`}>{progreso} %</span>
                </div>
                <div>
                  <div className={`text-xs ${theme.textSecondary} opacity-75`}>Progreso General</div>
                  <div className={`text-lg font-bold ${theme.textTitle}`}>{revisadas} de {total} pruebas</div>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs mt-1">
                    <span className="text-[#38B98E] font-semibold">{oks} aprobadas</span>
                    <span className={`${theme.textSecondary} opacity-40`}>·</span>
                    <span className="text-[#F59E0B] font-semibold">{parciales} parciales</span>
                    <span className={`${theme.textSecondary} opacity-40`}>·</span>
                    <span className="text-[#985fa1] font-semibold">{noSeEntiende} no se entiende</span>
                    <span className={`${theme.textSecondary} opacity-40`}>·</span>
                    <span className="text-[#FF5E4B] font-semibold">{fallas} fallas{criticas > 0 ? ` (${criticas} crít.)` : ''}</span>
                    <span className={`${theme.textSecondary} opacity-40`}>·</span>
                    <span className={`${theme.textSecondary} font-semibold opacity-75`}>{pendientes} pendientes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de acciones */}
          <div className={`mt-6 pt-6 border-t ${theme.divider} flex flex-col md:flex-row gap-3 lg:gap-4 items-start md:items-center justify-between`}>
            {/* Estado de guardado en 2 líneas */}
            <div className={`flex items-center gap-2 text-xs ${theme.textSecondary} shrink-0`}>
              <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 bg-[#00827C]`} />
              {guardadoReciente ? (
                <div className="flex flex-col leading-tight">
                  <span className="text-[#38B98E] font-semibold flex items-center gap-1">
                    <CheckCircle size={12} /> Guardado
                  </span>
                  <span className="text-[11px] opacity-70 whitespace-nowrap">
                    Autoguardado en {Math.floor(segundosRestantes / 60)}:{String(segundosRestantes % 60).padStart(2, '0')}
                  </span>
                </div>
              ) : ultimoGuardado ? (
                <div className="flex flex-col leading-tight">
                  <span className="whitespace-nowrap">
                    Guardado {ultimoGuardado.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[11px] opacity-70 whitespace-nowrap">
                    Autoguardado en {Math.floor(segundosRestantes / 60)}:{String(segundosRestantes % 60).padStart(2, '0')}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col leading-tight">
                  <span className="whitespace-nowrap">Sin guardar</span>
                  <span className="text-[11px] opacity-70 whitespace-nowrap">
                    Autoguardado en {Math.floor(segundosRestantes / 60)}:{String(segundosRestantes % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* Controles y botones (wrap en móvil) */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:gap-2.5 w-full md:w-auto pt-3 md:pt-0">
              {/* Búsqueda */}
              <div className="relative w-full sm:w-40 md:w-44 lg:w-56 xl:w-64 transition-all">
                <MagnifyingGlass size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textSecondary} opacity-60`} />
                <input
                  type="text"
                  placeholder="Buscar prueba..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className={`w-full pl-8 pr-2.5 py-1.5 ${theme.inputBg} border rounded-lg text-xs md:text-sm ${theme.textPrimary} ${isDark ? 'placeholder-white/50 focus:border-[#00827C]' : 'placeholder-[#00827C]/50 focus:border-[#38B98E]'} focus:outline-none focus:ring-1 transition-all`}
                />
              </div>
              <button
                onClick={resetear}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${theme.cardBg} ${theme.textSecondary} text-xs font-semibold hover:scale-105 active:scale-95 transition-all hover-spin shrink-0 whitespace-nowrap`}
              >
                <ArrowCounterClockwise size={13} /> Reiniciar
              </button>
              <button
                onClick={() => { guardar(); guardarIntento('completo') }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold hover:scale-105 active:scale-95 transition-all hover-download shrink-0 whitespace-nowrap ${
                  guardadoReciente
                    ? 'bg-[#38B98E]/10 border-[#38B98E]/30 text-[#38B98E]'
                    : `${theme.cardBg} ${theme.textSecondary}`
                }`}
              >
                <FloppyDisk size={13} /> Guardar general
              </button>
              <button
                onClick={() => setMostrarHistorial('completo')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold hover:scale-105 active:scale-95 transition-all hover-pop shrink-0 whitespace-nowrap ${theme.cardBg} ${theme.textSecondary}`}
              >
                <FileText size={13} /> Historial ({intentos.filter(i => i.alcance === 'completo').length})
              </button>
              <button
                onClick={() => setMostrarInforme('final')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-0 text-xs font-bold hover:scale-105 active:scale-95 transition-all hover-pop shrink-0 whitespace-nowrap bg-[#00827C] text-white`}
              >
                <FileText size={13} /> Informe final
              </button>
            </div>
          </div>
        </header>




        {/* ── Grid principal ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">

          {/* Sidebar de categorías (Módulos del sistema solo por tema).
              Solo aplica scroll / límite de altura si es necesario y el
              contenido del lado es muy pequeño, evitando cortes innecesarios. */}
          <div className={`lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-6 lg:z-20 ${contenidoLadoPequeno ? 'lg:max-h-[calc(100vh-2rem)]' : ''}`}>
            <div
              className={`border ${theme.headerBg} rounded-2xl p-4 transition-all flex flex-col ${contenidoLadoPequeno ? 'lg:max-h-[calc(100vh-2rem)]' : ''}`}
              style={{ boxShadow: `0 4px 24px ${theme.shadow}` }}
            >
              <h2 className={`text-sm font-semibold ${theme.textSecondary} mb-3 px-1 flex items-center justify-between`}>
                <span>{modo === 'pagina' ? 'Pantallas del sistema' : 'Módulos del sistema'}</span>
              </h2>

              <div className={`flex gap-1.5 mb-3 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <button
                  onClick={() => { setModo('modulo'); setExpandida(null) }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    modo === 'modulo'
                      ? 'bg-[#00827C] text-white shadow-sm'
                      : `bg-transparent ${theme.textSecondary} hover:opacity-70`
                  }`}
                >
                  Por tema
                </button>
                <button
                  onClick={() => { setModo('pagina'); setExpandida(null) }}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    modo === 'pagina'
                      ? 'bg-[#00827C] text-white shadow-sm'
                      : `bg-transparent ${theme.textSecondary} hover:opacity-70`
                  }`}
                >
                  Pantalla a pantalla
                </button>
              </div>

              {modo === 'pagina' && (
                <div className="flex flex-col gap-1.5 max-h-[600px] overflow-y-auto pr-1">
                  {paginas.map((pag, idx) => {
                    const activa = pag.ruta === rutaVigente
                    const pOk = pag.pruebas.filter(t => t.estado === 'ok').length
                    const pFail = pag.pruebas.filter(t => t.estado === 'falla').length
                    const lista = pOk === pag.pruebas.length
                    return (
                      <button
                        key={pag.ruta}
                        onClick={() => { setRutaActiva(pag.ruta); setExpandida(null) }}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 ${
                          activa ? theme.sidebarActiveBg : theme.sidebarInactiveBg
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`${theme.textSecondary} opacity-50 tabular-nums shrink-0`}>{idx + 1}</span>
                          <span className={`truncate font-mono ${theme.textPrimary}`}>{pag.ruta}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <span className={pFail > 0 ? 'text-[#FF5E4B] font-semibold' : lista ? 'text-[#38B98E] font-semibold' : theme.textSecondary}>
                            {pOk}/{pag.pruebas.length}
                          </span>
                          {lista && <CheckCircle size={11} className="text-[#38B98E]" />}
                          {pFail > 0 && <XCircle size={11} className="text-[#FF5E4B]" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {modo === 'modulo' && (
                <div className={`flex flex-col gap-2.5 p-1.5 -m-1.5 ${contenidoLadoPequeno ? 'lg:overflow-y-auto pr-2' : ''}`}>
                  {categoriasReactivas.map(cat => {
                    const isActive = categoriaActiva === cat.key
                    const ct = tareas.filter(t => t.categoria === cat.key)
                    const cOk = ct.filter(t => t.estado === 'ok').length
                    const cFail = ct.filter(t => t.estado === 'falla').length
                    const isDone = ct.length > 0 && ct.every(t => t.estado === 'ok')
                    const Icon = cat.icono

                    return (
                      <button
                        key={cat.key}
                        onClick={() => { setCategoriaActiva(cat.key); setExpandida(null) }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 relative group flex flex-col gap-1.5 overflow-hidden shrink-0 hover:z-10 hover:-translate-y-1 hover:border-[var(--card-color)] ${
                          isActive 
                            ? `border-[var(--card-color)] z-10 shadow-[inset_0_0_40px_var(--card-bg-active)] hover:shadow-[0_8px_30px_var(--card-glow),inset_0_0_40px_var(--card-bg-active)] ${isDark ? 'bg-white/5' : 'bg-white'}` 
                            : `hover:shadow-[0_8px_30px_var(--card-glow)] ${theme.sidebarInactiveBg}`
                        }`}
                        style={{
                          '--card-color': cat.color,
                          '--card-glow': isDark ? `${cat.color}40` : `${cat.color}30`,
                          '--card-bg-active': isDark ? `${cat.color}30` : `${cat.color}20`
                        } as React.CSSProperties}
                      >
                        {/* Barra lateral de color */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 transition-all rounded-l-xl"
                          style={{ backgroundColor: cat.color }} />

                        <div className="pl-2.5 flex items-start justify-between gap-2">
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded tracking-wide flex items-center gap-1"
                            style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                          >
                            <Icon size={11} />
                            {cat.key.split(' ')[0]}
                          </span>
                          <div className={`flex items-center gap-1.5 text-xs ${theme.textSecondary} opacity-80`}>
                            <span className={cFail > 0 ? 'text-[#FF5E4B] font-semibold' : isDone ? 'text-[#38B98E] font-semibold' : ''}>
                              {cOk}/{ct.length}
                            </span>
                            {isDone && <CheckCircle size={11} className="text-[#38B98E]" />}
                            {cFail > 0 && <XCircle size={11} className="text-[#FF5E4B]" />}
                          </div>
                        </div>

                        <div className={`pl-2.5 font-semibold text-sm transition-colors duration-300 leading-tight group-hover:!text-[var(--card-color)] ${isActive ? '!text-[var(--card-color)]' : theme.textTitle}`}>
                          {cat.key}
                        </div>

                        {/* Mini barra de progreso */}
                        <div className="pl-2.5 mt-0.5">
                          <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[#00827C]/8'}`}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${ct.length > 0 ? (cOk / ct.length) * 100 : 0}%`,
                                backgroundColor: cFail > 0 ? '#FF5E4B' : cat.color,
                              }}
                            />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Panel de tareas */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Cabecera del módulo activo */}
            <div
              className={`border ${theme.headerBg} rounded-2xl px-5 py-4 transition-all`}
              style={{ boxShadow: `0 4px 24px ${theme.shadow}` }}
            >
              {modo === 'pagina' && paginaActual ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: '#00827C' }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className={`text-sm font-mono font-semibold ${theme.textPrimary} break-all`}>
                            {paginaActual.ruta}
                          </span>
                          {/* Una ruta con [token] o [id] no se puede abrir tal cual:
                              hay que reemplazar el tramo por uno real primero. */}
                          {!paginaActual.ruta.includes('[') && paginaActual.ruta.startsWith('/') && (
                            <a
                              href={paginaActual.ruta}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-xs px-2 py-1 rounded-lg border transition-all ${theme.inputBg} ${theme.textSecondary} hover:opacity-80`}
                            >
                              Abrir en otra pestaña
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => { setAlcanceParcial(paginaActual.ruta); setMostrarInforme('parcial') }}
                            className={`text-xs px-2 py-1 rounded-lg border font-semibold transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-[#00827C]/20 text-[#00827C] border-[#00827C]/30' : 'bg-[#00827C]/10 text-[#00827C] border-[#00827C]/30'}`}
                          >
                            <FileText size={11} className="inline mr-1" /> Informe de esta pantalla
                          </button>
                        </div>
                        <p className={`text-xs ${theme.textSecondary}`}>
                          Pantalla {indicePagina + 1} de {paginas.length} · {paginaActual.pruebas.length} prueba{paginaActual.pruebas.length === 1 ? '' : 's'} aquí
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { const i = Math.max(0, indicePagina - 1); setRutaActiva(paginas[i].ruta); setExpandida(null) }}
                        disabled={indicePagina === 0}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${theme.inputBg} ${theme.textSecondary} disabled:opacity-30`}
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => { const i = Math.min(paginas.length - 1, indicePagina + 1); setRutaActiva(paginas[i].ruta); setExpandida(null) }}
                        disabled={indicePagina >= paginas.length - 1}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all disabled:opacity-30 ${
                          isDark ? 'bg-[#00827C] text-white border-transparent font-semibold'
                                 : 'bg-[#00827C] text-white border-transparent font-semibold'
                        }`}
                      >
                        Siguiente pantalla
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: catActual.color }} />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <catActual.icono size={16} color={catActual.color} />
                        <span className="text-xs font-bold" style={{ color: catActual.color }}>
                          {catActual.key}
                        </span>
                      </div>
                      <p className={`text-xs ${theme.textSecondary}`}>
                        {tareasCategoria.length === 0 ? 'Sin resultados con ese filtro.' : `${tareasCategoria.length} prueba${tareasCategoria.length === 1 ? '' : 's'} en este módulo`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setAlcanceParcial(catActual.key); setMostrarInforme('parcial') }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all hover:scale-105 active:scale-95 shrink-0 ${isDark ? 'bg-[#00827C]/20 text-[#00827C] border-[#00827C]/30' : 'bg-[#00827C]/10 text-[#00827C] border-[#00827C]/30'}`}
                  >
                    <FileText size={11} className="inline mr-1" /> Informe de este tema
                  </button>
                </div>
              )}
            </div>

            {/* Lista de tareas */}
            <div className="flex flex-col gap-3">
              {tareasCategoria.length === 0 ? (
                <div className={`border ${theme.cardBg} rounded-2xl p-12 text-center`} style={{ boxShadow: `0 4px 24px ${theme.shadow}` }}>
                  <MagnifyingGlass size={32} className={`${theme.textSecondary} opacity-40 mx-auto mb-3`} />
                  <p className={`${theme.textSecondary} text-sm`}>Sin resultados. Ajusta el buscador.</p>
                </div>
              ) : tareasCategoria.map(tarea => {
                const abierta = expandida === tarea.id
                const EstIcon = ESTADO_CFG[tarea.estado].icono

                const tareaCat = categoriasReactivas.find(c => c.key === tarea.categoria) || catActual
                const cardColor = tarea.estado !== 'pendiente' ? ESTADO_CFG[tarea.estado].color : tareaCat.color

                return (
                  <div
                    key={tarea.id}
                    className={`group border rounded-2xl transition-all duration-300 relative hover:z-50 hover:-translate-y-1 hover:border-[var(--card-color)] hover:shadow-[0_8px_30px_var(--card-glow)] border-[var(--card-border)]`}
                    style={{ 
                      boxShadow: `0 4px 20px var(--card-shadow)`,
                      '--card-color': cardColor,
                      '--card-border': isDark ? `${cardColor}25` : `${cardColor}20`,
                      '--card-shadow': isDark ? 'rgba(0,0,0,0.5)' : `${cardColor}15`,
                      '--card-glow': isDark ? `${cardColor}30` : `${cardColor}25`
                    } as React.CSSProperties}
                  >
                    {/* Fondo y barra lateral con overflow-hidden para corte perfecto de esquinas */}
                    <div className="absolute inset-0 rounded-[calc(1rem-1px)] overflow-hidden pointer-events-none"
                         style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fff' }}>
                      <div className="absolute left-0 top-0 bottom-0 w-[5px]"
                           style={{ backgroundColor: tareaCat.color }} />
                    </div>

                    {/* Cabecera de la tarea */}
                    <div
                      onClick={() => setExpandida(abierta ? null : tarea.id)}
                      className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none relative z-10"
                      style={{ paddingLeft: 20 }}
                    >
                      <EstIcon size={18} color={ESTADO_CFG[tarea.estado].color} style={{ flexShrink: 0 }} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-sm font-semibold transition-colors duration-300 group-hover:!text-[var(--card-color)] ${theme.textTitle}`}>{tarea.titulo}</span>
                          {tarea.critica && (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border transition-all"
                              style={{
                                backgroundColor: `${tareaCat.color}15`,
                                borderColor: `${tareaCat.color}35`,
                                color: tareaCat.color,
                              }}
                            >
                              <AlertCircle size={11} color={tareaCat.color} />
                              <span>Crítica</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                          <span className={`${theme.textSecondary} opacity-70`}>{tarea.ruta}</span>
                          <span className="opacity-30">|</span>
                          <div className="flex gap-1 flex-wrap items-center">
                            {tarea.roles.map(rol => {
                              const checked = (tarea.rolesProbados || []).includes(rol)
                              return (
                                <span
                                  key={rol}
                                  className={`text-xs px-1.5 py-0.2 rounded font-semiboldr ${
                                    checked
                                      ? 'bg-[#38B98E]/15 border border-[#38B98E]/30 text-[#38B98E]'
                                      : isDark
                                      ? 'bg-white/5 border border-white/10 text-white/50'
                                      : 'bg-[#474747]/[0.03] border border-[#474747]/10 text-[#474747]/50'
                                  }`}
                                >
                                  {rol === 'sin_sesion' ? 'público' : rol.replace('_', ' ')}
                                </span>
                              )
                            })}
                            <span className="opacity-30 mx-1">|</span>
                            {/* Indicadores día/noche */}
                            {(['resultado_dia', 'resultado_noche'] as const).map(campo => {
                              const val = tarea[campo]
                              const label = campo === 'resultado_dia' ? '☀ Día' : '☾ Noche'
                              const color = val === 'ok' ? '#38B98E' : val === 'falla' ? '#FF5E4B' : undefined
                              return (
                                <span
                                  key={campo}
                                  className="text-xs px-1.5 rounded font-semibold flex items-center gap-0.5"
                                  style={{
                                    background: color ? `${color}18` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    border: `1px solid ${color ? `${color}40` : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                                    color: color ?? (isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)'),
                                  }}
                                >
                                  {label}
                                  {val === 'ok' && <CheckCircle size={8} />}
                                  {val === 'falla' && <XCircle size={8} />}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Botones de estado rápido con tooltip explicativo abajo */}
                      <div className="flex gap-1 items-center relative z-30" onClick={e => e.stopPropagation()}>
                        {(['ok', 'parcial', 'no_se_entiende', 'falla', 'pendiente'] as Estado[]).map((est, idx) => {
                          const Ic = ESTADO_CFG[est].icono
                          const activo = tarea.estado === est
                          const cfg = ESTADO_CFG[est]
                          const tooltipText = cfg.label

                          const isRight = idx >= 3
                          const isLeft = idx <= 1

                          return (
                            <div key={est} className="relative group/qa-tip">
                              <button
                                type="button"
                                onClick={() => actualizar(tarea.id, 'estado', est)}
                                aria-label={tooltipText}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer relative z-10"
                                style={{
                                  border: `1px solid ${activo ? cfg.color : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,130,124,0.12)'}`,
                                  background: activo ? `${cfg.color}18` : 'transparent',
                                }}
                              >
                                <Ic size={13} color={activo ? cfg.color : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,130,124,0.4)'} />
                              </button>

                              {/* Tooltip flotante de frente en Verde Sostenible (#00827C) */}
                              <div
                                className={`pointer-events-none absolute top-full mt-1.5 z-[999] opacity-0 group-hover/qa-tip:opacity-100 transition-all duration-150 transform translate-y-[-2px] group-hover/qa-tip:translate-y-0 flex flex-col ${
                                  isRight
                                    ? 'right-0 items-end'
                                    : isLeft
                                    ? 'left-0 items-start'
                                    : 'left-1/2 -translate-x-1/2 items-center'
                                }`}
                              >
                                <div
                                  className="w-2 h-2 rotate-45 mb-[-4px] z-10"
                                  style={{
                                    backgroundColor: '#00827C',
                                    marginRight: isRight ? '12px' : undefined,
                                    marginLeft: isLeft ? '12px' : undefined,
                                  }}
                                />
                                <span
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white whitespace-nowrap shadow-2xl tracking-wide border border-white/20"
                                  style={{
                                    backgroundColor: '#00827C',
                                    boxShadow: '0 8px 24px rgba(0, 130, 124, 0.5), 0 2px 6px rgba(0,0,0,0.2)',
                                  }}
                                >
                                  {tooltipText}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className={`${theme.textSecondary} opacity-60 flex-shrink-0`}>
                        {abierta ? <CaretUp size={13} /> : <CaretDown size={13} />}
                      </div>
                    </div>

                    {/* Detalle expandido */}
                    {abierta && (
                      <div
                        className={`px-5 pb-5 border-t ${theme.divider} relative z-10`}
                        style={{ paddingLeft: 20 }}
                      >
                        <p className={`text-sm ${theme.textSecondary} mt-3 mb-3 leading-relaxed`}>
                          {tarea.descripcion}
                        </p>

                        {tarea.journeys && tarea.journeys.length > 0 && (
                          <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-semibold ${theme.textSecondary} opacity-75`}>Perfiles afectados:</span>
                            {tarea.journeys.map(j => (
                              <span 
                                key={j} 
                                className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium border transition-all" 
                                style={{ backgroundColor: `${tareaCat.color}15`, borderColor: `${tareaCat.color}35`, color: tareaCat.color }}
                              >
                                {j}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Pasos */}
                        {tarea.pasos.length > 0 && (
                          <div className="mb-4">
                            <p className={`text-xs font-bold ${theme.textSecondary} mb-2`}>Pasos</p>
                            <div
                              className="rounded-xl p-4"
                              style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,130,124,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,130,124,0.08)'}` }}
                            >
                              <ol className="space-y-2 pl-4 list-decimal">
                                {tarea.pasos.map((p, i) => (
                                  <li key={i} className={`text-xs ${theme.textSecondary} leading-relaxed`}>{p}</li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        )}

                        {/* Resultado esperado */}
                        <div
                          className="rounded-xl px-4 py-3 mb-4"
                          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,130,124,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,130,124,0.10)'}` }}
                        >
                          <span className={`text-xs font-bold ${theme.textSecondary}`}>Resultado esperado: </span>
                          <span className={`text-xs ${theme.textPrimary}`}>{tarea.esperado}</span>
                        </div>

                        {/* Checklist de Perfiles de Prueba */}
                        <div className="mb-4">
                          <p className={`text-xs font-bold ${theme.textSecondary} mb-2`}>
                            Checklist de Perfiles (Marca los probados)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {tarea.roles.map(rol => {
                              const checked = (tarea.rolesProbados || []).includes(rol)
                              return (
                                <button
                                  key={rol}
                                  onClick={() => toggleRolProbado(tarea.id, rol)}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                                    checked
                                      ? 'bg-[#38B98E]/10 border-[#38B98E]/30 text-[#38B98E]'
                                      : isDark
                                      ? 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                                      : 'bg-white border-black/10 text-black/60 hover:text-black hover:border-black/20'
                                  }`}
                                >
                                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                    checked ? 'bg-[#38B98E] border-[#38B98E] text-white' : 'border-current'
                                  }`}>
                                    {checked && <CheckCircle size={10} />}
                                  </span>
                                  <span>{ROL_LABELS[rol]}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Resultado por modo - Día y Noche */}
                        {(['resultado_dia', 'resultado_noche'] as const).map(campo => {
                          const esDia = campo === 'resultado_dia'
                          const valorActual = tarea[campo] ?? 'pendiente'
                          return (
                            <div key={campo} className="mb-3">
                              <p className={`text-xs font-bold ${theme.textSecondary} mb-1.5`}>
                                {esDia ? '☀ Resultado Modo Día' : '☾ Resultado Modo Noche'}
                              </p>
                              <div className="flex gap-1.5 flex-wrap">
                                {(['ok', 'falla'] as Estado[]).map(est => {
                                  const Ic = ESTADO_CFG[est].icono
                                  const activo = valorActual === est
                                  return (
                                    <button
                                      key={est}
                                      onClick={() => actualizarModo(tarea.id, campo, est)}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                                      style={{
                                        background: activo ? ESTADO_CFG[est].color : `${ESTADO_CFG[est].color}15`,
                                        color: activo ? '#fff' : ESTADO_CFG[est].color,
                                        border: `1px solid ${activo ? ESTADO_CFG[est].color : `${ESTADO_CFG[est].color}40`}`,
                                      }}
                                    >
                                      <Ic size={10} color={activo ? '#fff' : ESTADO_CFG[est].color} />
                                      {ESTADO_CFG[est].label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}

                        {/* Notas */}
                        <label className={`block text-xs font-bold ${theme.textSecondary} mb-2`}>
                          Tus apuntes
                        </label>
                        <textarea
                          value={tarea.notas}
                          onChange={e => actualizar(tarea.id, 'notas', e.target.value)}
                          placeholder="Qué hiciste, qué pasó y qué esperabas ver en su lugar. Así se puede arreglar sin adivinar."
                          rows={3}
                          onClick={e => e.stopPropagation()}
                          className={`w-full px-4 py-3 rounded-xl border text-xs ${theme.textPrimary} resize-vertical outline-none transition-all font-sans`}
                          style={{
                            background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,130,124,0.02)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,130,124,0.12)'}`,
                            fontFamily: "'Open Sans', sans-serif",
                          }}
                        />

                        {/* Veredicto general */}
                        <p className={`text-xs font-bold ${theme.textSecondary} mt-4 mb-2`}>
                          Veredicto general de la prueba
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {(['ok', 'parcial', 'no_se_entiende', 'falla'] as Estado[]).map(est => {
                            const Ic = ESTADO_CFG[est].icono
                            const activo = tarea.estado === est
                            return (
                              <button
                                key={est}
                                onClick={() => { actualizar(tarea.id, 'estado', est); if (est === 'ok') setExpandida(null) }}
                                className="flex-1 min-w-[120px] py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                                style={{
                                  background: activo ? ESTADO_CFG[est].color : `${ESTADO_CFG[est].color}15`,
                                  color: activo ? '#fff' : ESTADO_CFG[est].color,
                                  border: `1px solid ${activo ? ESTADO_CFG[est].color : `${ESTADO_CFG[est].color}40`}`,
                                }}
                              >
                                <Ic size={13} color={activo ? '#fff' : ESTADO_CFG[est].color} />
                                {ESTADO_CFG[est].label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Footer del módulo activo ─────────────────────────────── */}
            <div className={`border ${theme.headerBg} rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3`}>
              <div className={`text-xs ${theme.textSecondary}`}>
                {intentos.filter(i => i.alcance === categoriaActiva).length > 0
                  ? `${intentos.filter(i => i.alcance === categoriaActiva).length} intento(s) guardado(s) para este módulo`
                  : 'Sin intentos guardados para este módulo'}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={() => { guardar(); guardarIntento(categoriaActiva) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:scale-105 active:scale-95 transition-all hover-download ${theme.cardBg} ${theme.textSecondary}`}
                >
                  <FloppyDisk size={13} /> Guardar módulo
                </button>
                <button
                  onClick={() => setMostrarHistorial(categoriaActiva)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:scale-105 active:scale-95 transition-all hover-pop ${theme.cardBg} ${theme.textSecondary}`}
                >
                  <FileText size={13} /> Ver historial ({intentos.filter(i => i.alcance === categoriaActiva).length})
                </button>
                <button
                  onClick={() => { setAlcanceParcial(modo === 'modulo' ? categoriaActiva : rutaVigente); setMostrarInforme('parcial') }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-0 text-xs font-bold hover:scale-105 active:scale-95 transition-all hover-pop ${isDark ? 'bg-[#00827C]/20 text-[#00827C]' : 'bg-[#00827C]/10 text-[#00827C]'}`}
                >
                  <FileText size={13} /> Informe parcial
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Diagnóstico automático (abajo del todo, fuera de las cards/grid, antes del footer) ── */}
        <div
          className={`mt-8 mb-4 border-2 rounded-2xl px-5 py-4 sm:px-6 sm:py-5 transition-all w-full ${isDark ? 'bg-[#985fa1]/5 border-[#985fa1]/40' : 'bg-[#985fa1]/[0.04] border-[#985fa1]/40'}`}
          style={{ boxShadow: `0 4px 20px ${isDark ? 'rgba(152,95,161,0.1)' : 'rgba(152,95,161,0.15)'}` }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h3 className={`text-sm font-semibold ${theme.textPrimary}`}>
                Diagnóstico automático
              </h3>
              <p className={`text-xs ${theme.textSecondary} opacity-80 mt-0.5 leading-relaxed`}>
                Revisa contra la base real lo que no se ve a simple vista: columnas faltantes, archivos mal configurados y consultas que la base rechaza.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={correrDiagnostico}
                disabled={diagnosticando}
                className={`text-xs px-3.5 py-1.5 rounded-lg transition-all disabled:opacity-50 font-medium hover:scale-105 active:scale-95 bg-[#985fa1] text-white shadow-sm`}
              >
                {diagnosticando ? 'Revisando…' : 'Ejecutar revisión'}
              </button>
              {diagnostico && (
                <button
                  onClick={descargarDiagnostico}
                  className={`text-xs px-3.5 py-1.5 rounded-lg border transition-all ${theme.inputBg} ${theme.textSecondary} hover:opacity-80 font-medium`}
                >
                  Descargar informe
                </button>
              )}
            </div>
          </div>

          {errorDiagnostico && (
            <p className="text-xs mt-2.5 text-[#FF5E4B]">{errorDiagnostico}</p>
          )}

          {diagnostico && (
            <div className={`mt-3.5 pt-3 border-t ${theme.divider} flex flex-col gap-3`}>
              <div className="flex items-center gap-4 text-xs flex-wrap">
                <span className={theme.textSecondary}>{diagnostico.resumen.total} comprobaciones</span>
                <span className="text-[#38B98E] font-semibold">{diagnostico.resumen.ok} correctas</span>
                {diagnostico.resumen.avisos > 0 && (
                  <span className="text-[#F6BF3E] font-semibold">{diagnostico.resumen.avisos} avisos</span>
                )}
                <span className={diagnostico.resumen.fallas > 0 ? 'text-[#FF5E4B] font-semibold' : theme.textSecondary}>
                  {diagnostico.resumen.fallas} fallas
                </span>
              </div>

              {/* Solo se listan fallas y avisos: lo que está bien no necesita leerse */}
              {diagnostico.comprobaciones.filter(x => x.estado !== 'ok').length === 0 ? (
                <p className="text-xs text-[#38B98E]">
                  Sin fallas. El sistema respondió a todas las comprobaciones.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {diagnostico.comprobaciones.filter(x => x.estado !== 'ok').map((x, i) => (
                    <div
                      key={`${x.grupo}-${x.nombre}-${i}`}
                      className={`text-xs px-3 py-2 rounded-lg border ${theme.cardBg}`}
                    >
                      <span className={x.estado === 'falla' ? 'text-[#FF5E4B] font-semibold' : 'text-[#F6BF3E] font-semibold'}>
                        {x.estado === 'falla' ? 'Falla' : 'Aviso'}
                      </span>
                      <span className={`${theme.textSecondary} opacity-60`}> · {x.grupo} · </span>
                      <span className={theme.textPrimary}>{x.nombre}</span>
                      <p className={`${theme.textSecondary} mt-0.5`}>{x.detalle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de informe ─────────────────────────────────────────────────── */}
      {mounted && Boolean(mostrarInforme) && createPortal(
        <div
          className="fixed inset-0 bg-[#474747]/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setMostrarInforme(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border overflow-hidden bg-[var(--bg-card)] border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-150 relative"
          >
            {/* Header del modal */}
            {(() => {
              const targetScope = alcanceEfectivoParcial
              const esPorTema = modo === 'modulo'
              const tareasEnScope = mostrarInforme === 'parcial'
                ? (esPorTema ? tareas.filter(t => t.categoria === targetScope) : tareas.filter(t => t.ruta === targetScope))
                : tareas
              const oksScope = tareasEnScope.filter(t => t.estado === 'ok').length
              const parcialesScope = tareasEnScope.filter(t => t.estado === 'parcial').length
              const dudosasScope = tareasEnScope.filter(t => t.estado === 'no_se_entiende').length
              const fallasScope = tareasEnScope.filter(t => t.estado === 'falla').length
              const criticasScope = tareasEnScope.filter(t => t.critica && t.estado === 'falla').length
              const evaluadasScope = tareasEnScope.filter(t => t.estado !== 'pendiente').length

              return (
                <>
                  <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${theme.divider} ${isDark ? 'bg-[#D6F391]/[0.05]' : 'bg-[#00827C]/[0.03]'}`}>
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className={`text-lg font-bold ${theme.textTitle} m-0`}>
                          {mostrarInforme === 'parcial' ? `Informe Parcial QA (${esPorTema ? 'Por tema' : 'Por pantalla'})` : 'Informe Final de QA'}
                        </h2>
                        {mostrarInforme === 'parcial' && (
                          <div className="relative inline-block">
                            <select
                              value={targetScope}
                              onChange={e => setAlcanceParcial(e.target.value)}
                              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border cursor-pointer outline-none ${theme.inputBg} ${theme.textPrimary}`}
                              style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,130,124,0.2)' }}
                            >
                              {esPorTema ? (
                                categoriasReactivas.map(cat => {
                                  const cPruebas = tareas.filter(t => t.categoria === cat.key)
                                  const evalCount = cPruebas.filter(t => t.estado !== 'pendiente').length
                                  return (
                                    <option key={cat.key} value={cat.key} className={isDark ? 'bg-[#2A2A2A] text-white' : 'bg-white text-black'}>
                                      {cat.key} ({evalCount}/{cPruebas.length} evaluadas)
                                    </option>
                                  )
                                })
                              ) : (
                                paginas.map(p => {
                                  const evalCount = p.pruebas.filter(t => t.estado !== 'pendiente').length
                                  return (
                                    <option key={p.ruta} value={p.ruta} className={isDark ? 'bg-[#2A2A2A] text-white' : 'bg-white text-black'}>
                                      {p.ruta} ({evalCount}/{p.pruebas.length} evaluadas)
                                    </option>
                                  )
                                })
                              )}
                            </select>
                          </div>
                        )}
                      </div>
                      <p className={`text-xs ${theme.textSecondary} mt-0.5`}>
                        {evaluadasScope}/{tareasEnScope.length} evaluadas en {mostrarInforme === 'parcial' ? (esPorTema ? `Tema: ${targetScope}` : targetScope) : 'todo el sistema'} · {criticasScope} críticas fallidas
                      </p>
                    </div>
                    <div className="flex gap-2 items-center shrink-0">
                      <button
                        onClick={() => navigator.clipboard.writeText(generarInforme(mostrarInforme!, targetScope))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer hover-copy hover-press ${theme.cardBg} ${theme.textSecondary}`}
                      >
                        <ClipboardText size={12} /> Copiar
                      </button>
                      <button
                        onClick={descargar}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-0 text-xs font-bold cursor-pointer hover-download hover-press ${isDark ? 'bg-[#D6F391] text-[#474747]' : 'bg-[#00827C] text-white'}`}
                      >
                        <DownloadSimple size={12} /> .txt
                      </button>
                      <button
                        onClick={() => setMostrarInforme(null)}
                        className={`ml-1 flex items-center justify-center w-10 h-10 rounded-xl border hover-rotate-90 hover-press ${theme.cardBg} ${theme.textSecondary} hover:opacity-80 transition-opacity`}
                        aria-label="Cerrar"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 p-5 sm:p-6 overflow-y-auto min-h-0 flex-1">

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5 flex-shrink-0">
                    {[
                      { l: 'Aprobadas',      v: oksScope,                               c: '#38B98E' },
                      { l: 'Cumple parcial', v: parcialesScope,                         c: '#F59E0B' },
                      { l: 'No se entiende', v: dudosasScope,                           c: '#985fa1' },
                      { l: 'Fallas',         v: fallasScope,                            c: '#FF5E4B' },
                      { l: 'Pendientes',     v: tareasEnScope.length - evaluadasScope,  c: isDark ? '#A0AEC0' : '#849696' },
                    ].map(m => (
                      <div key={m.l} className="text-center py-2.5 px-2 rounded-xl" style={{ background: `${m.c}12`, border: `1px solid ${m.c}25` }}>
                        <p className="m-0 text-xl font-bold" style={{ color: m.c }}>{m.v}</p>
                        <p className="m-0 text-[11px] font-bold truncate" style={{ color: m.c }}>{m.l}</p>
                      </div>
                    ))}
                  </div>

                  <pre
                    className={`flex-1 min-h-[140px] overflow-y-auto rounded-xl p-4 text-xs leading-relaxed whitespace-pre-wrap break-words font-mono border ${theme.textPrimary}`}
                    style={{ background: 'var(--bg-input)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,130,124,0.08)'}` }}
                  >
                    {generarInforme(mostrarInforme!, targetScope)}
                  </pre>

                  <div
                    className="px-4 py-3 rounded-xl flex-shrink-0"
                    style={{
                      background: criticasScope > 0 ? 'rgba(255,94,75,0.10)' : fallasScope > 0 ? 'rgba(255,94,75,0.08)' : 'rgba(56,185,142,0.10)',
                      border: `1px solid ${criticasScope > 0 ? 'rgba(255,94,75,0.25)' : fallasScope > 0 ? 'rgba(255,94,75,0.20)' : 'rgba(56,185,142,0.20)'}`,
                    }}
                  >
                    <p className="m-0 text-sm font-bold" style={{ color: criticasScope > 0 ? '#FF5E4B' : fallasScope > 0 ? '#FF5E4B' : '#38B98E' }}>
                      {criticasScope > 0
                        ? `${criticasScope} prueba(s) crítica(s) fallida(s).`
                        : fallasScope > 0
                        ? `${fallasScope} falla(s) detectada(s).`
                        : evaluadasScope < tareasEnScope.length
                        ? `${tareasEnScope.length - evaluadasScope} prueba(s) pendientes por evaluar.`
                        : 'Todas las pruebas evaluadas aprobadas con éxito.'}
                    </p>
                  </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal de historial ───────────────────────────────────────────────────── */}
      {mounted && mostrarHistorial && createPortal(
        <div
          className="fixed inset-0 bg-[#474747]/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setMostrarHistorial(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border overflow-hidden bg-[var(--bg-card)] border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-150 relative"
          >
            <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${theme.divider} ${isDark ? 'bg-[#D6F391]/[0.05]' : 'bg-[#00827C]/[0.03]'}`}>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <h2 className={`text-lg font-bold ${theme.textTitle} m-0 flex items-center gap-2`}>
                    {mostrarHistorial === 'completo' ? 'Historial general' : `Historial - ${mostrarHistorial}`}
                  </h2>
                  {mostrarHistorial === 'completo' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#38B98E]/15 text-[#38B98E]">Global</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F6BF3E]/15 text-[#F6BF3E]">Parcial</span>
                  )}
                </div>
                <p className={`text-xs ${theme.textSecondary} mt-0.5`}>
                  {intentos.filter(i => i.alcance === mostrarHistorial).length} intento(s) guardado(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                {intentos.filter(i => i.alcance === mostrarHistorial).length > 0 && (
                  <button
                    onClick={() => {
                      if(confirm(`¿Estás seguro de borrar todo el historial ${mostrarHistorial === 'completo' ? 'global' : 'de ' + mostrarHistorial}?`)) {
                        borrarHistoriales(mostrarHistorial)
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 h-10 rounded-xl text-xs font-medium bg-[#FF5E4B]/10 text-[#FF5E4B] hover:bg-[#FF5E4B]/20 transition-colors`}
                  >
                    <Trash size={14} /> Borrar todos
                  </button>
                )}
                <button
                  onClick={() => setMostrarHistorial(null)}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border hover-rotate-90 hover-press ${theme.cardBg} ${theme.textSecondary} hover:opacity-80 transition-opacity`}
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto min-h-0 flex-1 p-4 flex flex-col gap-3">
              {intentos.filter(i => i.alcance === mostrarHistorial).length === 0 ? (
                <p className={`text-sm text-center py-8 ${theme.textSecondary} opacity-60`}>
                  Aún no hay intentos guardados. Usa &quot;Guardar módulo&quot; o &quot;Guardar general&quot; para crear un snapshot.
                </p>
              ) : intentos.filter(i => i.alcance === mostrarHistorial).map(intento => {
                const okCount = intento.tareas.filter(t => t.estado === 'ok').length
                const failCount = intento.tareas.filter(t => t.estado === 'falla').length
                const pct = intento.tareas.length > 0 ? Math.round((okCount / intento.tareas.length) * 100) : 0
                const fecha = new Date(intento.ts).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                const textoDescarga = [
                  `INTENTO QA - ${intento.etiqueta}`,
                  `Alcance: ${intento.alcance}`,
                  `Fecha: ${fecha}`,
                  `Resultado: ${okCount} ok · ${failCount} fallas · ${pct} %`,
                  '─'.repeat(50),
                  ...intento.tareas.map(t => {
                    const ic = t.estado === 'ok' ? '✓' : '✗'
                    return `${ic} ${t.id}${t.notas ? `\n   Notas: ${t.notas}` : ''}`
                  })
                ].join('\n')

                return (
                  <div
                    key={intento.id}
                    className={`rounded-xl border p-4 flex flex-col gap-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-[#f9fefe] border-[rgba(0,130,124,0.10)]'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className={`text-sm font-bold ${theme.textTitle}`}>{intento.etiqueta}</span>
                        <span className={`ml-2 text-xs ${theme.textSecondary} opacity-60`}>{fecha}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct === 100 ? 'bg-[#38B98E]/15 text-[#38B98E]' : failCount > 0 ? 'bg-[#FF5E4B]/15 text-[#FF5E4B]' : 'bg-[#F6BF3E]/15 text-[#F6BF3E]'}`}>
                          {okCount}/{intento.tareas.length} ok · {pct} %
                        </span>
                        <button
                          onClick={() => {
                            const blob = new Blob([textoDescarga], { type: 'text/plain' })
                            const a = document.createElement('a')
                            a.href = URL.createObjectURL(blob)
                            a.download = `qa-${intento.alcance.replace(/\s+/g, '-').toLowerCase()}-intento${intentos.filter(i => i.alcance === mostrarHistorial).indexOf(intento) + 1}.txt`
                            a.click()
                            URL.revokeObjectURL(a.href)
                          }}
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs hover-download hover-press ${theme.cardBg} ${theme.textSecondary} hover:opacity-80`}
                        >
                          <DownloadSimple size={12} /> .txt
                        </button>
                        <button
                          onClick={() => {
                            if(confirm('¿Eliminar este intento del historial?')) borrarIntento(intento.id)
                          }}
                          className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs bg-[#FF5E4B]/10 text-[#FF5E4B] hover:bg-[#FF5E4B]/20 transition-colors border-transparent`}
                          title="Eliminar intento"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                    {failCount > 0 && (
                      <p className="text-xs text-[#FF5E4B] opacity-80">
                        {failCount} falla(s): {intento.tareas.filter(t => t.estado === 'falla').map(t => t.id).join(', ')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>,
        document.body

      )}
    </div>
  )
}
