/**
 * Genera previews del nuevo diseño de correos:
 * 1. Antetítulo: TEXTO PLANO LIMPIO (sin píldora ni fondo, no parece botón).
 * 2. Texto adentro del cajón: A LA IZQUIERDA.
 * 3. Botón: VERDE, CENTRADO (solo cuando sea necesario).
 * 4. Cajas internas (código, OTP, alertas): CON TEXTO AL CENTRO.
 * 5. Debajo del cajón: TODO BIEN CENTRADO (aviso, términos/privacidad, redes, dirección, watermark "Reúso").
 * 6. Colores:
 *    - Título: Negro (#111111)
 *    - Párrafos: Negro Lurdes (#474747)
 *    - Fondo del cajón: Muy agua (#E6F2F0)
 *    - Watermark "Reúso": Mismo color muy agua (#E6F2F0), sin partirse
 *    - Botón y enlaces: Verde Reúso (#00827C)
 *    - Sin líneas ni bordes
 *    - Sin mayúsculas sostenidas
 *    - Redes sociales oficiales (LinkedIn, YouTube, Instagram)
 *    - Sin cancelar suscripción para transaccionales
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../.email-previews/nuevo')
fs.mkdirSync(outDir, { recursive: true })

// ── Paleta de Colores ───────────────────────────────────────────────────────
const COLOR_NEGRO = '#111111'         // Negro puro / profundo para títulos
const COLOR_LURDES = '#474747'        // Negro Lurdes oficial para texto
const COLOR_BRAND = '#00827C'         // Verde Reúso para antetítulo, botón y enlaces
const BG_PAGE = '#FFFFFF'             // Lienzo blanco exterior
const BG_MUY_AGUA = '#E6F2F0'         // Fondo "muy agua" del cajón
const BG_BOX_WHITE = '#FFFFFF'        // Cajas internas blancas limpias
const COLOR_WATERMARK = '#E6F2F0'     // Watermark "Reúso" en ESTE MISMO color muy agua
const COLOR_TEXT_MUTED = '#6B7E7B'    // Texto secundario gris agua

// ── Logo Oficial Completo (Leído directamente de public/logo-completo.svg) ──
const logoSvgRaw = fs.readFileSync(path.join(__dirname, '../public/logo-completo.svg'), 'utf-8').trim()
const logoSvgClean = logoSvgRaw.replace(
  /<svg\b([^>]*)>/,
  '<svg class="email-logo" width="148" height="41" viewBox="0 0 168 47" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;max-width:148px;height:auto;">'
)

const LOGO_COMPLETO_HTML = `
  <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      <td align="center" style="text-align:center;">
        <a href="https://calculadoradereuso.com" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;" title="Calculadora de Reúso">
          ${logoSvgClean}
        </a>
      </td>
    </tr>
  </table>
`

// ── CSS Modo Noche ──────────────────────────────────────────────────────────
const DARK_CSS = `
  <style type="text/css">
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }
    @media (prefers-color-scheme: dark) {
      body, .email-body { background-color: #2E2E2E !important; }
      .email-card { background-color: #384240 !important; }
      .email-card p, .email-card td, .email-card span, .email-card li { color: #E0E8E6 !important; }
      .email-card strong, .email-card h1 { color: #FFFFFF !important; }
      .email-eyebrow { color: #D6F391 !important; }
      .email-card a { color: #D6F391 !important; }
      .email-btn { background-color: #00827C !important; color: #FFFFFF !important; }
      .email-inner-box { background-color: #2A3331 !important; }
      .email-footer p, .email-footer a { color: #8F9E9B !important; }
      .email-social-icon path { fill: #8F9E9B !important; }
      .email-watermark { color: rgba(230,242,240,0.06) !important; }
    }
    [data-ogsc] body, [data-ogsc] .email-body { background-color: #2E2E2E !important; }
    [data-ogsc] .email-card { background-color: #384240 !important; }
    [data-ogsc] .email-card p, [data-ogsc] .email-card td { color: #E0E8E6 !important; }
    [data-ogsc] .email-card strong, [data-ogsc] .email-card h1 { color: #FFFFFF !important; }
    [data-ogsc] .email-eyebrow { color: #D6F391 !important; }
    [data-ogsc] .email-btn { background-color: #00827C !important; color: #FFFFFF !important; }
    [data-ogsc] .email-footer p, [data-ogsc] .email-footer a { color: #8F9E9B !important; }
    [data-ogsc] .email-watermark { color: rgba(230,242,240,0.06) !important; }
  </style>
`

// ── Redes Sociales Oficiales ────────────────────────────────────────────────
const SOCIAL_ICONS_HTML = `
  <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 12px;">
    <tr>
      <!-- LinkedIn -->
      <td style="padding:0 10px;">
        <a href="https://www.linkedin.com/company/calculadora-de-reuso" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;" title="LinkedIn Calculadora de Reúso">
          <svg class="email-social-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" fill="#8F9E9B"/>
          </svg>
        </a>
      </td>
      <!-- YouTube -->
      <td style="padding:0 10px;">
        <a href="https://www.youtube.com/@calculadoradereuso" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;" title="YouTube Calculadora de Reúso">
          <svg class="email-social-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#8F9E9B"/>
          </svg>
        </a>
      </td>
      <!-- Instagram -->
      <td style="padding:0 10px;">
        <a href="https://www.instagram.com/calculadoradereuso" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;" title="Instagram @calculadoradereuso">
          <svg class="email-social-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="#8F9E9B"/>
          </svg>
        </a>
      </td>
    </tr>
  </table>
`

/**
 * Plantilla Base
 */
function plantillaNueva({
  preheader,
  eyebrow,
  titulo,
  saludo,
  parrafos = [],
  contenidoCentral = '',
  botonTexto,
  botonUrl,
  botonSubtexto,
  despedida = 'Un saludo,<br><strong style="color:#474747;">El equipo de Reúso</strong>',
  emailDestinatario = 'luisfe.merino@gmail.com',
  esMarketing = false,
  avisoPie,
}) {
  // 1. Texto adentro del cajón a la izquierda
  const parrafosHtml = parrafos.map(p =>
    `<p style="margin:0 0 18px;font-size:15px;color:${COLOR_LURDES};line-height:1.75;text-align:left;">${p}</p>`
  ).join('')

  // 2. Botón central
  const botonHtml = (botonTexto && botonUrl) ? `
    <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:30px auto 12px;">
      <tr>
        <td align="center">
          <a class="email-btn" href="${botonUrl}" style="display:inline-block;background-color:${COLOR_BRAND};color:#ffffff;text-decoration:none;padding:15px 38px;border-radius:100px;font-size:15px;font-weight:700;letter-spacing:-0.2px;">
            ${botonTexto}
          </a>
        </td>
      </tr>
      ${botonSubtexto ? `
      <tr>
        <td align="center" style="padding-top:10px;">
          <p style="margin:0;font-size:12px;color:${COLOR_TEXT_MUTED};text-align:center;">${botonSubtexto}</p>
        </td>
      </tr>` : ''}
    </table>
  ` : ''

  // 4. Debajo del cajón: todo bien centrado
  const enlacesPie = esMarketing ? `
    <p style="margin:0 auto 14px;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">
      <a href="https://calculadoradereuso.com/terminos" style="color:${COLOR_TEXT_MUTED};text-decoration:none;">Términos</a>
      &nbsp;&nbsp;&nbsp;&nbsp;
      <a href="https://calculadoradereuso.com/privacidad" style="color:${COLOR_TEXT_MUTED};text-decoration:none;">Privacidad</a>
      &nbsp;&nbsp;&nbsp;&nbsp;
      <a href="https://calculadoradereuso.com/unsubscribe" style="color:${COLOR_TEXT_MUTED};text-decoration:none;">Cancelar suscripción</a>
    </p>
  ` : `
    <p style="margin:0 auto 14px;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">
      <a href="https://calculadoradereuso.com/terminos" style="color:${COLOR_TEXT_MUTED};text-decoration:none;">Términos</a>
      &nbsp;&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;&nbsp;
      <a href="https://calculadoradereuso.com/privacidad" style="color:${COLOR_TEXT_MUTED};text-decoration:none;">Privacidad</a>
    </p>
  `

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${titulo}</title>
  ${DARK_CSS}
</head>
<body class="email-body" style="margin:0;padding:0;background-color:${BG_PAGE};font-family:'Open Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader oculto -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>

  <!-- Contenedor externo -->
  <table class="email-body" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG_PAGE};">
    <tr>
      <td align="center" style="padding:48px 16px 56px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">

          <!-- ── CABECERA: LOGO COMPLETO (Centrado con holgura) ── -->
          <tr>
            <td align="center" style="padding:0 0 32px;text-align:center;">
              ${LOGO_COMPLETO_HTML}
            </td>
          </tr>

          <!-- ── EL CAJÓN (Fondo "muy agua" #E6F2F0, texto adentro a la izquierda) ── -->
          <tr>
            <td class="email-card" style="background-color:${BG_MUY_AGUA};border-radius:28px;padding:48px 44px 44px;text-align:left;">

              <!-- Antetítulo: TEXTO PLANO LIMPIO (sin píldora ni fondo, no parece botón) -->
              ${eyebrow ? `
              <p class="email-eyebrow" style="margin:0 0 14px;font-size:13px;font-weight:700;color:${COLOR_BRAND};letter-spacing:0.02em;text-align:left;font-family:'Open Sans',-apple-system,sans-serif;">
                ${eyebrow}
              </p>` : ''}

              <!-- Título principal en Negro (#111111) a la izquierda -->
              <h1 style="margin:0 0 22px;font-size:26px;font-weight:800;color:${COLOR_NEGRO};line-height:1.25;letter-spacing:-0.5px;text-align:left;">
                ${titulo}
              </h1>

              <!-- Saludo a la izquierda -->
              ${saludo ? `<p style="margin:0 0 16px;font-size:15px;color:${COLOR_LURDES};line-height:1.75;text-align:left;">${saludo}</p>` : ''}

              <!-- Párrafos simples a la izquierda en Negro Lurdes (#474747) -->
              ${parrafosHtml}

              <!-- Cajas internas (con texto al centro) -->
              ${contenidoCentral}

              <!-- Botones centrales -->
              ${botonHtml}

              <!-- Despedida / Firma a la izquierda -->
              ${despedida ? `
              <div style="margin-top:32px;">
                <p style="margin:0;font-size:14px;color:${COLOR_LURDES};line-height:1.65;text-align:left;">
                  ${despedida}
                </p>
              </div>` : ''}

            </td>
          </tr>

          <!-- ── DEBAJO DEL CAJÓN: TODO BIEN CENTRADO ── -->
          <tr>
            <td class="email-footer" align="center" style="padding:32px 16px 0;text-align:center;">

              <!-- Texto explicativo de destinatario centrado -->
              <p style="margin:0 auto 14px;font-size:11.5px;color:${COLOR_TEXT_MUTED};line-height:1.65;max-width:420px;text-align:center;">
                ${avisoPie ?? `Enviamos este correo a <a href="mailto:${emailDestinatario}" style="color:${COLOR_TEXT_MUTED};text-decoration:none;font-weight:600;">${emailDestinatario}</a> porque tienes una cuenta en la Calculadora de Reúso.`}
              </p>

              <!-- Enlaces legales centrados -->
              ${enlacesPie}

              <!-- Redes Sociales centradas -->
              ${SOCIAL_ICONS_HTML}

              <!-- Dirección legal centrada -->
              <p style="margin:12px auto 0;font-size:11px;color:${COLOR_TEXT_MUTED};line-height:1.6;text-align:center;">
                Grupo MLP S.A.S.<br>
                Medellín, Colombia · <a href="https://calculadoradereuso.com" style="color:${COLOR_TEXT_MUTED};text-decoration:none;">calculadoradereuso.com</a>
              </p>

            </td>
          </tr>



        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Ejemplos de prueba ──────────────────────────────────────────────────────

// Ejemplo 1: Estilo Lovable (Antetítulo en texto plano limpio, sin botón/píldora)
const ejemplo1 = plantillaNueva({
  preheader: 'Tu organización ya está lista para medir su impacto ambiental.',
  eyebrow: 'Tu cuenta está activa',
  titulo: 'Tu empresa puede hacer más que medir información',
  saludo: 'Hola Felipe,',
  parrafos: [
    'Tu empresa se activó hace unos días. Buen trabajo. Aquí está el paso que la mayoría pasa por alto: invita a tu equipo para registrar el reúso de recursos y activos en tiempo real.',
    'No hay nada que configurar ni costos adicionales. Funciona directamente con los créditos que ya tienes activos.',
    'Haz clic en el botón a continuación para acceder al panel de tu organización y comenzar a generar tus primeros reportes.',
  ],
  botonTexto: 'Explorar ideas para mi empresa',
  botonUrl: 'https://calculadoradereuso.com/empresa',
  emailDestinatario: 'luisfe.merino@gmail.com',
  esMarketing: false,
})

// Ejemplo 2: Invitación con caja interna con texto AL CENTRO
const ejemplo2 = plantillaNueva({
  preheader: 'Grupo MLP te invitó a medir su impacto ambiental.',
  eyebrow: 'Invitación de equipo',
  titulo: 'Únete a Grupo MLP en la Calculadora de Reúso',
  saludo: '¡Hola, Felipe!',
  parrafos: [
    '<strong>Grupo MLP S.A.S.</strong> te invitó a unirte a su equipo en la Calculadora de Reúso. Al aceptar, podrás colaborar en el registro de inventario, certificar el ahorro de CO₂ y gestionar el impacto ambiental de tu organización.',
  ],
  botonTexto: 'Aceptar invitación',
  botonUrl: 'https://calculadoradereuso.com/invitacion/TOKEN-EJEMPLO',
  botonSubtexto: 'O copia este enlace: https://calculadoradereuso.com/invitacion/TOKEN-EJEMPLO',
  contenidoCentral: `
    <!-- Caja interna con texto al centro -->
    <table align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 18px;max-width:400px;">
      <tr>
        <td class="email-inner-box" style="background-color:${BG_BOX_WHITE};border-radius:18px;padding:22px 24px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12.5px;color:${COLOR_LURDES};font-weight:600;text-align:center;">¿Prefieres registrarte con código?</p>
          <span style="display:inline-block;font-size:26px;font-weight:800;color:${COLOR_BRAND};letter-spacing:0.14em;font-family:'Open Sans',-apple-system,sans-serif;text-align:center;">MLP-2026</span>
          <p style="margin:8px 0 0;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">Úsalo en <a href="https://calculadoradereuso.com/registro" style="color:${COLOR_BRAND};text-decoration:none;font-weight:600;">calculadoradereuso.com/registro</a></p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:12.5px;color:${COLOR_TEXT_MUTED};line-height:1.6;text-align:left;">
      Recuerda que este enlace expira en <strong>7 días</strong>.
    </p>
  `,
  esMarketing: false,
})

// Ejemplo 3: Confirmación OTP con caja interna con texto AL CENTRO
const ejemplo3 = plantillaNueva({
  preheader: 'Tu código de activación en la Calculadora de Reúso.',
  eyebrow: 'Confirma tu correo',
  titulo: 'Activa tu cuenta en Reúso',
  saludo: '¡Hola!',
  parrafos: [
    'Te damos la bienvenida a la <strong>Calculadora de Reúso</strong>. Para activar tu cuenta y empezar a medir tu impacto ambiental, haz clic en el botón a continuación o ingresa tu código de verificación:',
  ],
  botonTexto: 'Activar mi cuenta',
  botonUrl: 'https://calculadoradereuso.com/confirmar',
  contenidoCentral: `
    <!-- Caja interna con texto al centro -->
    <table align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 16px;max-width:400px;">
      <tr>
        <td class="email-inner-box" style="background-color:${BG_BOX_WHITE};border-radius:18px;padding:24px 20px;text-align:center;">
          <p style="margin:0 0 10px;font-size:12.5px;color:${COLOR_LURDES};font-weight:600;text-align:center;">
            Código de verificación
          </p>
          <span style="display:inline-block;font-size:36px;font-weight:800;color:${COLOR_BRAND};letter-spacing:0.14em;font-family:'Open Sans',-apple-system,sans-serif;text-align:center;">
            4892&thinsp;3105
          </span>
          <p style="margin:10px 0 0;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">Expira en 10 minutos.</p>
        </td>
      </tr>
    </table>
  `,
  esMarketing: false,
})

// Ejemplo 4: Informativo sin botón (todo texto a la izquierda adentro, todo centrado abajo)
const ejemplo4 = plantillaNueva({
  preheader: 'Tu consulta fue registrada con éxito.',
  eyebrow: 'Consulta legal recibida',
  titulo: 'Hemos recibido tu solicitud',
  saludo: 'Hola Felipe,',
  parrafos: [
    'Tu consulta ha sido radicada correctamente con el caso <strong>LEG-2026-042</strong>. Nuestro equipo revisará la información y te daremos respuesta en los próximos 2 días hábiles.',
    'No requieres realizar ninguna acción en este momento. Te notificaremos a este mismo correo cuando haya una actualización.',
  ],
  esMarketing: false,
})

const files = [
  { name: '1-ejemplo-lovable-reuso-gris-agua.html', html: ejemplo1 },
  { name: '2-invitacion-equipo.html', html: ejemplo2 },
  { name: '3-confirmacion-otp.html', html: ejemplo3 },
  { name: '4-correo-sin-boton.html', html: ejemplo4 },
]

for (const { name, html } of files) {
  const filePath = path.join(outDir, name)
  fs.writeFileSync(filePath, html)
  console.log(`✓ Generado: ${filePath}`)
}
