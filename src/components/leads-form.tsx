'use client'

import { useRef, useState } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { SendHorizontal as PaperPlaneRight, Loader2 as CircleNotch, CheckCircle } from '@/components/ui/icons'

interface LeadsFormProps {
  initialPlan?: string
}

export function LeadsForm({ initialPlan }: LeadsFormProps = {}) {
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    empresa: '',
    mensaje: '',
    interes: initialPlan || '',
    // Honeypot anti-bots: campo invisible para una persona real, pero los
    // bots que autocompletan todos los inputs sí lo llenan. Si llega con
    // valor, el backend descarta el envío en silencio (ver /api/leads).
    sitio_web: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, turnstile_token: turnstileToken || 'skip' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar')

      setEnviado(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar')
      turnstileRef.current?.reset()
      setTurnstileToken('')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="p-8 text-center rounded-2xl border border-dashed border-[#38B98E] bg-[#38B98E]/5">
        <CheckCircle size={44} color="#38B98E" className="mx-auto mb-3" />
        <h3 className="text-lg font-bold text-[#474747] dark:text-white mb-2">¡Mensaje recibido!</h3>
        <p className="text-xs sm:text-sm text-[#737373] dark:text-white/70 m-0">
          Un consultor de impacto se pondrá en contacto contigo en las próximas 24 horas laborables.
        </p>
      </div>
    )
  }

  return (
    <div id="contacto" className="rounded-2xl transition-colors">
      <form onSubmit={handleSubmit} className="grid gap-3.5">
        {/* Honeypot anti-bots */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="sitio_web">Sitio web</label>
          <input
            type="text"
            id="sitio_web"
            name="sitio_web"
            tabIndex={-1}
            autoComplete="off"
            value={formData.sitio_web}
            onChange={handleChange}
          />
        </div>

        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <Turnstile
            ref={turnstileRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            options={{ size: 'invisible' }}
            onSuccess={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken('')}
            onError={() => setTurnstileToken('')}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#00827C] dark:text-[#D6F391]">Nombre completo</label>
            <input
              type="text"
              name="nombre"
              required
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez"
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-[#00827C]/20 dark:border-white/15 bg-white dark:bg-white/5 text-[#474747] dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-[#00827C] dark:focus:border-[#D6F391] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#00827C] dark:text-[#D6F391]">Email corporativo</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="juan@empresa.com"
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-[#00827C]/20 dark:border-white/15 bg-white dark:bg-white/5 text-[#474747] dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-[#00827C] dark:focus:border-[#D6F391] transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#00827C] dark:text-[#D6F391]">Empresa</label>
          <input
            type="text"
            name="empresa"
            required
            value={formData.empresa}
            onChange={handleChange}
            placeholder="Nombre de tu organización"
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-[#00827C]/20 dark:border-white/15 bg-white dark:bg-white/5 text-[#474747] dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-[#00827C] dark:focus:border-[#D6F391] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#00827C] dark:text-[#D6F391]">Plan de interés</label>
          <select
            name="interes"
            value={formData.interes}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-[#00827C]/20 dark:border-white/15 bg-white dark:bg-[#252525] text-[#474747] dark:text-white outline-none focus:border-[#00827C] dark:focus:border-[#D6F391] transition-colors"
          >
            <option value="">Selecciona un plan</option>
            <option value="Explora">Plan Explora</option>
            <option value="Circular Lab">Plan Circular Lab</option>
            <option value="Impacto Ilimitado">Plan Impacto Ilimitado</option>
            <option value="A Medida">Plan A Medida</option>
            <option value="Consulta general">Consulta o asesoría general</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#00827C] dark:text-[#D6F391]">Mensaje o requerimiento</label>
          <textarea
            name="mensaje"
            required
            rows={3}
            value={formData.mensaje}
            onChange={handleChange}
            placeholder="Cuéntanos cómo podemos ayudarte..."
            className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-[#00827C]/20 dark:border-white/15 bg-white dark:bg-white/5 text-[#474747] dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-[#00827C] dark:focus:border-[#D6F391] resize-none transition-colors"
          />
        </div>

        {error && (
          <p className="text-xs font-bold text-red-500 m-0">{error}</p>
        )}

        <button
          disabled={loading}
          type="submit"
          className={`mt-2 w-full py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 ${
            loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02]'
          } bg-[#00827C] dark:bg-[#D6F391] text-white dark:text-[#474747]`}>
          {loading ? (
            <CircleNotch size={16} className="animate-spin" />
          ) : (
            <>
              <PaperPlaneRight size={16} />
              Enviar solicitud
            </>
          )}
        </button>
      </form>
    </div>
  )
}
