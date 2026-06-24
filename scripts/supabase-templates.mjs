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
const BRAND   = '#00827C'
const NEGRO   = '#474747'
const BLANCO  = '#ffffff'

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
      .ec { background-color: #525252 !important; }
      .ec p, .ec td, .ec span, .ec li { color: #E0E0E0 !important; }
      .ec strong { color: #ffffff !important; }
      .ec a { color: #D6F391 !important; }
      .eh { background-color: #D6F391 !important; }
      .eh p { color: #474747 !important; }
      .eh p + p { color: rgba(71,71,71,0.65) !important; }
      a.eb { background-color: #D6F391 !important; color: #474747 !important; }
      .ef { background-color: #474747 !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
      .ef p, .ef a { color: #E0E0E0 !important; }
      .ea td { background-color: rgba(246,191,62,0.10) !important; }
      .ea p { color: #F6BF3E !important; }
      .ek td { background-color: rgba(214,243,145,0.10) !important; }
      .ek a, .ek span { color: #D6F391 !important; }
      .ek p { color: #E0E0E0 !important; }
    }
    [data-ogsc] .ec { background-color: #525252 !important; }
    [data-ogsc] .ec p, [data-ogsc] .ec td, [data-ogsc] .ec span, [data-ogsc] .ec li { color: #E0E0E0 !important; }
    [data-ogsc] .ec strong { color: #ffffff !important; }
    [data-ogsc] .ec a { color: #D6F391 !important; }
    [data-ogsc] .eh { background-color: #D6F391 !important; }
    [data-ogsc] .eh p { color: #474747 !important; }
    [data-ogsc] .eh p + p { color: rgba(71,71,71,0.65) !important; }
    [data-ogsc] a.eb { background-color: #D6F391 !important; color: #474747 !important; }
    [data-ogsc] .ef { background-color: #474747 !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
    [data-ogsc] .ef p, [data-ogsc] .ef a { color: #E0E0E0 !important; }
    [data-ogsc] .ea td { background-color: rgba(246,191,62,0.10) !important; }
    [data-ogsc] .ea p { color: #F6BF3E !important; }
    [data-ogsc] .ek td { background-color: rgba(214,243,145,0.10) !important; }
    [data-ogsc] .ek a, [data-ogsc] .ek span { color: #D6F391 !important; }
    [data-ogsc] .ek p { color: #E0E0E0 !important; }
    [data-ogsb] .ec { background-color: #525252 !important; }
    [data-ogsb] .ec p, [data-ogsb] .ec td, [data-ogsb] .ec span, [data-ogsb] .ec li { color: #E0E0E0 !important; }
    [data-ogsb] .ec strong { color: #ffffff !important; }
    [data-ogsb] .ec a { color: #D6F391 !important; }
    [data-ogsb] .eh { background-color: #D6F391 !important; }
    [data-ogsb] .eh p { color: #474747 !important; }
    [data-ogsb] .eh p + p { color: rgba(71,71,71,0.65) !important; }
    [data-ogsb] a.eb { background-color: #D6F391 !important; color: #474747 !important; }
    [data-ogsb] .ef { background-color: #474747 !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
    [data-ogsb] .ef p, [data-ogsb] .ef a { color: #E0E0E0 !important; }
    [data-ogsb] .ea td { background-color: rgba(246,191,62,0.10) !important; }
    [data-ogsb] .ea p { color: #F6BF3E !important; }
    [data-ogsb] .ek td { background-color: rgba(214,243,145,0.10) !important; }
    [data-ogsb] .ek a, [data-ogsb] .ek span { color: #D6F391 !important; }
    [data-ogsb] .ek p { color: #E0E0E0 !important; }
  </style>`

function plantilla({ subtituloHeader, preheader, saludo, cuerpo, contenidoCentral, mostrarAlerta = false, alertaAccion = '' }) {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${subtituloHeader}</title>
</head>
<body class="eo" style="margin:0;padding:0;background-color:#ffffff;font-family:'Open Sans',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${DARK_CSS}
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>

  <table class="eo" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px 48px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">

          <tr>
            <td class="eh" style="background-color:${BRAND};border-radius:16px 16px 0 0;padding:28px 40px 24px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:${BLANCO};letter-spacing:-0.3px;">Calculadora de Reúso</p>
              <p style="margin:6px 0 0;font-size:14px;font-weight:600;color:rgba(255,255,255,0.75);">${subtituloHeader}</p>
            </td>
          </tr>

          <tr>
            <td class="ec" style="background-color:${BLANCO};padding:36px 40px 40px;">

              <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:${NEGRO};line-height:1.3;">${saludo}</p>
              ${cuerpo ? `<p style="margin:0 0 28px;font-size:15px;color:${NEGRO};line-height:1.75;">${cuerpo}</p>` : ''}

              ${contenidoCentral}

              <p style="margin:32px 0 0;font-size:14px;color:${NEGRO};line-height:1.65;">
                Un saludo,<br>
                <strong style="color:${NEGRO};">El equipo de la Calculadora de Reúso</strong>
              </p>

              ${mostrarAlerta ? `
              <table class="ea" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
                <tr>
                  <td style="background-color:#FFF8E6;border-radius:12px;padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${NEGRO};">🔔 ¿No lo pediste tú?</p>
                    <p style="margin:0;font-size:13px;color:${NEGRO};line-height:1.65;">
                      Tranquilo, tu cuenta está segura. Nadie puede usarla sin que tú lo hagas. Solo ignora este correo${alertaAccion ? ` y no ${alertaAccion}` : ''}.
                    </p>
                  </td>
                </tr>
              </table>` : ''}

            </td>
          </tr>

          <tr>
            <td class="ef" style="background-color:#F5F5F5;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 10px;font-size:11px;color:${NEGRO};line-height:1.7;">
                Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso. No tiene fines promocionales ni de marketing, por eso no incluye un enlace para darte de baja. Lo recibirás aunque hayas cancelado tu suscripción a correos de marketing.
              </p>
              <p style="margin:0;font-size:11px;color:${NEGRO};line-height:1.7;">
                © ${year} Grupo MLP S.A.S. · Todos los derechos reservados.<br>
                <a href="https://reuso.lurdes.co" style="color:${NEGRO};text-decoration:underline;">reuso.lurdes.co</a>
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
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;">
  <tr>
    <td align="center">
      <a class="eb" href="${url}" style="display:inline-block;background-color:${BRAND};color:${BLANCO};text-decoration:none;padding:16px 44px;border-radius:100px;font-size:16px;font-weight:700;letter-spacing:-0.2px;">
        ${texto}
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top:14px;">
      <p style="margin:0;font-size:12px;color:${NEGRO};">O copia este enlace en tu navegador:<br>
        <a href="${url}" style="color:${BRAND};word-break:break-all;font-size:11px;">${url}</a>
      </p>
    </td>
  </tr>
</table>`

// ── Bloque OTP (código grande) ────────────────────────────────────────────────
// El código Supabase viene como {{ .Token }} (8 dígitos). Para evitar que iOS lo
// detecte como teléfono, se muestra en dos grupos de 4 con un thin space (&#8202;).
// "37842951" → "3784 2951". iOS no reconoce ese formato como número de teléfono.
// El usuario teclea los 8 dígitos; el campo OTP ignora el espacio de separación.
const bloqueOTP = (token) => `
<table class="ek" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td style="background-color:#F0F7F6;border-radius:16px;padding:28px 20px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:${NEGRO};font-weight:600;">Tu código de verificación</p>
      <span class="otp-text" style="display:inline-block;font-size:40px;font-weight:800;color:${BRAND};letter-spacing:0.18em;">${token}</span>
      <p style="margin:12px 0 0;font-size:12px;color:${NEGRO};">Expira en 10 minutos. No lo compartas con nadie.</p>
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
      preheader: 'Un clic y tu cuenta queda activa',
      saludo: '¡Ya casi terminas! 🎉',
      cuerpo: 'Confirma tu correo para activar tu cuenta en la Calculadora de Reúso y empezar a medir tu impacto ambiental.',
      contenidoCentral: botonLink('{{ .ConfirmationURL }}', 'Confirmar mi correo'),
      mostrarAlerta: true,
      alertaAccion: 'confirmes el correo',
    }),
  },

  // 2. Invitación (Supabase Admin invite — distinta a nuestra invitación de equipo)
  '2-invitacion-admin': {
    subject: 'Te invitaron a la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Invitación',
      preheader: 'Acepta la invitación y empieza hoy',
      saludo: '¡Hola! 👋',
      cuerpo: 'Te invitaron a unirte a la Calculadora de Reúso. Acepta la invitación para activar tu cuenta.',
      contenidoCentral: botonLink('{{ .ConfirmationURL }}', 'Aceptar invitación'),
      mostrarAlerta: true,
      alertaAccion: 'aceptes la invitación',
    }),
  },

  // 3. Magic link
  '3-magic-link': {
    subject: 'Tu enlace de acceso a la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Enlace de acceso',
      preheader: 'Tu enlace de acceso seguro. Expira en 10 minutos',
      saludo: '¡Hola! 👋',
      cuerpo: 'Usa este enlace para ingresar a tu cuenta. Es de un solo uso y expira en 10 minutos.',
      contenidoCentral: botonLink('{{ .ConfirmationURL }}', 'Ingresar a mi cuenta'),
      mostrarAlerta: true,
      alertaAccion: 'uses el enlace',
    }),
  },

  // 4. Cambio de correo
  '4-cambio-correo': {
    subject: 'Confirma tu nuevo correo en la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Confirma tu nuevo correo',
      preheader: 'Confirma el cambio para que quede activo',
      saludo: 'Confirma tu nuevo correo 📧',
      cuerpo: 'Recibimos una solicitud para cambiar el correo de tu cuenta. Confirma el cambio haciendo clic abajo.',
      contenidoCentral: botonLink('{{ .ConfirmationURL }}', 'Confirmar nuevo correo'),
      mostrarAlerta: true,
      alertaAccion: 'confirmes el cambio',
    }),
  },

  // 5. Recuperar contraseña (OTP de 8 dígitos — configurado en Supabase)
  '5-recuperar-contrasena': {
    subject: 'Restablece tu contraseña en la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Restablecer contraseña',
      preheader: 'Tu código para restablecer la contraseña',
      saludo: '¿Olvidaste tu contraseña?',
      cuerpo: 'Ingresa este código en la pantalla de recuperación para crear una nueva contraseña. Expira en 10 minutos.',
      contenidoCentral: bloqueOTP('{{ .Token }}'),
      mostrarAlerta: true,
      alertaAccion: 'ingreses el código',
    }),
  },

  // 6. Reautenticación (OTP de 8 dígitos)
  '6-reautenticacion': {
    subject: 'Tu código de verificación en la Calculadora de Reúso',
    html: plantilla({
      subtituloHeader: 'Código de verificación',
      preheader: 'Tu código de verificación de seguridad',
      saludo: 'Verifica tu identidad 🔐',
      cuerpo: 'Ingresa este código para confirmar que eres tú. Expira en 10 minutos.',
      contenidoCentral: bloqueOTP('{{ .Token }}'),
      mostrarAlerta: true,
      alertaAccion: 'ingreses el código',
    }),
  },

}

// CSS de noche forzada (sin media query) — para preview en cualquier Mac
const DARK_FORCED = `
  <style type="text/css">
    .ec { background-color: #525252 !important; }
    .ec p, .ec td, .ec span, .ec li { color: #E0E0E0 !important; }
    .ec strong { color: #ffffff !important; }
    .ec a { color: #D6F391 !important; }
    .eh { background-color: #D6F391 !important; }
    .eh p { color: #474747 !important; }
    .eh p + p { color: rgba(71,71,71,0.65) !important; }
    a.eb { background-color: #D6F391 !important; color: #474747 !important; }
    .ef { background-color: #474747 !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
    .ef p, .ef a { color: #E0E0E0 !important; }
    .ea td { background-color: rgba(246,191,62,0.10) !important; }
    .ea p { color: #F6BF3E !important; }
    .ek td { background-color: rgba(214,243,145,0.10) !important; }
    .ek a, .ek span { color: #D6F391 !important; }
    .ek p { color: #E0E0E0 !important; }
  </style>`

// ── Escribir archivos y abrir ────────────────────────────────────────────────
const outDir = path.join(__dirname, '../.email-previews/supabase')
fs.mkdirSync(outDir, { recursive: true })

const subjects = {}
const diaFiles = []
const nocheFiles = []

for (const [name, { subject, html }] of Object.entries(templates)) {
  // Archivo de producción (con media query — este es el que se pega en Supabase)
  fs.writeFileSync(path.join(outDir, `${name}.html`), html)

  // Preview día — sin CSS oscuro para siempre mostrar claro
  const htmlDia = html.replace(DARK_CSS, '')
  const fileDia = path.join(outDir, `${name}-dia.html`)
  fs.writeFileSync(fileDia, htmlDia)
  diaFiles.push(fileDia)

  // Preview noche — forzado sin media query
  const htmlNoche = html.replace(DARK_CSS, DARK_FORCED)
  const fileNoche = path.join(outDir, `${name}-noche.html`)
  fs.writeFileSync(fileNoche, htmlNoche)
  nocheFiles.push(fileNoche)

  subjects[name] = subject
  console.log(`✓ ${name}`)
  console.log(`  Subject: "${subject}"`)
}

// Guardar referencia de subjects
fs.writeFileSync(
  path.join(outDir, '_subjects.json'),
  JSON.stringify(subjects, null, 2)
)

// Abrir primero todos los de día, luego todos los de noche
for (const f of diaFiles) execSync(`open "${f}"`)
for (const f of nocheFiles) execSync(`open "${f}"`)

console.log('\nCómo pegar en Supabase:')
console.log('  Dashboard → Authentication → Email Templates → selecciona cada template')
console.log('  Pega el contenido de {name}.html (sin -dia ni -noche) en el campo "Body"')
console.log('  Pega el subject en el campo "Subject"')
console.log('  Los subjects están en .email-previews/supabase/_subjects.json')
