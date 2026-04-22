import { ShieldCheck, ShieldWarning, Leaf, Drop, Car, Tree, FileX, MagnifyingGlass } from '@/components/ui/icons'
import Image from 'next/image'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 3600

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const adminClient = await createAdminClient()
  const { exact, prefix } = normalizarCodigo(params.codigo)
  const metaQuery = adminClient.from('certificados').select('co2_total, metadata_json')
  const { data: cert } = prefix
    ? await metaQuery
        .gte('codigo_verificacion', `${prefix}-0000-0000-0000-000000000000`)
        .lte('codigo_verificacion', `${prefix}-ffff-ffff-ffff-ffffffffffff`)
        .limit(1)
        .single()
    : await metaQuery.eq('codigo_verificacion', exact).single()

  if (!cert) {
    return { title: 'Certificado verificado' }
  }

  const titular = (cert.metadata_json as Record<string, unknown>)?.titular_nombre as string | undefined
  const co2 = cert.co2_total ? `${parseFloat(String(cert.co2_total)).toFixed(1)} kg CO₂e evitados` : ''
  const desc = [titular, co2].filter(Boolean).join(' · ')

  return {
    title: 'Certificado verificado',
    description: desc || 'Certificado de impacto ambiental verificado en reuso.lurdes.co',
    openGraph: {
      title: titular ? `Certificado de ${titular} — reuso.lurdes.co` : 'Certificado verificado — reuso.lurdes.co',
      description: desc || 'Certificado de impacto ambiental por reúso de objetos',
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

function calcularEquivalencias(co2_kg: number) {
  const arboles = Math.round(co2_kg / 8.0)
  const duchas = Math.round(co2_kg / 2.0)
  const litros = duchas * 90
  const coches = parseFloat((co2_kg / 4600).toFixed(2))
  return { arboles, duchas, litros, coches }
}

// Normaliza el código ingresado para buscar en la BD.
// El display es "RCO2-ABCD-1234" pero codigo_verificacion es UUID.
// Si el input tiene ese formato, extraemos los 8 chars raw y usamos ilike.
function normalizarCodigo(raw: string): { exact: string; prefix: string | null } {
  const upper = raw.trim().toUpperCase()
  const match = upper.match(/^RCO2-([A-Z0-9]{4})-([A-Z0-9]{4})$/)
  if (match) {
    return { exact: raw.trim(), prefix: (match[1] + match[2]).toLowerCase() }
  }
  return { exact: raw.trim(), prefix: null }
}

export default async function VerificarPage({ params }: PageProps) {
  const adminClient = await createAdminClient()
  const { exact, prefix } = normalizarCodigo(params.codigo)

  const query = adminClient
    .from('certificados')
    .select(`
      id, tipo, co2_total, agua_total, fecha_inicio, fecha_fin,
      codigo_verificacion, hash_integridad, pdf_url, metadata_json, created_at,
      user_id, empresa_id, revocado, motivo_revocacion
    `)

  const { data: cert, error } = prefix
    ? await query
        .gte('codigo_verificacion', `${prefix}-0000-0000-0000-000000000000`)
        .lte('codigo_verificacion', `${prefix}-ffff-ffff-ffff-ffffffffffff`)
        .limit(1)
        .single()
    : await query.eq('codigo_verificacion', exact).single()

  // ── NO ENCONTRADO ────────────────────────────────────────────
  if (error || !cert) {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#FFFFFF', fontFamily: "'Open Sans', sans-serif", padding: '24px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(255,94,75,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <ShieldWarning size={34} color="#FF5E4B" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A3A38', margin: '0 0 10px' }}>
            Documento no encontrado
          </h1>
          <p style={{ fontSize: 14, color: '#4D7C79', lineHeight: 1.7, margin: '0 0 20px' }}>
            El código de verificación no corresponde a ningún documento registrado en reuso.lurdes.co.
            Verifica que el enlace esté completo.
          </p>
          <p style={{ fontSize: 11, color: '#7FA8A5', fontFamily: 'monospace' }}>
            Código consultado: {params.codigo}
          </p>
        </div>
      </main>
    )
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

  const eq = calcularEquivalencias(cert.co2_total)
  const meta = cert.metadata_json as { desglose?: Array<{ categoria: string; cantidad: number; co2_kg: number }> } | null
  const desglose = meta?.desglose ?? []

  const codigoFormateado = `RCO2-${cert.codigo_verificacion.slice(0, 4).toUpperCase()}-${cert.codigo_verificacion.slice(4, 8).toUpperCase()}`
  const esTipo = cert.tipo === 'certificado' ? 'Certificado' : 'Informe'
  const titulo = cert.tipo === 'certificado'
    ? 'Certificado de Impacto Ambiental por Reúso'
    : 'Informe de Impacto Ambiental por Reúso'

  return (
    <main style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      fontFamily: "'Open Sans', sans-serif",
      color: '#1A3A38',
    }}>
      {/* Header */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: `1px solid ${revocado ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,130,124,0.12)'}`,
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: revocado ? '#EF4444' : '#00827C' }}>reuso</span>
          <span style={{ fontSize: 18, color: '#4D7C79' }}>.bio</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: revocado ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56,185,142,0.10)',
          padding: '6px 14px', borderRadius: 100,
        }}>
          {revocado ? <FileX size={15} color="#EF4444" /> : <ShieldCheck size={15} color="#1F8C65" />}
          <span style={{ fontSize: 12, fontWeight: 700, color: revocado ? '#B91C1C' : '#1F8C65' }}>
            {revocado ? 'Certificado revocado' : `${esTipo} verificado`}
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: revocado ? 'rgba(239, 68, 68, 0.06)' : 'rgba(0,130,124,0.06)', borderRadius: 100,
            padding: '4px 16px', marginBottom: 16,
          }}>
            {revocado ? <FileX size={13} color="#EF4444" /> : <Leaf size={13} color="#00827C" />}
            <span style={{ fontSize: 11, fontWeight: 600, color: revocado ? '#B91C1C' : '#00827C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {revocado ? 'DOCUMENTO INVÁLIDO' : 'Documento auténtico · reuso.lurdes.co'}
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: revocado ? '#B91C1C' : '#1A3A38', margin: '0 0 8px', lineHeight: 1.25 }}>
            {revocado ? 'Certificado Revocado' : titulo}
          </h1>
          {revocado ? (
            <p style={{ fontSize: 15, color: '#EF4444', fontWeight: 600, margin: 0 }}>
              Motivo: {motivoRevocacion}
            </p>
          ) : (
            empresaNombre && <p style={{ fontSize: 15, color: '#4D7C79', margin: 0 }}>{empresaNombre}</p>
          )}
        </div>

        {/* Card principal */}
        <div style={{
          background: '#FFFFFF',
          border: `1px solid ${revocado ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,130,124,0.12)'}`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: revocado ? '0 4px 20px rgba(239, 68, 68, 0.08)' : '0 2px 12px rgba(0,130,124,0.06)',
          marginBottom: 20,
          opacity: revocado ? 0.7 : 1,
          filter: revocado ? 'grayscale(0.5)' : 'none',
        }}>
          <div style={{ height: 6, background: revocado ? '#EF4444' : '#00827C' }} />

          <div style={{ padding: '28px 28px 24px' }}>
            {/* Beneficiario */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              gap: 16, marginBottom: 24, flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ fontSize: 11, color: '#7FA8A5', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  Otorgado a
                </p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#1A3A38', margin: '0 0 6px' }}>
                  {beneficiario}
                </p>
                {empresaNombre && (
                  <p style={{ fontSize: 13, color: '#4D7C79', margin: 0 }}>{empresaNombre}</p>
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
              background: '#EBF5F4', borderRadius: 10,
              padding: '12px 18px', marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ width: 3, height: 32, background: '#00827C', borderRadius: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, color: '#7FA8A5', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {cert.tipo === 'certificado' ? 'Período de impacto verificado' : 'Período del informe'}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1A3A38', margin: 0 }}>
                  {formatFecha(cert.fecha_inicio ?? cert.created_at)} — {formatFecha(cert.fecha_fin ?? cert.created_at)}
                </p>
              </div>
            </div>

            {/* Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div style={{ background: '#00827C', borderRadius: 12, padding: '20px' }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  CO₂ evitado
                </p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', margin: '0 0 2px', lineHeight: 1 }}>
                  {cert.co2_total.toFixed(2)}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: 0 }}>kilogramos CO₂-eq</p>
              </div>
              <div style={{ background: '#EBF5F4', borderRadius: 12, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Drop size={13} color="#00827C" />
                  <p style={{ fontSize: 10, color: '#7FA8A5', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Agua ahorrada
                  </p>
                </div>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#1A3A38', margin: '0 0 2px', lineHeight: 1 }}>
                  {cert.agua_total.toLocaleString('es-CO')}
                </p>
                <p style={{ fontSize: 12, color: '#4D7C79', margin: 0 }}>litros</p>
              </div>
            </div>

            {/* Equivalencias */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#7FA8A5', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Equivale a...
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {[
                  { icon: <Tree size={18} color="#00827C" />, value: String(eq.arboles), label: 'árboles plantados' },
                  { icon: <Car size={18} color="#4D7C79" />, value: String(eq.coches), label: 'vehículos fuera de circulación' },
                  { icon: <Drop size={18} color="#59A6E4" />, value: eq.litros.toLocaleString('es-CO'), label: 'litros de agua equivalentes' },
                  { icon: <Leaf size={18} color="#38B98E" />, value: String(eq.duchas), label: 'duchas de 10 minutos' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: '#EBF5F4', borderRadius: 10,
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, background: '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#1A3A38', margin: 0, lineHeight: 1.1 }}>
                        {item.value}
                      </p>
                      <p style={{ fontSize: 11, color: '#4D7C79', margin: 0 }}>{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose */}
            {desglose.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#7FA8A5', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Desglose por categoría
                </p>
                <div style={{ border: '1px solid rgba(0,130,124,0.10)', borderRadius: 10, overflow: 'hidden' }}>
                  {desglose.map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px',
                      background: i % 2 === 0 ? '#FFFFFF' : '#EBF5F4',
                      borderBottom: i < desglose.length - 1 ? '1px solid rgba(0,130,124,0.06)' : 'none',
                    }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A3A38' }}>{row.categoria}</span>
                        <span style={{ fontSize: 11, color: '#7FA8A5', marginLeft: 8 }}>
                          {row.cantidad} objeto{row.cantidad !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#00827C' }}>
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
            background: '#EBF5F4', padding: '16px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ fontSize: 10, color: '#7FA8A5', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Código de verificación
              </p>
              <code style={{ fontSize: 15, fontWeight: 700, color: '#00827C', letterSpacing: '0.04em' }}>
                {codigoFormateado}
              </code>
            </div>
            {cert.hash_integridad && (
              <div style={{ flex: 1, minWidth: 200, paddingLeft: 20, borderLeft: '1px solid rgba(0,130,124,0.1)' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                  <ShieldCheck size={12} color="#00827C" />
                  <p style={{ fontSize: 10, color: '#00827C', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Sello de Seguridad Digital
                  </p>
                </div>
                <code style={{ fontSize: 10, fontWeight: 500, color: '#4A4A4A', wordBreak: 'break-all' }}>
                  {cert.hash_integridad}
                </code>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: '#7FA8A5', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Fecha de emisión
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1A3A38', margin: 0 }}>
                {formatFecha(cert.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Botón PDF */}
        {cert.pdf_url && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <a
              href={cert.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', borderRadius: 10,
                background: '#00827C', color: '#FFFFFF',
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}
            >
              Descargar PDF
            </a>
          </div>
        )}

        {/* Prueba de Seguridad Permanente (New Section) */}
        <div style={{
          background: 'rgba(0,130,124,0.03)',
          border: '1px dashed rgba(0,130,124,0.2)',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#00827C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A3A38', margin: 0 }}>Protección de Seguridad Permanente</h3>
              <p style={{ fontSize: 12, color: '#4D7C79', margin: 0 }}>Nosotros garantizamos que nadie ha alterado los datos originales de este registro.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00827C' }} />
                <div style={{ width: 2, flex: 1, background: 'linear-gradient(to bottom, #00827C, transparent)', margin: '4px 0' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#7FA8A5', textTransform: 'uppercase', marginBottom: 2 }}>Código de Seguridad del Registro</p>
                <code style={{ fontSize: 11, color: '#1A3A38', wordBreak: 'break-all' }}>{cert.hash_integridad}</code>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38B98E' }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#7FA8A5', textTransform: 'uppercase', marginBottom: 2 }}>Estado de Autenticidad</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38B98E' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1F8C65' }}>Nosotros confirmamos que este registro es auténtico</span>
                </div>
              </div>
            </div>
          </div>

          {cert.empresa_id && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,130,124,0.1)' }}>
              <p style={{ fontSize: 11, color: '#4D7C79', margin: 0 }}>
                Este documento forma parte de un registro protegido para <strong>{empresaNombre}</strong>. 
                Nosotros anclamos cada registro matemáticamente, lo cual impide cualquier cambio o falsificación en el futuro.
              </p>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#7FA8A5', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
          Factores de emisión basados en ecoinvent, Humana PPP, DEFRA 2023, Comisión Europea.
          Nosotros protegemos este documento con sellos de seguridad digitales que impiden cualquier modificación.
          Verificable de forma independiente en <strong style={{ color: '#4D7C79' }}>reuso.lurdes.co/verificar</strong>.
        </p>

        {/* Manual MagnifyingGlass Footer */}
        <div style={{ 
          borderTop: '1px solid rgba(0,130,124,0.1)', 
          paddingTop: 32, 
          textAlign: 'center',
          maxWidth: 400,
          margin: '0 auto'
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#1A3A38', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Verificar otro código</p>
          <form action="/verificar" method="GET" style={{ position: 'relative' }}>
            <input 
              name="codigo"
              placeholder="RCO2-XXXX-YYYY"
              style={{
                width: '100%',
                padding: '12px 42px 12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(0,130,124,0.15)',
                fontSize: 13,
                outline: 'none',
                background: '#FFFFFF'
              }}
            />
            <button type="submit" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#00827C' }}>
              <MagnifyingGlass size={18} />
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
