import { Skeleton } from '@/components/ui/skeleton'

export default function HomeLoading() {
  return (
    <div className="w-full flex flex-col min-h-[100vh] bg-[var(--bg-primary)] overflow-hidden">
      
      {/* Header Skeleton (Flotante / Pill) */}
      <div className="fixed top-4 lg:top-8 left-0 w-full z-[100] px-4 flex flex-col items-center pointer-events-none">
        <header 
          className="flex items-center justify-between w-full max-w-5xl px-6 py-3 rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-primary)] shadow-sm"
        >
          {/* Logo */}
          <div className="flex-shrink-0">
            <Skeleton style={{ width: 140, height: 32, borderRadius: 8 }} />
          </div>
          
          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Skeleton style={{ width: 65, height: 12, borderRadius: 4 }} />
            <Skeleton style={{ width: 75, height: 12, borderRadius: 4 }} />
            <Skeleton style={{ width: 85, height: 12, borderRadius: 4 }} />
            <Skeleton style={{ width: 50, height: 12, borderRadius: 4 }} />
          </nav>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            <Skeleton style={{ width: 36, height: 36, borderRadius: '50%' }} className="hidden sm:block" />
            <Skeleton style={{ width: 130, height: 36, borderRadius: 24 }} className="hidden sm:block" />
            <Skeleton style={{ width: 80, height: 36, borderRadius: 24 }} />
          </div>
        </header>
      </div>

      {/* Hero Section Skeleton */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-[140px] md:pt-[170px] pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column (Text & Buttons) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-start text-left">
            {/* Subtitle */}
            <Skeleton style={{ width: 280, height: 14, borderRadius: 4, marginBottom: 20 }} />
            
            {/* H1 Skeleton */}
            <div className="flex flex-col gap-2 w-full mb-6">
              <Skeleton style={{ width: '75%', height: 46, borderRadius: 8 }} />
              <Skeleton style={{ width: '92%', height: 46, borderRadius: 8 }} />
              <Skeleton style={{ width: '60%', height: 46, borderRadius: 8 }} />
            </div>

            {/* Paragraph Skeleton */}
            <div className="flex flex-col gap-2 w-full max-w-xl mb-10">
              <Skeleton style={{ width: '100%', height: 14, borderRadius: 4 }} />
              <Skeleton style={{ width: '90%', height: 14, borderRadius: 4 }} />
              <Skeleton style={{ width: '50%', height: 14, borderRadius: 4 }} />
            </div>

            {/* Buttons Skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <Skeleton style={{ width: 190, height: 44, borderRadius: 24 }} />
              <Skeleton style={{ width: 170, height: 44, borderRadius: 24 }} />
            </div>
          </div>

          {/* Right Column (HeroImpactPanel) */}
          <div className="lg:col-span-6 xl:col-span-5 w-full mt-10 lg:mt-0">
            <div className="w-full rounded-[2rem] border border-[var(--border)] bg-[var(--bg-primary)] p-8 flex flex-col shadow-sm">
               
               {/* Top info */}
               <div className="flex justify-between items-start mb-8">
                 <div className="flex flex-col gap-2">
                   <Skeleton style={{ width: 140, height: 10, borderRadius: 4 }} />
                   <Skeleton style={{ width: 220, height: 10, borderRadius: 4 }} />
                 </div>
                 <Skeleton style={{ width: 32, height: 32, borderRadius: '50%' }} />
               </div>

               {/* 3 Cards */}
               <div className="grid grid-cols-3 gap-3 mb-8">
                 {/* Card 1 */}
                 <div className="border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-3">
                   <Skeleton style={{ width: '60%', height: 10, borderRadius: 4 }} />
                   <Skeleton style={{ width: '80%', height: 28, borderRadius: 6 }} />
                   <Skeleton style={{ width: '90%', height: 8, borderRadius: 4 }} />
                 </div>
                 {/* Card 2 */}
                 <div className="border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-3">
                   <Skeleton style={{ width: '70%', height: 10, borderRadius: 4 }} />
                   <Skeleton style={{ width: '90%', height: 28, borderRadius: 6 }} />
                   <Skeleton style={{ width: '85%', height: 8, borderRadius: 4 }} />
                 </div>
                 {/* Card 3 */}
                 <div className="border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-3">
                   <Skeleton style={{ width: '75%', height: 10, borderRadius: 4 }} />
                   <Skeleton style={{ width: '85%', height: 28, borderRadius: 6 }} />
                   <Skeleton style={{ width: '80%', height: 8, borderRadius: 4 }} />
                 </div>
               </div>

               {/* Progress bar */}
               <div className="flex justify-between items-end mb-2">
                 <Skeleton style={{ width: 120, height: 10, borderRadius: 4 }} />
                 <Skeleton style={{ width: 30, height: 10, borderRadius: 4 }} />
               </div>
               <Skeleton style={{ width: '100%', height: 8, borderRadius: 4 }} />
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
