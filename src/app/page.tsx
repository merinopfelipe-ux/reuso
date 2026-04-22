'use client'
import { useState } from 'react'
import { LeadsForm } from '@/components/leads-form'
import Link from 'next/link'
import Image from 'next/image'
import {
  Check, CaretDown, ChatCircle, ArrowRight, X, TrendUp, Medal, Users } from '@phosphor-icons/react'
import { CURRENCIES, ANNUAL_DISCOUNT, PLANS, VALUE_PROPS } from '@/lib/constants/pricing'
import { waLink } from '@/lib/constants/contacto'

// ─── Constantes de color ─────────────────────────────────────────────────────
const C = {
  brand: '#00827C',
  brandHover: '#006B66',
  dark: '#1A3A38',
  mid: '#4D7C79',
  light: 'rgba(0,130,124,0.06)',
  border: 'rgba(0,130,124,0.10)',
  borderMid: 'rgba(0,130,124,0.20)',
  shadow: '0 4px 24px rgba(0,130,124,0.10)',
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────
function WhatsAppButton() {
  return (
    <a
      href={waLink('Hola, quiero más información sobre los planes de la Calculadora de Reúso.')}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed', bottom: 24, right: 24,
        width: 56, height: 56,
        background: '#25D366', borderRadius: '50%',
        boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, textDecoration: 'none',
        transition: 'transform 0.2s',
      }}
      title="Chat con nosotros"
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <ChatCircle size={28} color="#fff" fill="#fff" />
    </a>
  )
}

function PlanPrice({ plan, currency, billing }: { plan: (typeof PLANS)[0]; currency: string; billing: string }) {
  if (plan.priceMonthlyCOP === 0) {
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: C.dark }}>Gratis</div>
        <div style={{ fontSize: 12, color: C.mid, marginTop: 4 }}>Sin tarjeta de crédito</div>
      </div>
    )
  }
  const c = CURRENCIES[currency as keyof typeof CURRENCIES]
  const amount = billing === 'monthly' ? plan.priceMonthlyCOP * c.rate : plan.priceMonthlyCOP * c.rate * ANNUAL_DISCOUNT
  const annualTotal = billing === 'annual' ? plan.priceMonthlyCOP * 12 * c.rate * ANNUAL_DISCOUNT : null
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>{c.symbol}</span>
        <span style={{ fontSize: 36, fontWeight: 900, color: C.dark, lineHeight: 1 }}>{c.format(amount)}</span>
        <span style={{ fontSize: 12, color: C.mid, marginLeft: 2 }}>{c.code}/mes</span>
      </div>
      {billing === 'annual' && annualTotal !== null && (
        <div style={{ marginTop: 8 }}>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 800,
            background: C.light, color: C.brand,
            padding: '2px 8px', borderRadius: 6, marginBottom: 4,
          }}>2 meses gratis</span>
          <div style={{ fontSize: 11, color: C.mid }}>
            Facturado anual · {c.symbol}{c.format(annualTotal)} {c.code}/año
          </div>
        </div>
      )}
    </div>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'none',
          border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>{q}</span>
        <CaretDown
          size={18}
          color={C.mid}
          style={{ transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        />
      </button>
      <div style={{
        overflow: 'hidden', maxHeight: open ? 300 : 0,
        transition: 'max-height 0.3s ease, opacity 0.3s',
        opacity: open ? 1 : 0,
      }}>
        <p style={{ fontSize: 14, color: C.mid, lineHeight: 1.7, marginTop: 12 }}>{a}</p>
      </div>
    </div>
  )
}

// ─── Landing principal ───────────────────────────────────────────────────────
export default function LandingPage() {
  const [currency, setCurrency] = useState('COP')
  const [billing, setBilling] = useState('monthly')

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .hero-left { animation: slideUp 0.7s ease-out forwards; }
        .hero-right { animation: fadeIn 0.9s ease-out 0.2s both; }
        * { box-sizing: border-box; }
        @media (max-width:768px) {
          .nav-links { display:none !important; }
          .hero-grid { grid-template-columns:1fr !important; }
          .sincon-grid { grid-template-columns:1fr !important; }
          .features-grid { grid-template-columns:1fr 1fr !important; }
          .stats-grid { grid-template-columns:1fr !important; }
          .plans-grid { grid-template-columns:1fr !important; }
          .logos-strip { flex-wrap:wrap !important; gap:12px !important; }
          .footer-grid { grid-template-columns:1fr !important; }
          .hero-ctas { flex-direction:column !important; }
        }
        @media (max-width:480px) {
          .features-grid { grid-template-columns:1fr !important; }
        }
      ` }} />

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`, zIndex: 100,
        padding: '14px 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Image src="/logo-completo.svg" alt="Calculadora de Reúso" width={140} height={40} style={{ height: 32, width: 'auto' }} />
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <a href="#ventajas" style={{ fontSize: 13, fontWeight: 600, color: C.mid, textDecoration: 'none' }}>Ventajas</a>
            <a href="#precios" style={{ fontSize: 13, fontWeight: 600, color: C.mid, textDecoration: 'none' }}>Precios</a>
            <a href="#contacto" style={{ fontSize: 13, fontWeight: 600, color: C.mid, textDecoration: 'none' }}>Demo</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/login" style={{
              padding: '8px 18px', borderRadius: 10,
              border: `1.5px solid ${C.border}`, color: C.dark,
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>Iniciar sesión</Link>
            <Link href="/registro" style={{
              padding: '8px 18px', borderRadius: 10,
              background: C.brand, color: '#fff',
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
              boxShadow: `0 4px 12px rgba(0,130,124,0.25)`,
            }}>Empezar gratis</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, overflow: 'hidden' }}>
        <div className="hero-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 64, alignItems: 'center' }}>
          <div className="hero-left">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', background: C.light,
              border: `1px solid ${C.border}`, borderRadius: 100, marginBottom: 28,
            }}>
              <span style={{ width: 6, height: 6, background: C.brand, borderRadius: '50%' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: C.brand, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Plataforma de Impacto Ambiental
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontWeight: 900, color: C.dark, lineHeight: 1.05, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
              Certifica el <span style={{ color: C.brand }}>impacto</span><br />
              de lo que tu empresa<br />
              no tira.
            </h1>
            <p style={{ fontSize: 16, color: C.mid, lineHeight: 1.75, marginBottom: 36, maxWidth: 480 }}>
              La primera plataforma que certifica el CO₂ evitado al reutilizar. Rigor científico, certificados con QR verificable y reportes ESG listos para auditoría.
            </p>
            <div className="hero-ctas" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/registro" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 14,
                background: C.brand, color: '#fff',
                fontSize: 15, fontWeight: 800, textDecoration: 'none',
                boxShadow: `0 6px 20px rgba(0,130,124,0.28)`,
              }}>
                Empezar gratis
                <ArrowRight size={16} />
              </Link>
              <a href="#contacto" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 14,
                border: `2px solid ${C.borderMid}`, color: C.dark,
                fontSize: 15, fontWeight: 700, textDecoration: 'none',
                background: '#fff',
              }}>
                Solicitar demo
              </a>
            </div>
            <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex' }}>
                {['#D6F391','#8AD0B2','#F3BBD3'].map((c, i) => (
                  <div key={i} style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: c, border: '2px solid #fff',
                    marginLeft: i > 0 ? -8 : 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: C.dark,
                  }}>+</div>
                ))}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.mid }}>+100 organizaciones midiendo su impacto</span>
            </div>
          </div>

          <div className="hero-right">
            <div style={{
              background: '#fff', padding: 8,
              borderRadius: 28, boxShadow: `0 20px 60px rgba(0,130,124,0.12)`,
              border: `1px solid ${C.border}`,
            }}>
              <LeadsForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGOS STRIP ──────────────────────────────────────────────────── */}
      <section style={{
        padding: '28px 24px',
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        background: '#fff',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.mid, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>
            Organizaciones que ya certifican su impacto
          </p>
          <div className="logos-strip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'nowrap' }}>
            {['Econova', 'Textil Sur', 'GreenDesk', 'Muebles Patio', 'Ropa Circular', 'EcoBox'].map((name, i) => (
              <span key={i} style={{ fontSize: 15, fontWeight: 700, color: 'rgba(77,124,121,0.5)', whiteSpace: 'nowrap' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SIN / CON ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: C.dark, margin: '0 0 12px' }}>
              La diferencia entre reportar y certificar
            </h2>
            <p style={{ fontSize: 15, color: C.mid }}>Tus clientes e inversores ya saben distinguir entre datos y evidencia.</p>
          </div>
          <div className="sincon-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Sin Reúso */}
            <div style={{
              padding: '32px 28px', borderRadius: 20,
              background: 'rgba(0,0,0,0.025)',
              border: '1px solid rgba(0,0,0,0.07)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color="#EF4444" strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#EF4444' }}>Sin Reúso</span>
              </div>
              {[
                'Reportas intenciones, no hechos verificables',
                'Documentos editables sin trazabilidad',
                'Auditorías ESG costosas y lentas',
                'Impacto ambiental no cuantificado',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                  <X size={14} color="#EF4444" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            {/* Con Reúso */}
            <div style={{
              padding: '32px 28px', borderRadius: 20,
              background: C.light,
              border: `1px solid ${C.borderMid}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,130,124,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={16} color={C.brand} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.brand }}>Con Reúso</span>
              </div>
              {[
                'Certificados con código QR verificable en tiempo real',
                'Cada dato firmado digitalmente, inmutable',
                'Reportes ESG listos para auditoría en minutos',
                'CO₂ cuantificado con factores científicos trazables',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                  <Check size={14} color={C.brand} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.dark, lineHeight: 1.5, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── VENTAJAS ─────────────────────────────────────────────────────── */}
      <section id="ventajas" style={{ padding: '80px 24px', background: '#fff', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: C.dark, margin: '0 0 12px' }}>
              La seguridad de un dato inalterable
            </h2>
            <p style={{ fontSize: 15, color: C.mid, maxWidth: 520, margin: '0 auto' }}>
              Tecnología de trazabilidad para que cada kilogramo de CO₂ reportado sea 100% verificable.
            </p>
          </div>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {VALUE_PROPS.map((prop, i) => (
              <div key={i} style={{
                padding: '28px 24px', borderRadius: 20,
                background: '#fff', border: `1px solid ${C.border}`,
                boxShadow: '0 2px 12px rgba(0,130,124,0.06)',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,130,124,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,130,124,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: C.light, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                }}>
                  <prop.Icon size={26} color={C.brand} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: C.dark, marginBottom: 8 }}>{prop.title}</h3>
                <p style={{ fontSize: 13, color: C.mid, lineHeight: 1.65, margin: 0 }}>{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DARK CTA BAND ────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 24px', background: C.dark,
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Tu empresa ya está lista para medir impacto
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 36 }}>
            Sin tarjeta de crédito. Activa en 5 minutos.
          </p>
          <Link href="/registro" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '16px 36px', borderRadius: 14,
            background: C.brand, color: '#fff',
            fontSize: 16, fontWeight: 800, textDecoration: 'none',
            boxShadow: `0 6px 24px rgba(0,130,124,0.35)`,
          }}>
            Crear cuenta gratuita
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        <div className="stats-grid" style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40, textAlign: 'center' }}>
          {[
            { icon: TrendUp, value: '2.400', unit: 'kg', label: 'CO₂ evitados en total' },
            { icon: Medal, value: '180', unit: 'ton', label: 'reutilizadas y certificadas' },
            { icon: Users, value: '+100', unit: '', label: 'organizaciones activas' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: C.light, display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 8,
              }}>
                <s.icon size={24} color={C.brand} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 900, color: C.dark, lineHeight: 1 }}>{s.value}</span>
                {s.unit && <span style={{ fontSize: 20, fontWeight: 700, color: C.brand }}>{s.unit}</span>}
              </div>
              <p style={{ fontSize: 13, color: C.mid, margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="precios" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, color: C.dark, margin: '0 0 12px' }}>
              Elige tu escala de impacto
            </h2>
            <p style={{ fontSize: 15, color: C.mid, marginBottom: 36 }}>
              Planes diseñados para cada etapa de tu camino hacia la circularidad.
            </p>
            {/* Switches */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 48 }}>
              <div style={{ display: 'inline-flex', background: '#fff', padding: 4, borderRadius: 14, border: `1px solid ${C.border}` }}>
                {Object.keys(CURRENCIES).map((c) => (
                  <button key={c} onClick={() => setCurrency(c)} style={{
                    padding: '8px 20px', borderRadius: 10,
                    fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer',
                    background: currency === c ? C.brand : 'transparent',
                    color: currency === c ? '#fff' : C.mid,
                    transition: 'all 0.2s',
                  }}>{c}</button>
                ))}
              </div>
              <div style={{ display: 'inline-flex', background: '#fff', padding: 4, borderRadius: 14, border: `1px solid ${C.border}` }}>
                {[{ key: 'monthly', label: 'Mensual' }, { key: 'annual', label: 'Anual' }].map((b) => (
                  <button key={b.key} onClick={() => setBilling(b.key)} style={{
                    padding: '8px 20px', borderRadius: 10,
                    fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer',
                    background: billing === b.key ? C.brand : 'transparent',
                    color: billing === b.key ? '#fff' : C.mid,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s',
                  }}>
                    {b.label}
                    {b.key === 'annual' && (
                      <span style={{
                        padding: '1px 6px', borderRadius: 5, fontSize: 9, fontWeight: 900,
                        background: billing === 'annual' ? 'rgba(255,255,255,0.2)' : C.light,
                        color: billing === 'annual' ? '#fff' : C.brand,
                      }}>2 meses gratis</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, alignItems: 'stretch' }}>
            {PLANS.map((plan) => (
              <div key={plan.id} style={{
                position: 'relative', display: 'flex', flexDirection: 'column',
                padding: '28px 24px', borderRadius: 24,
                background: '#fff',
                border: plan.popular ? `2px solid ${C.brand}` : `1px solid ${C.border}`,
                boxShadow: plan.popular ? `0 12px 40px rgba(0,130,124,0.14)` : '0 2px 12px rgba(0,130,124,0.05)',
                transition: 'transform 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    padding: '4px 16px', background: C.brand, color: '#fff',
                    fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em',
                    borderRadius: 100, boxShadow: C.shadow, whiteSpace: 'nowrap',
                  }}>Más recomendado</div>
                )}
                {plan.isFuture && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    padding: '4px 16px', background: '#AD7C43', color: '#fff',
                    fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em',
                    borderRadius: 100, whiteSpace: 'nowrap',
                  }}>Próximamente</div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 900, color: C.dark, margin: '0 0 4px' }}>{plan.name}</h3>
                  <p style={{ fontSize: 11, color: C.mid, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, lineHeight: 1.4 }}>{plan.tagline}</p>
                </div>

                <PlanPrice plan={plan} currency={currency} billing={billing} />

                <div style={{ flex: 1, marginBottom: 24 }}>
                  <div style={{
                    padding: '12px 14px', background: 'rgba(0,130,124,0.05)',
                    borderRadius: 12, marginBottom: 16,
                  }}>
                    {[
                      { label: 'Miembros', val: plan.limits.empleados },
                      { label: 'Cálculos', val: plan.limits.calculos },
                      { label: 'Certificados', val: plan.limits.certificados },
                    ].map((row, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: 11, fontWeight: 700, color: C.dark,
                        marginBottom: i < 2 ? 8 : 0,
                      }}>
                        <span>{row.label}:</span>
                        <span style={{ color: C.brand }}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {plan.features.map((f: string, idx: number) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: C.light, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                        }}>
                          <Check size={9} color={C.brand} strokeWidth={3} />
                        </div>
                        <span style={{ fontSize: 12, color: C.mid, fontWeight: 500, lineHeight: 1.4 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {plan.isFuture ? (
                  <div style={{
                    display: 'block', padding: '13px', borderRadius: 12,
                    background: 'rgba(0,0,0,0.04)', border: `1px solid rgba(0,0,0,0.08)`,
                    color: '#9CA3AF', fontSize: 13, fontWeight: 800,
                    textAlign: 'center', cursor: 'not-allowed',
                  }}>Próximamente</div>
                ) : plan.id === 'free' || plan.id === 'lab' ? (
                  <Link href="/registro" style={{
                    display: 'block', padding: '13px', borderRadius: 12,
                    background: plan.popular ? C.brand : '#fff',
                    border: plan.popular ? 'none' : `2px solid ${C.borderMid}`,
                    color: plan.popular ? '#fff' : C.brand,
                    fontSize: 13, fontWeight: 800, textAlign: 'center', textDecoration: 'none',
                    boxShadow: plan.popular ? `0 4px 16px rgba(0,130,124,0.22)` : 'none',
                  }}>{plan.cta}</Link>
                ) : (
                  <a
                    href={waLink(`Hola, me interesa el plan ${plan.name}.`)}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'block', padding: '13px', borderRadius: 12,
                      background: '#fff', border: `2px solid ${C.border}`,
                      color: C.brand, fontSize: 13, fontWeight: 800,
                      textAlign: 'center', textDecoration: 'none',
                    }}
                  >{plan.cta}</a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#fff', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: C.dark, margin: '0 0 10px' }}>
              Preguntas frecuentes
            </h2>
            <p style={{ fontSize: 14, color: C.mid }}>Todo lo que necesitas saber sobre el servicio.</p>
          </div>
          <div>
            {[
              { q: '¿Cómo contrato un plan?', a: 'Elige tu plan y escríbenos por WhatsApp. Te enviamos los datos para transferencia bancaria. Una vez compartido el comprobante, activamos tu cuenta en minutos.' },
              { q: '¿Puedo cambiar de plan cuando quiera?', a: 'Sí, puedes subir o bajar de nivel en cualquier momento del mes. Si subes de plan, solo pagas la diferencia proporcional.' },
              { q: '¿Los certificados tienen validez legal?', a: 'Nuestros certificados tienen rigor técnico basado en factores de emisión científicos trazables. Son ideales para reportes de sostenibilidad y auditorías ESG.' },
              { q: '¿Qué pasa con mis datos si cancelo?', a: 'Tus datos permanecen seguros por 12 meses aunque canceles, para que puedas exportarlos o consultarlos si regresas.' },
            ].map((faq, i) => <FAQItem key={i} {...faq} />)}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ background: C.dark, padding: '72px 24px 32px' }}>
        <div className="footer-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <Image src="/logo-completo.svg" alt="Reuso" width={140} height={40} style={{ height: 32, width: 'auto', filter: 'brightness(0) invert(1)', marginBottom: 20 }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 260 }}>
              La plataforma líder en certificación de impacto ambiental por reúso en Latinoamérica. Un producto de Grupo MLP S.A.S.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Plataforma</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: 'Ventajas', href: '#ventajas' },
                { label: 'Precios', href: '#precios' },
                { label: 'Verificar Certificado', href: '/verificar' },
              ].map((l, i) => (
                <li key={i} style={{ marginBottom: 12 }}>
                  <a href={l.href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Canales</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: 'WhatsApp Soporte', href: waLink('Hola, quiero soporte de la Calculadora de Reúso.') },
                { label: 'servicio@lurdes.co', href: 'mailto:servicio@lurdes.co' },
              ].map((l, i) => (
                <li key={i} style={{ marginBottom: 12 }}>
                  <a href={l.href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Legal</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: 'Términos de Uso', href: '/legal/reglamento' },
                { label: 'Privacidad', href: '/legal/privacidad' },
              ].map((l, i) => (
                <li key={i} style={{ marginBottom: 12 }}>
                  <Link href={l.href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.18em', textAlign: 'center', margin: 0 }}>
            © {new Date().getFullYear()} Grupo MLP S.A.S. · Medellín, Colombia
          </p>
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  )
}
