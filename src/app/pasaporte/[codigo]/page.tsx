import type { Metadata } from 'next'
import Link from 'next/link'
import { IdCard as IdentificationCard, Leaf, Droplet as Drop, Car, TreeDeciduous as Tree, ShieldCheck, RotateCcw as ArrowCounterClockwise, Dumbbell as Barbell, AlertCircle as WarningCircle } from '@/components/ui/icons'
import { createAdminClient } from '@/lib/supabase/admin'
import { EmptyState } from '@/components/empty-state'
import { CollapseSection, ShareWhatsApp } from './collapse-section'

export const revalidate = 3600

export async function generateStaticParams() {
  return []
}

interface PageProps { params: { codigo: string } }

type ComposicionItem = {
  material: string
  peso_kg: number
  factor_co2_kg: number
  origen_fuente?: string
  nivel_confianza?: string
}

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: '#38B98E' },
  en_reuso: { label: 'En reúso', color: '#00827C' },
  disposicion_final: { label: 'Disposición final', color: '#FF5E4B' },
  archivado: { label: 'Archivado', color: '#7FA8A5' },
}

const CONFIANZA_COLOR: Record<string, string> = {
  alta: '#38B98E', media: '#F6BF3E', baja: '#FF5E4B',
}

function formatFecha(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
}

function calcEquivalencias(co2_kg: number) {
  return {
    arboles: Math.round(co2_kg / 8.0),
    duchas: Math.round(co2_kg / 2.0),
    coches: parseFloat((co2_kg / 4600).toFixed(2)),
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const adminClient = await createAdminClient()
  const { data: activo } = await adminClient
    .from('dpp_activos')
    .select('nombre, n_ciclos, empresa_id, imagen_url')
    .eq('codigo_dpp', params.codigo)
    .single()

  if (!activo) return { title: 'Pasaporte Digital - Reúso' }

  let empresaNombre = 'Reúso'
  if (activo.empresa_id) {
    const { data: emp } = await adminClient.from('empresas').select('nombre').eq('id', activo.empresa_id).single()
    if (emp?.nombre) empresaNombre = emp.nombre
  }

  return {
    title: `${activo.nombre} - Pasaporte Digital`,
    description: `Activo circular verificado por ${empresaNombre}. ${activo.n_ciclos} ciclos de reúso registrados.`,
    openGraph: {
      title: `${activo.nombre} - Pasaporte Digital · Reúso`,
      description: `Activo circular verificado por ${empresaNombre}. ${activo.n_ciclos} ciclos de reúso registrados.`,
      images: [{ url: activo.imagen_url ?? '/og-image.png', width: 1200, height: 630 }],
    },
  }
}

export default async function PasaportePage({ params }: PageProps) {
  const adminClient = await createAdminClient()
  const codigo = decodeURIComponent(params.codigo)

  const { data: activo } = await adminClient
    .from('dpp_activos')
    .select('id, codigo_dpp, nombre, descripcion, estado, n_ciclos, peso_total_kg, composicion_json, hash_integridad, imagen_url, created_at, empresa_id')
    .eq('codigo_dpp', codigo)
    .single()

  if (!activo) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', fontFamily: "'Open Sans', sans-serif", padding: 24 }}>
        <EmptyState
          icono={WarningCircle}
          titulo="No encontramos este pasaporte"
          descripcion="Revisa el código QR o escanealo de nuevo. Si crees que es un error, contacta a la empresa emisora."
          cta={{ label: 'Ir a reuso.lurdes.co', href: '/' }}
        />
      </main>
    )
  }

  const [ciclosRes, empresaRes] = await Promise.all([
    adminClient
      .from('dpp_ciclos')
      .select('numero_ciclo, fecha_inicio, fecha_fin, operacion_realizada, descripcion, co2_ciclo_kg, co2_evitado_kg')
      .eq('activo_id', activo.id)
      .order('numero_ciclo'),
    activo.empresa_id
      ? adminClient.from('empresas').select('nombre, logo_url').eq('id', activo.empresa_id).single()
      : Promise.resolve({ data: null }),
  ])

  await adminClient.from('dpp_verificaciones').insert({
    activo_id: activo.id,
    codigo_dpp: activo.codigo_dpp,
    ip_address: null,
    user_agent: null,
    pais: null,
  })

  const ciclos = ciclosRes.data ?? []
  const empresa = empresaRes.data
  const composicion = Array.isArray(activo.composicion_json) ? activo.composicion_json as ComposicionItem[] : []
  const co2_evitado_total = ciclos.reduce((s, c) => s + (c.co2_evitado_kg ?? 0), 0)
  const eq = calcEquivalencias(co2_evitado_total)
  const estadoConf = ESTADO_CONFIG[activo.estado ?? 'activo'] ?? ESTADO_CONFIG['activo']

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: "'Open Sans', sans-serif", color: 'var(--text-primary)' }}>

      {/* ── 1. HEADER STICKY ── */}
      <header style={{
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-brand)' }}>reuso</span>
            <span style={{ fontSize: 18, color: 'var(--text-secondary)' }}>.lurdes.co</span>
          </div>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-placeholder)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
            {activo.codigo_dpp}
          </p>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--color-brand-light)', color: 'var(--color-brand)',
          padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
        }}>
          <IdentificationCard size={14} />
          Pasaporte Verificado
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 40px' }}>

        {/* ── 2. HERO CARD - IDENTIDAD ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 12,
        }}>
          {activo.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activo.imagen_url}
              alt={activo.nombre}
              loading="lazy"
              style={{ borderRadius: 12, maxWidth: '100%', maxHeight: 260, objectFit: 'cover', marginBottom: 16, display: 'block' }}
            />
          )}
          <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {activo.nombre}
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <span style={{
              background: `${estadoConf.color}1A`,
              color: estadoConf.color,
              padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            }}>
              {estadoConf.label}
            </span>
            {activo.peso_total_kg && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(0,130,124,0.08)', color: '#4D7C79',
                padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              }}>
                <Barbell size={12} />
                {activo.peso_total_kg} kg
              </span>
            )}
          </div>
          {activo.descripcion && (
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {activo.descripcion}
            </p>
          )}
          {empresa && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              {empresa.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={empresa.logo_url} alt={empresa.nombre} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }} />
              )}
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Emitido por <strong style={{ color: 'var(--text-primary)' }}>{empresa.nombre}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ── 3. COMPOSICIÓN DE MATERIALES ── */}
        <CollapseSection titulo="Composición de materiales" defaultOpen={true}>
          {composicion.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              El emisor no ha detallado la composición de materiales.
            </p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid rgba(0,130,124,0.14)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,130,124,0.06)' }}>
                      {['Material', 'Peso kg', 'CO₂/kg', 'Fuente', 'Confianza'].map((h) => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#00827C', borderBottom: '1px solid rgba(0,130,124,0.14)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {composicion.map((m, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)' }}>
                        <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.material}</td>
                        <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{m.peso_kg}</td>
                        <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{m.factor_co2_kg}</td>
                        <td style={{ padding: '9px 10px', color: 'var(--text-secondary)', fontSize: 12 }}>{m.origen_fuente ?? '-'}</td>
                        <td style={{ padding: '9px 10px' }}>
                          {m.nivel_confianza ? (
                            <span style={{
                              background: `${CONFIANZA_COLOR[m.nivel_confianza] ?? '#7FA8A5'}1A`,
                              color: CONFIANZA_COLOR[m.nivel_confianza] ?? '#7FA8A5',
                              padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            }}>
                              {m.nivel_confianza}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                Verificamos cada factor con ecoinvent, ELCD y Humana PPP.
              </p>
            </>
          )}
        </CollapseSection>

        {/* ── 4. HISTORIA DE CICLOS ── */}
        <CollapseSection titulo={`Historia de ciclos (${ciclos.length})`} defaultOpen={true}>
          {ciclos.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Aún no se han registrado ciclos de reúso.
            </p>
          ) : (
            ciclos.map((c) => (
              <div key={c.numero_ciclo} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,130,124,0.12)', color: '#00827C',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {c.numero_ciclo}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {formatFecha(c.fecha_inicio)}{c.fecha_fin ? ` → ${formatFecha(c.fecha_fin)}` : ' → En curso'}
                  </span>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {c.operacion_realizada}
                </p>
                {c.descripcion && (
                  <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {c.descripcion}
                  </p>
                )}
                {(c.co2_evitado_kg ?? 0) > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#38B98E' }}>
                    <ArrowCounterClockwise size={14} strokeWidth={2.5} />
                    Evitaste {c.co2_evitado_kg?.toFixed(2)} kg CO₂e
                  </div>
                )}
              </div>
            ))
          )}
          {ciclos.length > 0 && co2_evitado_total > 0 && (
            <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#00827C' }}>
              Reutilizaste este objeto {ciclos.length} {ciclos.length === 1 ? 'vez' : 'veces'} y evitaste {co2_evitado_total.toFixed(2)} kg de CO₂
            </p>
          )}
        </CollapseSection>

        {/* ── 5. IMPACTO AMBIENTAL ── */}
        {co2_evitado_total > 0 && (
          <CollapseSection titulo="Impacto ambiental" defaultOpen={true}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}>
              {[
                { icon: Leaf, color: '#38B98E', value: co2_evitado_total.toFixed(1), label: 'kg CO₂e evitados' },
                { icon: Tree, color: '#00827C', value: eq.arboles, label: 'árboles protegidos' },
                { icon: Drop, color: '#59A6E4', value: eq.duchas, label: 'duchas de 10 min' },
                { icon: Car, color: '#F6BF3E', value: eq.coches > 0.01 ? eq.coches : '-', label: eq.coches > 0.01 ? 'km en coche' : 'impacto en transporte' },
              ].map(({ icon: Icon, color, value, label }, i) => (
                <div key={i} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px 12px', textAlign: 'center',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: `${color}1A`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 8px',
                  }}>
                    <Icon size={22} color={color} />
                  </div>
                  <p style={{ margin: '0 0 2px', fontSize: 24, fontWeight: 700, color }}>{value}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{label}</p>
                </div>
              ))}
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
              El CO₂ evitado se calcula a partir de la composición de materiales y los factores de emisión de cada ciclo.
            </p>
          </CollapseSection>
        )}

        {/* ── 6. INTEGRIDAD DEL PASAPORTE ── */}
        <CollapseSection titulo="Integridad del pasaporte" defaultOpen={false}>
          <div style={{
            background: 'rgba(0,130,124,0.04)', border: '1px solid rgba(0,130,124,0.12)',
            borderRadius: 12, padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <ShieldCheck size={24} color="#00827C" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Cadena de bloques verificada</span>
            </div>
            {activo.hash_integridad && (
              <p style={{ margin: '0 0 8px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                SHA-256: {activo.hash_integridad.slice(0, 12)}...
              </p>
            )}
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              Verifica tú mismo este pasaporte. Vive en una cadena de bloques - si alguien altera un dato, la cadena lo detecta inmediatamente.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <Link href="/legal/ia" style={{ fontSize: 12, color: '#59A6E4', textDecoration: 'none', fontWeight: 600 }}>
                Cómo usamos la tecnología en Reúso →
              </Link>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Emitido el {formatFecha(activo.created_at)}
              </span>
            </div>
          </div>
        </CollapseSection>

        {/* ── 7. COMPARTIR WHATSAPP ── */}
        <ShareWhatsApp codigo={activo.codigo_dpp} />

        {/* ── 8. FOOTER ── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-secondary)' }}>
            Emitido por Calculadora de Reúso · reuso.lurdes.co · Grupo MLP S.A.S
          </p>
        </div>

      </div>
    </main>
  )
}
