import { Resend } from 'resend'

// ── Plantilla base — igual para todos los correos ────────────────────────────
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
      <td style="padding:8px 0;font-weight:700;color:#333;width:110px;vertical-align:top;">${f.label}</td>
      <td style="padding:8px 0;color:#333;">${f.valor}</td>
    </tr>`
  ).join('')

  return `
    <div style="font-family:'Open Sans',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
      <div style="text-align:center;margin-bottom:28px;">
        <h1 style="color:#00827C;font-size:24px;margin:0;font-weight:700;">Calculadora de Reúso</h1>
        <p style="color:#888;font-size:12px;margin:6px 0 0;">${subtitulo}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        ${filasHtml}
      </table>

      <div style="background:#f6faf9;border-left:3px solid #00827C;padding:16px 20px;border-radius:0 6px 6px 0;font-size:14px;color:#333;line-height:1.6;">
        ${descripcion}
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;">
      <p style="color:#aaa;font-size:11px;text-align:center;margin:0;">© Grupo MLP S.A.S.</p>
    </div>
  `
}

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
    subject: `${empresaNombre} te invitó a unirse a Calculadora de Reúso`,
    html: emailBase({
      subtitulo: 'Invitación al equipo',
      filas: [
        { label: 'Empresa', valor: empresaNombre },
        { label: 'Enlace', valor: `<a href="${link}" style="color:#00827C;">${link}</a>` },
      ],
      descripcion: `Haz clic en el enlace para crear tu cuenta y unirte al equipo. Expira en 7 días.`,
    }),
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
    subject: `Nuevo ticket recibido ${datos.categoria}`,
    html: emailBase({
      subtitulo: 'Nuevo ticket de soporte',
      filas: [
        { label: 'Usuario',   valor: datos.nombre ?? 'Desconocido' },
        { label: 'Correo',    valor: datos.email ? `<a href="mailto:${datos.email}" style="color:#00827C;">${datos.email}</a>` : '-' },
        { label: 'Categoría', valor: datos.categoria },
      ],
      descripcion: datos.mensaje.replace(/\n/g, '<br>'),
    }),
  })
}
