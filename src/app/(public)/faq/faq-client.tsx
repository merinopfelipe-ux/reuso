'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronDown as CaretDown, ArrowLeft } from '@/components/ui/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { CLUSTERS_FAQ } from '@/lib/faq/preguntas-frecuentes'

function FAQItem({ q, a, isDark }: { q: string; a: string; isDark: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="py-1.5 sm:py-2 transition-all duration-200">
      <button
        onClick={() => setOpen(!open)}
        className={`group w-full flex items-center justify-between gap-4 text-left p-3.5 sm:p-4 rounded-2xl transition-all duration-300 ${
          open
            ? isDark ? 'bg-white/5 shadow-inner' : 'bg-[#00827C]/5 shadow-inner'
            : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-[#00827C]/[0.04]'
        }`}
      >
        <span className={`text-sm sm:text-base font-bold transition-colors duration-200 ${
          open
            ? isDark ? 'text-[#D6F391]' : 'text-[#00827C]'
            : isDark ? 'text-white group-hover:text-[#D6F391]' : 'text-[#474747] group-hover:text-[#00827C]'
        }`}>
          {q}
        </span>
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
          open
            ? isDark ? 'bg-[#D6F391] text-[#474747] rotate-180 shadow-sm' : 'bg-[#00827C] text-white rotate-180 shadow-sm'
            : isDark ? 'bg-white/5 text-white/60 group-hover:bg-[#D6F391]/20 group-hover:text-[#D6F391]' : 'bg-[#00827C]/5 text-[#00827C] group-hover:bg-[#00827C]/15 group-hover:text-[#00827C]'
        }`}>
          <CaretDown size={16} strokeWidth={2.5} />
        </div>
      </button>
      {open && (
        <div className="overflow-hidden px-3 sm:px-4">
          <p className={`text-sm sm:text-base leading-relaxed py-3 font-medium ${isDark ? 'text-white/75' : 'text-[#474747]/80'}`}>{a}</p>
        </div>
      )}
      <div className={`w-full h-px mt-1 bg-gradient-to-r from-transparent ${isDark ? 'via-white/10' : 'via-[#00827C]/10'} to-transparent`} />
    </div>
  )
}

export function FaqClient() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  const tp = isDark ? 'text-white' : 'text-[#474747]'
  const ts = isDark ? 'text-white/70' : 'text-[#474747]/70'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(12px)',
          background: isDark ? 'rgba(71,71,71,0.6)' : 'rgba(255,255,255,0.6)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,130,124,0.1)'}`,
        }}
        className="px-4 sm:px-6 py-3 flex items-center justify-between"
      >
        <Link href="/" className={`inline-flex items-center gap-1.5 text-sm font-semibold ${tp} hover-pop`}>
          <ArrowLeft size={16} />
          Inicio
        </Link>
        <ThemeToggle />
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <p className={`text-xs sm:text-sm font-bold tracking-wide mb-2 ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>
          PREGUNTAS FRECUENTES
        </p>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-4 ${tp}`}>
          Sostenibilidad, impacto ambiental y economía circular
        </h1>
        <p className={`text-sm sm:text-base leading-relaxed mb-10 max-w-xl ${ts}`}>
          Respuestas honestas sobre sostenibilidad, impacto ambiental, responsabilidad social, huella de carbono y economía circular — incluidas las preguntas que no podemos responder con certeza o que no forman parte de lo que hace la Calculadora de Reúso.
        </p>

        {CLUSTERS_FAQ.map(cluster => (
          <section key={cluster.slug} id={cluster.slug} className="scroll-mt-24 mb-10">
            <h2 className={`text-lg sm:text-xl font-extrabold tracking-tight mb-3 ${tp}`}>
              {cluster.cluster}
            </h2>
            <div>
              {cluster.items.map((item, i) => (
                <FAQItem key={i} q={item.q} a={item.a} isDark={isDark} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
