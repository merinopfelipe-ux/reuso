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
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reuso.lurdes.co'

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

// Bloque OTP — usa <a href="#otp-code"> (anchor interno al email).
// iOS no re-detecta como teléfono un número que ya está dentro de un <a>.
// El href="#otp-code" apunta a un anchor que no existe: tocar el código
// no navega a ningún lado. El usuario puede seleccionar y copiar el texto.
const bloqueOTP = (codigo) => {
  const display = codigo.length === 8
    ? `${codigo.slice(0, 4)}&thinsp;${codigo.slice(4)}`
    : codigo
  return `
<table class="ek" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td style="background-color:#F0F7F6;border-radius:16px;padding:28px 20px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#474747;font-weight:600;">Tu código de verificación</p>
      <span class="otp-text" style="display:inline-block;font-size:40px;font-weight:800;color:#00827C;letter-spacing:0.18em;">${display}</span>
      <p style="margin:12px 0 0;font-size:12px;color:#474747;">Expira en 10 minutos. No lo compartas con nadie.</p>
    </td>
  </tr>
</table>`
}

const ALERTA = (accion) => `
<table class="ea" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
  <tr>
    <td style="background-color:#FFF8E6;border-radius:12px;padding:16px 20px;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#474747;">🔔 ¿No lo pediste tú?</p>
      <p style="margin:0;font-size:13px;color:#474747;line-height:1.65;">
        Tranquilo, tu cuenta está segura. Nadie puede usarla sin que tú lo hagas. Solo ignora este correo y no ${accion}.
      </p>
    </td>
  </tr>
</table>`

function emailPlantilla({ preheader, subtituloHeader, saludo, cuerpo, contenidoCentral, alertaAccion = 'compartas el código', mostrarAlerta = true }) {
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
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
  <table class="eo" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px 48px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;">
          <tr>
            <td class="eh" style="background-color:#00827C;border-radius:16px 16px 0 0;padding:28px 40px 24px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Calculadora de Reúso</p>
              <p style="margin:6px 0 0;font-size:14px;font-weight:600;color:rgba(255,255,255,0.75);">${subtituloHeader}</p>
            </td>
          </tr>
          <tr>
            <td class="ec" style="background-color:#ffffff;padding:36px 40px 40px;">
              <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#474747;line-height:1.3;">${saludo}</p>
              ${cuerpo ? `<p style="margin:0 0 28px;font-size:15px;color:#474747;line-height:1.75;">${cuerpo}</p>` : ''}
              ${contenidoCentral}
              <p style="margin:32px 0 0;font-size:14px;color:#474747;line-height:1.65;">
                Un saludo,<br>
                <strong style="color:#474747;">El equipo de la Calculadora de Reúso</strong>
              </p>
              ${mostrarAlerta ? ALERTA(alertaAccion) : ''}
            </td>
          </tr>
          <tr>
            <td class="ef" style="background-color:#F5F5F5;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
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
const FROM = 'Calculadora de Reúso <noreply@reuso.lurdes.co>'
const FROM_INV = 'Calculadora de Reúso <invitaciones@reuso.lurdes.co>'

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
  const prev = existing?.users?.find(u => u.email === 'test-prueba-correo@reuso.lurdes.co')
  if (prev) await supabaseAdmin.auth.admin.deleteUser(prev.id)

  // Registrar nuevo usuario → Supabase dispara "Confirm signup"
  const { error } = await supabaseAnon.auth.signUp({
    email: 'test-prueba-correo@reuso.lurdes.co',
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
