import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarConfirmacionRegistro } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email('Correo electrónico no válido'),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  // Sin límite, este endpoint permitiría bombardear el correo de cualquier
  // persona con reenvíos, sin necesitar sesión (mismo riesgo que
  // verificar-email/route.ts).
  const allowed = await rateLimit(`reenviar-codigo:${ip}`, 3, 60_000)
  if (!allowed) {
    return NextResponse.json({ ok: true })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ingresa un correo válido.' }, { status: 400 })
  }

  const { email } = parsed.data
  const adminSupabase = await createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://calculadoradereuso.com'
  const redirectCallbackUrl = `${appUrl}/auth/callback?next=/dashboard`

  try {
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: 'signup',
      email: email.trim().toLowerCase(),
      password: 'TemporaryPlaceholder123!',
      options: {
        redirectTo: redirectCallbackUrl,
      },
    })

    if (linkError) {
      console.error('Error generating link on resend:', linkError)
      // Por seguridad no revelamos errores internos
      return NextResponse.json({ ok: true })
    }

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('nombre')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    const emailOtp = linkData?.properties?.email_otp ?? null
    const actionLink = linkData?.properties?.action_link ?? `${appUrl}/confirmar-email?email=${encodeURIComponent(email)}`

    await enviarConfirmacionRegistro(email, {
      nombre: profile?.nombre ?? null,
      codigoOtp: emailOtp,
      enlaceConfirmacion: actionLink,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en /api/auth/reenviar-codigo:', err)
    return NextResponse.json({ ok: true })
  }
}
