import { Resend } from 'resend'

export async function enviarInvitacion(
  to: string,
  rawToken: string,
  empresaNombre: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurada')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM_INVITACIONES ?? 'Calculadora de Reúso <invitaciones@reuso.lurdes.co>'
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reuso.lurdes.co'
  const link = `${APP_URL}/invitacion/${rawToken}`

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Te invitaron a unirte a ${empresaNombre} en Calculadora de Reúso`,
    html: `
      <div style="font-family:'Open Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#00827C;font-size:26px;margin:0;font-weight:700;">Calculadora de Reúso</h1>
          <p style="color:#888;font-size:12px;margin:4px 0 0;">Certificación de Impacto Ambiental por Reúso</p>
        </div>

        <p style="color:#333;font-size:15px;line-height:1.6;margin-bottom:8px;">
          Has sido invitado a unirte a <strong style="color:#00827C;">${empresaNombre}</strong> como miembro
          de su equipo de impacto ambiental en Calculadora de Reúso.
        </p>

        <p style="color:#555;font-size:14px;line-height:1.6;">
          Juntos pueden medir, certificar y comunicar el CO₂ evitado al reutilizar objetos.
        </p>

        <div style="text-align:center;margin:32px 0;">
          <a href="${link}"
            style="display:inline-block;padding:14px 32px;background:#00827C;color:#fff;border-radius:8px;
                   text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">
            Aceptar invitación
          </a>
        </div>

        <p style="color:#888;font-size:12px;line-height:1.5;">
          O copia este enlace en tu navegador:<br>
          <a href="${link}" style="color:#00827C;word-break:break-all;">${link}</a>
        </p>

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">

        <p style="color:#aaa;font-size:11px;text-align:center;margin:0;">
          El enlace expira en 48 horas. Si no esperabas esta invitación, puedes ignorar este mensaje.<br>
          © Grupo MLP S.A.S.
        </p>
      </div>
    `,
  })
}

export async function enviarNotificacionTicket(
  destinatarios: string[],
  datos: { nombre?: string | null; email?: string | null; categoria: string; mensaje: string }
): Promise<void> {
  if (!process.env.RESEND_API_KEY || destinatarios.length === 0) return

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@reuso.lurdes.co>'

  await resend.emails.send({
    from: FROM,
    to: destinatarios,
    subject: `Nuevo ticket de ayuda — ${datos.categoria}`,
    html: `
      <div style="font-family:'Open Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#00827C;font-size:26px;margin:0;font-weight:700;">Calculadora de Reúso</h1>
          <p style="color:#888;font-size:12px;margin:4px 0 0;">Nuevo ticket de soporte</p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;margin-bottom:20px;">
          <tr><td style="padding:8px 0;font-weight:700;width:100px;">Usuario</td><td style="padding:8px 0;">${datos.nombre ?? 'Desconocido'}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;">Correo</td><td style="padding:8px 0;">${datos.email ?? '-'}</td></tr>
          <tr><td style="padding:8px 0;font-weight:700;">Categoría</td><td style="padding:8px 0;">${datos.categoria}</td></tr>
        </table>

        <div style="background:#f6faf9;border-left:3px solid #00827C;padding:16px 20px;border-radius:0 8px 8px 0;font-size:14px;color:#333;line-height:1.6;">
          ${datos.mensaje.replace(/\n/g, '<br>')}
        </div>

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#aaa;font-size:11px;text-align:center;margin:0;">© Grupo MLP S.A.S.</p>
      </div>
    `,
  })
}
