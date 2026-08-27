'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { Search as MagnifyingGlass, Sun, Moon, X, ChevronDown as CaretDown, Package, Building2 as Buildings, TrendingUp as TrendUp, LifeBuoy as Lifebuoy, Menu } from '@/components/ui/icons'

interface MenuItem {
  name: string
  link: string
}

interface MenuGroup {
  name: string
  items: MenuItem[]
}

interface SearchResult {
  title: string
  link: string
}

interface LandingHeaderProps {
  menuGroups: MenuGroup[]
  searchResults?: SearchResult[]
  extraActions?: React.ReactNode
  logoHref?: string
  showSearch?: boolean
  isDark?: boolean
  onToggleDark?: () => void
}

export function LandingHeader({
  menuGroups,
  searchResults = [],
  extraActions,
  logoHref = '/',
  showSearch = false,
  isDark: propIsDark,
  onToggleDark
}: LandingHeaderProps) {
  const [localIsDark, setLocalIsDark] = useState(false)
  const isDark = propIsDark !== undefined ? propIsDark : localIsDark
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRefs = useRef<(HTMLDivElement | null)[]>([])
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 })
  const [mounted, setMounted] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [mobileMenuBottom, setMobileMenuBottom] = useState(0)

  useEffect(() => {
    setMounted(true)
    const checkTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme')
      setLocalIsDark(currentTheme === 'dark')
    }
    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const handleMenuEnter = (name: string, idx: number) => {
    if (isMobileNavOpen) return
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current)
    setActiveMenu(name)
    const el = triggerRefs.current[idx]
    if (el) {
      const r = el.getBoundingClientRect()
      setMenuPos({ left: r.left, top: r.bottom + 6 })
    }
    setSearchOpen(false)
  }

  const handleMenuLeave = () => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current)
    menuTimeoutRef.current = setTimeout(() => setActiveMenu(null), 200)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (mobileMenuRef.current?.contains(target) || mobileTriggerRef.current?.contains(target)) return
      if (!target.closest('.nav-group')) {
        setActiveMenu(null)
      }
      if (!target.closest('#mobile-menu-panel') && !target.closest('#mobile-menu-trigger')) {
        setIsMobileNavOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current)
    }
  }, [])

  const toggleDark = () => {
    if (onToggleDark) {
      onToggleDark()
    } else {
      const next = !isDark
      setLocalIsDark(next)
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      localStorage.setItem('theme', next ? 'dark' : 'light')
      localStorage.setItem('reuso-theme', next ? 'dark' : 'light')
    }
  }

  if (!mounted) return null

  const headerStyle: React.CSSProperties = {
    background: isDark ? 'color-mix(in srgb, var(--bg-primary) 50%, transparent)' : 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(8px) saturate(180%)',
    WebkitBackdropFilter: 'blur(8px) saturate(180%)',
    border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1.5px solid rgba(0, 130, 124, 0.1)',
    boxShadow: isDark 
      ? '0 4px 24px rgba(214,243,145,0.12), inset 0 1px 0 rgba(214,243,145,0.15), inset 0 -1px 0 rgba(214,243,145,0.10)' 
      : '0 4px 24px rgba(0,130,124,0.08), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,130,124,0.04)'
  }

  const getGroupIcon = (name: string) => {
    if (name.includes('Producto') || name.includes('Fundamentos')) return Package
    if (name.includes('Industrias') || name.includes('Componentes')) return Buildings
    if (name.includes('Planes') || name.includes('Datos')) return TrendUp
    return Lifebuoy
  }

  const filteredResults = searchResults.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <>
      {/* WRAPPER DEL HEADER TOP */}
      <div className="fixed top-4 lg:top-8 left-0 w-full z-[100] px-4 lg:px-6 flex flex-col items-center gap-4 pointer-events-none">
        
        {/* HEADER PRINCIPAL */}
        <header style={headerStyle} className="flex items-center justify-between w-full max-w-5xl px-4 sm:px-8 py-3 sm:py-4 rounded-[2.5rem] pointer-events-auto transition-all relative z-50">
          <div className="flex items-center gap-3 sm:gap-6 pointer-events-auto flex-shrink-0">

            <Link href={logoHref} className="flex items-center flex-shrink-0">
              <Image 
                src="/logo-completo.svg" 
                alt="Reuso" 
                width={140} 
                height={36} 
                className={`h-7 sm:h-8 w-auto flex-shrink-0 transition-all duration-300 ${isDark ? 'brightness-0 invert' : ''}`} 
                priority 
              />
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold pointer-events-auto">
            {menuGroups.map((group, idx) => {
              const isOpen = activeMenu === group.name
              return (
                <div
                  key={group.name}
                  ref={el => { triggerRefs.current[idx] = el }}
                  className="nav-group py-2 pointer-events-auto"
                  onMouseEnter={() => handleMenuEnter(group.name, idx)}
                  onMouseLeave={handleMenuLeave}
                >
                  <div className={`px-4 py-2 rounded-full cursor-default transition-all flex items-center gap-1.5 ${isOpen ? (isDark ? 'bg-[#D6F391]/10 text-[#D6F391]' : 'bg-[#00827C]/10 text-[#00827C]') : isDark ? 'text-white/60' : 'text-[#474747]/60'}`}>
                    {group.name}
                    <CaretDown size={14} strokeWidth={2.5} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {extraActions}
            {showSearch && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newState = !searchOpen;
                  setSearchOpen(newState);
                  if(newState) {
                    setActiveMenu(null);
                    setTimeout(() => document.getElementById('search-input')?.focus(), 100);
                  }
                }}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all relative z-[100] border shadow-sm hover-press ${searchOpen ? 'hover-rotate-90' : 'hover-pop'} ${searchOpen ? (isDark ? 'bg-[#D6F391] text-[#474747] border-transparent' : 'bg-[#00827C] text-white border-transparent') : (isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white/40 border-white/50 text-[#474747] hover:bg-[#00827C]/10')}`}
              >
                {searchOpen ? <X size={16} strokeWidth={2.5} /> : <MagnifyingGlass size={16} strokeWidth={2.5} />}
              </button>
            )}
            <button aria-label="Cambiar tema" onClick={toggleDark} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all border shadow-sm hover-rotate-180 hover-press ${isDark ? 'bg-[#D6F391] text-[#474747] border-transparent' : 'bg-white/40 border-white/50 hover:bg-[#00827C]/10'}`}>
              {isDark ? <Sun size={16} strokeWidth={2.5} /> : <Moon size={16} strokeWidth={2.5} />}
            </button>
          </div>
        </header>

        {/* BARRA DE BÚSQUEDA FLOTANTE */}
        <div style={headerStyle} className={`w-full max-w-2xl px-6 py-4 rounded-[2.5rem] pointer-events-auto transition-all duration-500 shadow-2xl relative z-50 ${searchOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'}`}>
           <div className="flex items-center gap-4">
             <MagnifyingGlass size={20} className={isDark ? 'text-white/40' : 'text-[#00827C]/40'} />
             <input 
               id="search-input"
               type="text" 
               placeholder="Busca un componente..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               autoComplete="off"
               className={`w-full bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none text-base font-medium shadow-none ${isDark ? 'text-white placeholder:text-white/20' : 'text-[#474747] placeholder:text-[#00827C]/30'}`}
             />
             {searchQuery && (
               <button onClick={() => setSearchQuery('')} className="hover-rotate-90 hover-press">
                 <X size={16} className="opacity-40" />
               </button>
             )}
           </div>

           {/* RESULTADOS DE BÚSQUEDA */}
           {searchQuery && (
             <div className={`absolute bottom-[calc(100%+12px)] left-0 w-full rounded-3xl p-3 border shadow-2xl z-[70] ${isDark ? 'bg-[#1A1A1A]/95 border-white/10 backdrop-blur-2xl' : 'bg-white/95 border-[#00827C]/10 backdrop-blur-2xl'}`}>
                <div className="grid grid-cols-2 gap-2">
                  {filteredResults.slice(0, 8).map((r, i) => (
                    <a 
                      key={i} 
                      href={r.link} 
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${isDark ? 'hover:bg-white/10 text-white/80' : 'hover:bg-[#00827C]/5 text-[#474747] hover:text-[#00827C]'}`}
                      onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    >
                      <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-[#D6F391]' : 'bg-[#00827C]'} opacity-40`} />
                      <span className="font-bold text-sm">{r.title}</span>
                    </a>
                  ))}
                  {filteredResults.length === 0 && <div className="col-span-2 px-4 py-8 text-center text-sm opacity-50">No hay coincidencias para tu búsqueda</div>}
                </div>
             </div>
           )}
        </div>
      </div>

      {/* FOOTER MÓVIL (Sustituye al hamburger) */}
      <nav 
        className="fixed bottom-4 left-4 right-4 z-[100] flex lg:hidden justify-around items-center h-[72px] px-2 rounded-[2.5rem] pointer-events-auto"
        style={headerStyle}
      >
        {menuGroups.slice(0, 3).map((group, idx) => {
          const Icon = getGroupIcon(group.name)
          return (
            <button
              key={idx}
              onClick={() => {
                const el = document.querySelector(group.items[0].link)
                if (el) el.scrollIntoView({ behavior: 'smooth' })
                setIsMobileNavOpen(false)
              }}
              className="flex flex-col items-center gap-1 hover-pop hover-press w-16"
              style={{
                color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(71, 71, 71, 0.6)',
                transition: 'color 0.2s ease',
              }}
            >
              <Icon size={26} strokeWidth={2} />
              <span style={{ fontSize: 10, fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>
                {group.name}
              </span>
            </button>
          )
        })}

        {/* BOTÓN MÁS (Oculto temporalmente) */}
        <button
          id="mobile-menu-trigger"
          ref={mobileTriggerRef}
          onClick={() => {
            setMobileMenuBottom(88); // 72px height + 16px bottom
            setIsMobileNavOpen(!isMobileNavOpen);
          }}
          className={`hidden flex-col items-center gap-1 w-16 ${isMobileNavOpen ? 'hover-rotate-90 hover-press' : 'hover-wiggle hover-press'}`}
          style={{
            display: 'none',
            color: isMobileNavOpen ? (isDark ? '#D6F391' : '#006B66') : (isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(71, 71, 71, 0.6)'),
            transition: 'color 0.2s ease',
          }}
        >
          {isMobileNavOpen ? <X size={26} strokeWidth={2.5} /> : <Menu size={26} />}
          <span style={{ fontSize: 10, fontWeight: isMobileNavOpen ? 700 : 500 }}>Más</span>
        </button>
      </nav>

      {/* MENÚ MÓVIL (Drawer) */}
      {mounted && isMobileNavOpen && createPortal(
        <div className="fixed inset-0 z-[9999] lg:hidden">
          <div className="absolute inset-0" onClick={() => setIsMobileNavOpen(false)} />

          <div
            id="mobile-menu-panel"
            ref={mobileMenuRef}
            className={`absolute mx-4 p-6 rounded-[2.5rem] border shadow-2xl ${isDark ? 'bg-[#121212] border-white/10' : 'bg-white border-[#00827C]/10'}`}
            style={{
              bottom: mobileMenuBottom,
              left: 0,
              right: 0,
              transformOrigin: 'bottom left',
              animation: 'mobileMenuIn 0.22s cubic-bezier(0.22,1,0.36,1) forwards'
            }}
          >
            <div className="flex justify-between items-center mb-6">
               <div className={`text-[10px] font-black tracking-[0.2em] ${isDark ? 'text-[#D6F391]' : 'text-[#00827C]'}`}>Menú de Navegación</div>
               <button onClick={() => setIsMobileNavOpen(false)} className={`w-8 h-8 rounded-full flex items-center justify-center hover-rotate-90 hover-press ${isDark ? 'bg-white/10 text-white' : 'bg-[#00827C]/5 text-[#00827C]'}`}><X size={16} strokeWidth={2.5} /></button>
            </div>
            
            <div className="grid grid-cols-1 gap-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
               {menuGroups.map((group, gIdx) => (
                 <div key={gIdx} className="space-y-3">
                   <div className={`text-[9px] font-black opacity-30 ${isDark ? 'text-white' : 'text-[#474747]'}`}>{group.name}</div>
                   <div className="flex flex-col gap-1">
                     {group.items.map((item, i) => (
                       <a
                         key={i}
                         href={item.link}
                         onClick={(e) => {
                           setIsMobileNavOpen(false)
                           const targetEl = document.querySelector(item.link)
                           if (targetEl) {
                             e.preventDefault()
                             targetEl.scrollIntoView({ behavior: 'smooth' })
                           }
                         }}
                         className={`block py-3 px-4 rounded-xl text-[13px] font-bold tracking-tight transition-all active:scale-95 ${isDark ? 'text-white/70 hover:bg-white/10 hover:text-[#D6F391]' : 'text-[#00827C]/70 hover:bg-[#00827C]/5 hover:text-[#00827C]'}`}
                       >
                         {item.name}
                       </a>
                     ))}
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DROPDOWN PORTAL DESKTOP */}
      {mounted && activeMenu && createPortal(
          <div
            className="nav-group pointer-events-auto hidden lg:block"
            style={{ 
              position: 'fixed', 
              left: menuPos.left, 
              top: menuPos.top, 
              zIndex: 99999, 
              minWidth: 220
            }}
          onMouseEnter={() => { if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current) }}
          onMouseLeave={handleMenuLeave}
        >
          <div className={`p-2 rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.25)] ${isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-[#00827C]/12'}`}>
            <div className="flex flex-col gap-1 p-1">
              {menuGroups.find(g => g.name === activeMenu)?.items.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  onClick={(e) => {
                    setActiveMenu(null)
                    const targetEl = document.querySelector(item.link)
                    if (targetEl) {
                      e.preventDefault()
                      targetEl.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  className={`block px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-colors cursor-pointer ${isDark ? 'text-white/80 hover:bg-white/10 hover:text-[#D6F391]' : 'text-[#474747] hover:bg-[#00827C]/8 hover:text-[#00827C]'}`}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
