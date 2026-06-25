/**
 * Script de prueba — envía el correo de promo relámpago via Resend.
 * Uso: node --env-file=.env.local scripts/send-promo-test.mjs
 */
import { Resend } from 'resend'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Calculadora de Reúso <noreply@reuso.lurdes.co>'
const DESTINATARIOS = ['luisfe.merino@gmail.com', 'merinop@me.com']
const ASUNTO = 'Hoy es tu día: 50% en Impulso Sostenible'

const htmlPath = path.join(__dirname, '../.email-previews/4-promo-relampago-full.html')
const html = fs.readFileSync(htmlPath, 'utf-8')

for (const to of DESTINATARIOS) {
  const { data, error } = await resend.emails.send({ from: FROM, to, subject: ASUNTO, html })
  if (error) {
    console.error(`✗ Error al enviar a ${to}:`, error.message)
  } else {
    console.log(`✓ Enviado a ${to} (id: ${data.id})`)
  }
}
