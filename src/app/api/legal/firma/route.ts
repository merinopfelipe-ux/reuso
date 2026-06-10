import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { emailBase } from '@/lib/email'
import jsPDF from 'jspdf'
import crypto from 'crypto'
import { rateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { OpenSansRegularBase64, OpenSansBoldBase64 } from '@/lib/fonts/base64'

const schema = z.object({
  nombre: z.string().min(2).max(200),
  tipoIdentidad: z.string().min(2).max(100),
  numeroIdentidad: z.string().regex(/^\d+$/, { message: 'El número de identificación debe contener solo números' }).min(3).max(50),
  email: z.string().email(),
  indicativo: z.string().regex(/^\+\d{1,4}$/),
  telefono: z.string().min(5).max(20),
  firma: z.string().startsWith('data:image/'),
})

const NOMBRES_TIPO: Record<string, string> = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  TI: 'Tarjeta de identidad',
  PA: 'Pasaporte',
  NIT: 'NIT',
  RUT: 'RUT',
}

function generarPDF(data: z.infer<typeof schema>, fecha: string, ip: string, userAgent: string, verificationCode: string): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  
  // Registrar fuente Open Sans
  doc.addFileToVFS('OpenSans-Regular.ttf', OpenSansRegularBase64)
  doc.addFileToVFS('OpenSans-Bold.ttf', OpenSansBoldBase64)
  doc.addFont('OpenSans-Regular.ttf', 'Open Sans', 'normal')
  doc.addFont('OpenSans-Bold.ttf', 'Open Sans', 'bold')
  // No hay OpenSans-Italic por ahora, así que la itálica caerá a Open Sans normal o helvetica itálica.
  
  const W = 210
  const margin = 20

  // Cabecera inicial
  doc.setFillColor(0, 130, 124)
  doc.rect(0, 0, W, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('Open Sans', 'bold')
  doc.text('Calculadora de Reúso — Grupo MLP S.A.S.', margin, 12)

  // Título
  doc.setTextColor(0, 130, 124)
  doc.setFontSize(16)
  doc.setFont('Open Sans', 'bold')
  doc.text('Acuerdo de Confidencialidad', margin, 36)
  doc.setFontSize(10)
  doc.setFont('Open Sans', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Documento firmado digitalmente', margin, 43)

  // Línea separadora
  doc.setDrawColor(0, 130, 124)
  doc.setLineWidth(0.5)
  doc.line(margin, 48, W - margin, 48)

  let y = 58

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > 265) {
      doc.addPage()
      y = 28 // Margen superior en nueva página
      drawHeader()
    }
  }

  const drawHeader = () => {
    doc.setFillColor(0, 130, 124)
    doc.rect(0, 0, W, 14, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('Open Sans', 'bold')
    doc.text('Acuerdo de Confidencialidad — Calculadora de Reúso', margin, 9)
  }

  const secciones = [
    {
      titulo: 'Introducción',
      texto: 'El presente Acuerdo de Confidencialidad regula el uso de la plataforma Calculadora de Reúso (ubicada en reuso.lurdes.co), de la cual Grupo MLP S.A.S. es el legítimo propietario. Al registrarse, firmar o acceder a los servicios de la plataforma, el firmante acepta plenamente y se compromete a cumplir con la totalidad de los términos aquí expuestos. Grupo MLP S.A.S. comparte información técnica, metodológica y comercial reservada para el desarrollo de la economía circular.'
    },
    {
      titulo: 'Objeto',
      texto: 'El objeto de este acuerdo es proteger y garantizar la absoluta reserva de toda la información técnica, comercial, metodológica y de negocio (la "Información Confidencial") que Grupo MLP S.A.S. ponga a disposición del firmante en el contexto del servicio de la Calculadora de Reúso. El firmante se compromete a conservar dicha información en reserva y a no revelarla a terceros bajo ninguna circunstancia.'
    },
    {
      titulo: '1. Qué constituye Información Confidencial',
      texto: 'Reconoces y aceptas que toda la información impresa, visual, verbal o digital que te suministremos directa o indirectamente a través de la plataforma constituye información reservada y confidencial. Esto incluye:\n' +
        '• La metodología de cálculo de CO₂ equivalente evitado.\n' +
        '• Los factores de emisión de ciclo de vida (ACV) usados en los cálculos.\n' +
        '• El diseño, código fuente, algoritmos, y arquitectura de software de la plataforma.\n' +
        '• Los reportes y certificados de impacto generados.\n' +
        '• Cualquier información técnica, comercial o estratégica provista en el contexto del servicio.\n\n' +
        'Tu acceso a esta información no implica la transferencia de ningún derecho sobre ella, incluyendo derechos de propiedad intelectual, know-how o patentes. Para más detalles sobre la titularidad y licencias de uso, consulta los Términos y Condiciones de Uso (https://reuso.lurdes.co/legal/terminos).'
    },
    {
      titulo: '2. Obligaciones del Firmante',
      texto: 'Te obligas de manera irrevocable a:\n' +
        '• Proteger y mantener en estricto secreto la Información Confidencial con las medidas de precaución más rigigurosas posibles.\n' +
        '• Abstenerte de usar la Información Confidencial, en todo o en parte, sin nuestro consentimiento expreso previo y por escrito.\n' +
        '• Abstenerte de revelar, divulgar o transmitir la Información Confidencial a terceros no autorizados explícitamente.\n' +
        '• Abstenerte de copiar, reproducir, descompilar, aplicar ingeniería inversa, distribuir o elaborar resúmenes o extractos de la información sin autorización escrita.\n' +
        '• No utilizar la información para fines comerciales propios ajenos al servicio o para construir productos y servicios competidores o similares a la Calculadora de Reúso.\n' +
        '• Cumplir con las medidas de seguridad informática, análisis de tráfico y control de intrusos de la plataforma.\n\n' +
        'El tratamiento de los datos personales recolectados en el marco de estas obligaciones se rige bajo los términos de nuestra Política de Privacidad (https://reuso.lurdes.co/legal/privacidad) y nuestra Política de Cookies (https://reuso.lurdes.co/legal/cookies), que detalla el almacenamiento de cookies técnicas y de sesión.'
    },
    {
      titulo: '3. Exclusiones de Confidencialidad',
      texto: 'Las obligaciones de confidencialidad no aplicarán a información que:\n' +
        '• Sea del dominio público al momento de recibirla, o que pase a ser pública sin negligencia o incumplimiento del firmante.\n' +
        '• Haya sido desarrollada de forma autónoma e independiente por el firmante, sin aprovechamiento de la información recibida.\n' +
        '• Deba ser revelada por requerimiento de ley o autoridad competente, en cuyo caso el firmante notificará de inmediato a Grupo MLP S.A.S. antes de proceder con dicha divulgación.\n' +
        '• Haya sido revelada bajo la aprobación previa y por escrito de Grupo MLP S.A.S.'
    },
    {
      titulo: '4. Titularidad y Relación entre las Partes',
      texto: 'El firmante reconoce de manera explícita la exclusiva titularidad de Grupo MLP S.A.S. sobre toda la Información Confidencial, los desarrollos y los derechos de propiedad intelectual asociados. El acceso del firmante a los datos y la calculadora no genera ni crea ninguna relación de sociedad, agencia, joint venture, mandato ni representación comercial entre las partes.'
    },
    {
      titulo: '5. Limitaciones en el Uso de la Información',
      texto: 'Queda estrictamente prohibido utilizar la Información Confidencial para fines lucrativos propios o de terceros ajenos a la relación de servicio. El incumplimiento de este acuerdo constituye una violación del secreto comercial y de la propiedad industrial, generando responsabilidad legal y civil por daños y perjuicios.\n\n' +
        'Los certificados, estimaciones e informes generados están sujetos a las condiciones técnicas y límites de responsabilidad dispuestos en el Reglamento de Uso de la Calculadora (https://reuso.lurdes.co/legal/reglamento). Asimismo, la recolección de los datos de impacto procesados está respaldada por nuestra Política de Tratamiento de Datos Personales (https://reuso.lurdes.co/legal/datos) en cumplimiento con la Ley 1581 de 2012 (Colombia), el RGPD de la Unión Europea y la CCPA de Estados Unidos.'
    },
    {
      titulo: '6. Vigencia del Acuerdo',
      texto: 'Las obligaciones de reserva y confidencialidad establecidas en este documento tienen carácter indefinido y permanente. Permanecerán plenamente vigentes con posterioridad a la finalización de los servicios de la Calculadora de Reúso, en especial con respecto a secretos industriales y conocimientos metodológicos de Grupo MLP S.A.S.'
    },
    {
      titulo: '7. Ley Aplicable y Solución de Controversias',
      texto: 'Este acuerdo se rige en su totalidad por las leyes de la República de Colombia y la normativa de la Comunidad Andina de Naciones (CAN) sobre secretos industriales (Artículos 260 al 266 de la Decisión 486 de la Comisión de la CAN). Cualquier disputa surgida de la interpretación o ejecución de este acuerdo que no pueda conciliarse directamente, se someterá obligatoriamente al Centro de Conciliación, Arbitraje y Amigable Composición de Medellín, Colombia.'
    }
  ]

  for (const sec of secciones) {
    // Calcular altura necesaria del título
    doc.setFont('Open Sans', 'bold')
    doc.setFontSize(10)
    const titleLines = doc.splitTextToSize(sec.titulo, W - margin * 2)
    const titleHeight = titleLines.length * 5

    // Calcular altura necesaria del cuerpo
    doc.setFont('Open Sans', 'normal')
    doc.setFontSize(8.5)
    const bodyLines = doc.splitTextToSize(sec.texto, W - margin * 2)
    const bodyHeight = bodyLines.length * 4.5

    const totalSecHeight = titleHeight + bodyHeight + 8
    checkPageBreak(totalSecHeight)

    // Dibujar Título
    doc.setFont('Open Sans', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 130, 124)
    doc.text(titleLines, margin, y)
    y += titleHeight + 2

    // Dibujar Cuerpo
    doc.setFont('Open Sans', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(60, 60, 60)
    doc.text(bodyLines, margin, y)
    y += bodyHeight + 6
  }

  // Cláusula formal antes del bloque de firma
  const declarationText = `DECLARACIÓN DE ACEPTACIÓN Y CIERRE: El Firmante declara bajo la gravedad de juramento que ha leído, comprendido y aceptado en su totalidad y de manera incondicional cada una de las cláusulas del presente Acuerdo de Confidencialidad, así como las políticas y términos legales vinculados de la plataforma Calculadora de Reúso. En constancia de lo anterior, estampa su firma digital y acepta que esta firma, junto con los metadatos de validación recolectados (nombre completo, documento de identidad, correo electrónico, indicativo y teléfono, dirección IP de origen, huella digital del dispositivo y fecha y hora de registro) constituyen plena prueba de su consentimiento y compromiso legal, siendo plenamente vinculante y exigible conforme a la legislación aplicable sobre comercio electrónico y firmas digitales en la República de Colombia (Ley 527 de 1999) y a nivel internacional (normativas eIDAS de la Unión Europea y ESIGN Act de los Estados Unidos).`

  doc.setFont('Open Sans', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  const decLines = doc.splitTextToSize(declarationText, W - margin * 2)
  const decHeight = decLines.length * 4

  // Verificar si cabe el bloque de firma y declaración
  checkPageBreak(decHeight + 120)

  doc.text(decLines, margin, y)
  y += decHeight + 8

  doc.setFont('Open Sans', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 130, 124)
  doc.text('Datos del Firmante y Aceptación', margin, y)
  y += 6

  doc.setDrawColor(0, 130, 124)
  doc.setLineWidth(0.4)
  doc.line(margin, y, W - margin, y)
  y += 6

  doc.setFontSize(9)
  const campos: [string, string][] = [
    ['Nombre completo', data.nombre],
    ['Documento de identidad', `${NOMBRES_TIPO[data.tipoIdentidad] ?? data.tipoIdentidad} — N° ${data.numeroIdentidad}`],
    ['Correo electrónico', data.email],
    ['Teléfono', `${data.indicativo} ${data.telefono}`],
    ['Fecha y hora de firma', fecha],
    ['Dirección IP de origen', ip],
    ['Dispositivo / Navegador', userAgent.substring(0, 75) + (userAgent.length > 75 ? '...' : '')],
    ['Código de Verificación Único', verificationCode],
  ]

  for (const [label, value] of campos) {
    doc.setFont('Open Sans', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text(label + ':', margin, y)
    doc.setFont('Open Sans', 'normal')
    doc.setTextColor(20, 20, 20)
    doc.text(value, margin + 58, y)
    y += 6.5
  }

  y += 4

  // Recuadro de la firma digital
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.rect(margin, y, W - margin * 2, 45, 'S')

  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('Open Sans', 'italic')
  doc.text('Firma digital del aceptante:', margin + 3, y + 5)

  try {
    doc.addImage(data.firma, 'PNG', margin + 3, y + 7, 80, 34)
  } catch {
    doc.setFont('Open Sans', 'normal')
    doc.text('[Imagen de firma no disponible]', margin + 3, y + 22)
  }

  // Overlay de pie de página (Página X de Y) en todas las hojas creadas
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const footerY = 282
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(margin, footerY - 4, W - margin, footerY - 4)
    doc.setFontSize(7.5)
    doc.setTextColor(130, 130, 130)
    doc.setFont('Open Sans', 'normal')
    doc.text('© Grupo MLP S.A.S. · Medellín, Colombia · reuso.lurdes.co', margin, footerY)
    doc.text(`Página ${i} de ${totalPages}`, W - margin - 20, footerY)
  }

  return Buffer.from(doc.output('arraybuffer'))
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const allowed = await rateLimit(`firma:${ip}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.', detalles: parsed.error.flatten() }, { status: 422 })
  }

  const data = parsed.data
  const fecha = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'full',
    timeStyle: 'medium',
  })

  const userAgent = req.headers.get('user-agent') ?? 'unknown'
  const verificationCode = crypto.randomUUID().toUpperCase()

  // Generar PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = generarPDF(data, fecha, ip, userAgent, verificationCode)
  } catch {
    return NextResponse.json({ error: 'No se pudo generar el PDF.' }, { status: 500 })
  }

  // Registrar en Supabase (sin guardar la firma)
  try {
    const supabase = await createAdminClient()
    await supabase.from('log_firmas_confidencialidad').insert({
      nombre: data.nombre,
      tipo_identidad: data.tipoIdentidad,
      numero_identidad: data.numeroIdentidad,
      email: data.email,
      indicativo: data.indicativo,
      telefono: data.telefono,
      ip_address: ip,
      user_agent: userAgent,
    })
  } catch {
    // El log es no crítico — continuar aunque falle
  }

  // Enviar email (opcional y no-bloqueante para desarrollo y tolerancia a fallos)
  if (!process.env.RESEND_API_KEY) {
    console.warn('Servicio de correo no configurado (RESEND_API_KEY ausente).')
    return NextResponse.json({ ok: true, emailSent: false })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const FROM = process.env.RESEND_FROM ?? 'Calculadora de Reúso <noreply@reuso.lurdes.co>'

    await resend.emails.send({
      from: FROM,
      to: data.email,
      bcc: ['innovacion@lurdes.co'],
      subject: 'Tu copia firmada del Acuerdo de Confidencialidad — Calculadora de Reúso',
      html: emailBase({
        subtitulo: 'Acuerdo de Confidencialidad firmado',
        filas: [
          { label: 'Nombre', valor: data.nombre },
          { label: 'Correo', valor: data.email },
          { label: 'Fecha',  valor: fecha },
        ],
        descripcion: `Has firmado digitalmente el Acuerdo de Confidencialidad de Calculadora de Reúso. Adjuntamos una copia en PDF.<br><br>Puedes verificar la autenticidad del documento en <a href="https://reuso.lurdes.co/verificar" style="color:#00827C;">reuso.lurdes.co/verificar</a>.`,
      }),
      attachments: [
        {
          filename: 'acuerdo-confidencialidad-reuso.pdf',
          content: pdfBuffer,
        },
      ],
    })
  } catch (err) {
    console.error('Error al enviar correo de firma:', err)
    // Retornamos éxito de todas formas porque el documento fue generado y registrado en BD con éxito
    return NextResponse.json({ ok: true, emailSent: false, warning: 'No se pudo enviar el correo de respaldo.' })
  }

  return NextResponse.json({ ok: true, emailSent: true })
}
