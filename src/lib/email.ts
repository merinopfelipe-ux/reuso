import { Resend } from 'resend'
import { formatCodigoCotizacion } from '@/lib/cotizador/format-codigo'
import { primerNombre } from '@/lib/eventos'

// ── Tokens Calculadora de Reúso ────────────────────────────────────────────────────
const COLOR_NEGRO = '#111111'         // Títulos principales
const COLOR_LURDES = '#474747'        // Texto de párrafos y etiquetas (Negro Lurdes)
const COLOR_BRAND = '#00827C'         // Verde oficial de Calculadora de Reúso (botones, antetítulo, acentos)
const BG_PAGE = '#FFFFFF'             // Lienzo exterior blanco
const BG_MUY_AGUA = '#E6F2F0'         // Fondo "muy agua" del cajón
const BG_BOX_WHITE = '#FFFFFF'        // Fondo blanco para cajas internas destacadas (OTP, códigos)
const COLOR_TEXT_MUTED = '#6B7E7B'    // Texto secundario y enlaces del footer

// ── Dark mode - Protocolo Lurdes adaptado ───────────────────────────────────
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
    @media (prefers-color-scheme: dark) {
      body, .email-body { background-color: #2A2C2F !important; }
      .email-card { background-color: #323A38 !important; }
      .email-card p, .email-card td, .email-card span, .email-card li { color: #DADEDD !important; }
      .email-card strong, .email-card h1 { color: #F3F3F3 !important; }
      .email-eyebrow { color: #7CBAB7 !important; }
      .email-card a { color: #7CBAB7 !important; }
      .email-btn, .email-card a.email-btn { background-color: #60A09D !important; color: #FFFFFF !important; -webkit-text-fill-color: #FFFFFF !important; }
      .email-inner-box, .email-inner-box td, td.email-inner-box { background-color: #2F3433 !important; }
      td.email-card, .email-card { background-color: #323A38 !important; }
      .email-inner-box p, .email-inner-box td { color: #DADEDD !important; }
      .email-inner-box span { color: #7CBAB7 !important; }
      .email-footer p, .email-footer a { color: #8F9E9B !important; }
      .email-social-icon path { fill: #8F9E9B !important; }
    }
    [data-ogsc] body, [data-ogsc] .email-body { background-color: #2A2C2F !important; }
    [data-ogsc] .email-card { background-color: #323A38 !important; }
    [data-ogsc] .email-card p, [data-ogsc] .email-card td { color: #DADEDD !important; }
    [data-ogsc] .email-card strong, [data-ogsc] .email-card h1 { color: #F3F3F3 !important; }
    [data-ogsc] .email-inner-box, [data-ogsc] .email-inner-box td { background-color: #2F3433 !important; }
    [data-ogsc] .email-inner-box p, [data-ogsc] .email-inner-box td { color: #DADEDD !important; }
    [data-ogsc] .email-eyebrow { color: #7CBAB7 !important; }
    [data-ogsc] .email-btn, .email-card a.email-btn { background-color: #60A09D !important; color: #FFFFFF !important; -webkit-text-fill-color: #FFFFFF !important; }
    [data-ogsc] .email-footer p, [data-ogsc] .email-footer a { color: #8F9E9B !important; }
  </style>`

function escaparHtml(valor: string): string {
  return valor.replace(/[&<>'"]/g, caracter => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[caracter] ?? caracter))
}

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
  </table>`

// ── Bloque de alerta de seguridad ────────────────────────────────────────────
const ALERTA_SEGURIDAD = (accion: string) => `
<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
  <tr>
    <td style="background-color:#FFFFFF;border-radius:16px;padding:18px 22px;text-align:left;">
      <p style="margin:0 0 6px;font-size:13.5px;font-weight:700;color:${COLOR_NEGRO};text-align:left;">🔔 ¿No realizaste esta solicitud?</p>
      <p style="margin:0;font-size:13px;color:${COLOR_LURDES};line-height:1.65;text-align:left;">
        Tu cuenta está protegida.${accion ? ` Nadie puede acceder sin tu confirmación.` : ''} Puedes ignorar este correo${accion ? ` y no ${accion}` : ''}.
      </p>
    </td>
  </tr>
</table>`

// ── Plantilla base del sistema de correos ─────────────────────────────────────
function emailPlantilla({
  preheader,
  subtituloHeader,
  saludo,
  cuerpo,
  contenidoCentral = '',
  alertaAccion = 'compartas el código con nadie',
  mostrarAlerta = true,
  mostrarFirma = true,
  avisoPie,
}: {
  preheader: string
  subtituloHeader?: string
  saludo: string
  cuerpo?: string
  contenidoCentral?: string
  alertaAccion?: string
  mostrarAlerta?: boolean
  mostrarFirma?: boolean
  avisoPie?: string
}): string {
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
              <p class="email-eyebrow" style="margin:0 0 14px;font-size:13px;font-weight:700;color:${COLOR_BRAND};letter-spacing:0.02em;text-align:left;font-family:'Open Sans',-apple-system,sans-serif;">
                ${subtituloHeader}
              </p>` : ''}

              <!-- Título principal en Negro (#111111) a la izquierda -->
              <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:${COLOR_NEGRO};line-height:1.25;letter-spacing:-0.5px;text-align:left;">
                ${saludo}
              </h1>

              <!-- Párrafo introductorio a la izquierda en Negro Lurdes (#474747) -->
              ${cuerpo ? `<p style="margin:0 0 20px;font-size:15px;color:${COLOR_LURDES};line-height:1.75;text-align:left;">${cuerpo}</p>` : ''}

              <!-- Contenido central (cajas de código, OTP o detalles) -->
              ${contenidoCentral}

              <!-- Firma a la izquierda -->
              ${mostrarFirma ? `
              <div style="margin-top:28px;">
                <p style="margin:0;font-size:14px;color:${COLOR_LURDES};line-height:1.65;text-align:left;">
                  Un saludo,<br>
                  <strong style="color:${COLOR_NEGRO};">El equipo de la Calculadora de Reúso</strong>
                </p>
              </div>` : ''}

              <!-- Alerta de seguridad opcional -->
              ${mostrarAlerta ? ALERTA_SEGURIDAD(alertaAccion) : ''}

            </td>
          </tr>

          <!-- ── DEBAJO DEL CAJÓN: TODO BIEN CENTRADO ── -->
          <tr>
            <td class="email-footer" align="center" style="padding:32px 16px 0;text-align:center;">

              <!-- Texto explicativo de destinatario centrado -->
              ${avisoPie
                ? (avisoPie.startsWith('<p')
                    ? avisoPie
                    : `<p style="margin:0 auto 14px;font-size:11.5px;color:${COLOR_TEXT_MUTED};line-height:1.65;max-width:440px;text-align:center;">${avisoPie}</p>`)
                : `<p style="margin:0 auto 14px;font-size:11.5px;color:${COLOR_TEXT_MUTED};line-height:1.65;max-width:440px;text-align:center;">
                    Recibiste este correo porque tienes una cuenta en la Calculadora de Reúso. No tiene fines promocionales ni de marketing.
                  </p>`}

              <!-- Enlaces legales centrados (sin cancelar suscripción para transaccionales) -->
              <p style="margin:0 auto 14px;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">
                <a href="https://calculadoradereuso.com/legal/terminos" style="color:${COLOR_TEXT_MUTED};text-decoration:none;">Términos</a>
                &nbsp;&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;&nbsp;
                <a href="https://calculadoradereuso.com/legal/privacidad" style="color:${COLOR_TEXT_MUTED};text-decoration:none;">Privacidad</a>
              </p>

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

// ── Botón CTA Centrado ───────────────────────────────────────────────────────
function botonCorreo(href: string, texto: string, subtexto?: string): string {
  return `
<table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 12px;">
  <tr>
    <td align="center">
      <a class="email-btn" href="${href}" style="display:inline-block;background-color:${COLOR_BRAND};color:#ffffff;text-decoration:none;padding:15px 42px;border-radius:100px;font-size:15px;font-weight:700;letter-spacing:-0.2px;text-align:center;">
        ${texto}
      </a>
    </td>
  </tr>
  ${subtexto ? `
  <tr>
    <td align="center" style="padding-top:10px;">
      <p style="margin:0;font-size:12px;color:${COLOR_TEXT_MUTED};text-align:center;">${subtexto}</p>
    </td>
  </tr>` : ''}
</table>`
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
      <td style="padding:6px 0;font-weight:700;color:${COLOR_NEGRO};width:100px;vertical-align:top;font-size:13px;">${f.label}</td>
      <td style="padding:6px 0;color:${COLOR_LURDES};font-size:13px;">${f.valor}</td>
    </tr>`
  ).join('')

  const contenidoCentral = `
<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background-color:${BG_BOX_WHITE};border-radius:16px;padding:18px 22px;">
  ${filasHtml}
</table>
<p style="margin:0;font-size:14px;color:${COLOR_LURDES};line-height:1.75;text-align:left;">${descripcion}</p>`

  return emailPlantilla({
    preheader: subtitulo,
    subtituloHeader: 'Notificación',
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
): Promise<{ resendEmailId: string | null }> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM_INVITACIONES ?? 'Calculadora de Reúso <invitaciones@calculadoradereuso.com>'
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://calculadoradereuso.com'
  const link = `${APP_URL}/invitacion/${rawToken}`

  const saludoPersonal = nombreDestinatario
    ? `¡Hola, ${nombreDestinatario}!`
    : '¡Hola!'

  const boton = botonCorreo(link, 'Aceptar invitación', `O copia este enlace: ${link}`)

  const bloqueCodigoOpcional = codigoEmpresa
    ? `<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 16px;max-width:400px;">
        <tr>
          <td style="background-color:${BG_BOX_WHITE};border-radius:18px;padding:22px 24px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12.5px;color:${COLOR_LURDES};font-weight:600;text-align:center;">¿Prefieres registrarte con código?</p>
            <span style="display:inline-block;font-size:26px;font-weight:800;color:${COLOR_BRAND};letter-spacing:0.14em;font-family:'Open Sans',-apple-system,sans-serif;text-align:center;">${codigoEmpresa}</span>
            <p style="margin:8px 0 0;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">Úsalo en <a href="${APP_URL}/registro" style="color:${COLOR_BRAND};text-decoration:none;font-weight:600;">${APP_URL}/registro</a></p>
          </td>
        </tr>
      </table>`
    : ''

  const bloqueExpiracion = `
<p style="margin:20px 0 0;font-size:12.5px;color:${COLOR_TEXT_MUTED};line-height:1.6;text-align:left;">
  Recuerda que este enlace expira en <strong>7 días</strong>. Si no alcanzas a usarlo, pídele a tu administrador que genere uno nuevo.
</p>`

  const contenidoCentral = boton + bloqueCodigoOpcional + bloqueExpiracion

  const html = emailPlantilla({
    preheader: `${empresaNombre} te invitó a medir su impacto ambiental. Acepta y empieza hoy.`,
    subtituloHeader: 'Invitación de equipo',
    saludo: saludoPersonal,
    cuerpo: `<strong>${empresaNombre}</strong> te invitó a unirte a su equipo en la Calculadora de Reúso. Al aceptar, podrás colaborar en el registro de inventario, certificar el ahorro de CO₂ y gestionar el impacto ambiental de tu organización.`,
    contenidoCentral,
    alertaAccion: 'aceptes la invitación',
    mostrarAlerta: true,
  })

  const { data } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${empresaNombre} te invitó a la Calculadora de Reúso`,
    html,
    replyTo: 'innovacion@lurdes.co',
  })

  return { resendEmailId: data?.id ?? null }
}

const PLAN_LABELS_EMAIL: Record<string, string> = {
  lab: 'Circular Lab',
  impulso: 'Impulso Sostenible',
  ilimitado: 'Impacto Ilimitado',
}

export async function enviarInvitacionEmpresaAbierta(
  to: string,
  rawToken: string,
  plan: 'lab' | 'impulso' | 'ilimitado',
): Promise<{ resendEmailId: string | null }> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM_INVITACIONES ?? 'Calculadora de Reúso <invitaciones@calculadoradereuso.com>'
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://calculadoradereuso.com'
  const link = `${APP_URL}/invitacion/${rawToken}`
  const planLabel = PLAN_LABELS_EMAIL[plan] ?? plan

  const boton = botonCorreo(link, 'Activar mi cuenta', `O copia este enlace: ${link}`)

  const bloqueExpiracion = `
<p style="margin:20px 0 0;font-size:12.5px;color:${COLOR_TEXT_MUTED};line-height:1.6;text-align:left;">
  Recuerda que este enlace expira en <strong>7 días</strong>. Si no alcanzas a usarlo, pídele a tu contacto en la Calculadora de Reúso que genere uno nuevo.
</p>`

  const html = emailPlantilla({
    preheader: `Activa tu cuenta en el plan ${planLabel} y registra el impacto de tu empresa.`,
    subtituloHeader: 'Bienvenido a la Calculadora de Reúso',
    saludo: '¡Hola!',
    cuerpo: `Te dimos acceso al plan <strong>${planLabel}</strong> en la Calculadora de Reúso. Activa tu cuenta, crea tu empresa y empieza a registrar el impacto ambiental de tu organización.`,
    contenidoCentral: boton + bloqueExpiracion,
    alertaAccion: 'actives tu cuenta',
    mostrarAlerta: true,
  })

  const { data } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Activa tu cuenta en la Calculadora de Reúso (plan ${planLabel})`,
    html,
    replyTo: 'innovacion@lurdes.co',
  })

  return { resendEmailId: data?.id ?? null }
}

// ── Notificación de ticket de soporte ────────────────────────────────────────
export async function enviarNotificacionTicket(
  destinatarios: string[],
  datos: { nombre?: string | null; email?: string | null; categoria: string; mensaje: string; numeroCaso?: string }
): Promise<void> {
  if (process.env.SKIP_TEST_EMAILS === 'true') return
  if (!process.env.RESEND_API_KEY || destinatarios.length === 0) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@calculadoradereuso.com>'

  const filasInfo = [
    ...(datos.numeroCaso ? [{ label: 'Caso', valor: `<strong style="color:${COLOR_BRAND};font-size:14px;">${datos.numeroCaso}</strong>` }] : []),
    { label: 'Usuario',   valor: datos.nombre ?? 'Sin nombre' },
    { label: 'Correo',    valor: datos.email ? `<a href="mailto:${datos.email}" style="color:${COLOR_BRAND};text-decoration:none;font-weight:600;">${datos.email}</a>` : 'No indicado' },
    { label: 'Categoría', valor: datos.categoria },
  ].map(f =>
    `<tr>
      <td style="padding:6px 0;font-weight:700;color:${COLOR_NEGRO};width:90px;vertical-align:top;font-size:13px;text-align:left;">${f.label}</td>
      <td style="padding:6px 0;color:${COLOR_LURDES};font-size:13px;text-align:left;">${f.valor}</td>
    </tr>`
  ).join('')

  const contenidoCentral = `
<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background-color:${BG_BOX_WHITE};border-radius:18px;padding:20px 24px;">
  ${filasInfo}
</table>
<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${COLOR_NEGRO};text-align:left;">Mensaje:</p>
<div class="email-inner-box" style="margin:0;padding:16px 20px;background-color:${BG_BOX_WHITE};border-radius:16px;font-size:13.5px;color:${COLOR_LURDES};line-height:1.7;white-space:pre-wrap;text-align:left;">${datos.mensaje}</div>`

  const casoPrefijo = datos.numeroCaso ? `[${datos.numeroCaso}] ` : ''

  const html = emailPlantilla({
    preheader: `${casoPrefijo}Nuevo ticket. ${datos.categoria}. Responde desde el panel admin.`,
    subtituloHeader: 'Ticket de soporte',
    saludo: 'Nuevo mensaje de soporte',
    cuerpo: 'Llegó un mensaje desde el formulario de soporte. Aquí están los detalles para su gestión:',
    contenidoCentral,
    mostrarAlerta: false,
  })

  await resend.emails.send({
    from: FROM,
    to: destinatarios,
    subject: `${casoPrefijo}Nuevo ticket de soporte: ${datos.categoria}`,
    html,
    replyTo: datos.email ?? 'innovacion@lurdes.co',
  })
}

// ── Confirmación de consulta legal al cliente con número de caso ─────────────
export async function enviarConfirmacionConsultaLegal(
  to: string,
  datos: {
    nombre: string
    numeroCaso: string
    tipo: string
    mensaje: string
  }
): Promise<{ resendEmailId: string | null }> {
  if (process.env.SKIP_TEST_EMAILS === 'true') return { resendEmailId: null }
  if (!process.env.RESEND_API_KEY || !to) return { resendEmailId: null }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@calculadoradereuso.com>'

  const nombreSeguro = escaparHtml(datos.nombre)
  const tipoSeguro = escaparHtml(datos.tipo)
  const mensajeSeguro = escaparHtml(datos.mensaje).replace(/\n/g, '<br/>')
  const casoSeguro = escaparHtml(datos.numeroCaso)

  const fecha = new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const contenidoCentral = `
<table class="email-inner-box" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;max-width:400px;">
  <tr>
    <td style="background-color:${BG_BOX_WHITE};border-radius:18px;padding:22px 24px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;color:${COLOR_LURDES};font-weight:600;text-align:center;">Número de caso asignado</p>
      <span style="display:inline-block;font-size:26px;font-weight:800;color:${COLOR_BRAND};letter-spacing:0.12em;font-family:'Open Sans',-apple-system,sans-serif;text-align:center;">
        ${casoSeguro}
      </span>
      <p style="margin:8px 0 0;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">Plazo estimado de respuesta: 10 a 15 días hábiles</p>
    </td>
  </tr>
</table>

<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background-color:${BG_BOX_WHITE};border-radius:18px;padding:18px 24px;">
  <tr>
    <td style="padding:6px 0;font-weight:700;color:${COLOR_NEGRO};width:100px;vertical-align:top;font-size:13px;text-align:left;">Asunto</td>
    <td style="padding:6px 0;color:${COLOR_LURDES};font-size:13px;text-align:left;">${tipoSeguro}</td>
  </tr>
  <tr>
    <td style="padding:6px 0;font-weight:700;color:${COLOR_NEGRO};width:100px;vertical-align:top;font-size:13px;text-align:left;">Fecha</td>
    <td style="padding:6px 0;color:${COLOR_LURDES};font-size:13px;text-align:left;">${fecha}</td>
  </tr>
</table>

<p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${COLOR_NEGRO};text-align:left;">Tu consulta:</p>
<div class="email-inner-box" style="margin:0;padding:16px 20px;background-color:${BG_BOX_WHITE};border-radius:16px;font-size:13px;color:${COLOR_LURDES};line-height:1.65;text-align:left;">
  ${mensajeSeguro}
</div>`

  const html = emailPlantilla({
    preheader: `Caso ${casoSeguro} registrado. Confirmación de tu consulta legal.`,
    subtituloHeader: 'Consulta legal recibida',
    saludo: `Hola ${nombreSeguro}`,
    cuerpo: `Hemos recibido tu consulta con éxito. Se ha generado un radicado oficial para el seguimiento de nuestro equipo jurídico:`,
    contenidoCentral,
    mostrarAlerta: false,
    avisoPie: `Este es un mensaje de confirmación automático. Para agregar información a tu caso, responde a este correo citando el identificador <strong>${casoSeguro}</strong>.`,
  })

  const { data } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Caso ${casoSeguro}: Confirmación de consulta legal`,
    html,
    replyTo: 'innovacion@lurdes.co',
  })

  return { resendEmailId: data?.id ?? null }
}

// ── Firmas de documentos legales (invitación cerrada, un solo uso) ──────────
export async function enviarInvitacionFirma(
  to: string,
  rawToken: string,
  nombreDestinatario: string,
  documentoLabel: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@calculadoradereuso.com>'
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://calculadoradereuso.com'
  const link = `${APP_URL}/legal/firma/${rawToken}`
  const nombreSeguro = escaparHtml(nombreDestinatario)
  const documentoSeguro = escaparHtml(documentoLabel)

  const boton = botonCorreo(link, 'Revisar y firmar', `O copia este enlace: ${link}`)

  const bloqueInformacion = `
<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background-color:${BG_BOX_WHITE};border-radius:18px;padding:18px 24px;">
  <tr><td style="padding:4px 0;font-size:13px;color:${COLOR_LURDES};text-align:left;"><strong style="color:${COLOR_NEGRO};">Documento:</strong> ${documentoSeguro}</td></tr>
  <tr><td style="padding:4px 0;font-size:13px;color:${COLOR_LURDES};text-align:left;"><strong style="color:${COLOR_NEGRO};">Vigencia:</strong> 7 días · un solo uso</td></tr>
</table>
<p style="margin:0 0 12px;font-size:14px;font-weight:700;color:${COLOR_NEGRO};text-align:left;">Pasos para completar tu firma:</p>
<ol style="margin:0;padding-left:20px;font-size:13.5px;color:${COLOR_LURDES};line-height:1.8;text-align:left;">
  <li>Lee el acuerdo completo.</li>
  <li>Confirma tus datos y dibuja tu firma.</li>
  <li>Recibe automáticamente una copia en PDF para tus registros.</li>
</ol>
<p style="margin:20px 0 0;font-size:12.5px;color:${COLOR_TEXT_MUTED};line-height:1.6;text-align:left;">
  Por seguridad, esta invitación no contiene archivos adjuntos y nunca te pediremos contraseña, códigos de acceso ni pagos.
</p>`

  const html = emailPlantilla({
    preheader: `Tienes un ${documentoLabel} pendiente de firma en la Calculadora de Reúso.`,
    subtituloHeader: 'Solicitud de firma',
    saludo: `Hola, ${nombreSeguro}`,
    cuerpo: `Tienes una invitación personal para revisar y firmar el <strong>${documentoSeguro}</strong>. El enlace te lleva directamente a calculadoradereuso.com y, al finalizar, recibirás una copia en PDF.`,
    contenidoCentral: bloqueInformacion + boton,
    alertaAccion: 'abras ni firmes el documento',
    mostrarAlerta: true,
  })

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Invitación para firmar: ${documentoLabel}`,
    html,
    replyTo: 'innovacion@lurdes.co',
  })
}

export async function enviarConfirmacionFirma(
  to: string,
  nombreDestinatario: string,
  documentoLabel: string,
  fecha: string,
  pdfBuffer: Buffer,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@calculadoradereuso.com>'

  const filas = [
    { label: 'Documento', valor: documentoLabel },
    { label: 'Nombre', valor: nombreDestinatario },
    { label: 'Fecha', valor: fecha },
  ].map(f =>
    `<tr>
      <td style="padding:6px 0;font-weight:700;color:${COLOR_NEGRO};width:100px;vertical-align:top;font-size:13px;text-align:left;">${f.label}</td>
      <td style="padding:6px 0;color:${COLOR_LURDES};font-size:13px;text-align:left;">${f.valor}</td>
    </tr>`
  ).join('')

  const contenidoCentral = `
<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background-color:${BG_BOX_WHITE};border-radius:18px;padding:18px 24px;">
  ${filas}
</table>
<p style="margin:0;font-size:13.5px;color:${COLOR_LURDES};line-height:1.7;text-align:left;">
  Adjuntamos tu copia en PDF. Puedes verificar su autenticidad en cualquier momento en <a href="https://calculadoradereuso.com/verificar" style="color:${COLOR_BRAND};text-decoration:none;font-weight:600;">calculadoradereuso.com/verificar</a>.
</p>`

  const html = emailPlantilla({
    preheader: `Tu ${documentoLabel} quedó firmado. Adjuntamos tu copia en PDF.`,
    subtituloHeader: 'Documento firmado',
    saludo: `¡Listo, ${nombreDestinatario}!`,
    cuerpo: `Firmaste tu <strong>${documentoLabel}</strong> satisfactoriamente. Guarda esta copia para tus registros.`,
    contenidoCentral,
    mostrarAlerta: false,
  })

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Tu ${documentoLabel} está firmado`,
    html,
    replyTo: 'innovacion@lurdes.co',
    attachments: [
      { filename: `${documentoLabel.toLowerCase().replace(/\s+/g, '-')}-reuso.pdf`, content: pdfBuffer },
    ],
  })
}

// ── Propuesta de cotización (Sector-agnóstica) ──────────────────────────────
export async function enviarPropuestaCotizacion(
  to: string,
  nombreCliente: string | null,
  empresaNombre: string,
  codigoCotizacion: string,
  link: string,
  pdfBuffer: Buffer,
  mensajeAsesor?: string | null,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@calculadoradereuso.com>'

  const boton = botonCorreo(link, 'Ver propuesta', `O copia este enlace: ${link}`)

  const bloqueMensaje = mensajeAsesor
    ? `<div class="email-inner-box" style="margin:0 0 20px;background-color:${BG_BOX_WHITE};border-radius:18px;padding:20px 24px;text-align:left;">
        <p style="margin:0;font-size:14px;color:${COLOR_LURDES};line-height:1.7;white-space:pre-line;text-align:left;">${mensajeAsesor}</p>
      </div>`
    : ''

  const html = emailPlantilla({
    preheader: `Tu propuesta de ${empresaNombre} ya está lista.`,
    subtituloHeader: 'Tu propuesta está lista',
    saludo: nombreCliente ? `¡Hola, ${nombreCliente}!` : '¡Hola!',
    cuerpo: `<strong>${empresaNombre}</strong> preparó tu propuesta con el código <strong>${formatCodigoCotizacion(codigoCotizacion)}</strong>. Revisa los detalles en el enlace o abre el PDF que adjuntamos a este correo.`,
    contenidoCentral: bloqueMensaje + boton,
    mostrarAlerta: false,
  })

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Tu propuesta de ${empresaNombre} ya está lista`,
    html,
    replyTo: 'innovacion@lurdes.co',
    attachments: [
      { filename: `cotizacion-${codigoCotizacion.replace(/\s+/g, '-')}.pdf`, content: pdfBuffer },
    ],
  })
}

// ── Confirmación de registro con código OTP y enlace directo ────────────────
export async function enviarConfirmacionRegistro(
  to: string,
  datos: {
    nombre?: string | null
    codigoOtp?: string | null
    enlaceConfirmacion: string
  }
): Promise<{ resendEmailId: string | null }> {
  if (process.env.SKIP_TEST_EMAILS === 'true') return { resendEmailId: null }
  if (!process.env.RESEND_API_KEY || !to) return { resendEmailId: null }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@calculadoradereuso.com>'
  const nombreSeguro = datos.nombre ? escaparHtml(datos.nombre) : ''
  const saludo = nombreSeguro ? `¡Hola, ${nombreSeguro}!` : '¡Hola!'

  const botonDirecto = botonCorreo(datos.enlaceConfirmacion, 'Activar mi cuenta', `O copia este enlace: ${datos.enlaceConfirmacion}`)

  const bloqueCodigo = datos.codigoOtp ? `
<table class="email-inner-box" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 16px;max-width:400px;">
  <tr>
    <td style="background-color:${BG_BOX_WHITE};border-radius:18px;padding:24px 20px;text-align:center;">
      <p style="margin:0 0 10px;font-size:12.5px;color:${COLOR_LURDES};font-weight:600;text-align:center;">
        ¿Prefieres ingresar el código en pantalla?
      </p>
      <span class="otp-text" style="display:inline-block;font-size:36px;font-weight:800;color:${COLOR_BRAND};letter-spacing:0.14em;font-family:'Open Sans',-apple-system,sans-serif;text-align:center;">
        <a href="#otp" style="color:inherit;text-decoration:none;">${
          datos.codigoOtp.length === 8
            ? `${datos.codigoOtp.slice(0, 4)}&thinsp;${datos.codigoOtp.slice(4)}`
            : datos.codigoOtp
        }</a>
      </span>
      <p style="margin:10px 0 0;font-size:11.5px;color:${COLOR_TEXT_MUTED};text-align:center;">Expira en 10 minutos.</p>
    </td>
  </tr>
</table>` : ''

  const contenidoCentral = botonDirecto + bloqueCodigo

  const html = emailPlantilla({
    preheader: 'Activa tu cuenta en la Calculadora de Reúso con un clic.',
    subtituloHeader: 'Confirma tu correo',
    saludo,
    cuerpo: 'Te damos la bienvenida a la <strong>Calculadora de Reúso</strong>. Para activar tu cuenta y empezar a medir tu impacto ambiental, haz clic en el botón a continuación:',
    contenidoCentral,
    alertaAccion: 'confirmes la cuenta ni compartas el enlace con nadie',
    mostrarAlerta: true,
  })

  const { data } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Activa tu cuenta en la Calculadora de Reúso',
    html,
    replyTo: 'innovacion@lurdes.co',
  })

  return { resendEmailId: data?.id ?? null }
}

// ── Página /eventos: seguimiento inmediato al lead y aviso interno ───────────
export async function enviarSeguimientoEvento(
  to: string,
  datos: { nombre: string; empresa?: string | null; evento?: string | null }
): Promise<{ resendEmailId: string | null }> {
  if (process.env.SKIP_TEST_EMAILS === 'true') return { resendEmailId: null }
  if (!process.env.RESEND_API_KEY || !to) return { resendEmailId: null }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@calculadoradereuso.com>'
  const nombreSeguro = escaparHtml(primerNombre(datos.nombre))
  const empresaSegura = datos.empresa ? escaparHtml(datos.empresa) : ''
  const evento = datos.evento ? escaparHtml(datos.evento.replace(/[\r\n]+/g, ' ').trim()) : ''

  const subtitulo = evento ? `Nos encontramos en ${evento}` : 'Quedamos en contacto'
  const preheader = evento
    ? `Nos encontramos en ${evento} y quedamos en contacto.`
    : 'Quedamos en contacto. Pronto te escribimos.'

  const textoEmpresa = empresaSegura ? ` Recibimos los datos de <strong>${empresaSegura}</strong>.` : ''
  const cuerpo = evento
    ? `Nos encontramos en <strong>${evento}</strong> y quedamos en contacto.${textoEmpresa}`
    : `Quedamos en contacto.${textoEmpresa}`

  const contenidoCentral = `
${botonCorreo('https://calculadoradereuso.com', 'Conoce la Calculadora de Reúso')}
<p style="margin:20px 0 0;font-size:14px;color:${COLOR_LURDES};line-height:1.75;text-align:left;">
  Pronto te escribiremos para mostrarte cómo medir el impacto ambiental y optimizar recursos con la Calculadora de Reúso.
</p>`

  const html = emailPlantilla({
    preheader,
    subtituloHeader: subtitulo,
    saludo: nombreSeguro ? `¡Hola, ${nombreSeguro}!` : '¡Hola!',
    cuerpo,
    contenidoCentral,
    mostrarAlerta: false,
    mostrarFirma: false,
    avisoPie: 'Recibiste este correo porque dejaste tus datos en nuestra web. Es un mensaje de seguimiento y no hace parte de una lista de correos masivos.',
  })

  const { data } = await resend.emails.send({
    from: FROM,
    to,
    subject: evento ? `Nos encontramos en ${datos.evento!.replace(/[\r\n]+/g, ' ').trim().slice(0, 80)}` : 'Quedamos en contacto',
    html,
    replyTo: 'innovacion@lurdes.co',
  })
  return { resendEmailId: data?.id ?? null }
}

// ── Aviso interno al equipo sobre nuevo lead ─────────────────────────────────
export async function enviarAvisoLeadEvento(datos: {
  nombre: string
  empresa?: string | null
  email?: string
  celular?: string
  whatsappUrl?: string
  evento?: string | null
}): Promise<{ resendEmailId: string | null }> {
  if (process.env.SKIP_TEST_EMAILS === 'true') return { resendEmailId: null }
  if (!process.env.RESEND_API_KEY) return { resendEmailId: null }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@calculadoradereuso.com>'
  const fila = (k: string, v: string) => v ? `
  <tr>
    <td style="padding:6px 0;font-weight:700;color:${COLOR_NEGRO};width:110px;vertical-align:top;font-size:13px;text-align:left;">${k}</td>
    <td style="padding:6px 0;color:${COLOR_LURDES};font-size:13px;text-align:left;">${escaparHtml(v)}</td>
  </tr>` : ''

  const contenidoCentral = `
<table class="email-inner-box" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background-color:${BG_BOX_WHITE};border-radius:18px;padding:18px 24px;">
  ${fila('Nombre', datos.nombre)}
  ${fila('Empresa', datos.empresa ?? '')}
  ${fila('Celular', datos.celular ?? '')}
  ${fila('Correo', datos.email ?? '')}
  ${fila('Evento', datos.evento ?? '')}
</table>
${datos.whatsappUrl ? botonCorreo(datos.whatsappUrl, 'Escribir por WhatsApp') : ''}`

  const cuerpo = datos.whatsappUrl
    ? `${datos.email ? 'Ya recibió un correo de seguimiento. ' : 'No dejó correo. '}Toca el botón para abrir WhatsApp con el mensaje listo.`
    : 'No dejó celular, solo correo, y ya recibió el correo de seguimiento.'

  const origen = datos.empresa ? `${datos.nombre} de ${datos.empresa}` : datos.nombre

  const html = emailPlantilla({
    preheader: `${origen} dejó sus datos en el evento.`,
    subtituloHeader: 'Nuevo contacto del evento',
    saludo: 'Nuevo contacto',
    cuerpo: `${escaparHtml(origen)} dejó sus datos en la página de eventos. ${cuerpo}`,
    contenidoCentral,
    mostrarAlerta: false,
    avisoPie: 'Aviso interno del equipo de la Calculadora de Reúso.',
  })

  const asunto = datos.empresa
    ? `Nuevo contacto del evento: ${datos.empresa.replace(/[\r\n]+/g, ' ').slice(0, 80)}`
    : `Nuevo contacto del evento: ${datos.nombre.replace(/[\r\n]+/g, ' ').slice(0, 80)}`

  const { data } = await resend.emails.send({
    from: FROM,
    to: 'innovacion@lurdes.co',
    subject: asunto,
    html,
  })
  return { resendEmailId: data?.id ?? null }
}
