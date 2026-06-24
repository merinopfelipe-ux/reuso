import { Resend } from 'resend'

// ── Dark mode - espejo fiel de globals.css [data-theme="dark"] ───────────────
// --bg-primary:#474747  --bg-card:#525252  --text-primary:#FFFFFF
// --text-secondary:#E0E0E0  --border:rgba(255,255,255,0.08)
// --color-brand:#D6F391  --color-warning-content:#F6BF3E
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
    /* Apple Mail, Outlook iOS, Samsung Mail */
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
    /* Gmail (web, Android, iOS) — data-ogsc */
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
    /* Outlook.com web — data-ogsb */
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

// ── Bloque de alerta de seguridad ────────────────────────────────────────────
const ALERTA_SEGURIDAD = (accion: string) => `
<table class="ea" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
  <tr>
    <td style="background-color:#FFF8E6;border-radius:12px;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#474747;">🔔 ¿No lo pediste tú?</p>
      <p style="margin:0;font-size:13px;color:#474747;line-height:1.65;">
        Tranquilo, tu cuenta está segura.${accion ? ` Nadie puede usarla sin que tú lo hagas.` : ''} Solo ignora este correo${accion ? ` y no ${accion}` : ''}.
      </p>
    </td>
  </tr>
</table>`

// ── Plantilla base ────────────────────────────────────────────────────────────
function emailPlantilla({
  preheader,
  subtituloHeader,
  saludo,
  cuerpo,
  contenidoCentral,
  alertaAccion = 'compartas el código con nadie',
  mostrarAlerta = true,
}: {
  preheader: string
  subtituloHeader: string
  saludo: string
  cuerpo: string
  contenidoCentral: string
  alertaAccion?: string
  mostrarAlerta?: boolean
}): string {
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
  ${DARK_MODE_CSS}
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>

  <table class="eo" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px 48px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">

          <!-- Cabecera - día: #00827C / noche: #D6F391 con texto #474747 -->
          <tr>
            <td class="eh" style="background-color:#00827C;border-radius:16px 16px 0 0;padding:28px 40px 24px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Calculadora de Reúso</p>
              <p style="margin:6px 0 0;font-size:14px;font-weight:600;color:rgba(255,255,255,0.75);">${subtituloHeader}</p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td class="ec" style="background-color:#ffffff;padding:36px 40px 40px;">

              <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#474747;line-height:1.3;">${saludo}</p>
              ${cuerpo ? `<p style="margin:0 0 28px;font-size:15px;color:#474747;line-height:1.75;">${cuerpo}</p>` : ''}

              ${contenidoCentral}

              <p style="margin:32px 0 0;font-size:14px;color:#474747;line-height:1.65;">
                Un saludo,<br>
                <strong style="color:#474747;">El equipo de la Calculadora de Reúso</strong>
              </p>

              ${mostrarAlerta ? ALERTA_SEGURIDAD(alertaAccion) : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="ef" style="background-color:#F5F5F5;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 10px;font-size:11px;color:#474747;line-height:1.7;">
                Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso. No tiene fines promocionales ni de marketing, por eso no incluye un enlace para darte de baja. Lo recibirás aunque hayas cancelado tu suscripción a correos de marketing.
              </p>
              <p style="margin:0;font-size:11px;color:#474747;line-height:1.7;">
                © ${year} Grupo MLP S.A.S. · Todos los derechos reservados.<br>
                <a href="https://reuso.lurdes.co" style="color:#474747;text-decoration:underline;">reuso.lurdes.co</a>
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

// ── Compatibilidad hacia atrás ────────────────────────────────────────────────
export function emailBase({
  subtitulo,
  filas,
  descripcion,
}: {
  subtitulo: string
  filas: { label: string; valor: string }[]
  descripcion: string
}): string {
  const filasHtml = filas.map(f =>
    `<tr>
      <td style="padding:5px 0;font-weight:700;color:#474747;width:100px;vertical-align:top;font-size:13px;">${f.label}</td>
      <td style="padding:5px 0;color:#474747;font-size:13px;">${f.valor}</td>
    </tr>`
  ).join('')

  const contenidoCentral = `
<table class="et" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
  ${filasHtml}
</table>
<p style="margin:0;font-size:14px;color:#474747;line-height:1.75;">${descripcion}</p>`

  return emailPlantilla({
    preheader: subtitulo,
    subtituloHeader: subtitulo,
    saludo: subtitulo,
    cuerpo: '',
    contenidoCentral,
    mostrarAlerta: false,
  })
}

// ── Correo de invitación de empresa ──────────────────────────────────────────
export async function enviarInvitacion(
  to: string,
  rawToken: string,
  empresaNombre: string,
  codigoEmpresa?: string | null,
  nombreDestinatario?: string | null,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM_INVITACIONES ?? 'Calculadora de Reúso <invitaciones@reuso.lurdes.co>'
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reuso.lurdes.co'
  const link = `${APP_URL}/invitacion/${rawToken}`

  const saludoPersonal = nombreDestinatario
    ? `¡Hola, ${nombreDestinatario}! 👋`
    : '¡Hola! 👋'

  const boton = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td align="center">
      <a class="eb" href="${link}" style="display:inline-block;background-color:#00827C;color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:100px;font-size:16px;font-weight:700;letter-spacing:-0.2px;">
        Aceptar invitación
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top:12px;">
      <p style="margin:0;font-size:12px;color:#474747;">O copia este enlace en tu navegador:<br>
        <a href="${link}" style="color:#00827C;word-break:break-all;font-size:11px;">${link}</a>
      </p>
    </td>
  </tr>
</table>`

  const bloqueExpiracion = `
<p style="margin:20px 0 0;font-size:13px;color:#474747;line-height:1.6;">
  <strong>Recuerda:</strong> Este enlace expira en <strong>7 días</strong>.
  Si no alcanzas a usarlo, pídele a tu administrador que genere uno nuevo.
</p>`

  const bloqueCodigoOpcional = codigoEmpresa
    ? `<table class="ek" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;">
        <tr>
          <td style="background-color:#F0F7F6;border-radius:12px;padding:16px 20px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#474747;font-weight:600;">¿Prefieres registrarte con código?</p>
            <span style="font-size:24px;font-weight:800;color:#00827C;letter-spacing:0.15em;">${codigoEmpresa}</span>
            <p style="margin:6px 0 0;font-size:11px;color:#474747;">Úsalo en <a href="${APP_URL}/registro" style="color:#00827C;">${APP_URL}/registro</a></p>
          </td>
        </tr>
      </table>`
    : ''

  const contenidoCentral = boton + bloqueCodigoOpcional + bloqueExpiracion

  const html = emailPlantilla({
    preheader: `${empresaNombre} te invitó a medir su impacto ambiental. Acepta y empieza hoy`,
    subtituloHeader: 'Invitación de equipo',
    saludo: saludoPersonal,
    cuerpo: `<strong>${empresaNombre}</strong> te invitó a unirte a su equipo en la Calculadora de Reúso. Acepta la invitación y empieza a registrar el impacto ambiental de tu organización.`,
    contenidoCentral,
    alertaAccion: 'aceptes la invitación',
    mostrarAlerta: true,
  })

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${empresaNombre} te invitó a la Calculadora de Reúso`,
    html,
  })
}

// ── Notificación de ticket de soporte ────────────────────────────────────────
export async function enviarNotificacionTicket(
  destinatarios: string[],
  datos: { nombre?: string | null; email?: string | null; categoria: string; mensaje: string }
): Promise<void> {
  if (!process.env.RESEND_API_KEY || destinatarios.length === 0) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@reuso.lurdes.co>'

  const filasInfo = [
    { label: 'Usuario',   valor: datos.nombre ?? 'Sin nombre' },
    { label: 'Correo',    valor: datos.email ? `<a href="mailto:${datos.email}" style="color:#00827C;">${datos.email}</a>` : 'No indicado' },
    { label: 'Categoría', valor: datos.categoria },
  ].map(f =>
    `<tr>
      <td style="padding:5px 0;font-weight:700;color:#474747;width:90px;vertical-align:top;font-size:13px;">${f.label}</td>
      <td style="padding:5px 0;color:#474747;font-size:13px;">${f.valor}</td>
    </tr>`
  ).join('')

  const contenidoCentral = `
<table class="et" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background-color:#F0F7F6;border-radius:10px;padding:16px 20px;">
  ${filasInfo}
</table>
<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#474747;">Mensaje:</p>
<p style="margin:0;font-size:14px;color:#474747;line-height:1.75;white-space:pre-wrap;">${datos.mensaje}</p>`

  const html = emailPlantilla({
    preheader: `Nuevo ticket. ${datos.categoria}. Responde desde el panel admin`,
    subtituloHeader: 'Nuevo ticket de soporte',
    saludo: '📬 Alguien necesita ayuda',
    cuerpo: 'Llegó un mensaje desde el formulario de soporte. Aquí están los detalles:',
    contenidoCentral,
    mostrarAlerta: false,
  })

  await resend.emails.send({
    from: FROM,
    to: destinatarios,
    subject: `Nuevo ticket de soporte. ${datos.categoria}`,
    html,
  })
}
