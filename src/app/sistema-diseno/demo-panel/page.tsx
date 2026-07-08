'use client'

import React, { useState } from 'react'
import {
  List,
  LayoutGrid as SquaresFour,
  Building2 as Buildings,
  Layers as Stack,
  Settings as Gear,
  Calculator,
  TrendingUp as TrendUp,
  LogOut as SignOut,
  Sun,
  Moon,
  ChevronRight as CaretRight,
  Leaf,
  Scale as Scales,
} from 'lucide-react'

export default function LayoutDemoPage() {
  const [isDark, setIsDark] = useState(true)
  const [isSidebarExpanded] = useState(true)
  const [isSidebarLocked, setIsSidebarLocked] = useState(false)
  const [, setIsSidebarHovered] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  
  // LOGICA DINAMICA PARA EL DEMO (Soluciona el problema de "siempre Resumen")
  const [activeTab, setActiveTab] = useState('Resumen') 

  const toggleDark = () => setIsDark(!isDark)

  // Variables de color institucionales
  const colorLurdes = '#474747'
  const colorPistacho = '#D6F391'
  
  const bgApp = isDark ? '#121212' : '#F8FAFB'
  const bgGlass = isDark ? 'rgba(71, 71, 71, 0.4)' : 'rgba(255, 255, 255, 0.7)'
  const borderGlass = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'

  const glassStyle: React.CSSProperties = {
    backdropFilter: 'blur(40px) saturate(150%)',
    backgroundColor: bgGlass,
    border: `1px solid ${borderGlass}`,
    boxShadow: isDark 
      ? '0 8px 32px 0 rgba(71, 71, 71, 0.8), inset 0 0 0 1px rgba(255,255,255,0.05)' 
      : 'inset 2px 2px 10px rgba(255,255,255,0.05), 0 8px 32px 0 rgba(0, 0, 0, 0.25)',
    borderRadius: '16px'
  }

  const menuItems = [
    { label: 'Resumen', icon: SquaresFour },
    { label: 'Gestión', icon: Buildings, hasSub: true },
    { label: 'Impacto', icon: TrendUp, hasSub: true },
    { label: 'Sistema', icon: Gear, hasSub: true },
    { label: 'Recursos', icon: Stack, hasSub: true },
    { label: 'Legales', icon: Scales },
    { label: 'Cotizador', icon: Calculator },
  ]

  return (
    <div className={`h-screen w-full flex flex-col font-sans transition-colors duration-500 overflow-hidden text-current`} 
         style={{ backgroundColor: bgApp, color: isDark ? '#FFFFFF' : colorLurdes }}>
      
      {/* 1. CABECERA */}
      <header className="w-full h-20 flex items-center justify-between px-8 z-50 transition-colors"
              style={{ backgroundColor: isDark ? 'transparent' : '#F4F7F6' }}>        <div className="flex items-center gap-8">
          <button 
            onMouseEnter={() => setIsSidebarHovered(true)}
            onClick={() => setIsSidebarLocked(!isSidebarLocked)}
            className="flex flex-col items-center justify-center gap-1 group transition-all duration-300 hover:scale-95 active:scale-90"
            style={{ color: '#FFFFFF' }}
          >
            <List size={22} strokeWidth={2.5} />
            <span className="text-[11px] font-black tracking-widest opacity-90">Menú</span>
          </button>
          
          <div className="flex items-center gap-3 select-none">
             <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-white/10">
               <Leaf size={24} color="#00827C" strokeWidth={2.5} />
             </div>
             <div className="flex flex-col leading-[1.1]">
               <span className="text-lg font-bold tracking-tighter" style={{ color: '#FFFFFF' }}>REÚSO</span>
               <span className="text-[10px] font-bold tracking-[0.1em] opacity-60" style={{ color: colorPistacho }}>Sostenible</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={toggleDark} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            {isDark ? <Sun size={20} color="#FFFFFF" /> : <Moon size={20} color="#FFFFFF" />}
          </button>
          <div className="flex items-center gap-3 pl-6 border-l border-white/15">
             <div className="flex flex-col items-end">
               <span className="text-sm font-bold text-white">Pipe Merino</span>
               <span className="text-[10px] font-bold opacity-50 text-white/70">Master Admin</span>
             </div>
             <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm bg-[#D6F391] text-[#474747]">P</div>
          </div>
        </div>
      </header>

      {/* 2. BODY CON SIDEBAR Y SUBMENÚ */}
      <div className="flex flex-1 overflow-hidden relative">
        
        <aside 
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className={`h-full flex flex-shrink-0 flex-col py-8 transition-all duration-300 ease-in-out relative z-40 ${isSidebarExpanded ? 'w-[260px]' : 'w-[70px]'} overflow-visible`}
          style={{ 
            backgroundColor: isDark ? '#474747' : '#006B66',
            borderRight: isDark ? '1px solid rgba(255,255,255,0.05)' : 'none',
            boxShadow: '15px 0 40px rgba(0,0,0,0.12)',
            borderRadius: 0,
          }}
        >
          <nav className="flex flex-col flex-1 gap-2 no-scrollbar overflow-y-auto" style={{ paddingLeft: 12 }}>
            {menuItems.map((item, idx) => {
              const isPageActive = item.label === activeTab
              const isInteracting = openSubmenu === item.label
              const isActive = isPageActive || isInteracting
              
              const activeBg = isDark ? '#474747' : '#FFFFFF'
              const activeColor = isDark ? '#FFFFFF' : '#00827C'

              return (
                <div key={idx} className="relative group/item">
                  <button 
                    onClick={() => {
                      if (item.hasSub) {
                        setOpenSubmenu(openSubmenu === item.label ? null : item.label)
                      } else {
                        setActiveTab(item.label)
                        setOpenSubmenu(null)
                      }
                    }}
                    className={`w-full group flex items-center px-4 py-3 transition-all duration-400 relative overflow-hidden
                      ${isSidebarExpanded ? 'justify-between' : 'justify-center'}
                      ${isActive ? 'reuso-nav-active' : 'hover:bg-white/5'}`}
                    style={{ 
                      borderRadius: '16px 0 0 16px',
                      background: isActive ? activeBg : 'transparent',
                      color: isActive ? activeColor : '#FFFFFF',
                      boxShadow: (isActive && !isDark) ? '0 4px 20px rgba(0,0,0,0.12)' : 'none'
                    }}
                  >
                    {/* INDICADOR ACTIVO A LA IZQUIERDA (Pill) */}
                    {isPageActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-white z-20" style={{ borderRadius: '0 4px 4px 0' }} />
                    )}

                    <div className="flex items-center gap-4 min-w-0">
                      <item.icon 
                        size={20} strokeWidth={2.5}
                        className={`shrink-0 transition-all ${isActive ? 'scale-110' : 'opacity-80 group-hover:opacity-100'}`}
                      />
                      <span 
                         className={`text-sm tracking-tight transition-all duration-300 whitespace-nowrap
                           ${isSidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}
                           ${isActive ? 'font-black' : 'font-semibold'}`}
                      >
                        {item.label}
                      </span>
                    </div>

                    {item.hasSub && isSidebarExpanded && (
                      <CaretRight size={16} strokeWidth={2.5} className={`transition-all duration-400 ${openSubmenu === item.label ? 'rotate-180' : 'opacity-60'}`} />
                    )}
                  </button>
                </div>
              )
            })}
          </nav>

          {/* SUBMENÚ FULL HEIGHT */}
          {openSubmenu && (
            <div 
              onMouseEnter={() => setOpenSubmenu(openSubmenu)}
              onMouseLeave={() => setOpenSubmenu(null)}
              className="absolute left-[calc(100%-4px)] top-0 w-[260px] h-full p-6 z-[100] transition-all"
              style={{
                ...glassStyle,
                borderRadius: 0,
                borderTop: 'none',
                borderBottom: 'none',
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.05))' 
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))',
                backdropFilter: 'blur(100px) saturate(200%)',
                WebkitBackdropFilter: 'blur(100px) saturate(200%)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                animation: 'expulsion 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards'
              }}
            >
              {/* Reflejo de cristal */}
              <div className="absolute inset-0 pointer-events-none z-[-1]" 
                   style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)' }} />
              <div className="px-4 py-3 text-[11px] font-bold opacity-40 border-b border-white/10 mb-6">
                {openSubmenu}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => { setActiveTab('Gestión'); setOpenSubmenu(null); }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium hover:font-semibold hover:bg-white/10 transition-all">Empresas</button>
                <button onClick={() => { setActiveTab('Gestión'); setOpenSubmenu(null); }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium hover:font-semibold hover:bg-white/10 transition-all">Leads</button>
                <button onClick={() => { setActiveTab('Gestión'); setOpenSubmenu(null); }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium hover:font-semibold hover:bg-white/10 transition-all">Configuración</button>
              </div>
            </div>
          )}

          <div className="px-4 mt-auto">
             <button className="w-full h-11 flex items-center justify-center gap-3 rounded-full border border-pistacho text-pistacho transition-all hover:bg-white/10">
               <SignOut size={18} strokeWidth={2.5} />
               <span className={`text-sm font-bold transition-all ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 scale-0 w-0'}`}>
                 Cerrar sesión
               </span>
             </button>
          </div>
        </aside>

        <main className={`flex-1 p-12 overflow-y-auto`}>
           <div className="max-w-5xl mx-auto space-y-12">
              <h1 className="text-4xl font-bold tracking-tight">Centro de Operaciones</h1>
              <div className="grid grid-cols-3 gap-8">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-44 p-8 transition-all hover:-translate-y-2 cursor-pointer group" style={glassStyle}>
                      <div className="w-12 h-12 rounded-2xl bg-white/10 mb-6 flex items-center justify-center transition-transform group-hover:scale-110">
                         <Stack size={24} className="opacity-50" />
                      </div>
                      <div className="h-2 w-3/4 bg-white/10 rounded mb-3" />
                      <div className="h-2 w-1/2 bg-white/20 rounded" />
                   </div>
                 ))}
              </div>
           </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes expulsion {
          0% { opacity: 0; transform: translateX(-15px) scale(0.98); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
