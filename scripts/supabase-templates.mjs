/**
 * Genera los 6 templates de Supabase Auth listos para pegar en el Dashboard.
 * Supabase Dashboard → Authentication → Email Templates → pegar HTML completo.
 *
 * Variables Supabase disponibles:
 *   {{ .ConfirmationURL }} — enlace de confirmación/acción
 *   {{ .Token }}           — código OTP (8 dígitos para recovery/reauth)
 *   {{ .Email }}           — correo del usuario
 *   {{ .NewEmail }}        — nuevo correo (solo en change email)
 *
 * Uso: node scripts/supabase-templates.mjs
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Tokens de diseño ─────────────────────────────────────────────────────────
const BRAND       = '#00827C'
const NEGRO       = '#111111'
const LURDES      = '#474747'
const MUTED       = '#8F9E9B'
const BG_PAGE     = '#F8FAFB'
const BG_MUY_AGUA = '#E6F2F0'
const BLANCO      = '#ffffff'

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
  </table>`

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
    .otp-text a {
      color: inherit !important;
      text-decoration: none !important;
    }
    @media (prefers-color-scheme: dark) {
      body, .email-body { background-color: #121817 !important; }
      .email-card { background-color: #1B2624 !important; }
      .email-card h1, .email-card h2, .email-card h3 { color: #FFFFFF !important; }
      .email-card p, .email-card td, .email-card span, .email-card li { color: #D1DCDA !important; }
      .email-card strong { color: #FFFFFF !important; }
      .email-card a { color: #52D1C9 !important; }
      .email-inner-box td { background-color: #243330 !important; }
      .email-inner-box p { color: #D1DCDA !important; }
      .email-inner-box strong { color: #FFFFFF !important; }
      .email-inner-box span.otp-text { color: #52D1C9 !important; }
      .email-eyebrow { color: #52D1C9 !important; }
      a.email-btn { background-color: #00827C !important; color: #FFFFFF !important; }
      .email-footer p, .email-footer a { color: #8F9E9B !important; }
      .email-social-icon path { fill: #8F9E9B !important; }
    }
    [data-ogsc] body, [data-ogsc] .email-body { background-color: #121817 !important; }
    [data-ogsc] .email-card { background-color: #1B2624 !important; }
    [data-ogsc] .email-card h1, [data-ogsc] .email-card h2 { color: #FFFFFF !important; }
    [data-ogsc] .email-card p { color: #D1DCDA !important; }
    [data-ogsc] .email-inner-box td { background-color: #243330 !important; }
    [data-ogsc] .email-inner-box span.otp-text { color: #52D1C9 !important; }
    [data-ogsc] a.email-btn { background-color: #00827C !important; color: #FFFFFF !important; }
    [data-ogsb] body, [data-ogsb] .email-body { background-color: #121817 !important; }
    [data-ogsb] .email-card { background-color: #1B2624 !important; }
    [data-ogsb] .email-card h1, [data-ogsb] .email-card h2 { color: #FFFFFF !important; }
    [data-ogsb] .email-card p { color: #D1DCDA !important; }
    [data-ogsb] .email-inner-box td { background-color: #243330 !important; }
    [data-ogsb] .email-inner-box span.otp-text { color: #52D1C9 !important; }
    [data-ogsb] a.email-btn { background-color: #00827C !important; color: #FFFFFF !important; }
  </style>`

function plantilla({ subtituloHeader, preheader, saludo, cuerpo, contenidoCentral, mostrarAlerta = false, alertaAccion = '' }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${saludo}</title>
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

          <!-- ── CABECERA: LOGO COMPLETO OFICIAL (Centrado con holgura) ── -->
          <tr>
            <td align="center" style="padding:0 0 32px;text-align:center;">
              <a href="https://calculadoradereuso.com" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;" title="Calculadora de Reúso">
                <img src="https://calculadoradereuso.com/logo-completo.svg" alt="Calculadora de Reúso" width="148" height="41" style="display:block;margin:0 auto;max-width:148px;height:auto;border:0;outline:none;" />
              </a>
            </td>
          </tr>

          <!-- ── EL CAJÓN (Fondo "muy agua" #E6F2F0, texto adentro a la izquierda, sin líneas) ── -->
          <tr>
            <td class="email-card" style="background-color:${BG_MUY_AGUA};border-radius:28px;padding:48px 44px 44px;text-align:left;">

              <!-- Antetítulo: texto plano limpio (sin botón ni píldora) -->
              ${subtituloHeader ? `
              <p class="email-eyebrow" style="margin:0 0 14px;font-size:13px;font-weight:700;color:${BRAND};letter-spacing:0.02em;text-align:left;font-family:'Open Sans',-apple-system,sans-serif;">
                ${subtituloHeader}
              </p>` : ''}

              <!-- Título principal en Negro (#111111) a la izquierda -->
              <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:${NEGRO};line-height:1.25;letter-spacing:-0.5px;text-align:left;">
                ${saludo}
              </h1>

              <!-- Párrafo introductorio a la izquierda en Negro Lurdes (#474747) -->
              ${cuerpo ? `<p style="margin:0 0 20px;font-size:15px;color:${LURDES};line-height:1.75;text-align:left;">${cuerpo}</p>` : ''}

              <!-- Contenido central (cajas de código, OTP o detalles) -->
              ${contenidoCentral}

              <!-- Firma a la izquierda -->
              <div style="margin-top:28px;">
                <p style="margin:0;font-size:14px;color:${LURDES};line-height:1.65;text-align:left;">
                  Un saludo,<br>
                  <strong style="color:${NEGRO};">El equipo de la Calculadora de Reúso</strong>
                </p>
              </div>

              <!-- Alerta de seguridad opcional -->
              ${mostrarAlerta ? `
              <table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
                <tr>
                  <td style="background-color:#FFFFFF;border-radius:16px;padding:18px 22px;text-align:left;">
                    <p style="margin:0 0 6px;font-size:13.5px;font-weight:700;color:${NEGRO};text-align:left;">🔔 ¿No realizaste esta solicitud?</p>
                    <p style="margin:0;font-size:13px;color:${LURDES};line-height:1.65;text-align:left;">
                      Tu cuenta está protegida.${alertaAccion ? ` Nadie puede acceder sin tu confirmación.` : ''} Puedes ignorar este correo${alertaAccion ? ` y no ${alertaAccion}` : ''}.
                    </p>
                  </td>
                </tr>
              </table>` : ''}

            </td>
          </tr>

          <!-- ── DEBAJO DEL CAJÓN: TODO BIEN CENTRADO ── -->
          <tr>
            <td class="email-footer" align="center" style="padding:32px 16px 0;text-align:center;">

              <!-- Texto explicativo de destinatario centrado -->
              <p style="margin:0 auto 14px;font-size:11.5px;color:${MUTED};line-height:1.65;max-width:440px;text-align:center;">
                Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso. No tiene fines promocionales ni de marketing.
              </p>

              <!-- Enlaces legales centrados (sin cancelar suscripción para transaccionales) -->
              <p style="margin:0 auto 14px;font-size:11.5px;color:${MUTED};text-align:center;">
                <a href="https://calculadoradereuso.com/terminos" style="color:${MUTED};text-decoration:none;">Términos</a>
                &nbsp;&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="https://calculadoradereuso.com/privacidad" style="color:${MUTED};text-decoration:none;">Privacidad</a>
              </p>

              <!-- Redes Sociales centradas -->
              ${SOCIAL_ICONS_HTML}

              <!-- Dirección legal centrada -->
              <p style="margin:12px auto 0;font-size:11px;color:${MUTED};line-height:1.6;text-align:center;">
                Grupo MLP S.A.S.<br>
                Medellín, Colombia · <a href="https://calculadoradereuso.com" style="color:${MUTED};text-decoration:none;">calculadoradereuso.com</a>
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

// ── Botón principal reutilizable ──────────────────────────────────────────────
const botonLink = (url, texto) => `
<table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 12px;">
  <tr>
    <td align="center">
      <a class="email-btn" href="${url}" style="display:inline-block;background-color:${BRAND};color:#ffffff;text-decoration:none;padding:15px 42px;border-radius:100px;font-size:15px;font-weight:700;letter-spacing:-0.2px;text-align:center;">
        ${texto}
      </a>
    </td>
  </tr>
</table>`

// ── Bloque OTP (código grande en caja blanca) ──────────────────────────────────
const bloqueOTP = (token) => `
<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr>
    <td style="background-color:#FFFFFF;border-radius:18px;padding:28px 24px;text-align:center;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:${BRAND};letter-spacing:0.02em;text-align:center;">Código de verificación</p>
      <span class="otp-text" style="display:inline-block;font-size:38px;font-weight:800;color:${NEGRO};letter-spacing:0.22em;font-family:'Open Sans',-apple-system,sans-serif;">${token}</span>
      <p style="margin:12px 0 0;font-size:12px;color:${MUTED};text-align:center;">Válido durante 10 minutos · No lo compartas</p>
    </td>
  </tr>
</table>`

// ── Los 6 templates ───────────────────────────────────────────────────────────

const templates = {

  // 1. Confirmar registro
  '1-confirmar-registro': {
    subject: 'Confirma tu correo en la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Confirma tu correo',
      preheader: 'Tu código de verificación para activar tu cuenta',
      saludo: '¡Ya casi terminas!',
      cuerpo: 'Confirma tu correo para activar tu cuenta en la Calculadora de Reúso y empezar a calcular el impacto de tus proyectos.',
      contenidoCentral: bloqueOTP('{{ .Token }}') + botonLink('{{ .ConfirmationURL }}', 'Confirmar mi correo directamente'),
      mostrarAlerta: true,
      alertaAccion: 'confirmes el correo ni compartas el código',
    }),
  },

  // 2. Invitación (Supabase Admin invite)
  '2-invitacion-admin': {
    subject: 'Te invitaron a la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Invitación a la plataforma',
      preheader: 'Acepta la invitación y empieza hoy',
      saludo: '¡Hola! Te damos la bienvenida',
      cuerpo: 'Has sido invitado a colaborar en la Calculadora de Reúso. Activa tu acceso para ingresar de inmediato.',
      contenidoCentral: botonLink('{{ .ConfirmationURL }}', 'Aceptar invitación'),
      mostrarAlerta: true,
      alertaAccion: 'aceptes la invitación',
    }),
  },

  // 3. Magic link
  '3-magic-link': {
    subject: 'Tu enlace de acceso a la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Enlace de acceso rápido',
      preheader: 'Tu enlace de acceso seguro. Expira en 10 minutos',
      saludo: 'Ingresa a tu cuenta',
      cuerpo: 'Usa este botón para ingresar directamente a tu cuenta en la Calculadora de Reúso. Este enlace es seguro y de un solo uso.',
      contenidoCentral: botonLink('{{ .ConfirmationURL }}', 'Ingresar a mi cuenta'),
      mostrarAlerta: true,
      alertaAccion: 'uses el enlace',
    }),
  },

  // 4. Cambio de correo
  '4-cambio-correo': {
    subject: 'Confirma tu nuevo correo en la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Actualización de credenciales',
      preheader: 'Confirma el cambio para que quede activo',
      saludo: 'Confirma tu nueva dirección',
      cuerpo: 'Recibimos una solicitud para actualizar el correo asociado a tu cuenta. Confirma el cambio para mantener tu acceso al día.',
      contenidoCentral: botonLink('{{ .ConfirmationURL }}', 'Confirmar nuevo correo'),
      mostrarAlerta: true,
      alertaAccion: 'confirmes el cambio',
    }),
  },

  // 5. Recuperar contraseña
  '5-recuperar-contrasena': {
    subject: 'Restablece tu contraseña en la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Seguridad de la cuenta',
      preheader: 'Tu código para restablecer la contraseña',
      saludo: '¿Olvidaste tu contraseña?',
      cuerpo: 'Ingresa este código en la pantalla de recuperación para crear una nueva contraseña segura y retomar tus proyectos.',
      contenidoCentral: bloqueOTP('{{ .Token }}'),
      mostrarAlerta: true,
      alertaAccion: 'ingreses el código',
    }),
  },

  // 6. Reautenticación
  '6-reautenticacion': {
    subject: 'Tu código de verificación en la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Verificación de seguridad',
      preheader: 'Tu código de verificación de seguridad',
      saludo: 'Verifica tu identidad',
      cuerpo: 'Ingresa este código de seguridad para verificar tu cuenta y continuar con la acción solicitada.',
      contenidoCentral: bloqueOTP('{{ .Token }}'),
      mostrarAlerta: true,
      alertaAccion: 'ingreses el código',
    }),
  },

}

// CSS de noche forzada (sin media query) — para preview
const DARK_FORCED = `
  <style type="text/css">
    body, .email-body { background-color: #121817 !important; }
    .email-card { background-color: #1B2624 !important; }
    .email-card h1, .email-card h2, .email-card h3 { color: #FFFFFF !important; }
    .email-card p, .email-card td, .email-card span, .email-card li { color: #D1DCDA !important; }
    .email-card strong { color: #FFFFFF !important; }
    .email-card a { color: #52D1C9 !important; }
    .email-inner-box td { background-color: #243330 !important; }
    .email-inner-box p { color: #D1DCDA !important; }
    .email-inner-box strong { color: #FFFFFF !important; }
    .email-inner-box span.otp-text { color: #52D1C9 !important; }
    .email-eyebrow { color: #52D1C9 !important; }
    a.email-btn { background-color: #00827C !important; color: #FFFFFF !important; }
    .email-footer p, .email-footer a { color: #8F9E9B !important; }
    .email-social-icon path { fill: #8F9E9B !important; }
  </style>`

// ── Escribir archivos ────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '../.email-previews/supabase')
fs.mkdirSync(outDir, { recursive: true })

const subjects = {}
const diaFiles = []
const nocheFiles = []

for (const [name, { subject, html }] of Object.entries(templates)) {
  fs.writeFileSync(path.join(outDir, `${name}.html`), html)

  const htmlDia = html.replace(DARK_CSS, '')
  const fileDia = path.join(outDir, `${name}-dia.html`)
  fs.writeFileSync(fileDia, htmlDia)
  diaFiles.push(fileDia)

  const htmlNoche = html.replace(DARK_CSS, DARK_FORCED)
  const fileNoche = path.join(outDir, `${name}-noche.html`)
  fs.writeFileSync(fileNoche, htmlNoche)
  nocheFiles.push(fileNoche)

  subjects[name] = subject
  console.log(`✓ ${name}`)
  console.log(`  Subject: "${subject}"`)
}

fs.writeFileSync(
  path.join(outDir, '_subjects.json'),
  JSON.stringify(subjects, null, 2)
)

console.log('\nCómo pegar en Supabase:')
console.log('  Dashboard → Authentication → Email Templates → selecciona cada template')
console.log('  Pega el contenido de {name}.html (sin -dia ni -noche) en el campo "Body"')
console.log('  Pega el subject en el campo "Subject"')
console.log('  Los subjects están en .email-previews/supabase/_subjects.json')
