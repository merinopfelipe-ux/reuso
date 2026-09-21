import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-guard'

// La key vive en el servidor — nunca llega al cliente.
const API_KEY = process.env.PAGESPEED_API_KEY

export async function GET(req: NextRequest) {
  // Solo super_admin: sin esto cualquiera gastaría la cuota de la llave y
  // podría analizar sitios ajenos (seguridad-reuso, regla de rutas API).
  const guard = await requireSuperAdmin(req)
  if (guard.error) return guard.error

  const { searchParams } = req.nextUrl
  const url = searchParams.get('url')
  const strategy = searchParams.get('strategy') === 'desktop' ? 'desktop' : 'mobile'

  if (!url) {
    return NextResponse.json({ error: 'Falta el parámetro url' }, { status: 400 })
  }
  let host = ''
  try { host = new URL(url).hostname } catch { /* url inválida */ }
  if (host !== 'calculadoradereuso.com' && !host.endsWith('.calculadoradereuso.com')) {
    return NextResponse.json({ error: 'Solo se analizan páginas de calculadoradereuso.com' }, { status: 400 })
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: 'PAGESPEED_API_KEY no configurada en el servidor' },
      { status: 500 }
    )
  }

  const psiUrl =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${API_KEY}` +
    `&category=performance&category=seo&category=accessibility&category=best-practices`

  try {
    const res = await fetch(psiUrl, { next: { revalidate: 0 } })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `PageSpeed devolvió ${res.status}`, detail: text.slice(0, 300) },
        { status: res.status }
      )
    }

    const data = await res.json()
    const cats = data.lighthouseResult?.categories ?? {}

    return NextResponse.json({
      performance:    Math.round((cats.performance?.score    ?? 0) * 100),
      seo:            Math.round((cats.seo?.score            ?? 0) * 100),
      accessibility:  Math.round((cats.accessibility?.score  ?? 0) * 100),
      best_practices: Math.round((cats['best-practices']?.score ?? 0) * 100),
      strategy,
      url,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
