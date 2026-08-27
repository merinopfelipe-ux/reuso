// Verificación server-side de Cloudflare Turnstile — mismo patrón fail-open
// que ya usan /api/auth/login y /api/auth/registro (CLAUDE.md directriz #8):
// nunca bloquea al usuario, solo se rechaza si el token llega Y falla contra
// Cloudflare.
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const formData = new FormData()
  const secret = process.env.TURNSTILE_SECRET_KEY || ''
  formData.append('secret', secret)
  formData.append('response', token)
  if (ip && ip !== 'unknown') {
    formData.append('remoteip', ip)
  }

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    )
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}
