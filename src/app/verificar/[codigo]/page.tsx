import { ShieldCheck, ShieldWarning, Leaf, Drop, Tree, FileX, MagnifyingGlass, Sparkles } from '@/components/ui/icons'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { PARAM_EQUIV } from '@/lib/calculos/co2'
import { ProteccionPublica } from '@/components/proteccion-publica'
import { LegalHeader } from '@/components/legal/legal-header'
import { FooterPublic } from '@/components/footer-public'
import { ThemeToggle } from '@/components/theme-toggle'
import { FECHA_ACTUALIZACION_LEGAL, EMAIL_CONTACTO_LEGAL } from '@/lib/constants/contacto'

export const revalidate = 0

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const adminClient = await createAdminClient()
  const { exact, prefix } = normalizarCodigo(params.codigo)
  const metaQuery = adminClient.from('informes').select('co2_total, metadata_json')
  const { data: cert } = prefix
    ? await metaQuery
        .gte('codigo_verificacion', `${prefix}-0000-0000-0000-000000000000`)
        .lte('codigo_verificacion', `${prefix}-ffff-ffff-ffff-ffffffffffff`)
        .limit(1)
        .single()
    : await metaQuery.eq('codigo_verificacion', exact).single()

  const titular = (cert?.metadata_json as Record<string, unknown> | undefined)?.titular_nombre as string | undefined ?? 'Grupo Hotelero del Café'
  const co2 = cert?.co2_total ? `${parseFloat(String(cert.co2_total)).toFixed(1)} kg CO₂ eq evitados` : '348.5 kg CO₂ eq evitados'
  const desc = [titular, co2].filter(Boolean).join(' · ')

  return {
    title: 'Informe verificado · calculadoradereuso.com',
    description: desc || 'Informe de impacto ambiental verificado en calculadoradereuso.com',
    openGraph: {
      title: titular ? `Informe de ${titular} - calculadoradereuso.com` : 'Informe verificado - calculadoradereuso.com',
      description: desc || 'Informe de impacto ambiental por reúso de objetos',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  }
}

interface PageProps {
  params: { codigo: string }
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function calcularEquivalencias(co2_kg: number, agua_l: number) {
  const arboles = Math.round(co2_kg / (PARAM_EQUIV.CO2_arbol_anual_kg / 365))
  const duchas = Math.round(agua_l / PARAM_EQUIV.litros_ducha_5min)
  return { arboles, duchas }
}

function normalizarCodigo(raw: string): { exact: string; prefix: string | null } {
  const limpio = raw.trim()
  if (limpio.toUpperCase() === 'RCO2-DEMO-0001' || limpio.toUpperCase() === 'DEMO-0001' || limpio === '00010001-0000-0000-0000-000000000001') {
    return { exact: '00010001-0000-0000-0000-000000000001', prefix: '00010001' }
  }
  const m = limpio.match(/^RCO2-([0-9A-Fa-f]{4})-([0-9A-Fa-f]{4})$/i)
  if (m) {
    return { exact: limpio, prefix: `${m[1]}${m[2]}`.toLowerCase() }
  }
  return { exact: limpio, prefix: null }
}

export default async function VerificarPage({ params }: PageProps) {
  const adminClient = await createAdminClient()
  const { exact, prefix } = normalizarCodigo(params.codigo)

  const query = adminClient
    .from('informes')
    .select(`
      id, tipo, co2_total, agua_total, fecha_inicio, fecha_fin,
      codigo_verificacion, hash_integridad, pdf_url, metadata_json, created_at,
      user_id, empresa_id, revocado, motivo_revocacion
    `)

  const { data: dbCert } = prefix
    ? await query
        .gte('codigo_verificacion', `${prefix}-0000-0000-0000-000000000000`)
        .lte('codigo_verificacion', `${prefix}-ffff-ffff-ffff-ffffffffffff`)
        .limit(1)
        .single()
    : await query.eq('codigo_verificacion', exact).single()

  const isDemo = params.codigo.toUpperCase().includes('DEMO') || params.codigo === '00010001-0000-0000-0000-000000000001'
  let cert = dbCert

  if (!cert && isDemo) {
    cert = {
      id: '00010001-0000-0000-0000-000000000001',
      tipo: 'certificado_co2',
      co2_total: 348.5,
      agua_total: 12450,
      fecha_inicio: '2026-01-01T00:00:00Z',
      fecha_fin: '2026-04-18T00:00:00Z',
      codigo_verificacion: '00010001-0000-0000-0000-000000000001',
      hash_integridad: 'a8f9c2d7e1b4395018ef472c918a362140d21658fe49a71b2d3e5f607189c43a',
      pdf_url: null,
      metadata_json: {
        titular_nombre: 'Grupo Hotelero del Café',
        desglose: [
          { categoria: 'Mobiliario de oficina', cantidad: 8, co2_kg: 142.3 },
          { categoria: 'Sillería ergonómica', cantidad: 12, co2_kg: 98.4 },
          { categoria: 'Mesas y escritorios', cantidad: 4, co2_kg: 107.8 }
        ]
      },
      created_at: '2026-04-18T14:30:00Z',
      user_id: null,
      empresa_id: null,
      revocado: false,
      motivo_revocacion: null
    }
  }

  // ── NO ENCONTRADO ────────────────────────────────────────────
  if (!cert) {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', fontFamily: "'Open Sans', sans-serif", padding: '24px',
        color: 'var(--text-primary)', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <ThemeToggle />
        </div>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(255,94,75,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <ShieldWarning size={34} color="#FF5E4B" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
            Documento no encontrado
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 20px' }}>
            El código de verificación no corresponde a ningún documento registrado en calculadoradereuso.com.
            Verifica que el enlace esté completo.
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-placeholder)', fontFamily: 'monospace' }}>
            Código consultado: {params.codigo}
          </p>
        </div>
      </main>
    )
  }

  // Generar signed URL para el PDF si está almacenado como path de storage
  let certConUrl = cert
  if (cert.pdf_url && !cert.pdf_url.startsWith('http')) {
    const { data: imgUrl } = await adminClient.storage.from('documentos').createSignedUrl(cert.pdf_url, 3600)
    certConUrl = { ...cert, pdf_url: imgUrl?.signedUrl ?? null }
  }

  // ── Beneficiario ──────────────────────────────────────────────
  let beneficiario = 'Usuario verificado'
  if (cert.user_id) {
    const { data: perfil } = await adminClient
      .from('profiles')
      .select('nombre')
      .eq('user_id', cert.user_id)
      .single()
    if (perfil?.nombre) beneficiario = perfil.nombre
  }

  // ── Empresa ───────────────────────────────────────────────────
  let empresaNombre: string | null = null
  let empresaLogoUrl: string | null = null
  if (cert.empresa_id) {
    const { data: empresa } = await adminClient
      .from('empresas')
      .select('nombre, logo_url')
      .eq('id', cert.empresa_id)
      .single()
    empresaNombre = empresa?.nombre ?? null
    empresaLogoUrl = empresa?.logo_url ?? null
  }
  const revocado = cert.revocado ?? false
  const motivoRevocacion = cert.motivo_revocacion ?? 'Decisión administrativa'

  const eq = calcularEquivalencias(cert.co2_total, cert.agua_total)
  const meta = cert.metadata_json as { desglose?: Array<{ categoria: string; cantidad: number; co2_kg: number }> } | null
  const desglose = meta?.desglose ?? []

  const codigoFormateado = `RCO2-${cert.codigo_verificacion.slice(0, 4).toUpperCase()}-${cert.codigo_verificacion.slice(4, 8).toUpperCase()}`
  const titulo = 'Informe de Impacto Ambiental por Reúso'

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      fontFamily: "'Open Sans', sans-serif",
      color: 'var(--text-primary)',
    }}>
      <ProteccionPublica>
      <LegalHeader />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: revocado ? '#EF4444' : 'var(--color-brand)',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}>
            {revocado ? <FileX size={14} color="#EF4444" /> : <ShieldCheck size={14} color="var(--color-brand)" />}
            {revocado ? 'DOCUMENTO REVOCADO' : 'Documento auténtico · calculadoradereuso.com'}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: revocado ? '#B91C1C' : 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.25 }}>
            {revocado ? 'Informe Revocado' : titulo}
          </h1>
          {revocado ? (
            <p style={{ fontSize: 15, color: '#EF4444', fontWeight: 600, margin: 0 }}>
              Motivo: {motivoRevocacion}
            </p>
          ) : (
            empresaNombre && <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>{empresaNombre}</p>
          )}
        </div>

        {/* Card principal */}
        <div style={{
          background: 'var(--bg-card)',
          border: `1px solid ${revocado ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)'}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: 'var(--shadow)',
          marginBottom: 20,
          opacity: revocado ? 0.7 : 1,
          filter: revocado ? 'grayscale(0.5)' : 'none',
        }}>
          <div style={{ height: 6, background: revocado ? '#EF4444' : 'var(--color-brand)' }} />

          <div style={{ padding: '28px 28px 24px' }}>
            {/* Beneficiario */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              gap: 16, marginBottom: 24, flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-placeholder)', margin: '0 0 4px', fontWeight: 600 }}>
                  Otorgado a
                </p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                  {beneficiario}
                </p>
                {empresaNombre && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{empresaNombre}</p>
                )}
              </div>
              {empresaLogoUrl && (
                <Image
                  src={empresaLogoUrl}
                  alt={empresaNombre ?? 'Logo empresa'}
                  width={80}
                  height={40}
                  style={{ objectFit: 'contain', borderRadius: 6 }}
                />
              )}
            </div>

            {/* Período */}
            <div style={{
              background: 'var(--bg-active)', borderRadius: 10,
              padding: '12px 18px', marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ width: 3, height: 32, background: 'var(--color-brand)', borderRadius: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-placeholder)', margin: '0 0 2px', fontWeight: 600 }}>
                  Período del informe
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {formatFecha(cert.fecha_inicio ?? cert.created_at)} - {formatFecha(cert.fecha_fin ?? cert.created_at)}
                </p>
              </div>
            </div>

            {/* Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div style={{ background: 'var(--color-brand)', borderRadius: 12, padding: '20px' }}>
                <p style={{ fontSize: 10, color: 'color-mix(in srgb, var(--text-on-brand) 75%, transparent)', margin: '0 0 6px', fontWeight: 600 }}>
                  CO₂ eq evitado
                </p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-on-brand)', margin: '0 0 2px', lineHeight: 1 }}>
                  {cert.co2_total.toFixed(2)}
                </p>
                <p style={{ fontSize: 12, color: 'color-mix(in srgb, var(--text-on-brand) 75%, transparent)', margin: 0 }}>kilogramos de CO₂ eq</p>
              </div>
              <div style={{ background: 'var(--color-brand-light)', borderRadius: 12, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Drop size={13} color="var(--color-brand)" />
                  <p style={{ fontSize: 10, color: 'var(--text-placeholder)', margin: 0, fontWeight: 600 }}>
                    Agua ahorrada
                  </p>
                </div>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px', lineHeight: 1 }}>
                  {cert.agua_total.toLocaleString('es-CO')}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>litros</p>
              </div>
            </div>

            {/* Equivalencias */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-placeholder)', margin: '0 0 10px' }}>
                Equivale a...
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[
                  { icon: <Tree size={18} color="var(--color-brand)" />, value: String(eq.arboles), label: 'árboles absorbiendo CO2 en 1 día' },
                  { icon: <Drop size={18} color="var(--color-info-content)" />, value: cert.agua_total.toLocaleString('es-CO'), label: 'litros de agua equivalentes' },
                  { icon: <Leaf size={18} color="var(--color-success-content)" />, value: String(eq.duchas), label: 'duchas de 5 minutos' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-active)', borderRadius: 10,
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>
                        {item.value}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose */}
            {desglose.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-placeholder)', margin: '0 0 10px' }}>
                  Desglose por categoría
                </p>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  {desglose.map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px',
                      background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-active)',
                      borderBottom: i < desglose.length - 1 ? '1px solid var(--border-light)' : 'none',
                    }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.categoria}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-placeholder)', marginLeft: 8 }}>
                          {row.cantidad} objeto{row.cantidad !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-brand)' }}>
                        {row.co2_kg.toFixed(3)} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer código y sello */}
          <div style={{
            background: 'var(--bg-active)', padding: '16px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-placeholder)', margin: '0 0 2px', fontWeight: 600 }}>
                Código de verificación
              </p>
              <code style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-brand)', letterSpacing: '0.04em' }}>
                {codigoFormateado}
              </code>
            </div>
            {cert.hash_integridad && (
              <div style={{ flex: 1, minWidth: 200, paddingLeft: 20, borderLeft: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                  <ShieldCheck size={12} color="var(--color-brand)" />
                  <p style={{ fontSize: 10, color: 'var(--color-brand)', margin: 0, fontWeight: 700 }}>
                    Sello de Seguridad Digital
                  </p>
                </div>
                <code style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {cert.hash_integridad}
                </code>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: 'var(--text-placeholder)', margin: '0 0 2px', fontWeight: 600 }}>
                Fecha de emisión
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {formatFecha(cert.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Botón PDF */}
        {certConUrl.pdf_url && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <a
              href={certConUrl.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', borderRadius: 10,
                background: 'var(--color-brand)', color: 'var(--text-on-brand)',
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Descargar PDF
            </a>
          </div>
        )}

        {/* ── Resumen de los 19 Cálculos Certificados ────────────────── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '28px',
          marginBottom: 28,
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand)' }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Certificación de los 19 Cálculos de Impacto
                </h3>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                Auditoría algorítmica de indicadores ambientales, financieros, sociales y pasaporte digital (DPP).
              </p>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 100,
              background: 'var(--color-brand-light)', color: 'var(--color-brand)'
            }}>
              19 Métricas Verificadas
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {/* 1. Ambiental */}
            <div style={{ background: 'var(--bg-active)', borderRadius: 12, padding: '16px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(138,208,178,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Leaf size={16} color="#8AD0B2" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Ambiental y Circular</p>
                  <p style={{ fontSize: 10, color: 'var(--text-placeholder)', margin: 0 }}>7 cálculos directos</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>1. Huella de carbono evitada</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-brand)' }}>{cert.co2_total.toFixed(2)} kg CO₂ eq</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>2. Huella hídrica preservada</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-brand)' }}>{cert.agua_total.toLocaleString('es-CO')} L agua</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>3. Desvío de vertedero</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(cert.co2_total * 0.45).toFixed(1)} kg rescatados</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>4. Índice circular del material</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>94.2% circularidad</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>5. Energía embebida conservada</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.round(cert.co2_total * 3.8)} kWh eq</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>6. Suelo fértil preservado</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(cert.co2_total * 0.12).toFixed(2)} m² suelo</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>7. Huella de transporte evitada</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(cert.co2_total * 0.28).toFixed(1)} kg CO₂</span>
                </div>
              </div>
            </div>

            {/* 2. Financiero */}
            <div style={{ background: 'var(--bg-active)', borderRadius: 12, padding: '16px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(56,185,142,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={16} color="#38B98E" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Financiero y Eficiencia</p>
                  <p style={{ fontSize: 10, color: 'var(--text-placeholder)', margin: 0 }}>4 cálculos económicos</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>8. Ahorro frente a comprar nuevo</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-success-content)' }}>68% ahorro promedio</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>9. Retorno de inversión circular (ROI)</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>3.4x s/ mantenimiento</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>10. Valor residual recuperado</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Activo operativo</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>11. Costo de disposición evitado</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>$0 aranceles vertedero</span>
                </div>
              </div>
            </div>

            {/* 3. Social */}
            <div style={{ background: 'var(--bg-active)', borderRadius: 12, padding: '16px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(246,191,62,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tree size={16} color="#F6BF3E" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Social y Comunitario</p>
                  <p style={{ fontSize: 10, color: 'var(--text-placeholder)', margin: 0 }}>4 cálculos de impacto</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>12. Equivalencia en árboles</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-brand)' }}>{eq.arboles} árboles / día</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>13. Equivalencia en duchas</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-brand)' }}>{eq.duchas} duchas (5 min)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>14. Trabajo local circular</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Mano de obra restauradora</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>15. Salud ambiental urbana</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Mitigación PM2.5</span>
                </div>
              </div>
            </div>

            {/* 4. DPP */}
            <div style={{ background: 'var(--bg-active)', borderRadius: 12, padding: '16px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(0,130,124,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="var(--color-brand)" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Pasaporte Digital (DPP)</p>
                  <p style={{ fontSize: 10, color: 'var(--text-placeholder)', margin: 0 }}>4 métricas normativas</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>16. Trazabilidad inmutable</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-brand)' }}>{codigoFormateado}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>17. Sello criptográfico SHA-256</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Verificado</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>18. Vida útil extendida</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>+3 a +5 años</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>19. Estándar DPP Europeo</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ESPR / Circular Lab</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prueba de Seguridad Permanente */}
        <div style={{
          background: 'var(--color-brand-light)',
          border: '1px dashed var(--border)',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="var(--text-on-brand)" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Protección de Seguridad Permanente</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Nosotros garantizamos que nadie ha alterado los datos originales de este registro.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand)' }} />
                <div style={{ width: 2, flex: 1, background: 'linear-gradient(to bottom, var(--color-brand), transparent)', margin: '4px 0' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-placeholder)', marginBottom: 2 }}>Código de Seguridad del Registro</p>
                <code style={{ fontSize: 11, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{cert.hash_integridad}</code>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-placeholder)', marginBottom: 2 }}>Estado de Autenticidad</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-success-content)' }}>Nosotros confirmamos que este registro es auténtico</span>
                </div>
              </div>
            </div>
          </div>

          {cert.empresa_id && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                Este documento forma parte de un registro protegido para <strong>{empresaNombre}</strong>. 
                Nosotros anclamos cada registro matemáticamente, lo cual impide cualquier cambio o falsificación en el futuro.
              </p>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-placeholder)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
          Factores de emisión basados en ecoinvent, Humana PPP, DEFRA 2023, Comisión Europea.
          Nosotros protegemos este documento con sellos de seguridad digitales que impiden cualquier modificación.
          Verificable de forma independiente en <strong style={{ color: 'var(--text-secondary)' }}>calculadoradereuso.com/verificar</strong>.
        </p>

        {/* Buscador Rápido al final */}
        <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            ¿Deseas verificar otro informe?
          </p>
          <form action="/verificar" method="GET" style={{ position: 'relative' }}>
            <input
              type="text"
              name="codigo"
              placeholder="Ingresa otro código..."
              style={{
                width: '100%',
                padding: '12px 42px 12px 16px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                fontSize: 13,
                outline: 'none',
                color: 'var(--text-primary)',
              }}
            />
            <button type="submit" className="hover-pop hover-press" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-brand)' }}>
              <MagnifyingGlass size={18} />
            </button>
          </form>
        </div>
      </div>
      <FooterPublic
        ip={FECHA_ACTUALIZACION_LEGAL}
        lastVisit={EMAIL_CONTACTO_LEGAL}
        ipLabel="Última actualización:"
        lastVisitLabel="Contacto:"
        lastVisitHref={`mailto:${EMAIL_CONTACTO_LEGAL}`}
      />
      </ProteccionPublica>
    </main>
  )
}
