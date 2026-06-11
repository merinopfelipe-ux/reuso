'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  CheckCircle, XCircle, Circle, ClipboardText, DownloadSimple,
  ArrowCounterClockwise, Lightning, Lock, Moon, ChartBar,
  Robot, FileText, Storefront, Buildings, Bell,
  ShieldCheck, Globe, Gear, BookOpen,
  MagnifyingGlass, CaretDown, CaretUp, FloppyDisk, X,
  MinusCircle, Question, Sun,
} from '@phosphor-icons/react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Estado = 'pendiente' | 'ok' | 'falla' | 'parcial' | 'no_clara'
type RolPrueba = 'super_admin' | 'empresa_admin' | 'empleado' | 'usuario_libre' | 'sin_sesion'

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
  roles: RolPrueba[]
  rolesProbados?: RolPrueba[]
  resultado_dia?: Estado
  resultado_noche?: Estado
}

const ROL_LABELS: Record<RolPrueba, string> = {
  super_admin: 'Super Admin',
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
  if (categoria === 'Dashboard' || id.startsWith('dash-')) return ['empleado']
  
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
  
  // APIs & Validaciones
  if (categoria === 'APIs & Validaciones' || id.startsWith('api-') || id.startsWith('auth-') || id.startsWith('emp-') || id.startsWith('dpl-')) {
    if (id === 'api-01' || id === 'api-07' || id === 'auth-12') return ['empleado']
    if (id === 'api-02' || id === 'api-04' || id === 'api-06' || id === 'emp-13') return ['empresa_admin']
    if (id === 'api-03') return ['super_admin']
    if (id === 'api-05' || id === 'dpl-09' || id === 'auth-11') return ['sin_sesion']
  }
  
  // Autenticación
  if (categoria === 'Autenticación' || id.startsWith('auth-')) {
    if (id === 'auth-01') return ['empresa_admin']
    if (id === 'auth-07') return ['sin_sesion', 'empleado']
    if (id === 'auth-10') return ['usuario_libre']
    return ['sin_sesion']
  }
  
  return ['empleado']
}

// ── Definición completa de tareas ─────────────────────────────────────────────

const TAREAS_INICIALES: Omit<Tarea, 'estado' | 'notas' | 'roles'>[] = [

  // ══════════════════════════════════════════════════════════════════
  // 1. AUTENTICACIÓN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'auth-01', categoria: 'Autenticación', ruta: '/login', critica: true,
    titulo: 'Login válido — tiempo de respuesta',
    descripcion: 'Mide el tiempo de respuesta real del endpoint de autenticación desde que el usuario hace clic en "Ingresar" hasta que es redirigido completamente al panel /empresa.',
    pasos: [
      'Abre /login en Chrome o Safari. Abre DevTools DENTRO DEL NAVEGADOR (NO en la terminal): Mac: Cmd+Option+I / Windows: F12. Ve a la pestaña "Red" (Network).',
      'Activa "Preserve log" (casilla arriba en la barra de Network) y haz clic en el ícono de papelera para limpiar el historial de peticiones.',
      'Ingresa un email y contraseña válidos de una cuenta empresa_admin y haz clic en "Ingresar".',
      'En la pestaña Network, busca la fila que dice "login" o "POST /api/auth/login". Haz clic en ella y mira la columna "Time" (Tiempo) — ese es el tiempo de respuesta del servidor.',
      'Anota los milisegundos medidos en el campo de apuntes. Luego observa que la página redirigió a /empresa correctamente.',
    ],
    esperado: 'Redirección exitosa a /empresa en menos de 1000 milisegundos sin bloqueos visuales ni spinners infinitos.',
  },
  {
    id: 'auth-02', categoria: 'Autenticación', ruta: '/login', critica: true,
    titulo: 'Login inválido — mensaje de error correcto',
    descripcion: 'Verifica que el sistema maneja de forma segura las credenciales incorrectas, no revela información sensible sobre la existencia del usuario y rehabilita el botón de login.',
    pasos: [
      'Ingresa un email registrado en el sistema pero coloca una contraseña errónea y haz clic en "Ingresar".',
      'Ingresa un correo electrónico inexistente (ej. inexistente_qa@reuso.com) con cualquier contraseña y haz clic en "Ingresar".',
      'Inspecciona el mensaje de error visible debajo de los inputs.',
      'Comprueba que el botón "Ingresar" vuelve a estar activo y seleccionable de inmediato después de mostrar el error.',
    ],
    esperado: 'En ambos casos debe mostrarse exactamente el mismo mensaje genérico: "Verifica tus datos e intenta de nuevo." El botón se desbloquea para nuevos intentos y no se indica si el email existe en la BD.',
  },
  {
    id: 'auth-03', categoria: 'Autenticación', ruta: '/login', critica: false,
    titulo: 'Selector de idioma ES / ENG',
    descripcion: 'Valida la reactividad multilingüe del formulario de inicio de sesión y la preservación local de la preferencia del usuario tras recargar la página.',
    pasos: [
      'Ubica el selector de idioma en la esquina superior/derecha de la página /login.',
      'Cambia el idioma a "English" (ENG).',
      'Verifica que todas las etiquetas (Email, Password, Remember me), el botón "Log In" y los testimonios cambian de forma instantánea al inglés.',
      'Presiona F5 o Cmd+R para recargar la página de forma limpia.',
      'Comprueba en qué idioma se renderiza el formulario tras la recarga y valida que en localStorage se haya guardado la clave correspondiente.',
    ],
    esperado: 'Todos los textos se traducen dinámicamente al inglés. El idioma seleccionado persiste tras la recarga (almacenado bajo la clave de idioma en localStorage).',
  },
  {
    id: 'auth-04', categoria: 'Autenticación', ruta: '/login', critica: false,
    titulo: 'Recuérdame — persistencia del email',
    descripcion: 'Verifica la retención segura del email del usuario en el navegador para facilitar el acceso rápido en visitas posteriores.',
    pasos: [
      'En el formulario de /login, ingresa un correo de prueba.',
      'Activa la casilla de verificación (checkbox) "Recuérdame".',
      'Ingresa la contraseña correcta y haz clic en "Ingresar" para iniciar sesión de forma exitosa.',
      'Una vez dentro, cierra la pestaña del navegador o abre una nueva pestaña en /login.',
      'Revisa si el campo "Email" ya tiene el correo precargado de forma automática.',
    ],
    esperado: 'El campo de email se encuentra autocompletado con la dirección de correo utilizada anteriormente.',
  },
  {
    id: 'auth-05', categoria: 'Autenticación', ruta: '/registro', critica: true,
    titulo: 'Registro libre — flujo completo',
    descripcion: 'Completa el proceso de creación de una nueva cuenta libre, validando la interacción del captcha Cloudflare Turnstile y la redirección final.',
    pasos: [
      'Abre /registro en una ventana de incógnito del navegador (Cmd+Shift+N en Mac / Ctrl+Shift+N en Windows).',
      'Completa los campos en este orden: "Nombre" (ej. Prueba), "Apellido" (ej. QA), "Correo electrónico" (usa un correo real que puedas revisar), "Apodo" (ej. testerqa), "Contraseña" (mínimo 8 caracteres, una mayúscula y un número).',
      'Busca los dos checkboxes de verificación (muestran un cuadrado o tilde verde): marca "Acepto los términos y condiciones" y "Acepto el tratamiento de datos". Ambos son OBLIGATORIOS.',
      'El widget de Cloudflare Turnstile puede marcarse automáticamente en verde. Si no se marca solo, haz clic en el cuadro verde de verificación.',
      'Haz clic en "Crear cuenta" y observa si eres redirigido a una pantalla de confirmación.',
    ],
    esperado: 'Redirección automática a /confirmar-email?email=... mostrando un banner de éxito indicando que se debe revisar la bandeja de entrada para verificar la cuenta.',
  },
  {
    id: 'auth-06', categoria: 'Autenticación', ruta: '/recuperar', critica: false,
    titulo: 'Recuperación de contraseña',
    descripcion: 'Verifica la solicitud de restablecimiento de contraseña para un usuario existente y el despacho del correo correspondiente.',
    pasos: [
      'Ve a /recuperar.',
      'Ingresa un correo electrónico que pertenezca a un usuario activo registrado en el sistema.',
      'Haz clic en el botón "Enviar instrucciones".',
      'Verifica que aparece el mensaje de confirmación en la UI.',
      'Revisa la bandeja de entrada (o simulador de correo si se trabaja en local) para confirmar la recepción del correo en menos de 2 minutos.',
    ],
    esperado: 'Aparece un mensaje indicando que las instrucciones han sido enviadas. Se recibe un correo con un enlace temporal que contiene el token de recuperación.',
  },
  {
    id: 'auth-07', categoria: 'Autenticación', ruta: '/invitacion/[token]', critica: true,
    titulo: 'Flujo de invitación por email',
    descripcion: 'Valida el registro guiado de un nuevo miembro invitado por el administrador de la empresa.',
    pasos: [
      'Desde la cuenta de administrador en /empresa/equipo, haz clic en "Invitar Miembro" y envía una invitación a un correo de pruebas.',
      'Accede a la bandeja de entrada de ese correo, copia el enlace de invitación recibido.',
      'Abre una ventana en incógnito y pega la URL de invitación copiada.',
      'Completa el formulario de asignación de contraseña, acepta los términos y condiciones, y presiona "Finalizar Registro".',
      'Revisa en /empresa/equipo que el nuevo usuario aparezca con estado "Activo" y el rol de empleado.',
    ],
    esperado: 'El registro se completa sin errores, el enlace de invitación queda invalidado tras su primer uso, y el nuevo usuario puede acceder a /dashboard.',
  },
  {
    id: 'auth-08', categoria: 'Autenticación', ruta: '/middleware', critica: true,
    titulo: 'Protección de rutas sin sesión',
    descripcion: 'Comprueba que el middleware de Next.js bloquea el acceso directo por URL a todas las vistas privadas del sistema si no se cuenta con una sesión activa.',
    pasos: [
      'Cierra sesión por completo en el sistema.',
      'En la barra de direcciones del navegador, intenta ingresar directamente a las siguientes rutas: /dashboard, /empresa, /admin, /empresa/cotizador, /empresa/equipo, /settings.',
      'Revisa que en cada caso seas redirigido al /login de forma automática.',
    ],
    esperado: 'Redirección inmediata a /login para todas las rutas privadas. No se debe mostrar en ningún momento el esqueleto ni contenido de las páginas privadas.',
  },
  {
    id: 'auth-09', categoria: 'Autenticación', ruta: '/login', critica: false,
    titulo: 'Límite de intentos de inicio de sesión (fuerza bruta)',
    descripcion: 'Verifica que el backend bloquee la IP después de 5 intentos fallidos consecutivos de login en 60 segundos.',
    pasos: [
      'Ve a /login en Chrome.',
      'Abre DevTools con Cmd+Option+I (Mac) o F12 (Windows) y haz clic en la pestaña Consola.',
      'Chrome puede mostrar el aviso "Don\'t paste code you don\'t understand". Si aparece, escribe exactamente: allow pasting — y presiona Enter. Luego pega el script.',
      'Copia y pega este script en la consola, luego presiona Enter: [...Array(6)].forEach((_,i)=>setTimeout(()=>fetch(\'/api/auth/login\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({email:\'test@fail.com\',password:\'wrong\'+i,turnstile_token:\'skip\'})}).then(r=>r.json()).then(d=>console.log(\'Intento\'+(i+1)+\':\',d.error||\'ok\')),i*800))',
      'Espera 7 segundos. Los primeros intentos deben mostrar "Credenciales incorrectas". El intento 6 debe mostrar algo como "Demasiados intentos. Intenta de nuevo en un momento."',
    ],
    esperado: 'Los primeros 5 intentos retornan 401 con mensaje de credenciales incorrectas. El intento 6 retorna 429 con mensaje de demasiados intentos.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 2. PANEL ADMIN
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'adm-01', categoria: 'Panel Admin', ruta: '/admin', critica: true,
    titulo: 'Dashboard admin — KPIs y carga',
    descripcion: 'Inicia sesión como super_admin, navega a /admin y comprueba la correcta visualización de los 4 paneles de KPI (Usuarios totales, Empresas registradas, Cálculos completados, Emisiones CO₂ evitadas).',
    pasos: [
      'Inicia sesión como super_admin.',
      'Navega al panel principal de administración /admin.',
      'Comprueba la correcta visualización de los 4 paneles de KPI.',
      'Despliega la consola de red de DevTools para revisar que la petición a la API de estadísticas no retorne error 500 y complete en menos de 1.5s.',
      'Observa el gráfico de actividad de los últimos 30 días y la tabla con los cálculos más recientes.',
    ],
    esperado: 'Todos los KPIs numéricos muestran valores reales cargados de la base de datos (no 0, ni nulo, ni guiones "—"). El gráfico renderiza correctamente y la tabla lista los últimos cálculos realizados.',
  },
  {
    id: 'adm-02', categoria: 'Panel Admin', ruta: '/admin/usuarios', critica: true,
    titulo: 'Gestión de usuarios — buscar, filtrar y editar',
    descripcion: 'Navega a /admin/usuarios, busca un usuario por nombre parcial, filtra por rol empresa_admin y edita su apodo de forma persistente.',
    pasos: [
      'Navega a /admin/usuarios desde el sidebar o menú superior.',
      'En el cuadro de búsqueda, introduce el nombre parcial de un usuario conocido del sistema y presiona enter o espera el filtrado automático.',
      'Despliega el selector de roles y selecciona el rol "empresa_admin" para filtrar el listado.',
      'Haz clic en el registro del usuario filtrado para abrir su panel lateral de detalle.',
      'Edita el apodo (nickname) del usuario introduciendo "Tester Admin" y haz clic en "Guardar cambios".',
    ],
    esperado: 'El listado responde en tiempo real a las búsquedas y filtros aplicados. El panel de edición guarda los datos en la base de datos de forma persistente y actualiza la UI al instante.',
  },
  {
    id: 'adm-03', categoria: 'Panel Admin', ruta: '/admin/empresas', critica: true,
    titulo: 'Lista de empresas y detalle',
    descripcion: 'Revisa que la grilla de empresas cargue correctamente todas las organizaciones vigentes, permitiendo abrir su panel detallado.',
    pasos: [
      'Dirígete a /admin/empresas.',
      'Revisa que el listado contenga todas las empresas dadas de alta, mostrando su nombre, sector y plan de suscripción actual.',
      'Haz clic sobre una de las empresas (ej. "Empresa de Prueba") para abrir el modal o panel lateral de detalle.',
      'Inspecciona la sección de estado de cuenta, los módulos contratados y la lista de empleados asociados a esa empresa.',
    ],
    esperado: 'El listado carga sin errores. El panel detallado de la empresa muestra su plan, módulos contratados y todos los usuarios asignados a ella.',
  },
  {
    id: 'adm-04', categoria: 'Panel Admin', ruta: '/admin/empresas/[id]', critica: false,
    titulo: 'Activar / desactivar módulo para empresa',
    descripcion: 'Habilita el módulo de Cotizador CRM para una empresa de pruebas y verifica que un empleado pueda ingresar a su ruta restringida.',
    pasos: [
      'Selecciona una empresa en /admin/empresas que no tenga activo el módulo "Cotizador CRM".',
      'En la sección de módulos de su panel de detalle, activa el selector correspondiente a "Cotizador CRM" e introduce cambios.',
      'Cierra la sesión de admin e ingresa al sistema con las credenciales de un empleado de esa misma empresa.',
      'Intenta acceder directamente a /empresa/cotizador o revisa si el botón del cotizador es visible en su sidebar.',
    ],
    esperado: 'El módulo se activa sin requerir recargar la página. Al iniciar sesión como usuario de esa empresa, la ruta /empresa/cotizador es completamente accesible y visible.',
  },
  {
    id: 'adm-05', categoria: 'Panel Admin', ruta: '/admin/categorias', critica: true,
    titulo: 'Categorías — crear, editar y desactivar',
    descripcion: 'Administra las categorías ecológicas del sistema, creando una nueva categoría de pruebas y luego desactivándola globalmente.',
    pasos: [
      'Ve a /admin/categorias.',
      'Presiona "Nueva Categoría", ponle de nombre "Plástico QA" y define un factor de emisión de CO₂ de "2.3" kg CO2/kg.',
      'Haz clic en "Guardar" y verifica que aparezca en el listado de categorías.',
      'Edita la categoría recién creada cambiándole el nombre a "Plástico QA v2".',
      'Desmarca la opción "Activo" para desactivar la categoría en el sistema.',
      'Inicia sesión con una cuenta de empleado, ve al dashboard /dashboard y despliega el selector de categorías al registrar un cálculo.',
    ],
    esperado: 'La categoría se crea, edita y desactiva correctamente en el panel de administración. Una vez desactivada, no se muestra en el selector de la calculadora de los empleados.',
  },
  {
    id: 'adm-06', categoria: 'Panel Admin', ruta: '/admin/calculos', critica: false,
    titulo: 'Historial global de cálculos con filtros',
    descripcion: 'Verifica los filtros avanzados de la tabla de cálculos históricos utilizando combinaciones de empresa, categorías y períodos de tiempo.',
    pasos: [
      'Dirígete a /admin/calculos.',
      'Selecciona una empresa en el filtro de empresas.',
      'Aplica un filtro de categoría seleccionando "Mobiliario de oficina".',
      'Define un rango de fechas correspondiente a los últimos 30 días en el selector de fechas.',
      'Verifica que el contador de registros y la tabla se reduzcan mostrando solo los cálculos que cumplen simultáneamente con los tres filtros.',
    ],
    esperado: 'Cada filtro refina y actualiza la lista de forma acumulativa e instantánea sin desencadenar errores en consola ni pantallas de error.',
  },
  {
    id: 'adm-07', categoria: 'Panel Admin', ruta: '/admin/certificados', critica: false,
    titulo: 'Certificados emitidos — búsqueda y verificación',
    descripcion: 'Localiza un certificado emitido y verifica su hash RCO2 único a través del portal de validación pública.',
    pasos: [
      'Ve a la ruta /admin/certificados.',
      'Utiliza el buscador para localizar un certificado mediante el nombre de la empresa asociada.',
      'Identifica el código único de verificación RCO2 (ej. RCO2-1234-5678) y cópialo al portapapeles.',
      'Abre una ventana en modo incógnito e ingresa a /verificar/RCO2-1234-5678 (reemplazando por el código real).',
    ],
    esperado: 'El buscador encuentra el certificado de forma rápida. La página pública de verificación del certificado carga correctamente toda la información del impacto real acumulado.',
  },
  {
    id: 'adm-08', categoria: 'Panel Admin', ruta: '/admin/tickets', critica: true,
    titulo: 'Tickets de soporte — ver y responder',
    descripcion: 'Abre el buzón de soporte técnico, lee un ticket pendiente, publica una respuesta y actualiza su estado de atención.',
    pasos: [
      'Navega a /admin/tickets.',
      'Identifica y haz clic en un ticket de soporte que tenga el estado "Abierto".',
      'Revisa la descripción, prioridad y el mensaje enviado por el usuario.',
      'Escribe un mensaje de respuesta técnica en la caja de texto y cambia el selector de estado a "En revisión" o "Resuelto".',
      'Haz clic en "Enviar respuesta".',
    ],
    esperado: 'La respuesta se publica y se registra en la base de datos. El estado del ticket se actualiza correctamente y se dispara el correo de notificación al creador del ticket.',
  },
  {
    id: 'adm-09', categoria: 'Panel Admin', ruta: '/admin/leads', critica: false,
    titulo: 'Leads — lista y exportación',
    descripcion: 'Inspecciona y descarga la lista de contactos e interesados comerciales recopilados desde la landing pública.',
    pasos: [
      'Navega a /admin/leads.',
      'Verifica que se muestren las solicitudes completadas en el formulario de la landing page pública (con nombre, email, empresa, sector y fecha).',
      'Presiona el botón "Exportar a CSV" de la tabla.',
      'Abre el archivo CSV descargado y verifica que contenga los mismos registros y columnas legibles.',
    ],
    esperado: 'El listado carga correctamente. La exportación genera un archivo CSV válido con toda la información de los leads estructurada.',
  },
  {
    id: 'adm-10', categoria: 'Panel Admin', ruta: '/admin/alertas', critica: false,
    titulo: 'Alertas del sistema — crear y marcar leída',
    descripcion: 'Publica una alerta global y comprueba que se despliegue en la sesión de los usuarios finales y desaparezca al marcarla leída.',
    pasos: [
      'Ve a /admin/alertas.',
      'Presiona "Crear Alerta", selecciona tipo "Información" (info), escribe un mensaje (ej. "Nueva actualización del sistema a las 20:00") y presiona "Publicar".',
      'Inicia sesión con una cuenta de empleado de cualquier empresa.',
      'Verifica que en la cabecera de su dashboard /dashboard se renderice un banner con la alerta.',
      'Haz clic en el botón de cerrar o marcar como leída la alerta.',
      'Recarga la página /dashboard.',
    ],
    esperado: 'La alerta se despliega correctamente para los usuarios del sistema. Al marcarla como leída, la alerta desaparece y no vuelve a mostrarse en posteriores visitas.',
  },
  {
    id: 'adm-11', categoria: 'Panel Admin', ruta: '/admin/modulos', critica: false,
    titulo: 'Módulos del sistema — activar/desactivar globalmente',
    descripcion: 'Verifica la disponibilidad global y estados de los módulos core de la aplicación.',
    pasos: [
      'Inicia sesión como super_admin y dirígete a /admin/modulos.',
      'Verifica que se visualice la lista de los tres módulos core (calculadora, cotizador_crm, dpp) con su respectiva descripción y número de empresas que lo tienen activo.',
      'Haz clic en el switch de estado para desactivar temporalmente un módulo (ej. "dpp") globalmente y presiona "Confirmar cambios".',
      'Inicia sesión como un usuario de cualquier empresa y comprueba que no tenga acceso a dicho módulo desactivado.',
    ],
    esperado: 'La sección lista todos los módulos y su configuración base sin problemas de visualización ni errores en la llamada HTTP.',
  },
  {
    id: 'adm-12', categoria: 'Panel Admin', ruta: '/admin/logs', critica: false,
    titulo: 'Logs de auditoría — trazabilidad',
    descripcion: 'Ejecuta una acción administrativa crítica y comprueba que quede registrada en la bitácora de eventos del sistema.',
    pasos: [
      'Realiza una acción administrativa (ej. desactiva temporalmente una categoría o modifica el plan de una empresa).',
      'Dirígete a /admin/logs.',
      'Localiza la última entrada del registro y verifica el usuario que realizó la acción, la descripción del cambio y la fecha/hora exacta.',
    ],
    esperado: 'El log registra la acción en background con todos los metadatos de trazabilidad correspondientes (usuario, IP/acción, tipo de recurso, timestamp).',
  },
  {
    id: 'adm-13', categoria: 'Panel Admin', ruta: '/admin/reportes', critica: false,
    titulo: 'Reportes admin — resumen global de impacto',
    descripcion: 'Verifica la integridad de las estadísticas e informes globales consolidados presentados al administrador.',
    pasos: [
      'Ve a /admin/reportes.',
      'Selecciona un rango de fechas amplio (ej. el año en curso).',
      'Verifica que los datos consolidados de CO₂ evitado por empresa, pesos acumulados e histórico mensual coincidan con los totales sumados individualmente.',
    ],
    esperado: 'El sistema realiza el cálculo agregado de emisiones de forma correcta y renderiza gráficos explicativos que concuerdan con la sumatoria del historial.',
  },
  {
    id: 'adm-14', categoria: 'Panel Admin', ruta: '/admin/configuracion', critica: false,
    titulo: 'Configuración del sistema — parámetros globales',
    descripcion: 'Modifica parámetros operativos de la plataforma y valida su persistencia.',
    pasos: [
      'Entra a /admin/configuracion.',
      'Modifica un parámetro global del sistema (ej. el límite por defecto de invitaciones por empresa o la dirección de contacto técnica).',
      'Presiona "Guardar".',
      'Recarga la página para comprobar la persistencia.',
    ],
    esperado: 'La página de configuración carga sin problemas. Los cambios aplicados se escriben en la base de datos y persisten tras la recarga.',
  },
  {
    id: 'adm-15', categoria: 'Panel Admin', ruta: '/admin/plantillas', critica: false,
    titulo: 'Plantillas de email — vista y edición',
    descripcion: 'Accede y edita los contenidos HTML de las notificaciones por correo electrónico enviadas por el sistema.',
    pasos: [
      'Ve a /admin/plantillas.',
      'Selecciona la plantilla de email para "Invitación a nuevo miembro".',
      'Modifica una sección del cuerpo del texto del correo y guarda.',
      'Envía una invitación de prueba y revisa que el email recibido contenga el texto modificado.',
    ],
    esperado: 'Las plantillas se cargan e introducen cambios correctamente en la base de datos para los envíos de correos subsiguientes.',
  },
  {
    id: 'adm-16', categoria: 'Panel Admin', ruta: '/admin/logs', critica: false,
    titulo: 'Carga masiva de datos en tiempo real (Paginación)',
    descripcion: 'Evalúa la robustez del panel de logs y paginación al realizar búsquedas masivas e instantáneas.',
    pasos: [
      'Dirígete a /admin/logs.',
      'Abre DevTools -> pestaña Network (Red).',
      'En el cuadro de búsqueda del panel de logs, escribe y borra caracteres de búsqueda muy rápidamente (ej. presiona teclas continuamente para simular a un usuario estresando el campo) sin esperar a que cargue.',
      'Observa si el sistema de red aborta las peticiones anteriores o si la UI colapsa o duplica registros.',
    ],
    esperado: 'El sistema no colapsa ni duplica las filas en la tabla. Las llamadas anteriores se cancelan o se descartan eficientemente gracias a un mecanismo de debounce o cancelación en la UI.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 3. PANEL EMPRESA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'emp-01', categoria: 'Panel Empresa', ruta: '/empresa', critica: true,
    titulo: 'Dashboard empresa — KPIs y gráficas',
    descripcion: 'Inicia sesión como empresa_admin, navega a /empresa y comprueba la correcta visualización de las tarjetas de KPI para CO₂ evitado, agua ahorrada, peso total reusado y número de cálculos.',
    pasos: [
      'Inicia sesión como empresa_admin.',
      'Accede a la ruta /empresa.',
      'Comprueba la correcta visualización de las tarjetas de KPI para CO₂ evitado, agua ahorrada, peso total reusado y número de cálculos.',
      'Revisa que las gráficas de impacto mensual (barras/línea) y el gráfico de donut de distribución por categorías se carguen por completo.',
    ],
    esperado: 'Todos los componentes visuales cargan datos reales consolidados de la empresa en menos de 2 segundos. Las gráficas no se quedan colgadas en skeletons infinitos.',
  },
  {
    id: 'emp-02', categoria: 'Panel Empresa', ruta: '/empresa/calculos', critica: false,
    titulo: 'Historial de cálculos de la empresa',
    descripcion: 'Verifica los filtros, paginación y exportación de cálculos históricos generados por la organización.',
    pasos: [
      'Ve a /empresa/calculos.',
      'Usa el filtro de empleados y selecciona a un empleado específico para reducir el historial.',
      'Establece un rango de fechas para el mes en curso.',
      'Haz clic en "Exportar a CSV".',
      'Abre el archivo exportado y valida que solo contenga los cálculos que cumplen con el filtro aplicado de empleado y fechas.',
    ],
    esperado: 'Los filtros de búsqueda y paginación funcionan de manera integrada y rápida. El archivo CSV contiene exactamente la misma información que se ve en la pantalla filtrada.',
  },
  {
    id: 'emp-03', categoria: 'Panel Empresa', ruta: '/empresa/certificados', critica: true,
    titulo: 'Generar certificado de impacto acumulado',
    descripcion: 'Genera el documento oficial de impacto ecológico y valida la consistencia del código QR impreso en él.',
    pasos: [
      'Navega a /empresa/certificados.',
      'Haz clic en "Generar Certificado Oficial de Impacto".',
      'Espera a que se genere el archivo y se abra en el visor de PDF integrado del navegador.',
      'Copia el código alfanumérico RCO2 y escanea el código QR que viene impreso en el PDF con tu dispositivo móvil o verifica el enlace.',
    ],
    esperado: 'El PDF se genera en menos de 3 segundos, contiene los datos acumulados oficiales correctos de la empresa y el QR conduce a la página pública de validación /verificar/[codigo].',
  },
  {
    id: 'emp-04', categoria: 'Panel Empresa', ruta: '/empresa/reportes', critica: false,
    titulo: 'Generar informe por rango de fechas',
    descripcion: 'Descarga un informe detallado en un periodo personalizado y verifica su concordancia aritmética.',
    pasos: [
      'Ve a /empresa/reportes.',
      'Selecciona las fechas de inicio y fin correspondientes a un período determinado.',
      'Genera el reporte en formato PDF o Excel.',
      'Valida que los datos de emisiones reportados coincidan con el cálculo del historial de ese período de tiempo.',
    ],
    esperado: 'El reporte se descarga de forma correcta. Los valores agregados presentados corresponden exactamente con las transacciones de cálculo de ese período.',
  },
  {
    id: 'emp-05', categoria: 'Panel Empresa', ruta: '/empresa/equipo', critica: true,
    titulo: 'Gestión del equipo — lista y desactivar usuario',
    descripcion: 'Inactiva la cuenta de un empleado de la organización y valida que su acceso sea revocado de inmediato.',
    pasos: [
      'Dirígete a /empresa/equipo.',
      'Comprueba que la lista renderiza todos los empleados registrados bajo la organización.',
      'Selecciona un empleado de pruebas y haz clic en el botón de toggle o menú para "Desactivar usuario".',
      'Abre una ventana en incógnito e intenta iniciar sesión con el correo y contraseña de ese empleado desactivado.',
    ],
    esperado: 'El usuario desactivado es visible como inactivo en la interfaz del administrador. Al intentar iniciar sesión, la API de auth devuelve un mensaje de error claro de cuenta desactivada.',
  },
  {
    id: 'emp-06', categoria: 'Panel Empresa', ruta: '/empresa/metas', critica: false,
    titulo: 'Metas — crear, progreso y eliminar',
    descripcion: 'Configura un objetivo corporativo de reducción de emisiones y comprueba la acumulación automática del progreso.',
    pasos: [
      'Navega a /empresa/metas.',
      'Haz clic en "Nueva Meta", ponle título "Reducir Huella Q2", meta de co2_kg en "1000", y establece fechas para el trimestre.',
      'Inicia sesión como empleado y realiza cálculos que sumen 150 kg de CO₂ evitado.',
      'Regresa al panel de empresa /empresa/metas y observa la barra de progreso de la meta activa.',
    ],
    esperado: 'La barra de progreso de la meta se actualiza agregando el CO₂ evitado de los nuevos cálculos en tiempo real.',
  },
  {
    id: 'emp-07', categoria: 'Panel Empresa', ruta: '/empresa/objetos', critica: false,
    titulo: 'Objetos de la empresa — lista de ítems',
    descripcion: 'Verifica la integridad del inventario de activos ecológicos declarados por la empresa.',
    pasos: [
      'Navega a /empresa/objetos.',
      'Comprueba que se cargue la lista completa de activos registrados por los empleados de la organización.',
      'Valida que se muestre el identificador de cada objeto, su categoría, marca y total de CO₂ evitado calculado.',
    ],
    esperado: 'La lista se carga de forma correcta. Los ítems muestran todos sus detalles técnicos y el enlace a su pasaporte si lo tienen activo.',
  },
  {
    id: 'emp-08', categoria: 'Panel Empresa', ruta: '/empresa/soporte', critica: false,
    titulo: 'Crear ticket de soporte desde empresa',
    descripcion: 'Comprueba que un administrador de empresa pueda remitir incidencias al equipo de soporte de Reúso.',
    pasos: [
      'Ve a /empresa/soporte.',
      'Haz clic en "Crear Ticket", selecciona la categoría "Fallo técnico", prioridad "Alta", escribe una descripción detallada del error y envíalo.',
      'Entra al panel de super admin en /admin/tickets y busca el nuevo ticket registrado.',
    ],
    esperado: 'El ticket se crea de forma inmediato y se visualiza en la bandeja de entrada del administrador con todos sus campos y archivos adjuntos si corresponde.',
  },
  {
    id: 'emp-09', categoria: 'Panel Empresa', ruta: '/empresa/configuracion', critica: false,
    titulo: 'Configuración de la empresa — datos básicos',
    descripcion: 'Modifica la información general de la empresa y verifica la propagación en cascada de los cambios.',
    pasos: [
      'Entra a /empresa/configuracion.',
      'Modifica el nombre de la empresa y su sector comercial.',
      'Presiona "Guardar cambios".',
      'Recarga la página y comprueba que se visualicen los campos modificados.',
    ],
    esperado: 'Los datos de la empresa se actualizan de forma persistente y el cambio es visible en todas las pantallas vinculadas (incluyendo PDF y propuestas públicas).',
  },
  {
    id: 'emp-10', categoria: 'Panel Empresa', ruta: '/empresa/configuracion/modulos', critica: false,
    titulo: 'Módulos de la empresa — ver acceso',
    descripcion: 'Inspecciona las licencias de módulos y la asignación manual por usuario.',
    pasos: [
      'Inicia sesión como empresa_admin y navega a /empresa/configuracion/modulos desde la barra lateral de configuración.',
      'Revisa los módulos asignados (ej. Calculadora CO2, Cotizador CRM, Pasaporte Digital DPP) y sus interruptores de estado (activo/inactivo).',
      'Desmarca un módulo (por ejemplo, "Pasaporte Digital DPP") y haz clic en "Guardar licencias".',
      'Comprueba que el módulo se oculte automáticamente en tu menú lateral y que si intentas acceder por URL a /empresa/dpp seas redirigido al dashboard con un aviso de módulo inactivo.',
    ],
    esperado: 'El panel muestra con exactitud el estado de licenciamiento de la cuenta y bloquea el acceso si no hay licencia.',
  },
  {
    id: 'emp-11', categoria: 'Panel Empresa', ruta: '/empresa/configuracion/marca', critica: false,
    titulo: 'Marca personalizada — logo y WhatsApp',
    descripcion: 'Sube la identidad gráfica corporativa y comprueba su inclusión en la propuesta comercial externa.',
    pasos: [
      'Navega a /empresa/configuracion/marca.',
      'Sube una imagen de logo corporativo (formato PNG o JPG).',
      'Configura un número de WhatsApp para atención de clientes (con código de país, ej. +573001234567).',
      'Crea una cotización y abre la URL de la propuesta pública en modo incógnito.',
    ],
    esperado: 'La propuesta pública de cotización se renderiza mostrando el logo cargado de la empresa y el botón "Resolver dudas por WhatsApp" vincula directamente a https://wa.me/573001234567.',
  },
  {
    id: 'emp-12', categoria: 'Panel Empresa', ruta: '/empresa/equipo', critica: false,
    titulo: 'Invitación masiva y colisión de emails',
    descripcion: 'Somete el backend de invitaciones a condiciones de carrera enviando invitaciones simultáneas.',
    pasos: [
      'Navega a /empresa/equipo en dos pestañas diferentes de tu navegador al mismo tiempo.',
      'En ambas pestañas abre el modal de "Invitar Miembro".',
      'Rellena ambos formularios con la misma dirección de correo electrónico (ej. colision_qa@empresa.com).',
      'Haz clic en "Enviar Invitación" en ambas pestañas con una diferencia de menos de medio segundo (casi simultáneo).',
    ],
    esperado: 'Solo se crea un registro de invitación en la base de datos de Supabase. La segunda petición es rechazada de manera segura por restricciones de clave única, mostrando un error controlado en la UI.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 4. DASHBOARD EMPLEADO
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'dash-01', categoria: 'Dashboard', ruta: '/dashboard', critica: true,
    titulo: 'Registro de cálculo y actualización del historial',
    descripcion: 'Valida que la calculadora ecológica funcione correctamente y actualice el feed de cálculos de forma reactiva.',
    pasos: [
      'Inicia sesión como un usuario con rol empleado y ve a /dashboard.',
      'Rellena el formulario de cálculo: selecciona la categoría "Mobiliario de oficina", ingresa el peso "60" kg y el material "Madera maciza".',
      'Haz clic en the botón "Guardar cálculo".',
      'Observa la parte inferior de la pantalla donde se lista el historial personal de cálculos sin recargar el navegador de forma manual.',
    ],
    esperado: 'La tarjeta de resultado de CO₂ calculado muestra el total ahorrado al instante y el registro aparece en la primera posición de la tabla del historial sin necesidad de pulsar F5.',
  },
  {
    id: 'dash-02', categoria: 'Dashboard', ruta: '/dashboard', critica: false,
    titulo: 'Límite de plan Explora (10 cálculos/mes)',
    descripcion: 'Pone a prueba el restrictor de plan gratuito impidiendo cálculos adicionales tras alcanzar la cuota mensual.',
    pasos: [
      'Utiliza o configura un usuario de una empresa asociada al plan gratuito "Explora" que cuente ya con 10 cálculos registrados en el mes actual.',
      'Intenta realizar e ingresar un 11.º cálculo a través del formulario de /dashboard.',
      'Observa la respuesta e indicativos de la UI.',
    ],
    esperado: 'El sistema no permite el envío del formulario. Muestra un mensaje amigable indicando que se ha alcanzado el límite mensual permitido por el plan de la empresa y sugiere contactar al administrador. No genera un error de servidor (500).',
  },
  {
    id: 'dash-03', categoria: 'Dashboard', ruta: '/dashboard/historial', critica: false,
    titulo: 'Historial personal — filtros y búsqueda',
    descripcion: 'Realiza búsquedas detalladas y filtros de categorías en la bitácora personal del empleado.',
    pasos: [
      'Inicia sesión como empleado y ve a /dashboard.',
      'Ubica la tabla "Tu historial de cálculos" en la parte inferior de la página.',
      'Introduce una palabra clave (ej. "Madera") en el cuadro de búsqueda "Buscar cálculo..." y observa el filtrado automático.',
      'Haz clic en el selector dropdown de "Categoría", elige "Mobiliario de oficina" y comprueba que se actualice la tabla.',
      'Haz clic en el selector de rango de fechas, define el mes actual y verifica que los registros se limiten a este período.',
    ],
    esperado: 'La tabla de historial se actualiza de forma reactiva reflejando solo las operaciones del usuario que correspondan a los filtros aplicados.',
  },
  {
    id: 'dash-04', categoria: 'Dashboard', ruta: '/dashboard/certificados', critica: false,
    titulo: 'Certificados del empleado',
    descripcion: 'Comprueba el acceso y descarga de los certificados personales de reducción de emisiones.',
    pasos: [
      'Ve a la sección de certificados personales en /dashboard/certificados.',
      'Comprueba que aparezcan los certificados donde el empleado ha participado o acumulado impacto.',
      'Presiona "Descargar" en uno de ellos.',
    ],
    esperado: 'Se abre o descarga el PDF oficial que avala la participación y el total de CO₂ evitado por el empleado.',
  },
  {
    id: 'dash-05', categoria: 'Dashboard', ruta: '/dashboard/objetos', critica: false,
    titulo: 'Objetos del empleado',
    descripcion: 'Visualiza el inventario personal de activos recuperados declarados por el empleado.',
    pasos: [
      'Inicia sesión como empleado, abre la barra lateral y haz clic en "Mis Objetos" o navega directamente a /dashboard/objetos.',
      'Comprueba que se renderice la lista o grilla conteniendo todos los muebles ecológicos declarados individualmente por ti.',
      'Verifica que cada ítem muestre su nombre, peso (en kg), estado físico actual (ej. Excelente, Bueno), total de CO₂ evitado calculado y la fecha de registro.',
    ],
    esperado: 'Lista visible de ítems con su peso, estado físico, CO₂ asociado y fecha de registro.',
  },
  {
    id: 'dash-06', categoria: 'Dashboard', ruta: '/dashboard/soporte', critica: false,
    titulo: 'Soporte del empleado — crear y ver ticket',
    descripcion: 'Genera una incidencia técnica como empleado y valida el flujo bidireccional de comentarios con el administrador.',
    pasos: [
      'Ve a la sección /dashboard/soporte.',
      'Crea un ticket de soporte con el asunto "Error en selector de madera" y envíalo.',
      'Valida que aparezca en el listado con estado "Abierto".',
      'Inicia sesión como administrador en /admin/tickets y responde a este ticket.',
      'Regresa al dashboard del empleado y verifica la actualización.',
    ],
    esperado: 'El flujo de comunicación se refleja correctamente. El empleado puede ver las respuestas del administrador y el estado actualizado del ticket.',
  },
  {
    id: 'dash-07', categoria: 'Dashboard', ruta: '/dashboard', critica: false,
    titulo: 'Cálculos súper-rápidos y simulación de latencia',
    descripcion: 'Valida que el sistema esté protegido contra race conditions si se presiona repetidamente el botón de guardar.',
    pasos: [
      'Abre /dashboard y llena los datos del formulario de cálculo.',
      'Abre DevTools, ve a la pestaña Network y ajusta el throttling de red a "Fast 3G" para simular conexión lenta.',
      'Haz clic en el botón "Guardar" de forma consecutiva y muy rápida 5 veces.',
    ],
    esperado: 'El botón de enviar cálculo se bloquea/deshabilita al primer clic. El sistema no permite registrar duplicados y solo realiza una inserción en la base de datos.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 5. COTIZADOR IA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'cot-01', categoria: 'Cotizador IA', ruta: '/empresa/cotizador', critica: true,
    titulo: 'Panel CRM — lista de cotizaciones y filtros',
    descripcion: 'Comprueba el tablero general del CRM del cotizador, filtros por estados y búsquedas rápidas.',
    pasos: [
      'Entra a /empresa/cotizador.',
      'Verifica que se visualice la lista de propuestas del cliente con su nombre, fecha de creación, precio estimado y estado.',
      'Prueba el buscador de texto ingresando el nombre de un cliente.',
      'Filtra por el estado "Enviada" y luego por "Pendiente".',
    ],
    esperado: 'El CRM responde rápido actualizando los datos en base a las búsquedas. Si una búsqueda devuelve 0 resultados, muestra un texto amigable y un botón para limpiar filtros.',
  },
  {
    id: 'cot-02', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: true,
    titulo: 'Diagnóstico IA — mueble viable',
    descripcion: 'Somete una fotografía válida de madera maciza para validar el acierto del modelo de visión.',
    pasos: [
      'Dirígete a /empresa/cotizador/nueva.',
      'Selecciona y sube una fotografía nítida de un mueble de madera maciza (ej. una mesa de comedor en buen estado).',
      'Presiona "Iniciar Diagnóstico" e inicia un cronómetro.',
      'Observa la respuesta devuelta por la API del modelo de visión.',
    ],
    esperado: 'El análisis de la IA detecta que el mueble es viable (es_viable = true), identifica correctamente la categoría ("Mobiliario") y el material ("Madera maciza"), con un nivel de confianza > 0.6. El tiempo de respuesta es menor a 8 segundos.',
  },
  {
    id: 'cot-03', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: true,
    titulo: 'Diagnóstico IA — mueble inviable (MDF)',
    descripcion: 'Somete una foto de un mueble de aglomerado/MDF y valida el rechazo controlado del sistema.',
    pasos: [
      'En el formulario de nueva cotización, sube una foto de un mueble fabricado en aglomerado, melamina o MDF en mal estado.',
      'Espera a que termine la llamada de análisis del modelo de visión.',
    ],
    esperado: 'La IA determina que el mueble no cumple con los criterios de reúso (es_viable = false), da un motivo claro ("Material no recuperable - Aglomerado") y el formulario inhabilita el botón de continuar para evitar cotizarlo.',
  },
  {
    id: 'cot-04', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: false,
    titulo: 'Imagen mayor a 10 MB — validación',
    descripcion: 'Intenta forzar la carga de un archivo mayor al límite estipulado.',
    pasos: [
      'En el área de subida de fotos del cotizador, intenta seleccionar una imagen pesada que supere los 10 megabytes (MB).',
    ],
    esperado: 'El validador en el frontend intercepta el archivo antes de subirlo, muestra una alerta que dice "La imagen no puede superar 10 MB" y limpia el input de archivos.',
  },
  {
    id: 'cot-05', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: false,
    titulo: 'Rate limit — 5 diagnósticos por minuto',
    descripcion: 'Comprueba las protecciones de tasa de uso (rate limit) de la API de diagnóstico de imágenes.',
    pasos: [
      'Prepara 6 imágenes de prueba diferentes de muebles.',
      'Sube y ejecuta diagnósticos uno tras otro lo más rápido posible.',
      'Intenta ejecutar el 6.º diagnóstico en el mismo minuto.',
    ],
    esperado: 'El sistema bloquea el 6.º diagnóstico mostrando el mensaje de advertencia "Demasiadas solicitudes: límite de 5 análisis por minuto alcanzado" con status de API 429. Vuelve a permitir diagnósticos tras esperar 60 segundos.',
  },
  {
    id: 'cot-06', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: true,
    titulo: 'Flujo completo: diagnóstico → ajuste → guardar',
    descripcion: 'Realiza el flujo integral de cotización de un mueble viable desde la carga hasta el guardado en base de datos.',
    pasos: [
      'Completa la subida y diagnóstico de un mueble viable.',
      'En el siguiente paso, edita los oficios requeridos (ej. activa Carpintería y Barnizado y desactiva Tapicería).',
      'Agrega los datos del cliente (nombre, email, teléfono), precio de venta sugerido y una descripción.',
      'Haz clic en "Guardar Cotización".',
      'Comprueba que aparezca en el panel de /empresa/cotizador en estado "Pendiente".',
    ],
    esperado: 'La cotización se almacena de forma exitosa en la base de datos reflejando los oficios y los datos del cliente correctos.',
  },
  {
    id: 'cot-07', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/[id]', critica: true,
    titulo: 'Detalle de cotización — generar enlace público',
    descripcion: 'Genera el token y URL de propuesta comercial y valida su legibilidad sin sesión.',
    pasos: [
      'Selecciona una cotización guardada y haz clic para ver su detalle en /empresa/cotizador/[id].',
      'Presiona the botón "Generar enlace de propuesta".',
      'Copia la URL generada al portapapeles.',
      'Abre una pestaña de incógnito, pega la dirección y carga la página.',
    ],
    esperado: 'La página de propuesta comercial para el cliente carga sin pedir credenciales, mostrando el logo de la empresa emisora, los detalles del mueble y el botón para responder por WhatsApp.',
  },
  {
    id: 'cot-08', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/[id]', critica: false,
    titulo: 'Cambio de estado con confirmación (terminal)',
    descripcion: 'Valida la protección interactiva contra cierres accidentales de cotizaciones.',
    pasos: [
      'Abre el panel de detalle de una cotización.',
      'Despliega el selector de estados de la cotización y cámbialo a un estado final como "Cerrado ganado" o "Cerrado perdido".',
      'Verifica que se muestre un modal solicitando confirmación de la acción.',
      'Haz clic en "Cancelar" y comprueba que el estado no se haya modificado.',
      'Repite el cambio y haz clic en "Confirmar".',
    ],
    esperado: 'El estado cambia solo al confirmar en el modal de advertencia, previniendo alteraciones accidentales de los estados comerciales del CRM.',
  },
  {
    id: 'cot-09', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/[id]', critica: false,
    titulo: 'Copiar texto para WhatsApp',
    descripcion: 'Comprueba el formateador de textos predefinidos para envíos de propuestas comerciales por mensajería.',
    pasos: [
      'Abre una cotización activa que ya tenga un enlace de propuesta pública.',
      'Haz clic en el botón "Copiar mensaje corto de WhatsApp".',
      'Pega el contenido copiado en cualquier editor de texto o chat.',
    ],
    esperado: 'El texto copiado incluye un saludo amigable personalizado para el cliente, la mención del mueble cotizado, el precio final y el enlace corto de la propuesta comercial /propuesta/[token].',
  },
  {
    id: 'cot-10', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: false,
    titulo: 'Carga concurrente de imágenes pesadas',
    descripcion: 'Somete el procesador de imágenes en cliente a estrés enviando múltiples archivos pesados simultáneamente.',
    pasos: [
      'Abre 3 pestañas del navegador en la ruta /empresa/cotizador/nueva.',
      'Selecciona en cada una de ellas una imagen de un mueble de gran tamaño (entre 8MB y 10MB).',
      'Presiona el botón de iniciar diagnóstico en las 3 pestañas casi de forma simultánea.',
      'Abre la pestaña de red de DevTools para monitorear las llamadas concurrentes.',
    ],
    esperado: 'La aplicación del lado del cliente procesa y comprime las imágenes antes del envío, transmitiendo archivos optimizados. El backend procesa las solicitudes en paralelo sin lanzar errores de timeout (504) o de memoria excedida.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 6. DPP / PASAPORTE DIGITAL
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'dpp-01', categoria: 'DPP / Pasaporte', ruta: '/empresa/dpp', critica: true,
    titulo: 'Lista de activos DPP',
    descripcion: 'Verifica la grilla y el buscador de pasaportes digitales de producto.',
    pasos: [
      'Navega a la ruta de administración de pasaportes digitales /empresa/dpp.',
      'Comprueba que se listen todos los activos registrados con su identificador único, nombre, fecha y estado de validez en la cadena.',
      'Escribe el nombre de un activo en la barra de búsqueda y verifica el filtro instantáneo.',
    ],
    esperado: 'La lista carga rápidamente. El buscador filtra la grilla de pasaportes digitales en tiempo real.',
  },
  {
    id: 'dpp-02', categoria: 'DPP / Pasaporte', ruta: '/empresa/dpp/nuevo', critica: true,
    titulo: 'Crear pasaporte digital completo',
    descripcion: 'Genera un nuevo DPP de pruebas rellenando composición material, peso y fotografía.',
    pasos: [
      'Ve a /empresa/dpp/nuevo.',
      'Ingresa el nombre "Escritorio Operativo QA", peso "50" kg, porcentaje de circularidad y composición de materiales (ej. Madera 80%, Metal 20%).',
      'Sube una foto representativa del producto.',
      'Haz clic en "Generar Pasaporte Digital".',
      'Comprueba que aparezca en el listado global.',
    ],
    esperado: 'El DPP se almacena correctamente, generando un código hash SHA-256 único y asociando la imagen de forma permanente.',
  },
  {
    id: 'dpp-03', categoria: 'DPP / Pasaporte', ruta: '/empresa/dpp/nuevo', critica: false,
    titulo: 'Ingesta IA desde imagen — extracción de campos',
    descripcion: 'Somete una etiqueta técnica e inspecciona la precarga inteligente de especificaciones.',
    pasos: [
      'En el formulario de creación de nuevo DPP, sube una imagen o fotografía de una ficha de especificaciones técnicas o etiqueta del mueble.',
      'Espera a que la IA procese la imagen (OCR + Análisis semántico).',
      'Revisa qué campos del formulario se rellenaron automáticamente.',
    ],
    esperado: 'El sistema extrae al menos 2 campos técnicos (ej. peso del ítem, porcentaje de composición o dimensiones) a partir del texto de la imagen y los escribe en los campos correspondientes.',
  },
  {
    id: 'dpp-04', categoria: 'DPP / Pasaporte', ruta: '/pasaporte/[codigo]', critica: true,
    titulo: 'Verificación pública del pasaporte por QR',
    descripcion: 'Abre la vista pública del pasaporte descentralizado de producto sin iniciar sesión.',
    pasos: [
      'Abre el detalle de un activo en /empresa/dpp/[id].',
      'Copia el enlace del pasaporte digital público.',
      'Abre la URL en una ventana de incógnito en tu navegador.',
      'Revisa que cargue la información pública: nombre del mueble, peso, porcentaje de materiales circulares, hash de la transacción y la firma de auditoría.',
    ],
    esperado: 'La página de pasaporte público carga sin requerir inicio de sesión en menos de 2 segundos, mostrando de forma ordenada la ficha técnica ecológica completa.',
  },
  {
    id: 'dpp-05', categoria: 'DPP / Pasaporte', ruta: '/empresa/dpp/[id]', critica: false,
    titulo: 'Detalle DPP — editar y agregar ciclo',
    descripcion: 'Registra un evento de mantenimiento y valida su inserción cronológica en el histórico del DPP.',
    pasos: [
      'Abre la vista detallada de un pasaporte digital en /empresa/dpp/[id].',
      'Ubica la sección de ciclo de vida del producto.',
      'Haz clic en "Registrar intervención / mantenimiento", rellena la fecha, tipo de acción (ej. "Rebarnizado de cubierta") y el operario a cargo, y presiona "Guardar".',
      'Recarga la página y revisa la línea de tiempo del activo.',
    ],
    esperado: 'El nuevo ciclo se añade a la base de datos de forma persistente y se muestra cronológicamente en la línea de tiempo interactiva del pasaporte del producto.',
  },
  {
    id: 'dpp-06', categoria: 'DPP / Pasaporte', ruta: '/empresa/dpp/[id]', critica: false,
    titulo: 'Generación de Pasaportes con ciclos de vida extensos',
    descripcion: 'Pone a prueba el renderizador del frontend agregando un número inusualmente alto de hitos de mantenimiento.',
    pasos: [
      'Abre un activo de DPP en /empresa/dpp/[id].',
      'Registra de forma consecutiva 20 intervenciones de mantenimiento en la línea de tiempo con descripciones detalladas de más de 200 caracteres cada una.',
      'Navega a la URL del pasaporte público en modo incógnito.',
      'Realiza scroll vertical rápido a través del historial de ciclos de vida.',
    ],
    esperado: 'La interfaz responde de forma fluida (> 60fps) sin congelar la pestaña del navegador. La línea de tiempo muestra todas las intervenciones con sus respectivos hashes calculados sin desbordar el diseño.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 7. PÁGINAS PÚBLICAS
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'pub-01', categoria: 'Páginas Públicas', ruta: '/', critica: false,
    titulo: 'Landing page — carga y formulario de contacto',
    descripcion: 'Navega en modo incógnito, comprueba la carga de la landing y envía un lead de contacto.',
    pasos: [
      'Abre una pestaña de incógnito y navega a la raíz del sitio /.',
      'Comprueba la carga fluida de todas las secciones principales (Hero, Características, Planes, Opiniones y Formulario de contacto).',
      'Rellena el formulario de lead al final de la landing: introduce nombre, email de pruebas, sector comercial y presiona "Enviar".',
      'Inicia sesión como admin y entra a /admin/leads.',
    ],
    esperado: 'La página de aterrizaje carga en menos de 2 segundos. El formulario de contacto procesa la llamada y escribe un nuevo registro visible en la lista de leads de /admin/leads.',
  },
  {
    id: 'pub-02', categoria: 'Páginas Públicas', ruta: '/legal', critica: false,
    titulo: 'Páginas legales — todas accesibles',
    descripcion: 'Comprueba el acceso libre de sesión a términos y condiciones y el panel de consentimiento de cookies.',
    pasos: [
      'Cierra la sesión activa en el navegador.',
      'Ingresa sucesivamente a las siguientes URLs: /legal, /legal/privacidad, /legal/terminos, /legal/datos y /legal/cookies.',
      'Haz clic en el botón de configuración de preferencias de cookies en la esquina del banner legal.',
    ],
    esperado: 'Todas las rutas de términos de uso y políticas de privacidad son accesibles públicamente y no devuelven errores 404 ni 500. El panel de cookies permite activar y desactivar consentimientos de forma interactiva.',
  },
  {
    id: 'pub-03', categoria: 'Páginas Públicas', ruta: '/legal/dudas', critica: false,
    titulo: 'Formulario de dudas legales',
    descripcion: 'Valida la radicación de preguntas jurídicas desde el portal público de dudas.',
    pasos: [
      'Ve a /legal/dudas en modo incógnito.',
      'Rellena el formulario de dudas legales con un nombre, correo electrónico y la pregunta técnica de prueba.',
      'Haz clic en "Enviar consulta".',
    ],
    esperado: 'Se muestra un mensaje de éxito. La consulta se registra en la base de datos bajo la tabla de soporte o incidencias para revisión de los administradores.',
  },
  {
    id: 'pub-04', categoria: 'Páginas Públicas', ruta: '/status', critica: false,
    titulo: 'Página de estado del sistema (Status Page)',
    descripcion: 'Comprueba la visibilidad de estados de API, Base de Datos, y los reportes de incidentes.',
    pasos: [
      'Navega a /status en modo incógnito.',
      'Revisa que los componentes de la plataforma (Base de datos, Autenticación, API de cálculo, API de cotización e IAs) se carguen con su estado correspondiente.',
      'Comprueba la sección de reportar un incidente de forma manual y el formulario de suscripción a alertas.',
    ],
    esperado: 'La página de estatus carga y muestra la telemetría en tiempo real de los servicios y las últimas incidencias registradas en el historial.',
  },
  {
    id: 'pub-05', categoria: 'Páginas Públicas', ruta: '/verificar/[codigo]', critica: true,
    titulo: 'Verificación de certificado/informe',
    descripcion: 'Valida un certificado emitido introduciendo su identificador en el portal público de verificación.',
    pasos: [
      'Genera un certificado de impacto acumulado desde /empresa/certificados y copia su código RCO2.',
      'Navega a /verificar/[codigo] en incógnito (ej. /verificar/RCO2-9876-5432).',
      'Valida que la información de emisiones del certificado coincida con los datos reales presentados.',
    ],
    esperado: 'La página pública de validación renderiza el estado "VÁLIDO", detallando el nombre de la empresa emisora, la huella de CO₂ evitada y la fecha original de expedición.',
  },
  {
    id: 'pub-06', categoria: 'Páginas Públicas', ruta: '/propuesta/[token]', critica: true,
    titulo: 'Propuesta pública de cotización',
    descripcion: 'Verifica la visualización de propuestas de restauración y accesos a WhatsApp.',
    pasos: [
      'Genera un enlace de propuesta comercial para un cliente desde el CRM del cotizador de una empresa.',
      'Abre la URL /propuesta/[token] en modo incógnito en tu navegador.',
      'Revisa que toda la cotización de los oficios, descripción del mueble y precio sugerido sea correcta.',
    ],
    esperado: 'La propuesta comercial carga de forma impecable sin pedir autenticación y el botón de contacto dirige directamente al WhatsApp de la empresa emisora.',
  },
  {
    id: 'pub-07', categoria: 'Páginas Públicas', ruta: '/empresa/nueva', critica: false,
    titulo: 'Crear empresa nueva — flujo de onboarding',
    descripcion: 'Completa el onboarding de creación de empresa y promoción de rol de usuario.',
    pasos: [
      'Inicia sesión con un usuario recién registrado que aún no pertenezca a ninguna organización.',
      'Verifica que el middleware te redirija automáticamente a /empresa/nueva.',
      'Rellena el formulario con el nombre de la empresa, NIT, sector e información de contacto.',
      'Presiona "Guardar empresa".',
    ],
    esperado: 'La empresa se crea con éxito, el rol de tu cuenta se promueve a empresa_admin y eres redirigido al panel /empresa.',
  },
  {
    id: 'pub-08', categoria: 'Páginas Públicas', ruta: '/status', critica: false,
    titulo: 'Widget Diagnóstico de Conexión en Vivo — Simulación de desconexión parcial',
    descripcion: 'Comprueba el comportamiento adaptativo del widget de ping en tiempo real simulando cortes de red.',
    pasos: [
      'Abre la página pública /status en incógnito y localiza el panel de "Diagnóstico de Red en Vivo".',
      'Abre las DevTools, ve a la pestaña Network y ajusta el modo de red a "Offline".',
      'Presiona el botón "Iniciar" del diagnóstico.',
      'A la mitad de la prueba de ping, cambia el modo de red a "Fast 3G" para simular reconexión inestable.',
    ],
    esperado: 'La aplicación no arroja pantallazos de error. El widget registra adecuadamente el estado "Error de red" mientras estuvo desconectado y calcula correctamente la nueva latencia de ping en cuanto se reestablece la conexión.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 8. MODO NOCHE
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'dark-01', categoria: 'Modo Noche', ruta: '/login', critica: false,
    titulo: 'Login en modo noche',
    descripcion: 'Valida el contraste y consistencia tipográfica en la interfaz de login en modo noche.',
    pasos: [
      'Activa el modo noche en la aplicación desde el toggle del sidebar en el panel principal.',
      'Cierra sesión e ingresa a la página /login.',
      'Examina visualmente todos los elementos de la interfaz: el fondo, inputs, placeholders, botones, etiquetas y testimonios.',
    ],
    esperado: 'El diseño se adapta perfectamente al tema oscuro. No se aprecian textos oscuros sobre fondo oscuro ni contrastes que dificulten la lectura de los inputs de credenciales.',
  },
  {
    id: 'dark-02', categoria: 'Modo Noche', ruta: '/dashboard', critica: false,
    titulo: 'Dashboard completo en modo noche',
    descripcion: 'Inspecciona la paleta de colores oscuros en la calculadora y visualizadores del empleado.',
    pasos: [
      'Inicia sesión con tu cuenta de empleado con el modo noche activo.',
      'Navega a /dashboard.',
      'Inspecciona el fondo de la página, los colores de los KPIs, el historial de cálculos, las etiquetas y las gráficas.',
      'Realiza un nuevo registro de cálculo en el formulario.',
    ],
    esperado: 'El color de fondo se renderiza en gris oscuro #474747, los textos se muestran en color blanco, y los acentos interactivos usan el color verde pistacho #D6F391. No aparecen tarjetas con fondos verdes oscuros o bordes descuadrados.',
  },
  {
    id: 'dark-03', categoria: 'Modo Noche', ruta: '/empresa', critica: false,
    titulo: 'Panel empresa en modo noche',
    descripcion: 'Verifica gráficos circulares, barras e historiales de empresa en tema oscuro.',
    pasos: [
      'Inicia sesión como empresa_admin con el tema oscuro activado.',
      'Navega a la ruta /empresa y revisa las secciones analíticas.',
      'Entra a /empresa/equipo, /empresa/metas y /empresa/reportes.',
    ],
    esperado: 'Todas las tablas, gráficos circulares y de barras, barras de progreso y modales se visualizan con el contraste correcto. No quedan secciones flotantes con fondos claros sobre la interfaz oscura.',
  },
  {
    id: 'dark-04', categoria: 'Modo Noche', ruta: '/empresa/cotizador', critica: false,
    titulo: 'Cotizador IA en modo noche',
    descripcion: 'Valida selectores dropdown, switches y modales del CRM en modo noche.',
    pasos: [
      'Con el modo noche activo, ve a /empresa/cotizador.',
      'Entra a /empresa/cotizador/nueva, sube una foto de mueble viable y observa el proceso de diagnóstico de IA.',
      'Abre el detalle de una cotización y edita los oficios requeridos.',
    ],
    esperado: 'Todo el flujo del cotizador es legible. Las tarjetas de diagnóstico, los selectores dropdown, los switches y los textos de ayuda respetan el esquema de colores oscuros con acentos pistacho.',
  },
  {
    id: 'dark-05', categoria: 'Modo Noche', ruta: '/empresa/dpp', critica: false,
    titulo: 'DPP en modo noche',
    descripcion: 'Comprueba el contraste y usabilidad del gestor de pasaportes en modo noche.',
    pasos: [
      'Con el modo noche activo, dirígete al listado de pasaportes digitales /empresa/dpp.',
      'Abre el formulario de creación en /empresa/dpp/nuevo.',
      'Abre la línea de tiempo de un pasaporte existente.',
    ],
    esperado: 'Los campos de entrada, botones de subida de imágenes, sliders de composición de materiales y la línea de tiempo se muestran legibles y con el contraste estético premium esperado.',
  },
  {
    id: 'dark-06', categoria: 'Modo Noche', ruta: '/admin', critica: false,
    titulo: 'Panel admin en modo noche',
    descripcion: 'Verifica consistencia en tablas extensas y modales del panel de administración global.',
    pasos: [
      'Inicia sesión como super_admin con el modo noche activado.',
      'Navega secuencialmente por /admin, /admin/usuarios, /admin/empresas, /admin/tickets y /admin/logs.',
      'Abre modales de edición y paneles laterales de información detallada.',
    ],
    esperado: 'Los modales overlays de administración y las tablas extensas se renderizan con el fondo oscuro correcto, evitando parpadeos de color blanco al abrir elementos emergentes.',
  },
  {
    id: 'dark-07', categoria: 'Modo Noche', ruta: '/settings', critica: false,
    titulo: 'Settings — toggle de modo noche persiste',
    descripcion: 'Valida que el estado del tema persista al cerrar la sesión o reiniciar la pestaña.',
    pasos: [
      'Ve a /settings.',
      'Activa el modo noche en los controles de perfil/configuración.',
      'Cierra por completo la pestaña del navegador.',
      'Vuelve a ingresar a la aplicación en una pestaña nueva y comprueba el tema visual aplicado.',
    ],
    esperado: 'La preferencia de modo noche se almacena localmente y se mantiene activa de forma persistente en las siguientes sesiones del usuario.',
  },
  {
    id: 'dark-08', categoria: 'Modo Noche', ruta: '/empresa', critica: false,
    titulo: 'Consistencia de contraste extremo en gráficos interactivos y modales flotantes',
    descripcion: 'Verifica la integridad de las paletas de ApexCharts al conmutar repetida y velozmente el tema visual.',
    pasos: [
      'Ve a /empresa con el tema claro activo.',
      'Haz clic en el botón de cambio de tema del sidebar de forma consecutiva y rápida (10 veces en 4 segundos) mientras observas los Tooltips interactivos y leyendas del gráfico de CO₂ y el donut de categorías.',
    ],
    esperado: 'Los gráficos y sus tooltips flotantes cambian de tema de forma síncrona sin retener configuraciones de color anteriores (ej. no debe quedar texto blanco sobre fondo blanco ni texto negro sobre fondo negro).',
  },

  // ══════════════════════════════════════════════════════════════════
  // 9. RENDIMIENTO
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'perf-01', categoria: 'Rendimiento', ruta: '/dashboard', critica: true,
    titulo: 'Login → Dashboard < 1 segundo',
    descripcion: 'Mide la velocidad de autenticación y redirección inicial al panel principal.',
    pasos: [
      'Abre las DevTools, ve a la pestaña Network y limpia el historial de peticiones.',
      'Ingresa las credenciales correctas en /login y haz clic en "Ingresar".',
      'Cronometra el intervalo transcurrido desde el clic hasta que finaliza la carga del DOM de /dashboard.',
    ],
    esperado: 'El tiempo total de respuesta del login y redirección al panel principal es inferior a 1000 milisegundos (1 segundo) en condiciones normales de conexión.',
  },
  {
    id: 'perf-02', categoria: 'Rendimiento', ruta: '/empresa', critica: false,
    titulo: 'Panel empresa con gráficas < 2 segundos',
    descripcion: 'Mide el renderizado completo de las analíticas de impacto ecológico consolidado.',
    pasos: [
      'Navega a /empresa pulsando Ctrl+Shift+R (recarga completa de la caché).',
      'Valida que durante la carga de las estadísticas y los gráficos se muestren skeletons de carga coherentes.',
      'Anota el tiempo transcurrido desde la petición inicial hasta que el gráfico de CO₂ se dibuja por completo.',
    ],
    esperado: 'El tiempo de renderizado completo es inferior a 2 segundos. Los skeletons mitigan el efecto de parpadeo visual.',
  },
  {
    id: 'perf-03', categoria: 'Rendimiento', ruta: '/empresa/cotizador/nueva', critica: false,
    titulo: 'Compresión de imagen antes del diagnóstico',
    descripcion: 'Verifica la optimización de peso en cliente antes de la transmisión HTTP.',
    pasos: [
      'Ve al cotizador en /empresa/cotizador/nueva.',
      'Abre DevTools, ve a la pestaña Network y selecciona una imagen de prueba pesada (de entre 6 y 8MB).',
      'Presiona "Iniciar Diagnóstico" e inspecciona el tamaño de la carga útil (payload) del request HTTP POST enviado a /api/cotizador/diagnostico.',
    ],
    esperado: 'El tamaño del archivo transmitido en el POST es menor a 4MB, confirmando que el frontend aplica compresión en el cliente (client-side compression) antes de la subida.',
  },
  {
    id: 'perf-04', categoria: 'Rendimiento', ruta: '/empresa/certificados', critica: false,
    titulo: 'Generación de PDF < 3 segundos',
    descripcion: 'Verifica que el servicio de compilación PDF resuelva rápido e impida timeouts.',
    pasos: [
      'Dirígete a la sección de certificados /empresa/certificados o reportes.',
      'Haz clic en generar el PDF del documento de impacto.',
      'Cronometra el tiempo hasta que se abre el visor con el PDF generado en el navegador.',
    ],
    esperado: 'La compilación del PDF a nivel de servidor se completa y entrega en menos de 3 segundos, previniendo fallos de timeout.',
  },
  {
    id: 'perf-05', categoria: 'Rendimiento', ruta: '/pasaporte/[codigo]', critica: false,
    titulo: 'Pasaporte público < 2 segundos',
    descripcion: 'Valida la velocidad de despacho del pasaporte público para lecturas rápidas de QR.',
    pasos: [
      'Copia la URL de un pasaporte digital público /pasaporte/[codigo].',
      'Abre la consola de desarrollo, pestaña Network, y carga la URL en modo incógnito.',
      'Comprueba el tiempo total de carga de la página.',
    ],
    esperado: 'La página pública de pasaporte se carga en menos de 2 segundos, asegurando una experiencia rápida al escanear los códigos QR físicos desde móviles.',
  },
  {
    id: 'perf-06', categoria: 'Rendimiento', ruta: '/empresa/calculos', critica: false,
    titulo: 'Retención de memoria por renderizado de tablas extensas',
    descripcion: 'Evalúa la acumulación de nodos DOM y posibles fugas de RAM tras búsquedas sucesivas.',
    pasos: [
      'Abre /empresa/calculos.',
      'Abre DevTools -> pestaña Memory -> selecciona "Heap snapshot" y toma una captura de la memoria RAM del navegador.',
      'Modifica los filtros de búsqueda y cambia de página de la tabla de forma continua y muy rápida durante 15 segundos para forzar renderizados repetidos de filas.',
      'Toma una segunda captura "Heap snapshot" y compáralas.',
    ],
    esperado: 'El incremento de memoria del Heap tras liberar recursos (Garbage Collection) es menor a 2MB. Los elementos DOM de filas anteriores se desmontan por completo del árbol sin generar Memory Leaks.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 10. SEGURIDAD & RBAC
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'seg-01', categoria: 'Seguridad', ruta: '/middleware', critica: true,
    titulo: 'Empleado no accede a rutas de admin ni empresa',
    descripcion: 'Intenta acceder a URLs administrativas con una sesión básica de empleado.',
    pasos: [
      'Inicia sesión con una cuenta de usuario con el rol de empleado.',
      'Intenta ingresar de forma directa escribiendo en la URL del navegador /admin, /admin/usuarios, /empresa/equipo, /empresa/configuracion o /empresa/cotizador (si no tiene el módulo).',
    ],
    esperado: 'El middleware de la aplicación intercepta el intento de intrusión, bloquea la visualización de la página y redirige automáticamente al usuario a /dashboard.',
  },
  {
    id: 'seg-02', categoria: 'Seguridad', ruta: '/api', critica: true,
    titulo: 'APIs sin sesión retornan 401',
    descripcion: 'Comprueba el blindaje de las rutas API REST del backend ante accesos públicos no autenticados.',
    pasos: [
      'Cierra sesión por completo en el sistema.',
      'Abre DevTools, ve a la pestaña Console y ejecuta la siguiente petición fetch:',
      'fetch("/api/calcular", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({})}).then(r=>console.log(r.status, r.statusText))',
      'Repite el comando para /api/cotizador/cotizaciones, /api/dpp/activos y /api/profile.',
    ],
    esperado: 'Todas las llamadas a las APIs protegidas devuelven un código de estado 401 Unauthorized indicando que no se cuenta con una sesión válida.',
  },
  {
    id: 'seg-03', categoria: 'Seguridad', ruta: '/api/cotizador', critica: false,
    titulo: 'Empleado no accede a cotizaciones de otra empresa',
    descripcion: 'Verifica la hermeticidad de datos (tenancy isolation) forzando llamadas con IDs cruzados.',
    pasos: [
      'Obtén el identificador único (ID) de una cotización perteneciente a la Empresa A.',
      'Inicia sesión con un usuario de rol empleado perteneciente a la Empresa B.',
      'Abre la consola de desarrollo y ejecuta la petición:',
      'fetch("/api/cotizador/cotizaciones/[id_de_empresa_a]").then(r=>console.log(r.status)) (sustituyendo por el ID real).',
    ],
    esperado: 'El backend valida la separación de datos y devuelve un error de tipo 403 Forbidden o 404 Not Found. No expone información confidencial de terceras empresas.',
  },
  {
    id: 'seg-04', categoria: 'Seguridad', ruta: '/empresa/cotizador', critica: false,
    titulo: 'Módulo cotizador bloqueado sin activación',
    descripcion: 'Valida la inaccesibilidad a vistas premium cuando la empresa no cuenta con el módulo habilitado.',
    pasos: [
      'Desactiva el módulo "Cotizador CRM" de la Empresa de Prueba en el panel de control de administración /admin/empresas.',
      'Inicia sesión con la cuenta de administrador de esa misma empresa.',
      'Intenta forzar la navegación manual hacia la dirección /empresa/cotizador.',
    ],
    esperado: 'El middleware o la validación interna de la página intercepta la falta de licencia del módulo y redirige al panel general /empresa con un query param explicativo (ej. /empresa?modulo_bloqueado=cotizador).',
  },
  {
    id: 'seg-05', categoria: 'Seguridad', ruta: '/api/auth', critica: true,
    titulo: 'Rate limit en inicio de sesión (Login) — Control por IP (BD)',
    descripcion: 'Verifica que el backend bloquee intentos repetidos de inicio de sesión desde la misma dirección IP tras superar 5 peticiones por minuto, usando la tabla persistente de rate limits.',
    pasos: [
      'Ve a la pantalla de /login en el navegador.',
      'Abre la consola de desarrollo (F12) -> pestaña Network (Red).',
      'Ingresa un correo electrónico de prueba cualquiera y una contraseña incorrecta.',
      'Haz clic en "Ingresar" de forma rápida y repetida por lo menos 6 veces en menos de un minuto.',
      'Comprueba que a partir del 6.° intento el servidor responda con un código de estado HTTP 429 (Too Many Requests).',
    ],
    esperado: 'El backend intercepta las peticiones tras el 5.° intento por minuto, registra el evento en la tabla `rate_limits` y responde con status 429 y el error: "Demasiados intentos. Intenta de nuevo en un momento."',
  },
  {
    id: 'seg-06', categoria: 'Seguridad', ruta: '/api/dpp', critica: true,
    titulo: 'Aislamiento de Tenancy (RLS) — Intento de elusión de filtros por REST API',
    descripcion: 'Simula un ataque de filtración de datos donde un atacante intenta consultar registros de otras empresas llamando directamente a la API REST de base de datos de Supabase sin pasar por el frontend.',
    pasos: [
      'Inicia sesión en la aplicación con una cuenta de empleado de la Empresa A.',
      'Abre la consola de desarrollo (F12) -> pestaña Network (Red).',
      'Busca cualquier petición dirigida a Supabase (ej. que contenga "supabase.co/rest/v1/") y cópiala como fetch (clic derecho -> Copy -> Copy as fetch).',
      'Ve a la pestaña Console, pega el comando y modifícalo para consultar la tabla `calculos` sin filtros de empresa: cambia la URL del fetch a `https://<tu-subdominio-supabase>.supabase.co/rest/v1/calculos` (elimina parámetros de consulta después de calculos).',
      'Ejecuta el fetch modificado y observa los registros devueltos.',
    ],
    esperado: 'Las directivas de Row Level Security (RLS) en la base de datos se aplican de forma implícita. La respuesta de la base de datos contiene únicamente los registros pertenecientes a la Empresa A del usuario autenticado; no expone ningún registro de la Empresa B.',
  },
  {
    id: 'seg-07', categoria: 'Seguridad', ruta: '/admin/usuarios', critica: false,
    titulo: 'Ataque por inyección SQL/NoSQL en inputs de búsqueda globales',
    descripcion: 'Verifica el saneamiento de las cadenas de búsqueda antes de compilar consultas SQL.',
    pasos: [
      'Ve a /admin/usuarios o /empresa/cotizador y ubica la barra de búsqueda de texto.',
      'Escribe y envía los siguientes payloads maliciosos de inyección: \' OR 1=1 --, "; DROP TABLE dpp_incidencias; --, admin\' -- o strings con llaves de MongoDB/NoSQL.',
      'Observa el comportamiento de la UI y revisa en DevTools Network si el backend arroja algún error 500 de sintaxis SQL.',
    ],
    esperado: 'Las cajas de búsqueda escapan y sanean el texto de forma segura antes de realizar la consulta a Supabase. No se producen fallas 500 y la tabla muestra "Sin resultados".',
  },
  {
    id: 'seg-08', categoria: 'Seguridad', ruta: '/admin', critica: false,
    titulo: 'Manipulación manual de cookies de sesión y tokens de rol',
    descripcion: 'Intenta inyectar o manipular cookies y tokens en local para escalar privilegios en el frontend.',
    pasos: [
      'Inicia sesión como empleado en el sistema.',
      'Abre DevTools -> pestaña Application (Aplicación) -> sección Cookies en el menú lateral.',
      'Localiza la cookie del token de autenticación (ej. sb-access-token) e intenta manipular su valor alterándolo, o añade manualmente una cookie falsa role=super_admin.',
      'Intenta ingresar a /admin o refrescar la página.',
    ],
    esperado: 'El servidor detecta la firma inválida del token alterado o rechaza la cookie inyectada manualmente. Cierra la sesión del usuario de forma inmediata y lo expulsa redirigiéndolo a /login.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 11. ALERTAS
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'alerta-01', categoria: 'Alertas', ruta: '/admin/alertas', critica: false,
    titulo: 'Crear alerta global de tipo advertencia',
    descripcion: 'Publica un banner global de tipo warning e inspecciona su correcta renderización.',
    pasos: [
      'Inicia sesión como administrador y ve a /admin/alertas.',
      'Presiona "Crear Alerta", selecciona severidad "Advertencia" (warning), escribe el mensaje "Corte programado el sábado a las 22:00" y presiona "Guardar".',
      'Inicia sesión con la cuenta de un empleado y ve a /dashboard.',
    ],
    esperado: 'La alerta de advertencia se muestra en el dashboard de los empleados con el color de advertencia correcto (amarillo/naranja) y el texto redactado por el administrador.',
  },
  {
    id: 'alerta-02', categoria: 'Alertas', ruta: '/dashboard', critica: false,
    titulo: 'Marcar alerta como leída',
    descripcion: 'Valida que el cierre de una alerta por el usuario persista en el almacenamiento local.',
    pasos: [
      'Estando en el dashboard con una alerta activa en pantalla, presiona el botón "x" de cerrar o "Marcar como leída".',
      'Recarga la página.',
    ],
    esperado: 'El banner de alerta se cierra y se retira visualmente al instante. La preferencia se guarda de manera local y la alerta no vuelve a aparecer tras refrescar.',
  },
  {
    id: 'alerta-03', categoria: 'Alertas', ruta: '/dashboard', critica: false,
    titulo: 'Concurrencia de alertas con expiración automática',
    descripcion: 'Comprueba el comportamiento visual al desplegar simultáneamente múltiples alertas de diversa severidad.',
    pasos: [
      'Simula la inserción de 5 alertas de forma paralela en la base de datos (2 info, 2 warning, 1 critical).',
      'Navega al dashboard /dashboard del empleado.',
      'Observa cómo se apilan y el orden en que se visualizan.',
    ],
    esperado: 'Las alertas se agrupan o apilan de forma ordenada según su nivel de criticidad (primero críticas en rojo). La interfaz de usuario se mantiene limpia y no se superpone de forma errónea con los otros elementos del dashboard.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 12. SETTINGS Y PERFIL
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'set-01', categoria: 'Settings', ruta: '/settings', critica: false,
    titulo: 'Editar perfil — nombre, apodo y teléfono',
    descripcion: 'Modifica datos de perfil y valida la reactividad del saludo del dashboard.',
    pasos: [
      'Ve a /settings.',
      'En el formulario de datos personales, modifica tu nombre completo, escribe "TesterQA" en apodo, e ingresa tu número de contacto.',
      'Haz clic en "Guardar cambios".',
      'Dirígete al dashboard /dashboard y valida el saludo inicial de la cabecera.',
    ],
    esperado: 'Los datos del perfil se actualizan en la base de datos. El dashboard refleja el cambio al instante saludando al usuario: "Hola, TesterQA".',
  },
  {
    id: 'set-02', categoria: 'Settings', ruta: '/settings', critica: false,
    titulo: 'Cambiar contraseña',
    descripcion: 'Comprueba la validación de contraseñas seguras y la posterior autenticación.',
    pasos: [
      'En /settings, desplázate hasta el formulario para cambio de clave.',
      'Introduce tu contraseña actual, escribe la nueva clave (debe cumplir los requisitos de seguridad obligatorios: 8 caracteres, 1 mayúscula, 1 número) y confírmala.',
      'Haz clic en "Actualizar contraseña".',
      'Cierra sesión e intenta acceder de nuevo al sistema utilizando la clave anterior, y luego inténtalo con la nueva contraseña.',
    ],
    esperado: 'La contraseña se cambia de forma segura. El intento de login con la clave antigua falla de forma controlada y el login con la nueva contraseña se completa con éxito.',
  },

  // ══════════════════════════════════════════════════════════════════
  // 13. AYUDA
  // ══════════════════════════════════════════════════════════════════
  {
    id: 'ayuda-01', categoria: 'Ayuda', ruta: '/ayuda', critica: false,
    titulo: 'Centro de ayuda — carga y búsqueda',
    descripcion: 'Valida las búsquedas inteligentes sobre la base de conocimientos.',
    pasos: [
      'Navega a /ayuda.',
      'Verifica que se visualice la lista de categorías del centro de soporte.',
      'En la barra de búsqueda del centro de ayuda, escribe "certificado" y presiona enter.',
    ],
    esperado: 'El sistema realiza la búsqueda sobre los artículos del manual de usuario y filtra la lista mostrando los contenidos que resuelven dudas sobre certificados.',
  },
  {
    id: 'api-01', categoria: 'APIs & Validaciones', ruta: '/api/calcular', critica: true,
    titulo: 'API calcular — validación de campos obligatorios',
    descripcion: 'Somete el endpoint de cálculo a payloads nulos o vacíos en la consola.',
    pasos: [
      'Inicia sesión como empleado en /dashboard y abre la consola de DevTools.',
      'En la pestaña Console, ejecuta el siguiente comando fetch enviando un body vacío para simular una petición inválida al backend de cálculos:',
      'fetch("/api/calcular", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({})}).then(r=>r.json().then(d=>console.log(r.status, d)))',
    ],
    esperado: 'El backend rechaza la petición por falta de campos obligatorios y devuelve un código de estado 400 Bad Request indicando exactamente cuáles son las variables requeridas (peso, material, categoría). No produce un error de servidor (500).',
  },
  {
    id: 'api-02', categoria: 'APIs & Validaciones', ruta: '/api/metas', critica: false,
    titulo: 'API metas — validar fecha_fin >= fecha_inicio',
    descripcion: 'Valida el bloqueo del formulario al introducir fechas invertidas.',
    pasos: [
      'Navega al formulario de creación de metas en /empresa/metas.',
      'Ingresa en fecha de inicio el valor "2026-12-31" y en fecha de fin el valor "2026-01-01" (fecha de fin anterior a la de inicio).',
      'Intenta guardar la meta en el formulario.',
    ],
    esperado: 'El validador del formulario intercepta las fechas inconsistentes y muestra el error "La fecha de fin debe ser posterior a la fecha de inicio", bloqueando el envío del formulario.',
  },
  {
    id: 'api-03', categoria: 'APIs & Validaciones', ruta: '/api/tickets', critica: false,
    titulo: 'API tickets — paginación con límite máximo',
    descripcion: 'Comprueba el límite de seguridad contra denegaciones de servicio en consultas masivas.',
    pasos: [
      'Inicia sesión como super_admin y abre la pestaña Console de DevTools.',
      'Ejecuta el siguiente comando fetch enviando un parámetro de límite excesivo:',
      'fetch("/api/tickets?limit=999").then(r=>r.json()).then(d=>console.log("Número de registros:", d.data?.length))',
    ],
    esperado: 'La API de tickets aplica un tope de seguridad (max limit capping) a nivel de servidor y devuelve un máximo de 100 registros aunque el cliente haya solicitado 999.',
  },
  {
    id: 'api-04', categoria: 'APIs & Validaciones', ruta: '/api/cotizador/diagnostico', critica: false,
    titulo: 'API diagnóstico — fallback a OpenRouter si Gemini falla',
    descripcion: 'Comprueba la resiliencia del diagnóstico forzando el fallo de la clave API de Gemini.',
    pasos: [
      'Edita temporalmente el archivo .env.local y modifica el valor de GEMINI_KEY por uno incorrecto para forzar el fallo de conexión con Google Gemini.',
      'Reinicia el servidor local de desarrollo Next.js.',
      'Sube una foto de mueble en /empresa/cotizador/nueva y presiona "Iniciar Diagnóstico".',
      'Observa el proveedor que procesa y responde la consulta en la respuesta JSON del endpoint en DevTools Network.',
    ],
    esperado: 'El diagnóstico de imagen se completa de forma exitosa a través del fallback secundario de OpenRouter / Qwen-VL. No arroja error 503 en pantalla y responde en un tiempo razonable.',
  },
  {
    id: 'api-05', categoria: 'APIs & Validaciones', ruta: '/api/status/check', critica: false,
    titulo: 'Auto-reporte de incidencias por caídas de servicios (Resend & Vercel)',
    descripcion: 'Simula un fallo de Vercel/Resend y verifica la inserción del reporte en background y su visualización segura.',
    pasos: [
      'Abre src/lib/status-checker.ts y simula una falla crítica en Resend o Vercel devolviendo indicator: \'critical\' de forma forzada en la rutina runChecks.',
      'Llama al endpoint de estado general ejecutando una petición GET a /api/status/check.',
      'Abre tu base de datos Supabase o inspecciona la tabla dpp_incidencias para verificar las inserciones automáticas.',
      'Abre en modo incógnito la página pública /status y comprueba que se liste la incidencia activa.',
    ],
    esperado: 'El backend inserta de forma automática un nuevo registro en la tabla dpp_incidencias con estado investigando. En la interfaz de /status se muestra la incidencia con su título genérico ("Servicio de Correo Electrónico" o "Servidor de Distribución Web") sin revelar marcas comerciales ("Resend" o "Vercel").',
  },
  {
    id: 'seg-09', categoria: 'Seguridad', ruta: '/dashboard', critica: true,
    titulo: 'Inyección de scripts (XSS) en formularios de entrada',
    descripcion: 'Verifica que todos los campos de texto libre de la plataforma (como el campo de material, notas del cálculo o notas de ticket) escapen adecuadamente los caracteres especiales de HTML y Javascript antes de renderizarlos en pantalla.',
    pasos: [
      'Inicia sesión como empleado y navega a /dashboard.',
      'En el formulario de la calculadora de reúso, en el campo "Material", introduce el siguiente script malicioso: <script>alert("XSS_CALC")</script><img src="x" onerror="alert(\'XSS_IMG\')"> Madera.',
      'Haz clic en "Guardar cálculo".',
      'Observa el historial de cálculos en la parte inferior y valida si se dispara alguna ventana modal de alerta (alert).',
      'Abre las DevTools, ve a la pestaña Elements, inspecciona el nodo de texto correspondiente al registro que acabas de guardar y confirma que las etiquetas HTML estén debidamente codificadas (&lt;script&gt;...) y no interpretadas por el navegador.',
    ],
    esperado: 'El cálculo se guarda e inserta en la base de datos sin errores de sintaxis. La interfaz de usuario renderiza el texto de forma literal y segura sin ejecutar ninguna alerta o comportamiento anómalo.',
  },
  {
    id: 'seg-10', categoria: 'Seguridad', ruta: '/api/admin/status/incidentes/[id]', critica: true,
    titulo: 'Escalada de Privilegios — Bypass de RBAC en APIs administrativas',
    descripcion: 'Comprueba la hermeticidad y robustez de los endpoints administrativos mediante intentos de llamadas cruzadas con tokens de roles con menor jerarquía.',
    pasos: [
      'Inicia sesión en el sistema con una cuenta de rol empleado (ej. empleado@empresa.com).',
      'Abre la consola de desarrollo (F12) -> pestaña Console.',
      'Ejecuta la siguiente petición para intentar actualizar una incidencia crítica del sistema: fetch(\'/api/admin/status/incidentes/incidente-ficticio-123\', { method: \'PATCH\', headers: { \'Content-Type\': \'application/json\' }, body: JSON.stringify({ estado: \'resuelto\', severidad: \'menor\', titulo: \'Hacked Title\' }) }).then(r => r.json().then(d => console.log(\'Resultado PATCH:\', r.status, d)))',
      'Luego, ejecuta una petición para intentar eliminar una incidencia: fetch(\'/api/admin/status/incidentes/incidente-ficticio-123\', { method: \'DELETE\' }).then(r => r.json().then(d => console.log(\'Resultado DELETE:\', r.status, d)))',
      'Comprueba en la consola la respuesta HTTP de ambos intentos.',
    ],
    esperado: 'Ambas peticiones son rechazadas por el backend con un código de estado HTTP 403 Forbidden o 401 Unauthorized (según el estado de la sesión), mostrando el mensaje "No autorizado" o "Inicia sesión para continuar" y protegiendo el recurso.',
  },
  {
    id: 'seg-11', categoria: 'Seguridad', ruta: '/api/profile', critica: true,
    titulo: 'Escalada de Privilegios — Alteración del rol de perfil (BD Trigger)',
    descripcion: 'Verifica que el trigger de seguridad `trg_prevent_profile_elevation` en la base de datos bloquee de forma absoluta cualquier intento de un usuario cliente de cambiar su rol a super_admin o asociarse a otra empresa.',
    pasos: [
      'Inicia sesión en la aplicación con una cuenta de empleado.',
      'Abre la consola de desarrollo (F12) -> pestaña Network (Red).',
      'Busca cualquier petición dirigida a Supabase (ej. que contenga "supabase.co/rest/v1/profiles") y cópiala como fetch (clic derecho -> Copy -> Copy as fetch).',
      'Ve a la pestaña Console, pega el comando y modifícalo para realizar un PATCH: cambia el método a "PATCH" y añade un cuerpo `body: JSON.stringify({ rol: "super_admin" })`. Asegúrate de que la URL apunte a `/rest/v1/profiles?user_id=eq.<tu-user-id>`.',
      'Ejecuta la petición en la consola y observa la respuesta del servidor.',
    ],
    esperado: 'La petición de actualización es rechazada por la base de datos. El servidor devuelve un código de estado HTTP 400 o un error SQL controlado con el mensaje exacto: "No tienes permisos para modificar el rol o la empresa de tu perfil."',
  },
  {
    id: 'seg-12', categoria: 'Seguridad', ruta: '/api/profile/update-sensitive', critica: true,
    titulo: 'Rate limit en Acciones Sensibles — Bloqueo de cambios de perfil (BD)',
    descripcion: 'Verifica que el sistema de rate limit persistente bloquee cambios de datos sensibles (correo, teléfono o clave) tras acumular 5 intentos fallidos en la última hora por usuario.',
    pasos: [
      'Inicia sesión como empleado y ve a la ruta `/settings`.',
      'En la sección de cambios de datos sensibles (como "Cambiar correo" o "Cambiar teléfono"), intenta realizar actualizaciones introduciendo una contraseña incorrecta.',
      'Realiza 6 intentos de actualización fallidos consecutivos.',
      'Observa la respuesta del servidor en la pestaña Network a partir del 6.° intento.',
    ],
    esperado: 'El sexto intento es rechazado automáticamente por la API del servidor con un código de estado HTTP 429 (Too Many Requests), mostrando el mensaje de error: "Demasiados intentos fallidos. Acciones sensibles bloqueadas por una hora."',
  },
  {
    id: 'api-06', categoria: 'APIs & Validaciones', ruta: '/api/cotizador/diagnostico', critica: true,
    titulo: 'Subida de Archivos — Validación de tipos MIME reales (Magic Numbers)',
    descripcion: 'Verifica que el servicio de procesamiento de imágenes para cotizaciones y DPP rechace archivos maliciosos renombrados con extensiones permitidas (ej. scripts camuflados en .png o .jpg).',
    pasos: [
      'En tu máquina, crea un archivo de texto con contenido de script ejecutable (por ejemplo: <?php echo "malware"; ?> o un script Bash) y cámbiale el nombre para que tenga extensión de imagen (ej. archivo_malicioso.jpg o test.png).',
      'Inicia sesión como empresa_admin y navega a la sección de nueva cotización /empresa/cotizador/nueva.',
      'Intenta subir este archivo simulado en la zona de subida de fotos.',
      'Si pasa la validación inicial del frontend (por extensión), haz clic en "Iniciar Diagnóstico" e inspecciona la pestaña Network de las DevTools para revisar la respuesta de la petición POST a /api/cotizador/diagnostico.',
    ],
    esperado: 'El sistema (o la librería de análisis de imagen en el backend) inspecciona la cabecera real del archivo y rechaza la carga devolviendo un código de estado 400 Bad Request indicando que el archivo no corresponde a una imagen válida o un error controlado de formato.',
  },
  {
    id: 'perf-07', categoria: 'Rendimiento', ruta: '/empresa/dpp/nuevo', critica: false,
    titulo: 'Resiliencia de Red — Recuperación del formulario DPP ante fallos de conexión',
    descripcion: 'Pone a prueba el comportamiento y persistencia de datos de la interfaz al experimentar una caída de red intermedia durante el registro de un Pasaporte Digital.',
    pasos: [
      'Ve al formulario de creación de pasaporte digital en /empresa/dpp/nuevo.',
      'Rellena todos los campos requeridos (nombre, peso, composición circular) y sube una fotografía del producto.',
      'Abre las DevTools, ve a la pestaña Network y selecciona la opción de limitación "Offline" para desactivar la red del navegador por completo.',
      'Haz clic en el botón "Generar Pasaporte Digital".',
      'Observa la notificación y el comportamiento del formulario en pantalla.',
      'Vuelve a cambiar el estado de red a "No throttling" (Online) en DevTools y haz clic de nuevo en enviar.',
    ],
    esperado: 'El frontend muestra un banner descriptivo indicando problemas de conectividad o internet, preserva intactos todos los datos ingresados en el formulario de pasaporte (no limpia los campos ni devuelve a error) y permite enviar el formulario correctamente en cuanto se restablece la red.',
  },
  {
    id: 'perf-08', categoria: 'Rendimiento', ruta: '/empresa/certificados', critica: false,
    titulo: 'Estrés de Memoria — Generación concurrente de múltiples PDFs',
    descripcion: 'Evalúa el impacto en la CPU y RAM del hilo principal del navegador al ejecutar peticiones repetidas de renderizado de PDFs.',
    pasos: [
      'Navega a /empresa/certificados donde esté la opción para generar PDFs oficiales.',
      'Presiona de forma repetida e ininterrumpida el botón "Generar Certificado Oficial de Impacto" 6 veces seguidas en un lapso de 3 segundos.',
      'Monitorea el comportamiento del navegador y revisa si se congela la pestaña, o si se abren múltiples descargas simultáneas correctas.',
    ],
    esperado: 'La aplicación deshabilita temporalmente el botón durante el renderizado (o maneja un debounce de peticiones) para prevenir una sobrecarga de memoria del hilo principal. Se generan y descargan los PDFs correspondientes sin fugas de memoria ni crasheos del navegador.',
  },
  {
    id: 'cot-11', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/[id]', critica: false,
    titulo: 'Colisión de Edición — Conflicto de guardado concurrente (Optimistic Locking)',
    descripcion: 'Verifica que el sistema prevenga la pérdida accidental de datos comerciales cuando dos comerciales editan simultáneamente la misma cotización.',
    pasos: [
      'Abre el detalle de la misma cotización (ej. /empresa/cotizador/123) en dos ventanas del navegador distintas y de forma paralela.',
      'En la Ventana A, modifica el precio sugerido agregando $100 y haz clic en "Guardar Cotización". Revisa que se guarde correctamente.',
      'De inmediato, en la Ventana B (que aún tiene el estado anterior cargado en su pantalla), modifica los oficios requeridos y haz clic en "Guardar Cotización".',
      'Observa el mensaje de error o confirmación arrojado por el backend/frontend en la Ventana B.',
    ],
    esperado: 'La Ventana B muestra una advertencia indicando que la cotización ha sido modificada por otro usuario recientemente y solicita refrescar los datos para evitar sobrescribir los cambios de la Ventana A de forma descontrolada.',
  },
  {
    id: 'dpp-07', categoria: 'DPP / Pasaporte', ruta: '/pasaporte/[codigo]', critica: true,
    titulo: 'Verificación de Integridad Criptográfica del Pasaporte Digital',
    descripcion: 'Verifica que la página pública de consulta de pasaportes detecte de forma automática cualquier alteración o falsificación del código hash que viaja en la URL.',
    pasos: [
      'Abre el detalle de un activo circular en /empresa/dpp/[id] y copia la URL de su pasaporte digital público (ej. /pasaporte/SHA256-abc123xyz...).',
      'Abre esa URL en modo incógnito y revisa que cargue con el estado "VERIFICADO" o "VÁLIDO".',
      'Modifica a mano un solo carácter del hash en la barra de direcciones del navegador (ej. cambia una \'a\' por una \'b\' en el hash de la URL) y presiona Enter para recargar la página.',
      'Observa la advertencia mostrada en la pantalla de verificación del pasaporte.',
    ],
    esperado: 'La página del pasaporte digital detecta la discordancia entre el código proporcionado y la firma criptográfica registrada en la base de datos de auditoría de Supabase. Renderiza un banner visible en color rojo indicando "Firma inválida o alterada" o muestra una página de error 404 controlada.',
  },
  {
    id: 'auth-10', categoria: 'Autenticación', ruta: '/empresa/nueva', critica: true,
    titulo: 'Flujo de Onboarding Incompleto — Bloqueo de rutas privadas',
    descripcion: 'Asegura que los usuarios que inicien la creación de una empresa pero no terminen el formulario de onboarding queden bloqueados en la ruta de configuración inicial, impidiendo el bypass a /empresa o /dashboard.',
    pasos: [
      'Abre /registro en una ventana de incógnito y crea una cuenta nueva con un email de prueba (ej. qa_onboarding@tudominio.com). Necesitas acceso a ese correo para confirmar la cuenta.',
      'Confirma la cuenta haciendo clic en el enlace que llega al correo de prueba.',
      'Inicia sesión con esa cuenta nueva. El sistema debe detectar que no tienes empresa vinculada y redirigirte automáticamente a /empresa/nueva.',
      'Estando en /empresa/nueva (sin completar el formulario), ve a la barra de direcciones del navegador, escribe directamente https://reuso.lurdes.co/empresa y presiona Enter.',
      'Verifica que el middleware te devuelve a /empresa/nueva en lugar de mostrarte el panel de empresa.',
    ],
    esperado: 'El middleware detecta la ausencia de una organización vinculada a la sesión y te redirige de inmediato a /empresa/nueva con un mensaje indicando que debes completar el registro de tu empresa para poder ingresar al panel. No se renderizan los componentes internos de /empresa ni de /dashboard.',
  },
  {
    id: 'cot-12', categoria: 'Cotizador IA', ruta: '/empresa/cotizador/nueva', critica: true,
    titulo: 'Sanitización de Archivos — Inyección de XSS vía SVG/XML vectoriales',
    descripcion: 'Verifica que al subir archivos SVG o vectoriales (como logos o fotos de muebles en formatos que admiten código estructurado) el sistema neutralice scripts JavaScript embebidos antes de procesarlos o renderizarlos.',
    pasos: [
      'Crea un archivo de texto con extensión .svg (ej. exploit.svg) que contenga código XML con un script inyectado: <svg xmlns="http://www.w3.org/2000/svg" onload="alert(\'SVG_XSS\')"><rect width="100" height="100" fill="red"/></svg>.',
      'Inicia sesión como administrador de empresa, ve al cotizador y simula subir el archivo exploit.svg.',
      'Comprueba si el navegador ejecuta la alerta alert(\'SVG_XSS\') al previsualizar la imagen en el formulario.',
      'Presiona "Iniciar Diagnóstico" e inspecciona si en el backend la API de IA o el optimizador de imágenes maneja el archivo de forma segura o lo rechaza.',
    ],
    esperado: 'El sistema intercepta el archivo SVG, lo rechaza por no ser una imagen de mapa de bits permitida (.jpg, .png, .webp) o desinfecta/neutraliza el script embebido en el canvas de procesamiento en cliente, evitando la ejecución de código arbitrario en el navegador del usuario.',
  },
  {
    id: 'api-07', categoria: 'APIs & Validaciones', ruta: '/api/calcular', critica: true,
    titulo: 'Valores Límite Calculadora — Redondeos, desbordes y números negativos',
    descripcion: 'Somete al motor de cálculo ecológico a valores numéricos extremos o inválidos de peso para validar la visualización en ApexCharts y KPIs sin NaN o deformaciones visuales.',
    pasos: [
      'Inicia sesión como empleado y ve a /dashboard.',
      'En el formulario de cálculo, ingresa un peso de "-50" y haz clic en "Guardar cálculo". Comprueba si el validador lo rechaza.',
      'Ingresa un peso absurdamente pequeño (ej. "0.0000000001") y verifica si la UI redondea o desborda la tarjeta de CO₂ evitado.',
      'Ingresa un peso extremo (ej. "999999999999999") y valida que el gráfico de distribución por categorías e históricos no queden inutilizados o deformados por números que desbordan el ancho de los componentes.',
    ],
    esperado: 'El frontend y el backend aplican validación estricta de rangos (por ejemplo, impidiendo pesos menores o iguales a cero y limitando el peso a un rango racional). No se generan cálculos con NaN, números infinitos o valores negativos en el historial.',
  },
  {
    id: 'dpl-09', categoria: 'APIs & Validaciones', ruta: '/legal/confidencialidad-firma', critica: false,
    titulo: 'Firma Digital — Inyección de Base64 corrupto o de gran tamaño',
    descripcion: 'Verifica que la API de procesamiento de firmas y el compilador jsPDF del servidor controlen excepciones ante strings de dibujo corruptos o excesivamente pesados.',
    pasos: [
      'Ve a la página pública del Acuerdo de Confidencialidad en /legal/confidencialidad-firma.',
      'Abre la consola de desarrollo de DevTools, ve a la pestaña Network y localiza la petición POST a la API /api/legal/firma al firmar.',
      'Simula el envío de la petición interceptando o re-ejecutando el fetch en consola, reemplazando el parámetro de la firma "firmaBase64" con una cadena corrupta gigante (por ejemplo, un payload de texto de 5MB con caracteres aleatorios que no sea un base64 de imagen válido).',
      'Observa la respuesta de la llamada y revisa si el backend Next.js cae en un error de desbordamiento de memoria (out of memory) o responde con un error controlado.',
    ],
    esperado: 'La API de firma detecta el formato base64 inválido o el tamaño desproporcionado, responde con un código de estado 400 Bad Request y evita crashear el servidor Next.js o la generación de PDFs.',
  },
  {
    id: 'auth-11', categoria: 'Autenticación', ruta: '/registro', critica: true,
    titulo: 'Resistencia al bloqueo de Cloudflare Turnstile',
    descripcion: 'Verifica que el formulario de registro permita enviar el formulario aunque el widget de Turnstile no cargue (falla abierta — no bloquea al usuario).',
    pasos: [
      'Ve a /registro en Chrome y completa el Paso 1 (datos) y el Paso 2 (perfil) hasta llegar al Paso 3 (contraseña).',
      'Abre DevTools con Cmd+Option+I (Mac) o F12. Ve a la pestaña Red (Network).',
      'Escribe turnstile en el campo de filtro de Network.',
      'Recarga la página con Cmd+R. Aparecerán peticiones a challenges.cloudflare.com.',
      'Haz clic derecho sobre la primera petición de Turnstile y selecciona "Bloquear URL de solicitud" (Block request URL). Si no aparece esa opción, ve a Ajustes en DevTools (ícono de engranaje) > pestaña Throttling > Network conditions y activa "Offline" solo para la URL de Turnstile.',
      'Recarga de nuevo. El widget de Turnstile no debe aparecer en el Paso 3.',
      'Rellena todos los campos del Paso 3 con una contraseña fuerte (ej. Test1234) y acepta los términos. Haz clic en "Crear cuenta".',
    ],
    esperado: 'El formulario procesa el envío aunque Turnstile no cargó. El sistema no bloquea al usuario por falla del captcha. La cuenta se crea o se muestra error de validación de datos — nunca un error de "verificación de seguridad requerida".',
  },
  {
    id: 'emp-13', categoria: 'Panel Empresa', ruta: '/empresa/configuracion/marca', critica: false,
    titulo: 'Marca Personalizada — Ratios de aspecto y dimensiones extremas en Logo',
    descripcion: 'Evalúa la flexibilidad y resiliencia del procesador de marca en cliente al subir imágenes con dimensiones desproporcionadas.',
    pasos: [
      'Navega a /empresa/configuracion/marca.',
      'Intenta subir como logo de la empresa una imagen de dimensiones desproporcionadas (ej. 15000x200 px, muy ancha y baja, o 10000x10000 px, cuadrada gigante).',
      'Comprueba que el procesamiento de compresión en cliente no congele la pestaña del navegador por falta de memoria de canvas.',
      'Abre en incógnito una propuesta comercial pública /propuesta/[token] vinculada a esta empresa y verifica que el logo renderice centrado y escalado de forma proporcional sin romper el diseño del cabecero.',
    ],
    esperado: 'La imagen es escalada y comprimida correctamente en el cliente sin consumir excesiva RAM. El diseño del cabecero de la propuesta pública se adapta, conteniendo el logo dentro de los límites visuales seguros sin desbordamientos tipográficos.',
  },
  {
    id: 'auth-12', categoria: 'Autenticación', ruta: '/dashboard', critica: true,
    titulo: 'Concurrencia de Sesión — Cierre de sesión en multi-pestaña',
    descripcion: 'Verifica que el sistema maneje adecuadamente la invalidación del token de sesión en múltiples pestañas abiertas simultáneamente, previniendo operaciones fantasma o estados inconsistentes.',
    pasos: [
      'Abre dos pestañas del navegador en /dashboard con la misma sesión de empleado activa.',
      'En la Pestaña A, haz clic en "Cerrar sesión" y confirma que eres redirigido a /login.',
      'De inmediato, ve a la Pestaña B (que aún muestra el formulario de cálculo con el estado anterior).',
      'Intenta rellenar el formulario de cálculo y haz clic en "Guardar cálculo".',
      'Observa el comportamiento de la UI y la respuesta del endpoint /api/calcular en la pestaña Network.',
    ],
    esperado: 'El backend devuelve un código 401 Unauthorized de inmediato. El cliente detecta la caída de la sesión, no inserta ningún cálculo en la base de datos y redirige al usuario de forma automática a /login sin romper la interfaz.',
  },
  {
    id: 'perf-09', categoria: 'Rendimiento', ruta: '/empresa', critica: false,
    titulo: 'Renderizado Reactivo — Estrés por cambio de tamaño de ventana (Resize Flood)',
    descripcion: 'Verifica que las librerías gráficas (ApexCharts/Recharts) en el dashboard de la empresa y del empleado implementen debounce en el redibujado para prevenir el congelamiento del hilo principal del navegador.',
    pasos: [
      'Inicia sesión como administrador de empresa y navega a /empresa (donde se cargan los gráficos de CO₂ y categorías).',
      'Abre las DevTools y ve a la pestaña Performance.',
      'Presiona el botón de grabación en Performance.',
      'Con la ventana del navegador desanclada, arrastra el borde para redimensionar la ventana rápidamente de forma continua durante 5 segundos para forzar el redibujado de la interfaz.',
      'Detén la grabación y analiza si la tasa de cuadros por segundo (FPS) cae por debajo de 30 o si el hilo principal queda bloqueado (Long Tasks en color rojo).',
    ],
    esperado: 'El navegador responde de forma fluida. Los gráficos aplican un debounce o retardo controlado antes de recalcular sus dimensiones en SVG, evitando picos de CPU del 100% o bloqueos del navegador.',
  }
]

// ── Categorías con colores ─────────────────────────────────────────────────────

const CATEGORIAS = [
  { key: 'Autenticación',       icono: Lock,        color: '#59A6E4' },
  { key: 'Panel Admin',         icono: Buildings,    color: '#F6BF3E' },
  { key: 'Panel Empresa',       icono: Storefront,   color: '#00827C' },
  { key: 'Dashboard',           icono: ChartBar,     color: '#38B98E' },
  { key: 'Cotizador IA',        icono: Robot,        color: '#AD7C43' },
  { key: 'DPP / Pasaporte',     icono: ClipboardText,color: '#8AD0B2' },
  { key: 'Páginas Públicas',    icono: Globe,        color: '#F3BBD3' },
  { key: 'Modo Noche',          icono: Moon,         color: '#D6F391' },
  { key: 'Rendimiento',         icono: Lightning,    color: '#FF5E4B' },
  { key: 'Seguridad',           icono: ShieldCheck,  color: '#FF5E4B' },
  { key: 'Alertas',             icono: Bell,         color: '#F6BF3E' },
  { key: 'Settings',            icono: Gear,         color: '#7FA8A5' },
  { key: 'Ayuda',               icono: BookOpen,     color: '#59A6E4' },
  { key: 'APIs & Validaciones', icono: FileText,     color: '#8AD0B2' },
]

const ESTADO_CFG: Record<Estado, { label: string; color: string; icono: typeof CheckCircle }> = {
  pendiente: { label: 'Pendiente',           color: 'rgba(128,128,128,0.4)', icono: Circle },
  ok:        { label: 'Aprobada',            color: '#38B98E',               icono: CheckCircle },
  falla:     { label: 'Falla',               color: '#FF5E4B',               icono: XCircle },
  parcial:   { label: 'Cumple parcialmente', color: '#F6BF3E',               icono: MinusCircle },
  no_clara:  { label: 'No es clara',         color: '#59A6E4',               icono: Question },
}

interface QAIntento {
  id: string
  ts: string
  etiqueta: string
  alcance: 'completo' | string
  tareas: { id: string; estado: Estado; notas: string }[]
}

interface QAStore {
  intentos: QAIntento[]
  borrador: { id: string; estado: Estado; notas: string; rolesProbados?: RolPrueba[]; resultado_dia?: Estado; resultado_noche?: Estado; ts?: number }[]
}

const LS_KEY_V3 = 'reuso_qa_v3'
const LS_KEY = 'reuso_qa_v2'

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
  const [mostrarInforme, setMostrarInforme] = useState(false)
  const [mostrarHistorial, setMostrarHistorial] = useState<string | null>(null) // null | 'completo' | nombreCategoria
  const [intentos, setIntentos] = useState<QAIntento[]>([])
  const [categoriaActiva, setCategoriaActiva] = useState(CATEGORIAS[0].key)
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
      // Cargar v3 (tiene borrador + historial de intentos)
      const savedV3 = localStorage.getItem(LS_KEY_V3)
      if (savedV3) {
        const store = JSON.parse(savedV3) as { intentos?: QAIntento[]; borrador?: { id: string; estado: Estado; notas: string; rolesProbados?: RolPrueba[]; resultado_dia?: Estado; resultado_noche?: Estado; ts?: number }[] }
        if (store.borrador?.length) {
          setTareas(prev => prev.map(t => {
            const s = store.borrador!.find(p => p.id === t.id)
            return s ? { ...t, estado: s.estado, notas: s.notas, rolesProbados: s.rolesProbados || [], resultado_dia: s.resultado_dia, resultado_noche: s.resultado_noche } : t
          }))
          const ts = store.borrador[0]?.ts
          if (ts) setUltimoGuardado(new Date(ts))
        }
        if (store.intentos?.length) setIntentos(store.intentos)
        return
      }
      // Migración desde v2
      const savedV2 = localStorage.getItem(LS_KEY)
      if (savedV2) {
        const parsed = JSON.parse(savedV2) as { id: string; estado: Estado; notas: string; rolesProbados?: RolPrueba[]; ts?: number }[]
        setTareas(prev => prev.map(t => {
          const s = parsed.find(p => p.id === t.id)
          return s ? { ...t, estado: s.estado, notas: s.notas, rolesProbados: s.rolesProbados || [] } : t
        }))
        const savedTs = parsed[0]?.ts
        if (savedTs) setUltimoGuardado(new Date(savedTs))
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
      const storeRaw = localStorage.getItem(LS_KEY_V3)
      const storeExistente = storeRaw ? (JSON.parse(storeRaw) as { intentos?: QAIntento[] }) : {}
      localStorage.setItem(LS_KEY_V3, JSON.stringify({ intentos: storeExistente.intentos || [], borrador }))
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
        const storeRaw = localStorage.getItem(LS_KEY_V3)
        const storeExistente = storeRaw ? (JSON.parse(storeRaw) as { borrador?: unknown }) : {}
        localStorage.setItem(LS_KEY_V3, JSON.stringify({ ...storeExistente, intentos: actualizados }))
      } catch { /* ignorar */ }
      return actualizados
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
      const updated = prev.map(t => t.id === id ? { ...t, [campo]: valor } : t)
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
      const updated = prev.map(t => t.id !== id ? t : { ...t, [modo]: valor })
      guardar(updated)
      return updated
    })
  }

  const resetear = () => {
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
    guardar(reseteadas)
    setMostrarInforme(false)
  }

  // Métricas
  const total     = tareas.length
  const oks       = tareas.filter(t => t.estado === 'ok').length
  const fallas    = tareas.filter(t => t.estado === 'falla').length
  const parciales = tareas.filter(t => t.estado === 'parcial').length
  const no_claras = tareas.filter(t => t.estado === 'no_clara').length
  const criticas  = tareas.filter(t => t.critica && t.estado === 'falla').length
  const revisadas = oks + fallas + parciales + no_claras
  const progreso  = Math.round((revisadas / total) * 100)

  // Tareas de la categoría activa, filtradas por búsqueda
  const tareasCategoria = tareas.filter(t => {
    if (t.categoria !== categoriaActiva) return false
    if (!busqueda) return true
    const b = busqueda.toLowerCase()
    return t.titulo.toLowerCase().includes(b) || t.ruta.includes(b) || t.descripcion.toLowerCase().includes(b)
  })

  // Generación de informe
  const generarInforme = () => {
    const ahora = new Date().toLocaleString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const lineas = [
      `INFORME QA — Calculadora de Reúso`,
      `Fecha: ${ahora}`,
      `${'─'.repeat(60)}`,
      `RESUMEN: ${oks} aprobadas · ${fallas} fallas · ${parciales} parciales · ${no_claras} instrucciones poco claras · ${criticas} críticas fallidas`,
      `Cobertura: ${progreso}% (${revisadas}/${total} revisadas)`,
      `${'─'.repeat(60)}`,
    ]
    for (const cat of CATEGORIAS) {
      const grupo = tareas.filter(t => t.categoria === cat.key)
      if (!grupo.length) continue
      lineas.push(`\n▸ ${cat.key.toUpperCase()} (${grupo.filter(t => t.estado === 'ok').length}/${grupo.length} ok)`)
      for (const t of grupo) {
        const ic = t.estado === 'ok' ? '✓' : t.estado === 'falla' ? '✗' : t.estado === 'parcial' ? '△' : t.estado === 'no_clara' ? '?' : '○'
        const rolesStr = (t.rolesProbados || []).map(r => ROL_LABELS[r]).join(', ') || 'Ninguno'
        const diaStr = t.resultado_dia ? ESTADO_CFG[t.resultado_dia].label : 'Sin evaluar'
        const nocheStr = t.resultado_noche ? ESTADO_CFG[t.resultado_noche].label : 'Sin evaluar'
        lineas.push(`  ${ic} [${t.critica ? 'CRÍTICA' : 'normal '}] ${t.ruta.padEnd(35)} ${t.titulo}`)
        lineas.push(`       Perfiles probados: ${rolesStr} | Día: ${diaStr} | Noche: ${nocheStr}`)
        if (t.notas.trim()) lineas.push(`       Notas: ${t.notas.trim()}`)
      }
    }
    lineas.push(`\n${'─'.repeat(60)}`)
    if (criticas > 0) lineas.push(`⚠  BLOQUEANTE: ${criticas} prueba(s) crítica(s) fallida(s). Sistema NO apto para producción.`)
    else if (fallas > 0) lineas.push(`△  ADVERTENCIA: ${fallas} falla(s) no crítica(s). Sistema operable con limitaciones.`)
    else if (revisadas < total) lineas.push(`○  INCOMPLETO: ${total - revisadas} prueba(s) pendientes.`)
    else lineas.push(`✓  APROBADO: Todas las pruebas superadas. Sistema listo para producción.`)
    return lineas.join('\n')
  }

  const descargar = () => {
    const blob = new Blob([generarInforme()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `informe-qa-reuso-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#474747] text-white flex items-center justify-center font-sans">
        <div className="text-sm text-[#D6F391]">Cargando QA...</div>
      </div>
    )
  }

  // Tema (idéntico a pivot-roadmap)
  const theme = {
    bg:                isDark ? 'bg-[#474747]'                           : 'bg-white',
    textPrimary:       isDark ? 'text-white'                             : 'text-[#474747]',
    textSecondary:     isDark ? 'text-white/70'                          : 'text-[#00827C]/70',
    textTitle:         isDark ? 'text-white'                             : 'text-[#474747]',
    headerBg:          isDark ? 'bg-[#D6F391]/[0.08] backdrop-blur-md border-[#D6F391]/15'
                              : 'bg-white/60 backdrop-blur-md border-[rgba(0,130,124,0.12)]',
    cardBg:            isDark ? 'bg-[#D6F391]/[0.05] backdrop-blur-sm border-[#D6F391]/10'
                              : 'bg-white/50 backdrop-blur-sm border-[rgba(0,130,124,0.10)]',
    sidebarActiveBg:   isDark ? 'bg-[#474747] border-[#D6F391]/25 shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                              : 'bg-[#e2f3f1]/80 border-[#00827C] shadow-[0_4px_12px_rgba(0,130,124,0.12)]',
    sidebarInactiveBg: isDark ? 'bg-transparent border-[#D6F391]/[0.05] hover:border-[#D6F391]/15 hover:bg-[#D6F391]/[0.08]'
                              : 'bg-white/30 border-[rgba(0,130,124,0.06)] hover:bg-[#f2f9f8]/60 hover:border-[rgba(0,130,124,0.15)]',
    inputBg:           isDark ? 'bg-[#D6F391]/[0.05] border-[#D6F391]/15' : 'bg-white/60 border-[rgba(0,130,124,0.12)]',
    divider:           isDark ? 'border-[#D6F391]/[0.08]'               : 'border-[rgba(0,130,124,0.08)]',
    glowColor:         isDark ? '#D6F391'                                : '#38B98E',
    shadow:            isDark ? 'rgba(0,0,0,0.25)'                      : 'rgba(0,130,124,0.06)',
  }

  const catActual = CATEGORIAS.find(c => c.key === categoriaActiva)!

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.textPrimary} font-sans antialiased relative overflow-hidden transition-colors duration-500`}>

      {/* Blobs de fondo — solo en modo noche (directriz #0: fondo blanco puro en luz) */}
      {isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full filter blur-[130px] opacity-20 animate-blob bg-[#D6F391]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full filter blur-[110px] animate-blob animation-delay-2000 bg-[#D6F391]/10" />
          <div className="absolute top-[40%] left-[20%] w-[350px] h-[350px] rounded-full filter blur-[100px] animate-blob animation-delay-4000 bg-[#D6F391]/5" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* ── Header glass ──────────────────────────────────────────────────── */}
        <header
          className={`mb-8 border ${theme.headerBg} rounded-2xl p-6 relative overflow-hidden transition-all duration-300`}
          style={{ boxShadow: `0 8px 32px 0 ${theme.shadow}` }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs font-semibold px-3 py-1 rounded-fullr border ${isDark ? 'bg-[#D6F391]/10 border-[#D6F391]/40 text-[#D6F391]' : 'bg-[#00827C]/20 border-[#00827C]/40 text-[#38B98E]'}`}>
                  Auditoría & QA
                </span>
                <span className={`${theme.textSecondary} text-xs opacity-80`}>Grupo MLP S.A.S</span>
              </div>
              <h1 className={`text-3xl font-bold tracking-tight ${theme.textTitle} mb-2`}>
                Panel de Pruebas — Reúso
              </h1>
              <p className={`${theme.textSecondary} text-sm max-w-xl`}>
                {total} pruebas en {CATEGORIAS.length} módulos. Guarda tus apuntes y genera el informe final.
              </p>
            </div>

            {/* Progreso circular + controles */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Progress circular */}
              <div
                className={`border ${theme.cardBg} rounded-xl p-4 flex items-center gap-4 min-w-[240px] transition-all`}
                style={{ borderColor: isDark ? '#D6F391' : 'rgba(0,130,124,0.18)' }}
              >
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28"
                      className={isDark ? 'stroke-[#D6F391]/20' : 'stroke-[#e2f3f1]'}
                      strokeWidth="6" fill="transparent" />
                    <circle cx="32" cy="32" r="28"
                      className={isDark ? 'stroke-[#D6F391]' : 'stroke-[#38B98E]'}
                      strokeWidth="6" fill="transparent"
                      strokeDasharray={175.9}
                      strokeDashoffset={175.9 - (175.9 * progreso) / 100}
                      strokeLinecap="round" />
                  </svg>
                  <span className={`absolute text-sm font-bold ${theme.textTitle}`}>{progreso}%</span>
                </div>
                <div>
                  <div className={`text-xs ${theme.textSecondary} opacity-75`}>Progreso General</div>
                  <div className={`text-lg font-bold ${theme.textTitle}`}>{revisadas} de {total} pruebas</div>
                  <div className={`text-xs ${theme.textSecondary} opacity-60 mt-0.5`}>
                    <span className="text-[#38B98E] font-semibold">{oks} ok</span>
                    {' · '}
                    <span className="text-[#FF5E4B] font-semibold">{fallas} fallas</span>
                    {' · '}
                    <span className="text-[#F6BF3E] font-semibold">{parciales} parciales</span>
                    {' · '}
                    <span className="text-[#59A6E4] font-semibold">{no_claras} poco claras</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de acciones */}
          <div className={`mt-6 pt-6 border-t ${theme.divider} flex flex-col sm:flex-row gap-4 items-center justify-between`}>
            {/* Estado de guardado */}
            <div className={`flex items-center gap-2 text-xs ${theme.textSecondary}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-[#D6F391]' : 'bg-[#00827C]'}`} />
              {guardadoReciente ? (
                <span className="text-[#38B98E] font-semibold flex items-center gap-1">
                  <CheckCircle size={12} weight="fill" /> Guardado
                </span>
              ) : ultimoGuardado ? (
                <span>
                  Guardado {ultimoGuardado.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}autosave en {Math.floor(segundosRestantes / 60)}:{String(segundosRestantes % 60).padStart(2, '0')}
                </span>
              ) : (
                <span>Sin guardar · autosave en {Math.floor(segundosRestantes / 60)}:{String(segundosRestantes % 60).padStart(2, '0')}</span>
              )}
            </div>

            {/* Botones */}
            <div className="flex items-center gap-3">
              {/* Búsqueda */}
              <div className="relative w-64">
                <MagnifyingGlass size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.textSecondary} opacity-60`} />
                <input
                  type="text"
                  placeholder="Buscar prueba..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className={`w-full pl-9 pr-3 py-1.5 ${theme.inputBg} border rounded-lg text-sm ${theme.textPrimary} ${isDark ? 'placeholder-[#D6F391]/50 focus:border-[#D6F391]' : 'placeholder-[#00827C]/50 focus:border-[#38B98E]'} focus:outline-none focus:ring-1 transition-all`}
                />
              </div>
              <button
                onClick={resetear}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${theme.cardBg} ${theme.textSecondary} text-xs font-semibold hover:scale-105 active:scale-95 transition-all`}
              >
                <ArrowCounterClockwise size={13} /> Reiniciar
              </button>
              <button
                onClick={() => { guardar(); guardarIntento('completo') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:scale-105 active:scale-95 transition-all ${
                  guardadoReciente
                    ? 'bg-[#38B98E]/10 border-[#38B98E]/30 text-[#38B98E]'
                    : `${theme.cardBg} ${theme.textSecondary}`
                }`}
              >
                <FloppyDisk size={13} /> Guardar general
              </button>
              <button
                onClick={() => setMostrarHistorial('completo')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:scale-105 active:scale-95 transition-all ${theme.cardBg} ${theme.textSecondary}`}
              >
                <FileText size={13} /> Historial ({intentos.filter(i => i.alcance === 'completo').length})
              </button>
              <button
                onClick={() => setMostrarInforme(true)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg border-0 text-xs font-bold hover:scale-105 active:scale-95 transition-all ${
                  isDark ? 'bg-[#D6F391] text-[#474747]' : 'bg-[#00827C] text-white'
                }`}
              >
                <FileText size={13} /> Informe final
              </button>
            </div>
          </div>
        </header>

        {/* ── Grid principal ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Sidebar de categorías */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div
              className={`border ${theme.headerBg} rounded-2xl p-4 transition-all`}
              style={{ boxShadow: `0 4px 24px ${theme.shadow}` }}
            >
              <h2 className={`text-sm font-semiboldr ${theme.textSecondary} mb-3 px-1 flex items-center justify-between`}>
                <span>Módulos del sistema</span>
                <span className={`text-[10px] lowercase ${theme.textSecondary} opacity-60 font-normal`}>Clic para revisar</span>
              </h2>
              <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-1">
                {CATEGORIAS.map((cat, catIdx) => {
                  const isActive = categoriaActiva === cat.key
                  const ct = tareas.filter(t => t.categoria === cat.key)
                  const cOk = ct.filter(t => t.estado === 'ok').length
                  const cFail = ct.filter(t => t.estado === 'falla').length
                  const isDone = ct.length > 0 && ct.every(t => t.estado === 'ok')
                  const Icon = cat.icono
                  // Locking: categoría 0 siempre disponible; N solo si N-1 está completada con todas en OK
                  const prevDone = catIdx === 0 || CATEGORIAS.slice(0, catIdx).every(prevCat => {
                    const prevTareas = tareas.filter(t => t.categoria === prevCat.key)
                    return prevTareas.length > 0 && prevTareas.every(t => t.estado === 'ok')
                  })
                  const isLocked = !prevDone

                  return (
                    <button
                      key={cat.key}
                      onClick={() => { if (!isLocked) { setCategoriaActiva(cat.key); setExpandida(null) } }}
                      disabled={isLocked}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 relative group flex flex-col gap-1.5 ${
                        isLocked
                          ? `${isDark ? 'bg-transparent border-white/5 opacity-40' : 'bg-[#f9f9f9] border-[rgba(0,130,124,0.04)] opacity-50'} cursor-not-allowed`
                          : isActive ? theme.sidebarActiveBg : theme.sidebarInactiveBg
                      }`}
                    >
                      {/* Barra lateral de color */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl transition-all"
                        style={{ backgroundColor: cat.color }} />

                      <div className="pl-2.5 flex items-start justify-between gap-2">
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded tracking-wide flex items-center gap-1"
                          style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                        >
                          <Icon size={11} weight="duotone" />
                          {cat.key.split(' ')[0]}
                        </span>
                        <div className={`flex items-center gap-1.5 text-xs ${theme.textSecondary} opacity-80`}>
                          {isLocked ? (
                            <Lock size={12} className="opacity-60" />
                          ) : (
                            <>
                              <span className={cFail > 0 ? 'text-[#FF5E4B] font-semibold' : isDone ? 'text-[#38B98E] font-semibold' : ''}>
                                {cOk}/{ct.length}
                              </span>
                              {isDone && <CheckCircle size={11} weight="fill" className="text-[#38B98E]" />}
                              {cFail > 0 && <XCircle size={11} weight="fill" className="text-[#FF5E4B]" />}
                            </>
                          )}
                        </div>
                      </div>

                      <div className={`pl-2.5 font-semibold text-sm ${theme.textTitle} ${isDark ? 'group-hover:text-[#D6F391]' : 'group-hover:text-[#38B98E]'} transition-colors leading-tight`}>
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
            </div>
          </div>

          {/* Panel de tareas */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Cabecera del módulo activo */}
            <div
              className={`border ${theme.headerBg} rounded-2xl px-5 py-4 transition-all`}
              style={{ boxShadow: `0 4px 24px ${theme.shadow}` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: catActual.color }} />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <catActual.icono size={16} weight="duotone" style={{ color: catActual.color }} />
                    <span className="text-xs font-boldr" style={{ color: catActual.color }}>
                      {catActual.key}
                    </span>
                  </div>
                  <p className={`text-xs ${theme.textSecondary}`}>
                    {tareasCategoria.length === 0 ? 'Sin resultados con ese filtro.' : `${tareasCategoria.length} prueba${tareasCategoria.length === 1 ? '' : 's'} en este módulo`}
                  </p>
                </div>
              </div>
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

                const borderGlow = tarea.estado === 'falla'
                  ? isDark ? 'border-[#FF5E4B]/30' : 'border-[#FF5E4B]/25'
                  : tarea.estado === 'ok'
                  ? isDark ? 'border-[#38B98E]/30' : 'border-[#38B98E]/25'
                  : tarea.estado === 'parcial'
                  ? isDark ? 'border-[#F6BF3E]/25' : 'border-[#F6BF3E]/20'
                  : tarea.estado === 'no_clara'
                  ? isDark ? 'border-[#59A6E4]/25' : 'border-[#59A6E4]/20'
                  : isDark ? 'border-[#D6F391]/10' : 'border-[rgba(0,130,124,0.10)]'

                return (
                  <div
                    key={tarea.id}
                    className={`border ${borderGlow} rounded-2xl overflow-hidden transition-all duration-200 relative`}
                    style={{ background: isDark ? 'rgba(214,243,145,0.03)' : '#fff', boxShadow: `0 4px 20px ${theme.shadow}` }}
                  >
                    {/* Barra lateral de color de categoría */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                      style={{ backgroundColor: catActual.color }} />

                    {/* Cabecera de la tarea */}
                    <div
                      onClick={() => setExpandida(abierta ? null : tarea.id)}
                      className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
                      style={{ paddingLeft: 20 }}
                    >
                      <EstIcon size={18} weight="fill" style={{ color: ESTADO_CFG[tarea.estado].color, flexShrink: 0 }} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-sm font-semibold ${theme.textTitle}`}>{tarea.titulo}</span>
                          {tarea.critica && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-[#FF5E4B]/12 text-[#FF5E4B]">
                              CRÍTICA
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
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-semiboldr ${
                                    checked
                                      ? 'bg-[#38B98E]/15 border border-[#38B98E]/30 text-[#38B98E]'
                                      : isDark
                                      ? 'bg-white/5 border border-white/10 text-white/50'
                                      : 'bg-black/[0.03] border border-black/10 text-black/50'
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
                              const color = val === 'ok' ? '#38B98E' : val === 'falla' ? '#FF5E4B' : val === 'parcial' ? '#F6BF3E' : val === 'no_clara' ? '#59A6E4' : undefined
                              return (
                                <span
                                  key={campo}
                                  className="text-[9px] px-1.5 rounded font-semiboldr flex items-center gap-0.5"
                                  style={{
                                    background: color ? `${color}18` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    border: `1px solid ${color ? `${color}40` : isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                                    color: color ?? (isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)'),
                                  }}
                                >
                                  {label}
                                  {val === 'ok' && <CheckCircle size={8} weight="fill" />}
                                  {val === 'falla' && <XCircle size={8} weight="fill" />}
                                  {val === 'parcial' && <MinusCircle size={8} weight="fill" />}
                                  {val === 'no_clara' && <Question size={8} weight="fill" />}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Botones de estado rápido */}
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        {(['ok', 'falla', 'parcial', 'no_clara', 'pendiente'] as Estado[]).map(est => {
                          const Ic = ESTADO_CFG[est].icono
                          const activo = tarea.estado === est
                          return (
                            <button
                              key={est}
                              onClick={() => actualizar(tarea.id, 'estado', est)}
                              title={ESTADO_CFG[est].label}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                              style={{
                                border: `1px solid ${activo ? ESTADO_CFG[est].color : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,130,124,0.12)'}`,
                                background: activo ? `${ESTADO_CFG[est].color}18` : 'transparent',
                              }}
                            >
                              <Ic size={13} weight="fill" style={{ color: activo ? ESTADO_CFG[est].color : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,130,124,0.4)' }} />
                            </button>
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
                        className={`px-5 pb-5 border-t ${theme.divider}`}
                        style={{ paddingLeft: 20 }}
                      >
                        <p className={`text-sm ${theme.textSecondary} mt-3 mb-4 leading-relaxed`}>
                          {tarea.descripcion}
                        </p>

                        {/* Pasos */}
                        {tarea.pasos.length > 0 && (
                          <div className="mb-4">
                            <p className={`text-[10px] font-boldr ${theme.textSecondary} mb-2`}>Pasos</p>
                            <div
                              className="rounded-xl p-4"
                              style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,130,124,0.03)', border: `1px solid ${isDark ? 'rgba(214,243,145,0.08)' : 'rgba(0,130,124,0.08)'}` }}
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
                          style={{ background: isDark ? 'rgba(214,243,145,0.04)' : 'rgba(0,130,124,0.04)', border: `1px solid ${isDark ? 'rgba(214,243,145,0.10)' : 'rgba(0,130,124,0.10)'}` }}
                        >
                          <span className={`text-[10px] font-boldr ${theme.textSecondary}`}>Resultado esperado: </span>
                          <span className={`text-xs ${theme.textPrimary}`}>{tarea.esperado}</span>
                        </div>

                        {/* Checklist de Perfiles de Prueba */}
                        <div className="mb-4">
                          <p className={`text-[10px] font-boldr ${theme.textSecondary} mb-2`}>
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
                                      ? 'bg-[#474747] border-white/10 text-white/60 hover:text-white hover:border-white/20'
                                      : 'bg-white border-black/10 text-black/60 hover:text-black hover:border-black/20'
                                  }`}
                                >
                                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                    checked ? 'bg-[#38B98E] border-[#38B98E] text-white' : 'border-current'
                                  }`}>
                                    {checked && <CheckCircle size={10} weight="fill" />}
                                  </span>
                                  <span>{ROL_LABELS[rol]}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Resultado por modo — Día y Noche */}
                        {(['resultado_dia', 'resultado_noche'] as const).map(campo => {
                          const esDia = campo === 'resultado_dia'
                          const valorActual = tarea[campo] ?? 'pendiente'
                          return (
                            <div key={campo} className="mb-3">
                              <p className={`text-[10px] font-boldr ${theme.textSecondary} mb-1.5`}>
                                {esDia ? '☀ Resultado Modo Día' : '☾ Resultado Modo Noche'}
                              </p>
                              <div className="flex gap-1.5 flex-wrap">
                                {(['ok', 'falla', 'parcial', 'no_clara'] as Estado[]).map(est => {
                                  const Ic = ESTADO_CFG[est].icono
                                  const activo = valorActual === est
                                  return (
                                    <button
                                      key={est}
                                      onClick={() => actualizarModo(tarea.id, campo, est)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95"
                                      style={{
                                        background: activo ? ESTADO_CFG[est].color : `${ESTADO_CFG[est].color}15`,
                                        color: activo ? (est === 'parcial' ? '#474747' : '#fff') : ESTADO_CFG[est].color,
                                        border: `1px solid ${activo ? ESTADO_CFG[est].color : `${ESTADO_CFG[est].color}40`}`,
                                      }}
                                    >
                                      <Ic size={10} weight="fill" />
                                      {ESTADO_CFG[est].label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}

                        {/* Notas */}
                        <label className={`block text-[10px] font-boldr ${theme.textSecondary} mb-2`}>
                          Tus apuntes
                        </label>
                        <textarea
                          value={tarea.notas}
                          onChange={e => actualizar(tarea.id, 'notas', e.target.value)}
                          placeholder="Observaciones, tiempos medidos, errores encontrados, capturas..."
                          rows={3}
                          onClick={e => e.stopPropagation()}
                          className={`w-full px-4 py-3 rounded-xl border text-xs ${theme.textPrimary} resize-vertical outline-none transition-all font-sans`}
                          style={{
                            background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,130,124,0.02)',
                            border: `1px solid ${isDark ? 'rgba(214,243,145,0.12)' : 'rgba(0,130,124,0.12)'}`,
                            fontFamily: "'Open Sans', sans-serif",
                          }}
                        />

                        {/* Veredicto general */}
                        <p className={`text-[10px] font-boldr ${theme.textSecondary} mt-4 mb-2`}>
                          Veredicto general de la prueba
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {(['ok', 'falla', 'parcial', 'no_clara'] as Estado[]).map(est => {
                            const Ic = ESTADO_CFG[est].icono
                            const activo = tarea.estado === est
                            return (
                              <button
                                key={est}
                                onClick={() => { actualizar(tarea.id, 'estado', est); setExpandida(null) }}
                                className="flex-1 min-w-[120px] py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                                style={{
                                  background: activo ? ESTADO_CFG[est].color : `${ESTADO_CFG[est].color}15`,
                                  color: activo ? (est === 'parcial' ? '#474747' : '#fff') : ESTADO_CFG[est].color,
                                  border: `1px solid ${activo ? ESTADO_CFG[est].color : `${ESTADO_CFG[est].color}40`}`,
                                }}
                              >
                                <Ic size={13} weight="fill" />
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:scale-105 active:scale-95 transition-all ${theme.cardBg} ${theme.textSecondary}`}
                >
                  <FloppyDisk size={13} /> Guardar módulo
                </button>
                <button
                  onClick={() => setMostrarHistorial(categoriaActiva)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:scale-105 active:scale-95 transition-all ${theme.cardBg} ${theme.textSecondary}`}
                >
                  <FileText size={13} /> Ver historial ({intentos.filter(i => i.alcance === categoriaActiva).length})
                </button>
                <button
                  onClick={() => setMostrarInforme(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-0 text-xs font-bold hover:scale-105 active:scale-95 transition-all ${isDark ? 'bg-[#D6F391]/20 text-[#D6F391]' : 'bg-[#00827C]/10 text-[#00827C]'}`}
                >
                  <FileText size={13} /> Informe parcial
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de informe ─────────────────────────────────────────────────── */}
      {mostrarInforme && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[2500] p-4"
          onClick={() => setMostrarInforme(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col border overflow-hidden ${isDark ? 'bg-[#525252] border-white/10' : 'bg-white border-[rgba(0,130,124,0.12)]'}`}
            style={{ animation: 'modalIn 0.2s ease-out' }}
          >
            {/* Header del modal */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${theme.divider} ${isDark ? 'bg-[#D6F391]/[0.05]' : 'bg-[#00827C]/[0.03]'}`}>
              <div>
                <h2 className={`text-lg font-bold ${theme.textTitle} m-0`}>Informe de QA</h2>
                <p className={`text-xs ${theme.textSecondary} mt-0.5`}>{revisadas}/{total} revisadas · {criticas} críticas fallidas</p>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => navigator.clipboard.writeText(generarInforme())}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${theme.cardBg} ${theme.textSecondary}`}
                >
                  <ClipboardText size={12} /> Copiar
                </button>
                <button
                  onClick={descargar}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-0 text-xs font-bold cursor-pointer ${isDark ? 'bg-[#D6F391] text-[#474747]' : 'bg-[#00827C] text-white'}`}
                >
                  <DownloadSimple size={12} /> .txt
                </button>
                <button
                  onClick={() => setMostrarInforme(false)}
                  className={`ml-1 flex items-center justify-center w-10 h-10 rounded-xl border ${theme.cardBg} ${theme.textSecondary} hover:opacity-80 transition-opacity`}
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-6 overflow-y-auto flex-1">

            <div className="flex gap-3">
              {[
                { l: 'Aprobadas', v: oks,       c: '#38B98E' },
                { l: 'Fallas',    v: fallas,     c: '#FF5E4B' },
                { l: 'Parciales', v: parciales,  c: '#F6BF3E' },
                { l: 'Poco claras', v: no_claras, c: '#59A6E4' },
                { l: 'Críticas ✗', v: criticas,  c: '#FF5E4B' },
              ].map(m => (
                <div key={m.l} className="flex-1 text-center py-3 px-2 rounded-xl" style={{ background: `${m.c}12`, border: `1px solid ${m.c}25` }}>
                  <p className="m-0 text-2xl font-bold" style={{ color: m.c }}>{m.v}</p>
                  <p className="m-0 text-[9px] font-bold" style={{ color: m.c }}>{m.l}</p>
                </div>
              ))}
            </div>

            <pre
              className={`flex-1 overflow-y-auto rounded-xl p-4 text-[10px] leading-relaxed whitespace-pre-wrap break-words font-mono border ${theme.textPrimary}`}
              style={{ background: 'var(--bg-input)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,130,124,0.08)'}` }}
            >
              {generarInforme()}
            </pre>

            <div
              className="px-4 py-3 rounded-xl"
              style={{
                background: criticas > 0 ? 'rgba(255,94,75,0.10)' : fallas > 0 ? 'rgba(246,191,62,0.08)' : 'rgba(56,185,142,0.10)',
                border: `1px solid ${criticas > 0 ? 'rgba(255,94,75,0.25)' : fallas > 0 ? 'rgba(246,191,62,0.20)' : 'rgba(56,185,142,0.20)'}`,
              }}
            >
              <p className="m-0 text-sm font-bold" style={{ color: criticas > 0 ? '#FF5E4B' : fallas > 0 ? '#F6BF3E' : '#38B98E' }}>
                {criticas > 0
                  ? `${criticas} prueba(s) crítica(s) fallida(s). El sistema NO está listo para producción.`
                  : fallas > 0
                  ? `${fallas} falla(s) no crítica(s). Operable con limitaciones.`
                  : revisadas < total
                  ? `${total - revisadas} prueba(s) aún pendientes.`
                  : 'Todas las pruebas aprobadas. Sistema listo.'}
              </p>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de historial ───────────────────────────────────────────────────── */}
      {mostrarHistorial && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[2500] p-4"
          onClick={() => setMostrarHistorial(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border overflow-hidden ${isDark ? 'bg-[#525252] border-white/10' : 'bg-white border-[rgba(0,130,124,0.12)]'}`}
            style={{ animation: 'modalIn 0.2s ease-out' }}
          >
            <div className={`flex items-center justify-between px-6 py-4 border-b ${theme.divider} ${isDark ? 'bg-[#D6F391]/[0.05]' : 'bg-[#00827C]/[0.03]'}`}>
              <div>
                <h2 className={`text-lg font-bold ${theme.textTitle} m-0`}>
                  {mostrarHistorial === 'completo' ? 'Historial general' : `Historial — ${mostrarHistorial}`}
                </h2>
                <p className={`text-xs ${theme.textSecondary} mt-0.5`}>
                  {intentos.filter(i => i.alcance === mostrarHistorial).length} intento(s) guardado(s)
                </p>
              </div>
              <button
                onClick={() => setMostrarHistorial(null)}
                className={`flex items-center justify-center w-10 h-10 rounded-xl border ${theme.cardBg} ${theme.textSecondary} hover:opacity-80 transition-opacity`}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
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
                  `INTENTO QA — ${intento.etiqueta}`,
                  `Alcance: ${intento.alcance}`,
                  `Fecha: ${fecha}`,
                  `Resultado: ${okCount} ok · ${failCount} fallas · ${pct}%`,
                  '─'.repeat(50),
                  ...intento.tareas.map(t => {
                    const ic = t.estado === 'ok' ? '✓' : t.estado === 'falla' ? '✗' : t.estado === 'parcial' ? '△' : t.estado === 'no_clara' ? '?' : '○'
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
                          {okCount}/{intento.tareas.length} ok · {pct}%
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
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${theme.cardBg} ${theme.textSecondary} hover:opacity-80`}
                        >
                          <DownloadSimple size={12} /> .txt
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
        </div>
      )}
    </div>
  )
}
