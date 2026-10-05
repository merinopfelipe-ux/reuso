/**
 * Genera previews de los correos del sistema reflejando fielmente src/lib/email.ts.
 * Uso: node scripts/preview-emails.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const COLOR_NEGRO = '#111111'
const COLOR_LURDES = '#474747'
const COLOR_BRAND = '#00827C'
const BG_PAGE = '#FFFFFF'
const BG_MUY_AGUA = '#E6F2F0'
const BG_BOX_WHITE = '#FFFFFF'
const COLOR_TEXT_MUTED = '#6B7E7B'

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
      body, .email-body { background-color: #2E2E2E !important; }
      .email-card { background-color: #384240 !important; }
      .email-card p, .email-card td, .email-card span, .email-card li { color: #E0E8E6 !important; }
      .email-card strong, .email-card h1 { color: #FFFFFF !important; }
      .email-eyebrow { color: #D6F391 !important; }
      .email-card a { color: #D6F391 !important; }
      .email-btn { background-color: #00827C !important; color: #FFFFFF !important; }
      .email-inner-box { background-color: #2A3331 !important; }
      .email-inner-box p, .email-inner-box td { color: #E0E8E6 !important; }
      .email-footer p, .email-footer a { color: #8F9E9B !important; }
      .email-social-icon path { fill: #8F9E9B !important; }
    }
    [data-ogsc] body, [data-ogsc] .email-body { background-color: #2E2E2E !important; }
    [data-ogsc] .email-card { background-color: #384240 !important; }
    [data-ogsc] .email-card p, [data-ogsc] .email-card td { color: #E0E8E6 !important; }
    [data-ogsc] .email-card strong, [data-ogsc] .email-card h1 { color: #FFFFFF !important; }
    [data-ogsc] .email-eyebrow { color: #D6F391 !important; }
    [data-ogsc] .email-btn { background-color: #00827C !important; color: #FFFFFF !important; }
    [data-ogsc] .email-footer p, [data-ogsc] .email-footer a { color: #8F9E9B !important; }
  </style>`

const SOCIAL_ICONS_HTML = `
  <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 12px;">
    <tr>
      <td style="padding:0 10px;">
        <a href="https://www.linkedin.com/company/calculadora-de-reuso" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;" title="LinkedIn Calculadora de Reúso">
          <svg class="email-social-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" fill="#8F9E9B"/>
          </svg>
        </a>
      </td>
      <td style="padding:0 10px;">
        <a href="https://www.youtube.com/@calculadoradereuso" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;" title="YouTube Calculadora de Reúso">
          <svg class="email-social-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#8F9E9B"/>
          </svg>
        </a>
      </td>
      <td style="padding:0 10px;">
        <a href="https://www.instagram.com/calculadoradereuso" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;" title="Instagram @calculadoradereuso">
          <svg class="email-social-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="#8F9E9B"/>
          </svg>
        </a>
      </td>
    </tr>
  </table>`

const ALERTA = (accion) => `
<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
  <tr>
    <td style="background-color:#FFFFFF;border-radius:16px;padding:18px 22px;text-align:left;">
      <p style="margin:0 0 6px;font-size:13.5px;font-weight:700;color:${COLOR_NEGRO};text-align:left;">🔔 ¿No realizaste esta solicitud?</p>
      <p style="margin:0;font-size:13px;color:${COLOR_LURDES};line-height:1.65;text-align:left;">
        Tu cuenta está protegida. Puedes ignorar este correo y no ${accion}.
      </p>
    </td>
  </tr>
</table>`

function emailPlantilla({ preheader, subtituloHeader, saludo, cuerpo, contenidoCentral = '', alertaAccion = 'compartas el código con nadie', mostrarAlerta = true, mostrarFirma = true, avisoPie }) {
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
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>

  <table class="email-body" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG_PAGE};">
    <tr>
      <td align="center" style="padding:48px 16px 56px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">

          <!-- Cabecera Logo Completo Oficial -->
          <tr>
            <td align="center" style="padding:0 0 32px;text-align:center;">
              <a href="https://calculadoradereuso.com" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;" title="Calculadora de Reúso">
                <img src="https://calculadoradereuso.com/logo-completo.svg" alt="Calculadora de Reúso" width="148" height="41" style="display:block;margin:0 auto;max-width:148px;height:auto;border:0;outline:none;" />
              </a>
            </td>
          </tr>

          <!-- El Cajón (Fondo Muy Agua, sin líneas, texto a la izquierda) -->
          <tr>
            <td class="email-card" style="background-color:${BG_MUY_AGUA};border-radius:28px;padding:48px 44px 44px;text-align:left;">

              ${subtituloHeader ? `
              <p class="email-eyebrow" style="margin:0 0 14px;font-size:13px;font-weight:700;color:${COLOR_BRAND};letter-spacing:0.02em;text-align:left;font-family:'Open Sans',-apple-system,sans-serif;">
                ${subtituloHeader}
              </p>` : ''}

              <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:${COLOR_NEGRO};line-height:1.25;letter-spacing:-0.5px;text-align:left;">
                ${saludo}
              </h1>

              ${cuerpo ? `<p style="margin:0 0 20px;font-size:15px;color:${COLOR_LURDES};line-height:1.75;text-align:left;">${cuerpo}</p>` : ''}

              ${contenidoCentral}

              ${mostrarFirma ? `
              <div style="margin-top:28px;">
                <p style="margin:0;font-size:14px;color:${COLOR_LURDES};line-height:1.65;text-align:left;">
                  Un saludo,<br>
                  <strong style="color:${COLOR_NEGRO};">El equipo de la Calculadora de Reúso</strong>
                </p>
              </div>` : ''}

              ${mostrarAlerta ? ALERTA(alertaAccion) : ''}

            </td>
          </tr>

          <!-- Footer Centrado (Sin marca de agua) -->
          <tr>
            <td class="email-footer" align="center" style="padding:32px 16px 0;text-align:center;">

              ${avisoPie
                ? (avisoPie.startsWith('<p')
                    ? avisoPie
                    : `<p style="margin:0 auto 14px;font-size:11.5px;color:${COLOR_TEXT_MUTED};line-height:1.65;max-width:440px;text-align:center;">${avisoPie}</p>`)
                : `<p style="margin:0 auto 14px;font-size:11.5px;color:${COLOR_TEXT_MUTED};line-height:1.65;max-width:440px;text-align:center;">
                    Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso. No tiene fines promocionales ni de marketing.
                  </p>`}

              <p style="margin:0 auto 14px;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">
                <a href="https://calculadoradereuso.com/terminos" style="color:${COLOR_TEXT_MUTED};text-decoration:none;">Términos</a>
                &nbsp;&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="https://calculadoradereuso.com/privacidad" style="color:${COLOR_TEXT_MUTED};text-decoration:none;">Privacidad</a>
              </p>

              ${SOCIAL_ICONS_HTML}

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

const APP_URL = 'https://calculadoradereuso.com'
const link = `${APP_URL}/invitacion/TOKEN-EJEMPLO-123`

const boton = (url, texto) => `
<table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 12px;">
  <tr>
    <td align="center">
      <a class="email-btn" href="${url}" style="display:inline-block;background-color:${COLOR_BRAND};color:#ffffff;text-decoration:none;padding:15px 42px;border-radius:100px;font-size:15px;font-weight:700;letter-spacing:-0.2px;">
        ${texto}
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top:10px;">
      <p style="margin:0;font-size:12px;color:${COLOR_TEXT_MUTED};text-align:center;">O copia este enlace: <a href="${url}" style="color:${COLOR_BRAND};text-decoration:none;">${url}</a></p>
    </td>
  </tr>
</table>`

const templates = {
  '1-invitacion-con-codigo': emailPlantilla({
    preheader: 'Empresa Ejemplo te invitó a medir su impacto ambiental.',
    subtituloHeader: 'Invitación de equipo',
    saludo: '¡Hola, María!',
    cuerpo: `<strong>Empresa Ejemplo S.A.S.</strong> te invitó a unirte a su equipo en la Calculadora de Reúso. Al aceptar, podrás colaborar en el registro de inventario, certificar el ahorro de CO₂ y gestionar el impacto ambiental de tu organización.`,
    contenidoCentral: boton(link, 'Aceptar invitación') + `
<table class="email-inner-box" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 16px;max-width:400px;">
  <tr>
    <td style="background-color:${BG_BOX_WHITE};border-radius:18px;padding:22px 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12.5px;color:${COLOR_LURDES};font-weight:600;text-align:center;">¿Prefieres registrarte con código?</p>
      <span style="font-size:26px;font-weight:800;color:${COLOR_BRAND};letter-spacing:0.14em;font-family:'Open Sans',-apple-system,sans-serif;text-align:center;">EJMP-2025</span>
      <p style="margin:8px 0 0;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">Úsalo en <a href="${APP_URL}/registro" style="color:${COLOR_BRAND};text-decoration:none;font-weight:600;">${APP_URL}/registro</a></p>
    </td>
  </tr>
</table>
<p style="margin:20px 0 0;font-size:12.5px;color:${COLOR_TEXT_MUTED};line-height:1.6;text-align:left;">
  Recuerda que este enlace expira en <strong>7 días</strong>.
</p>`,
    alertaAccion: 'aceptes la invitación',
    mostrarAlerta: true,
  }),

  '2-invitacion-sin-codigo': emailPlantilla({
    preheader: 'Empresa Ejemplo te invitó a medir su impacto ambiental.',
    subtituloHeader: 'Invitación de equipo',
    saludo: '¡Hola!',
    cuerpo: `<strong>Empresa Ejemplo S.A.S.</strong> te invitó a unirte a su equipo en la Calculadora de Reúso. Al aceptar, podrás colaborar en el registro de inventario, certificar el ahorro de CO₂ y gestionar el impacto ambiental de tu organización.`,
    contenidoCentral: boton(link, 'Aceptar invitación') + `
<p style="margin:20px 0 0;font-size:12.5px;color:${COLOR_TEXT_MUTED};line-height:1.6;text-align:left;">
  Recuerda que este enlace expira en <strong>7 días</strong>.
</p>`,
    alertaAccion: 'aceptes la invitación',
    mostrarAlerta: true,
  }),

  '3-notificacion-ticket': emailPlantilla({
    preheader: 'Nuevo ticket de soporte: Error al generar certificado.',
    subtituloHeader: 'Ticket de soporte',
    saludo: 'Nuevo mensaje de soporte',
    cuerpo: 'Llegó un mensaje desde el formulario de soporte. Aquí están los detalles para su gestión:',
    contenidoCentral: `
<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background-color:${BG_BOX_WHITE};border-radius:18px;padding:20px 24px;">
  <tr>
    <td style="padding:6px 0;font-weight:700;color:${COLOR_NEGRO};width:90px;vertical-align:top;font-size:13px;text-align:left;">Usuario</td>
    <td style="padding:6px 0;color:${COLOR_LURDES};font-size:13px;text-align:left;">María García</td>
  </tr>
  <tr>
    <td style="padding:6px 0;font-weight:700;color:${COLOR_NEGRO};width:90px;vertical-align:top;font-size:13px;text-align:left;">Correo</td>
    <td style="padding:6px 0;color:${COLOR_LURDES};font-size:13px;text-align:left;"><a href="mailto:maria@empresa.com" style="color:${COLOR_BRAND};text-decoration:none;font-weight:600;">maria@empresa.com</a></td>
  </tr>
  <tr>
    <td style="padding:6px 0;font-weight:700;color:${COLOR_NEGRO};width:90px;vertical-align:top;font-size:13px;text-align:left;">Categoría</td>
    <td style="padding:6px 0;color:${COLOR_LURDES};font-size:13px;text-align:left;">Error técnico</td>
  </tr>
</table>
<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${COLOR_NEGRO};text-align:left;">Mensaje:</p>
<div class="email-inner-box" style="margin:0;padding:16px 20px;background-color:${BG_BOX_WHITE};border-radius:16px;font-size:13.5px;color:${COLOR_LURDES};line-height:1.7;white-space:pre-wrap;text-align:left;">Al intentar generar el certificado me aparece un error 500.</div>`,
    mostrarAlerta: false,
  }),
}

const outDir = path.join(__dirname, '../.email-previews')
fs.mkdirSync(outDir, { recursive: true })

for (const [name, html] of Object.entries(templates)) {
  const fileFull = path.join(outDir, `${name}.html`)
  fs.writeFileSync(fileFull, html)
  console.log(`✓ Generado: ${fileFull}`)
}
