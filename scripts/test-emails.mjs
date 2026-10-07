/**
 * Prueba de envío real de todos los correos del sistema.
 * Uso: node scripts/test-emails.mjs
 *
 * Envía:
 *   1. Invitación de equipo (con código de empresa)
 *   2. Invitación de equipo (sin código)
 *   3. Notificación de ticket
 *   4. Dispara los 5 flujos de Supabase Auth que generan correo automático
 */
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// ── Cargar .env.local manualmente ────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const [key, ...rest] = trimmed.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const DEST = ['luisfe.merino@gmail.com', 'merinop@me.com']
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const RESEND_KEY = process.env.RESEND_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://calculadoradereuso.com'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_KEY) {
  console.error('Faltan variables de entorno. Verifica .env.local')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const resend = new Resend(RESEND_KEY)

// ── Helpers del sistema de correo (copia fiel de email.ts) ───────────────────
const DARK_MODE_CSS = `
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
    /* Apple Mail, Outlook iOS, Samsung Mail, Thunderbird */
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
      .et { background-color: rgba(214,243,145,0.08) !important; }
      .et td { color: #E0E0E0 !important; }
    }
    /* Gmail app (Android e iOS) — preserva estilos en body, agrega data-ogsc en noche */
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
    [data-ogsc] .et { background-color: rgba(214,243,145,0.08) !important; }
    [data-ogsc] .et td { color: #E0E0E0 !important; }
    /* Outlook.com web — agrega data-ogsb en noche */
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
    [data-ogsb] .et { background-color: rgba(214,243,145,0.08) !important; }
    [data-ogsb] .et td { color: #E0E0E0 !important; }
  </style>`

// ── Tokens Sistema Reúso ────────────────────────────────────────────────────
const COLOR_NEGRO = '#111111'
const COLOR_LURDES = '#474747'
const COLOR_BRAND = '#00827C'
const BG_PAGE = '#FFFFFF'
const BG_MUY_AGUA = '#E6F2F0'
const BG_BOX_WHITE = '#FFFFFF'
const COLOR_TEXT_MUTED = '#6B7E7B'

// ── Redes Sociales Oficiales ────────────────────────────────────────────────
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

// Bloque OTP centrado con caja blanca
const bloqueOTP = (codigo) => {
  const display = codigo.length === 8
    ? `${codigo.slice(0, 4)}&thinsp;${codigo.slice(4)}`
    : codigo
  return `
<table class="email-inner-box" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 16px;max-width:400px;">
  <tr>
    <td style="background-color:${BG_BOX_WHITE};border-radius:18px;padding:24px 20px;text-align:center;">
      <p style="margin:0 0 10px;font-size:12.5px;color:${COLOR_LURDES};font-weight:600;text-align:center;">Tu código de verificación</p>
      <span class="otp-text" style="display:inline-block;font-size:36px;font-weight:800;color:${COLOR_BRAND};letter-spacing:0.14em;font-family:'Open Sans',-apple-system,sans-serif;text-align:center;">
        <a href="#otp" style="color:inherit;text-decoration:none;">${display}</a>
      </span>
      <p style="margin:10px 0 0;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">Expira en 10 minutos. No lo compartas con nadie.</p>
    </td>
  </tr>
</table>`
}

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

function emailPlantilla({ preheader, subtituloHeader, saludo, cuerpo, contenidoCentral = '', alertaAccion = 'compartas el código', mostrarAlerta = true }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${saludo}</title>
  ${DARK_MODE_CSS}
</head>
<body class="email-body" style="margin:0;padding:0;background-color:${BG_PAGE};font-family:'Open Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>

  <table class="email-body" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG_PAGE};">
    <tr>
      <td align="center" style="padding:48px 16px 56px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">

          <!-- Logo Oficial Completo -->
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

              <div style="margin-top:28px;">
                <p style="margin:0;font-size:14px;color:${COLOR_LURDES};line-height:1.65;text-align:left;">
                  Un saludo,<br>
                  <strong style="color:${COLOR_NEGRO};">El equipo de la Calculadora de Reúso</strong>
                </p>
              </div>

              ${mostrarAlerta ? ALERTA(alertaAccion) : ''}

            </td>
          </tr>

          <!-- Footer Centrado (Sin marca de agua) -->
          <tr>
            <td class="email-footer" align="center" style="padding:32px 16px 0;text-align:center;">

              <p style="margin:0 auto 14px;font-size:11.5px;color:${COLOR_TEXT_MUTED};line-height:1.65;max-width:440px;text-align:center;">
                Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso. No tiene fines promocionales ni de marketing.
              </p>

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

// ── Resultados ────────────────────────────────────────────────────────────────
const resultados = []

async function probar(nombre, fn) {
  process.stdout.write(`  ${nombre}...`)
  try {
    await fn()
    console.log(' ✓')
    resultados.push({ nombre, ok: true })
  } catch (e) {
    console.log(` ✗  ${e.message}`)
    resultados.push({ nombre, ok: false, error: e.message })
  }
}

// ── BLOQUE 1: Correos Resend ──────────────────────────────────────────────────
console.log('\n📨 Correos Resend\n')
const FROM = 'Calculadora de Reúso <innovacion@lurdes.co>'
const FROM_INV = 'Calculadora de Reúso <innovacion@lurdes.co>'

await probar('1. Invitación con código de empresa', async () => {
  const link = `${APP_URL}/invitacion/TOKEN-TEST-123`
  const html = emailPlantilla({
    preheader: 'Empresa de Prueba te invitó a medir su impacto ambiental. Acepta y empieza hoy',
    subtituloHeader: 'Invitación de equipo',
    saludo: '¡Hola, Luis Felipe! 👋',
    cuerpo: '<strong>Empresa de Prueba S.A.S.</strong> te invitó a unirte a su equipo en la Calculadora de Reúso. Acepta la invitación y empieza a registrar el impacto ambiental de tu organización.',
    contenidoCentral: `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr><td align="center">
    <a class="eb" href="${link}" style="display:inline-block;background-color:#00827C;color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:100px;font-size:16px;font-weight:700;letter-spacing:-0.2px;">Aceptar invitación</a>
  </td></tr>
  <tr><td align="center" style="padding-top:12px;">
    <p style="margin:0;font-size:12px;color:#474747;">O copia este enlace en tu navegador:<br>
      <a href="${link}" style="color:#00827C;word-break:break-all;font-size:11px;">${link}</a>
    </p>
  </td></tr>
</table>
<table class="ek" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;">
  <tr><td style="background-color:#F0F7F6;border-radius:12px;padding:16px 20px;text-align:center;">
    <p style="margin:0 0 6px;font-size:12px;color:#474747;font-weight:600;">¿Prefieres registrarte con código?</p>
    <span style="font-size:24px;font-weight:800;color:#00827C;letter-spacing:0.15em;">EJMP-2025</span>
    <p style="margin:6px 0 0;font-size:11px;color:#474747;">Úsalo en <a href="${APP_URL}/registro" style="color:#00827C;">${APP_URL}/registro</a></p>
  </td></tr>
</table>
<p style="margin:20px 0 0;font-size:13px;color:#474747;line-height:1.6;">
  <strong>Recuerda:</strong> Este enlace expira en <strong>7 días</strong>.
</p>`,
    alertaAccion: 'aceptes la invitación',
  })
  const { error } = await resend.emails.send({ from: FROM_INV, to: DEST, subject: 'Empresa de Prueba te invitó a la Calculadora de Reúso', html })
  if (error) throw new Error(JSON.stringify(error))
})

await probar('2. Invitación sin código de empresa', async () => {
  const link = `${APP_URL}/invitacion/TOKEN-TEST-456`
  const html = emailPlantilla({
    preheader: 'Grupo MLP te invitó a medir su impacto ambiental. Acepta y empieza hoy',
    subtituloHeader: 'Invitación de equipo',
    saludo: '¡Hola! 👋',
    cuerpo: '<strong>Grupo MLP S.A.S.</strong> te invitó a unirte a su equipo en la Calculadora de Reúso.',
    contenidoCentral: `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr><td align="center">
    <a class="eb" href="${link}" style="display:inline-block;background-color:#00827C;color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:100px;font-size:16px;font-weight:700;letter-spacing:-0.2px;">Aceptar invitación</a>
  </td></tr>
</table>
<p style="margin:20px 0 0;font-size:13px;color:#474747;line-height:1.6;"><strong>Recuerda:</strong> Este enlace expira en <strong>7 días</strong>.</p>`,
    alertaAccion: 'aceptes la invitación',
  })
  const { error } = await resend.emails.send({ from: FROM_INV, to: DEST, subject: 'Grupo MLP S.A.S. te invitó a la Calculadora de Reúso', html })
  if (error) throw new Error(JSON.stringify(error))
})

await probar('3. Notificación de ticket de soporte', async () => {
  const filasInfo = [
    { label: 'Usuario', valor: 'Luis Felipe Merino' },
    { label: 'Correo', valor: `<a href="mailto:${DEST}" style="color:#00827C;">${DEST}</a>` },
    { label: 'Categoría', valor: 'Error técnico' },
  ].map(f =>
    `<tr>
      <td style="padding:5px 0;font-weight:700;color:#474747;width:90px;vertical-align:top;font-size:13px;">${f.label}</td>
      <td style="padding:5px 0;color:#474747;font-size:13px;">${f.valor}</td>
    </tr>`
  ).join('')

  const html = emailPlantilla({
    preheader: 'Nuevo ticket. Error técnico. Responde desde el panel admin',
    subtituloHeader: 'Nuevo ticket de soporte',
    saludo: '📬 Alguien necesita ayuda',
    cuerpo: 'Llegó un mensaje desde el formulario de soporte. Aquí están los detalles:',
    contenidoCentral: `
<table class="et" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background-color:#F0F7F6;border-radius:10px;padding:16px 20px;">
  ${filasInfo}
</table>
<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#474747;">Mensaje:</p>
<p style="margin:0;font-size:14px;color:#474747;line-height:1.75;">Esta es una prueba del sistema de tickets. Todo funciona correctamente.</p>`,
    mostrarAlerta: false,
  })
  const { error } = await resend.emails.send({ from: FROM, to: DEST, subject: 'Nuevo ticket de soporte. Error técnico', html })
  if (error) throw new Error(JSON.stringify(error))
})

await probar('4. Demo OTP (verifica modo noche y detección iPhone)', async () => {
  const html = emailPlantilla({
    preheader: 'Código de prueba para verificar que iPhone no lo detecta como teléfono',
    subtituloHeader: 'Código de verificación',
    saludo: '¡Este es un correo de prueba! 🧪',
    cuerpo: 'Este correo verifica dos cosas: (1) El modo noche aplica correctamente en Gmail y otros clientes. (2) El código de abajo no se detecta como número de teléfono en iPhone.',
    contenidoCentral: bloqueOTP('37842951'),
    alertaAccion: 'ingreses el código',
    mostrarAlerta: true,
  })
  const { error } = await resend.emails.send({
    from: FROM,
    to: DEST,
    subject: 'Demo — Código de verificación (prueba modo noche + iPhone)',
    html,
  })
  if (error) throw new Error(JSON.stringify(error))
})

// ── BLOQUE 2: Disparadores Supabase Auth ─────────────────────────────────────
// Solo se ejecuta con: node scripts/test-emails.mjs --supabase
if (process.argv.includes('--supabase')) {

console.log('\n🔐 Correos Supabase Auth\n')

await probar('5. Confirm signup (registro nuevo)', async () => {
  // Borrar usuario de prueba si ya existe
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
  const prev = existing?.users?.find(u => u.email === 'test-prueba-correo@calculadoradereuso.com')
  if (prev) await supabaseAdmin.auth.admin.deleteUser(prev.id)

  // Registrar nuevo usuario → Supabase dispara "Confirm signup"
  const { error } = await supabaseAnon.auth.signUp({
    email: 'test-prueba-correo@calculadoradereuso.com',
    password: 'TestCorreo2026!',
  })
  if (error) throw new Error(error.message)
})

for (const email of DEST) {
  await probar(`5. Reset Password → ${email}`, async () => {
    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/recuperar`,
    })
    if (error) throw new Error(error.message)
  })
}

for (const email of DEST) {
  await probar(`6. Magic Link → ${email}`, async () => {
    const { error } = await supabaseAnon.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) throw new Error(error.message)
  })
}

for (const email of DEST) {
  await probar(`7. Invite User → ${email}`, async () => {
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${APP_URL}/invitacion`,
      data: { empresa: 'Grupo MLP S.A.S.' },
    })
    if (error && !error.message?.includes('already been invited')) throw new Error(error.message)
  })
}

} // fin del bloque --supabase

// ── Resumen ───────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────')
const ok = resultados.filter(r => r.ok).length
const total = resultados.length
console.log(`\n${ok === total ? '✅' : '⚠️ '} ${ok}/${total} correos enviados\n`)
for (const r of resultados) {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.nombre}${r.error ? `\n      Error: ${r.error}` : ''}`)
}

if (ok === total) {
  console.log(`\nRevisa la bandeja de ${DEST}.`)
  console.log('Los Supabase Auth (reset, magic link, invite) pueden tardar 10-30 segundos en llegar.\n')
} else {
  console.log('\nRevisa los errores de arriba.\n')
}
