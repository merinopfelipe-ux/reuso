import { NextResponse } from 'next/server'
import { sanitizarHtml } from '@/lib/sanitizar-html'

// Salud del sanitizador en el runtime REAL de Vercel. No usa datos de nadie:
// limpia un texto fijo. Si `jsdom` no carga, responde 500 y `npm run smoke:api`
// lo marca después de cada despliegue. Sin esto, el fallo solo aparecía cuando
// una persona intentaba guardar una nota.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const salida = await sanitizarHtml('<b>ok</b><script>x</script><img src=x onerror=alert(1)>')
    if (salida.includes('script') || salida.includes('onerror')) {
      return NextResponse.json({ ok: false, error: 'El sanitizador dejó pasar contenido activo.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[salud/sanitizador]', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'El sanitizador no carga.' }, { status: 500 })
  }
}
