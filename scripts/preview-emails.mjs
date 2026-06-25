/**
 * Genera previews de los correos del sistema (email.ts) y los abre en el navegador.
 * Uso: node scripts/preview-emails.mjs
 * Espejo exacto de src/lib/email.ts.
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BRAND  = '#00827C'
const NEGRO  = '#474747'
const BLANCO = '#ffffff'

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
      span.epi { color: #474747 !important; }
      .ediv { border-color: rgba(214,243,145,0.35) !important; }
      .epromo-bg { background: #D6F391 !important; }
      .epromo-bg p, .epromo-bg span { color: #474747 !important; }
      span.epbw { color: #ffffff !important; }
      .epbd { background-color: #474747 !important; }
      span.ep-mes { color: #D6F391 !important; }
      .ef { background-color: #474747 !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
      .ef p, .ef a { color: #E0E0E0 !important; }
      .ea td { background-color: rgba(246,191,62,0.10) !important; }
      .ea p { color: #F6BF3E !important; }
      .ek td { background-color: rgba(214,243,145,0.10) !important; }
      .ek a, .ek span { color: #D6F391 !important; }
      .ek p { color: #E0E0E0 !important; }
      .et { background-color: rgba(214,243,145,0.08) !important; }
      .et td { color: #E0E0E0 !important; }
      .ep { background-color: rgba(255,255,255,0.07) !important; }
      .ep p { color: #E0E0E0 !important; }
      .ep .ep-tachado { color: rgba(224,224,224,0.45) !important; }
      .ep .ep-precio { color: #D6F391 !important; }
    }
    [data-ogsc] .ec { background-color: #525252 !important; }
    [data-ogsc] .ec p, [data-ogsc] .ec td, [data-ogsc] .ec span, [data-ogsc] .ec li { color: #E0E0E0 !important; }
    [data-ogsc] .ec strong { color: #ffffff !important; }
    [data-ogsc] .ec a { color: #D6F391 !important; }
    [data-ogsc] .eh { background-color: #D6F391 !important; }
    [data-ogsc] .eh p { color: #474747 !important; }
    [data-ogsc] .eh p + p { color: rgba(71,71,71,0.65) !important; }
    [data-ogsc] a.eb { background-color: #D6F391 !important; color: #474747 !important; }
    [data-ogsc] span.epi { color: #474747 !important; }
    [data-ogsc] .ediv { border-color: rgba(214,243,145,0.35) !important; }
    [data-ogsc] .epromo-bg { background: #D6F391 !important; }
    [data-ogsc] .epromo-bg p, [data-ogsc] .epromo-bg span { color: #474747 !important; }
    [data-ogsc] span.epbw { color: #ffffff !important; }
    [data-ogsc] .epbd { background-color: #474747 !important; }
    [data-ogsc] span.ep-mes { color: #D6F391 !important; }
    [data-ogsc] .ef { background-color: #474747 !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
    [data-ogsc] .ef p, [data-ogsc] .ef a { color: #E0E0E0 !important; }
    [data-ogsc] .ea td { background-color: rgba(246,191,62,0.10) !important; }
    [data-ogsc] .ea p { color: #F6BF3E !important; }
    [data-ogsc] .ek td { background-color: rgba(214,243,145,0.10) !important; }
    [data-ogsc] .ek a, [data-ogsc] .ek span { color: #D6F391 !important; }
    [data-ogsc] .ek p { color: #E0E0E0 !important; }
    [data-ogsc] .et { background-color: rgba(214,243,145,0.08) !important; }
    [data-ogsc] .et td { color: #E0E0E0 !important; }
    [data-ogsc] .ep { background-color: rgba(255,255,255,0.07) !important; }
    [data-ogsc] .ep p { color: #E0E0E0 !important; }
    [data-ogsc] .ep .ep-tachado { color: rgba(224,224,224,0.45) !important; }
    [data-ogsc] .ep .ep-precio { color: #D6F391 !important; }
    [data-ogsb] .ec { background-color: #525252 !important; }
    [data-ogsb] .ec p, [data-ogsb] .ec td, [data-ogsb] .ec span, [data-ogsb] .ec li { color: #E0E0E0 !important; }
    [data-ogsb] .ec strong { color: #ffffff !important; }
    [data-ogsb] .ec a { color: #D6F391 !important; }
    [data-ogsb] .eh { background-color: #D6F391 !important; }
    [data-ogsb] .eh p { color: #474747 !important; }
    [data-ogsb] .eh p + p { color: rgba(71,71,71,0.65) !important; }
    [data-ogsb] a.eb { background-color: #D6F391 !important; color: #474747 !important; }
    [data-ogsb] span.epi { color: #474747 !important; }
    [data-ogsb] .ediv { border-color: rgba(214,243,145,0.35) !important; }
    [data-ogsb] .epromo-bg { background: #D6F391 !important; }
    [data-ogsb] .epromo-bg p, [data-ogsb] .epromo-bg span { color: #474747 !important; }
    [data-ogsb] span.epbw { color: #ffffff !important; }
    [data-ogsb] .epbd { background-color: #474747 !important; }
    [data-ogsb] span.ep-mes { color: #D6F391 !important; }
    [data-ogsb] .ef { background-color: #474747 !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
    [data-ogsb] .ef p, [data-ogsb] .ef a { color: #E0E0E0 !important; }
    [data-ogsb] .ea td { background-color: rgba(246,191,62,0.10) !important; }
    [data-ogsb] .ea p { color: #F6BF3E !important; }
    [data-ogsb] .ek td { background-color: rgba(214,243,145,0.10) !important; }
    [data-ogsb] .ek a, [data-ogsb] .ek span { color: #D6F391 !important; }
    [data-ogsb] .ek p { color: #E0E0E0 !important; }
    [data-ogsb] .et { background-color: rgba(214,243,145,0.08) !important; }
    [data-ogsb] .et td { color: #E0E0E0 !important; }
    [data-ogsb] .ep { background-color: rgba(255,255,255,0.07) !important; }
    [data-ogsb] .ep p { color: #E0E0E0 !important; }
    [data-ogsb] .ep .ep-tachado { color: rgba(224,224,224,0.45) !important; }
    [data-ogsb] .ep .ep-precio { color: #D6F391 !important; }
  </style>`

const ALERTA = (accion) => `
<table class="ea" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
  <tr>
    <td style="background-color:#FFF8E6;border-radius:12px;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${NEGRO};">🔔 ¿No lo pediste tú?</p>
      <p style="margin:0;font-size:13px;color:${NEGRO};line-height:1.65;">
        Tranquilo, tu cuenta está segura. Nadie puede usarla sin que tú lo hagas. Solo ignora este correo y no ${accion}.
      </p>
    </td>
  </tr>
</table>`

function emailPlantilla({ preheader, subtituloHeader, saludo, cuerpo, contenidoCentral, alertaAccion = 'compartas el código con nadie', mostrarAlerta = true, mostrarFirma = true, avisoPie }) {
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
<body class="eo" style="margin:0;padding:0;background-color:${BLANCO};font-family:'Open Sans',Helvetica,Arial,sans-serif;">
  ${DARK_CSS}
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <table class="eo" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BLANCO};">
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
              ${mostrarFirma ? `<p style="margin:32px 0 0;font-size:14px;color:${NEGRO};line-height:1.65;">Un saludo,<br><strong style="color:${NEGRO};">El equipo de la Calculadora de Reúso</strong></p>` : ''}
              ${mostrarAlerta ? ALERTA(alertaAccion) : ''}
            </td>
          </tr>
          <tr>
            <td class="ef" style="background-color:#F5F5F5;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              ${avisoPie ?? `<p style="margin:0 0 10px;font-size:11px;color:${NEGRO};line-height:1.7;">Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso. No tiene fines promocionales ni de marketing, por eso no incluye un enlace para darte de baja. Lo recibirás aunque hayas cancelado tu suscripción a correos de marketing.</p>`}
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

const APP_URL = 'https://reuso.lurdes.co'
const link = `${APP_URL}/invitacion/TOKEN-EJEMPLO-123`

const boton = (url, texto) => `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center">
      <a class="eb" href="${url}" style="display:inline-block;background-color:${BRAND};color:${BLANCO};text-decoration:none;padding:16px 44px;border-radius:100px;font-size:16px;font-weight:700;letter-spacing:-0.2px;">
        ${texto}
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top:12px;">
      <p style="margin:0;font-size:12px;color:${NEGRO};">O copia este enlace en tu navegador:<br>
        <a href="${url}" style="color:${BRAND};word-break:break-all;font-size:11px;">${url}</a>
      </p>
    </td>
  </tr>
</table>`

const templates = {
  '1-invitacion-con-codigo': emailPlantilla({
    preheader: 'Empresa Ejemplo te invitó a medir su impacto ambiental',
    subtituloHeader: 'Invitación de equipo',
    saludo: '¡Hola, María! 👋',
    cuerpo: `<strong>Empresa Ejemplo S.A.S.</strong> te invitó a unirte a su equipo en la Calculadora de Reúso.`,
    contenidoCentral: boton(link, 'Aceptar invitación') + `
<table class="ek" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;">
  <tr>
    <td style="background-color:#F0F7F6;border-radius:12px;padding:16px 20px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;color:${NEGRO};font-weight:600;">¿Prefieres registrarte con código?</p>
      <span style="font-size:24px;font-weight:800;color:${BRAND};letter-spacing:0.15em;">EJMP-2025</span>
      <p style="margin:6px 0 0;font-size:11px;color:${NEGRO};">Úsalo en <a href="${APP_URL}/registro" style="color:${BRAND};">${APP_URL}/registro</a></p>
    </td>
  </tr>
</table>
<p style="margin:20px 0 0;font-size:13px;color:${NEGRO};line-height:1.6;">
  <strong>Recuerda:</strong> Este enlace expira en <strong>7 días</strong>.
</p>`,
    alertaAccion: 'aceptes la invitación',
    mostrarAlerta: true,
  }),

  '2-invitacion-sin-codigo': emailPlantilla({
    preheader: 'Empresa Ejemplo te invitó a medir su impacto ambiental',
    subtituloHeader: 'Invitación de equipo',
    saludo: '¡Hola! 👋',
    cuerpo: `<strong>Empresa Ejemplo S.A.S.</strong> te invitó a unirte a su equipo en la Calculadora de Reúso.`,
    contenidoCentral: boton(link, 'Aceptar invitación') + `
<p style="margin:20px 0 0;font-size:13px;color:${NEGRO};line-height:1.6;">
  <strong>Recuerda:</strong> Este enlace expira en <strong>7 días</strong>.
</p>`,
    alertaAccion: 'aceptes la invitación',
    mostrarAlerta: true,
  }),

  '3-notificacion-ticket': emailPlantilla({
    preheader: 'Nuevo ticket de soporte: Error al generar certificado',
    subtituloHeader: 'Nuevo ticket de soporte',
    saludo: '📬 Alguien necesita ayuda',
    cuerpo: 'Llegó un mensaje desde el formulario de soporte. Aquí están los detalles:',
    contenidoCentral: `
<table class="et" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background-color:#F0F7F6;border-radius:10px;padding:16px 20px;">
  <tr>
    <td style="padding:5px 0;font-weight:700;color:${NEGRO};width:90px;vertical-align:top;font-size:13px;">Usuario</td>
    <td style="padding:5px 0;color:${NEGRO};font-size:13px;">María García</td>
  </tr>
  <tr>
    <td style="padding:5px 0;font-weight:700;color:${NEGRO};width:90px;vertical-align:top;font-size:13px;">Correo</td>
    <td style="padding:5px 0;color:${NEGRO};font-size:13px;"><a href="mailto:maria@empresa.com" style="color:${BRAND};">maria@empresa.com</a></td>
  </tr>
  <tr>
    <td style="padding:5px 0;font-weight:700;color:${NEGRO};width:90px;vertical-align:top;font-size:13px;">Categoría</td>
    <td style="padding:5px 0;color:${NEGRO};font-size:13px;">Error técnico</td>
  </tr>
</table>
<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${NEGRO};">Mensaje:</p>
<p style="margin:0;font-size:14px;color:${NEGRO};line-height:1.75;">Al intentar generar el certificado me aparece un error 500.</p>`,
    mostrarAlerta: false,
  }),

  // ── Ejemplo de correo de marketing ──────────────────────────────────────────
  '4-promo-relampago': emailPlantilla({
    preheader: '50% de descuento hoy. Solo 24 horas para activar Impulso Sostenible.',
    subtituloHeader: 'Oferta exclusiva para ti',
    saludo: '¡Hola, María! 👋',
    cuerpo: 'Mañana pagan el precio completo. Hoy tú no.',
    avisoPie: `<p style="margin:0 0 10px;font-size:11px;color:${NEGRO};line-height:1.7;">Para dejar de recibir estos correos, <a href="https://reuso.lurdes.co/unsubscribe?token=EJEMPLO" style="color:${NEGRO};text-decoration:underline;">cancela tu suscripción</a>.</p>`,
    mostrarAlerta: false,
    mostrarFirma: false,
    contenidoCentral: `

<!-- HERO — bloque de imagen estilizada -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;border-radius:16px;overflow:hidden;">
  <tr>
    <td class="epromo-bg" style="background:linear-gradient(135deg,#004D49 0%,#00827C 55%,#006B66 100%);padding:36px 32px 32px;text-align:center;border-radius:16px;">

      <!-- Badge relámpago -->
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px;">
        <tr>
          <td class="epbd" style="background-color:#D6F391;border-radius:100px;padding:6px 18px;">
            <span class="epbw" style="font-size:13px;font-weight:800;color:#474747;letter-spacing:0.04em;">⚡ Promo Relámpago</span>
          </td>
        </tr>
      </table>

      <!-- Número grande -->
      <p style="margin:0;font-size:88px;font-weight:800;color:#D6F391;line-height:1;letter-spacing:-4px;">50<span style="font-size:52px;vertical-align:super;letter-spacing:-1px;">%</span></p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">en Impulso Sostenible</p>

    </td>
  </tr>
</table>

<!-- QUÉ INCLUYE -->
<p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#474747;">Con Impulso Sostenible obtienes:</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
  <tr>
    <td class="ediv" style="padding:10px 0;border-bottom:1px solid rgba(0,130,124,0.15);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="32" style="vertical-align:top;padding-top:1px;">
            <span class="epi" style="display:inline-block;width:24px;height:24px;background-color:#D6F391;border-radius:50%;text-align:center;line-height:24px;font-size:13px;">✓</span>
          </td>
          <td>
            <p style="margin:0;font-size:14px;font-weight:700;color:#474747;">200 cálculos CO₂ por mes</p>
            <p style="margin:2px 0 0;font-size:13px;color:rgba(71,71,71,0.65);line-height:1.5;">Registra todo el reúso de tu empresa sin límite mensual práctico.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td class="ediv" style="padding:10px 0;border-bottom:1px solid rgba(0,130,124,0.15);">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="32" style="vertical-align:top;padding-top:1px;">
            <span class="epi" style="display:inline-block;width:24px;height:24px;background-color:#D6F391;border-radius:50%;text-align:center;line-height:24px;font-size:13px;">✓</span>
          </td>
          <td>
            <p style="margin:0;font-size:14px;font-weight:700;color:#474747;">Cotizador inteligente con IA</p>
            <p style="margin:2px 0 0;font-size:13px;color:rgba(71,71,71,0.65);line-height:1.5;">Diagnostica muebles con foto y genera propuestas de reúso en segundos.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:10px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="32" style="vertical-align:top;padding-top:1px;">
            <span class="epi" style="display:inline-block;width:24px;height:24px;background-color:#D6F391;border-radius:50%;text-align:center;line-height:24px;font-size:13px;">✓</span>
          </td>
          <td>
            <p style="margin:0;font-size:14px;font-weight:700;color:#474747;">Hasta 10 personas en tu equipo</p>
            <p style="margin:2px 0 0;font-size:13px;color:rgba(71,71,71,0.65);line-height:1.5;">Invita a tu equipo y centraliza el registro de impacto desde un solo lugar.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- PRECIO -->
<table class="ep" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;background-color:#F0F7F6;border-radius:16px;">
  <tr>
    <td style="padding:20px 24px;text-align:center;">
      <p class="ep-tachado" style="margin:0 0 2px;font-size:13px;color:rgba(71,71,71,0.55);">Precio habitual</p>
      <p class="ep-tachado" style="margin:0 0 10px;font-size:20px;font-weight:700;color:rgba(71,71,71,0.35);text-decoration:line-through;">$199.000 / mes</p>
      <p class="ep-precio" style="margin:0 0 2px;font-size:13px;font-weight:700;color:#00827C;">Precio de hoy</p>
      <p class="ep-precio" style="margin:0;font-size:40px;font-weight:800;color:#00827C;letter-spacing:-1px;">$99.500<span class="ep-mes" style="font-size:16px;font-weight:600;"> / mes</span></p>
    </td>
  </tr>
</table>

<!-- CTA -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
  <tr>
    <td align="center">
      <a class="eb" href="https://reuso.lurdes.co/planes" style="display:inline-block;background-color:#00827C;color:#ffffff;text-decoration:none;padding:18px 52px;border-radius:100px;font-size:17px;font-weight:800;letter-spacing:-0.3px;">
        Activar ahora con 50% off
      </a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:12px;color:rgba(71,71,71,0.5);text-align:center;">El descuento se aplica automáticamente. No necesitas código.</p>

`,
  }),
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
    span.epi { color: #474747 !important; }
    .ediv { border-color: rgba(214,243,145,0.35) !important; }
    .epromo-bg { background: #D6F391 !important; }
    .epromo-bg p, .epromo-bg span { color: #474747 !important; }
    span.epbw { color: #ffffff !important; }
    .epbd { background-color: #474747 !important; }
    span.ep-mes { color: #D6F391 !important; }
    .ef { background-color: #474747 !important; border-top: 1px solid rgba(255,255,255,0.08) !important; }
    .ef p, .ef a { color: #E0E0E0 !important; }
    .ea td { background-color: rgba(246,191,62,0.10) !important; }
    .ea p { color: #F6BF3E !important; }
    .ek td { background-color: rgba(214,243,145,0.10) !important; }
    .ek span { color: #D6F391 !important; }
    .ek p { color: #E0E0E0 !important; }
    .et { background-color: rgba(214,243,145,0.08) !important; }
    .et td { color: #E0E0E0 !important; }
    .ep { background-color: rgba(255,255,255,0.07) !important; }
    .ep p { color: #E0E0E0 !important; }
    .ep .ep-tachado { color: rgba(224,224,224,0.45) !important; }
    .ep .ep-precio { color: #D6F391 !important; }
  </style>`

const outDir = path.join(__dirname, '../.email-previews')
fs.mkdirSync(outDir, { recursive: true })

const diaFiles = []
const nocheFiles = []

for (const [name, html] of Object.entries(templates)) {
  // Modo día — elimina el <style> oscuro para siempre mostrar claro
  const htmlDia = html.replace(DARK_CSS, '')
  const fileDia = path.join(outDir, `${name}-dia.html`)
  fs.writeFileSync(fileDia, htmlDia)
  diaFiles.push(fileDia)

  // Modo noche — reemplaza el <style> por versión forzada (sin media query)
  const htmlNoche = html.replace(DARK_CSS, DARK_FORCED)
  const fileNoche = path.join(outDir, `${name}-noche.html`)
  fs.writeFileSync(fileNoche, htmlNoche)
  nocheFiles.push(fileNoche)

  // Full — HTML original con @media CSS para enviar via Resend
  const fileFull = path.join(outDir, `${name}-full.html`)
  fs.writeFileSync(fileFull, html)

  console.log(`✓ ${name}`)
}

// Abrir primero todos los de día, luego todos los de noche
for (const f of diaFiles) execSync(`open "${f}"`)
for (const f of nocheFiles) execSync(`open "${f}"`)

