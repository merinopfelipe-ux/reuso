'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import {
  type SafeThemeViewData,
  sanitizeThemeData,
  assertNoDatabaseLeak,
} from '@/lib/theme-isolation/theme-contract'
import { sanitizeThemeCss } from '@/lib/theme-isolation/css-sanitizer'
import { validarMensajeSandbox, generarNonceSeguro } from '@/lib/theme-isolation/sandbox-bridge'

interface ThemeSandboxProps {
  /**
   * Datos cosméticos seguros para el tema.
   * Se sanitizan automáticamente para garantizar que ninguna columna de BD llegue al tema.
   */
  datos: Partial<SafeThemeViewData> | Record<string, unknown>
  /**
   * Código HTML / plantilla del tema de terceros.
   */
  htmlContenido?: string
  /**
   * CSS opcional provisto por el tema. Se sanitizará automáticamente.
   */
  cssContenido?: string
  /**
   * Script JS opcional del tema (ejecutado estrictamente dentro del sandbox con origin=null).
   */
  jsContenido?: string
  /**
   * Altura inicial del contenedor en píxeles.
   */
  alturaInicial?: number
  /**
   * Clase CSS opcional para el contenedor externo.
   */
  className?: string
  /**
   * Título descriptivo para accesibilidad.
   */
  titulo?: string
}

/**
 * Contenedor Sandbox Aislado para Temas de Terceros.
 * 
 * BLINDAJE DE SEGURIDAD:
 * 1. Utiliza un <iframe> con sandbox="allow-scripts" (SIN allow-same-origin).
 * 2. El iframe corre con origin='null':
 *    - CERO acceso a document.cookie (imposible robar sesiones).
 *    - CERO acceso al DOM padre (imposible leer datos de clientes, usuarios o precios en pantalla).
 *    - CERO acceso a localStorage/sessionStorage.
 *    - CERO acceso autenticado a las APIs de Supabase o endpoints internos (las cookies no se transmiten).
 * 3. Todos los datos entrantes se purgan de cualquier campo de BD antes de llegar al iframe.
 * 4. El CSS se sanitiza para prevenir exfiltración de datos.
 */
export function ThemeSandbox({
  datos,
  htmlContenido = '',
  cssContenido = '',
  jsContenido = '',
  alturaInicial = 300,
  className = '',
  titulo = 'Vista previa de tema de terceros (aislado)',
}: ThemeSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [altura, setAltura] = useState(alturaInicial)
  const [cargado, setCargado] = useState(false)
  const [errorTema, setErrorTema] = useState<string | null>(null)
  const nonce = useMemo(() => generarNonceSeguro(), [])

  // 1. Sanitizar y verificar datos de vista
  const safeData = useMemo(() => {
    try {
      assertNoDatabaseLeak(datos)
    } catch (err) {
      console.warn('[ThemeSandbox] Advertencia de seguridad en datos de tema:', err)
    }
    return sanitizeThemeData(datos)
  }, [datos])

  // 2. Sanitizar CSS del tema
  const safeCss = useMemo(() => {
    return sanitizeThemeCss(cssContenido)
  }, [cssContenido])

  // 3. Generar el documento seguro para el iframe con origin=null
  const srcDocContent = useMemo(() => {
    const jsonTokens = JSON.stringify(safeData.tokens)
    const jsonDatos = JSON.stringify(safeData)

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Content Security Policy estricta dentro del iframe: bloquea acceso a endpoints sensibles -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:; connect-src 'none'; object-src 'none';">
  <style>
    :root {
      --color-primario: ${safeData.tokens.colorPrimario};
      --color-secundario: ${safeData.tokens.colorSecundario ?? safeData.tokens.colorPrimario};
      --color-fondo: ${safeData.tokens.colorFondo ?? '#ffffff'};
      --color-texto: ${safeData.tokens.colorTexto ?? '#474747'};
      --color-borde: ${safeData.tokens.colorBorde ?? 'rgba(0,0,0,0.1)'};
      --radio-borde: ${safeData.tokens.radioBorde ?? '12px'};
      --fuente: ${safeData.tokens.tipografia ?? 'system-ui, -apple-system, sans-serif'};
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: var(--fuente);
      color: var(--color-texto);
      background-color: var(--color-fondo);
      -webkit-font-smoothing: antialiased;
    }
    /* Estilos seguros del tema */
    ${safeCss}
  </style>
</head>
<body>
  <div id="theme-root">
    ${htmlContenido || `
      <div style="border: 1px solid var(--color-borde); border-radius: var(--radio-borde); padding: 20px;">
        <h2 style="margin-top: 0; color: var(--color-primario);">${safeData.nombreMarca}</h2>
        ${safeData.eslogan ? `<p style="opacity: 0.8; font-size: 14px;">${safeData.eslogan}</p>` : ''}
        ${safeData.descripcion ? `<p style="font-size: 13px; line-height: 1.5;">${safeData.descripcion}</p>` : ''}
      </div>
    `}
  </div>

  <script>
    (function() {
      // Entorno de ejecución sellado
      var nonce = "${nonce}";
      var themeTokens = ${jsonTokens};
      var themeData = ${jsonDatos};

      // Notificar altura al contenedor padre
      function notificarAltura() {
        var body = document.body;
        var html = document.documentElement;
        var h = Math.max(
          body.scrollHeight, body.offsetHeight,
          html.clientHeight, html.scrollHeight, html.offsetHeight
        );
        window.parent.postMessage({ tipo: 'THEME_RESIZE', altura: h }, '*');
      }

      window.addEventListener('load', function() {
        notificarAltura();
        window.parent.postMessage({ tipo: 'THEME_READY', version: '1.0' }, '*');
      });

      // Observer para cambios de tamaño dinámicos
      if (window.ResizeObserver) {
        new ResizeObserver(notificarAltura).observe(document.body);
      }

      // Ejecutar script del tema en contexto aislado si existe
      try {
        ${jsContenido ? `(function(tokens, data) { ${jsContenido} })(themeTokens, themeData);` : ''}
      } catch (e) {
        window.parent.postMessage({ tipo: 'THEME_ERROR', mensaje: String(e && e.message ? e.message : e) }, '*');
      }
    })();
  <\/script>
</body>
</html>`
  }, [safeData, safeCss, htmlContenido, jsContenido, nonce])

  // Escuchar mensajes seguros del sandbox
  useEffect(() => {
    function manejarMensaje(event: MessageEvent) {
      const msg = validarMensajeSandbox(event)
      if (!msg) return

      if (msg.tipo === 'THEME_RESIZE') {
        setAltura(Math.max(60, msg.altura))
      } else if (msg.tipo === 'THEME_READY') {
        setCargado(true)
      } else if (msg.tipo === 'THEME_ERROR') {
        console.warn('[ThemeSandbox] Error en el tema de terceros:', msg.mensaje)
        setErrorTema(msg.mensaje)
      }
    }

    window.addEventListener('message', manejarMensaje)
    return () => window.removeEventListener('message', manejarMensaje)
  }, [])

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden transition-all ${className}`}
      style={{ minHeight: altura }}
    >
      {!cargado && (
        <div
          className="absolute inset-0 bg-(--bg-card) animate-pulse flex items-center justify-center text-xs text-(--text-secondary)"
          style={{ minHeight: alturaInicial }}
        >
          Cargando entorno seguro del tema...
        </div>
      )}

      {errorTema && (
        <div className="p-3 mb-2 text-xs bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20">
          Nota: El tema reportó un aviso: {errorTema}
        </div>
      )}

      <iframe
        ref={iframeRef}
        title={titulo}
        srcDoc={srcDocContent}
        /*
         * AISLAMIENTO CRÍTICO:
         * sandbox="allow-scripts" sin "allow-same-origin"
         * Confiere origen null: sin cookies, sin acceso a BD, sin acceso a DOM padre.
         */
        sandbox="allow-scripts"
        className="w-full border-0 block"
        style={{ height: `${altura}px`, transition: 'height 0.2s ease-out' }}
        onLoad={() => setCargado(true)}
      />
    </div>
  )
}
