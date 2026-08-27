import { createAdminClient } from '@/lib/supabase/admin'

export interface ServiceCheck {
  status: 'ok' | 'degradado' | 'error'
  latency: number
  details?: string
  uptime?: number
  // 'externo' = proveedor de terceros (Supabase, Groq, OpenRouter, Vercel,
  // Resend); no se marca 'nuestro' aquí porque este objeto solo describe
  // chequeos a servicios de terceros — lo "nuestro" vive como incidencia
  // manual con componente 'calculadora' en dpp_incidencias, no como un
  // ServiceCheck (no hay una página de estado externa que consultar de
  // nuestro propio código).
  origen?: 'externo'
  // Texto tal cual lo publica el proveedor sobre un mantenimiento programado
  // o en curso de SU LADO — informativo, nunca se guarda en base de datos,
  // solo vive mientras dura este chequeo en vivo.
  mantenimientoProgramado?: string
}

function extraerMantenimiento(data: { scheduled_maintenances?: { name?: string; status?: string }[] }): string | undefined {
  const activo = data.scheduled_maintenances?.find(m => m.status && m.status !== 'completed')
  return activo?.name
}

export interface ChecksResult {
  supabase: ServiceCheck
  gemini: ServiceCheck
  groq: ServiceCheck
  openrouter: ServiceCheck
  qwen: ServiceCheck & { uptime: number }
  correo: ServiceCheck
  hosting: ServiceCheck
}

// Cache en memoria para evitar saturar las APIs en cada recarga
let statusCache: { data: ChecksResult; ts: number } | null = null
const CACHE_TTL = 60000 // 60 segundos

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(id)
  }
}

export async function runChecks() {
  const adminClient = await createAdminClient()

  // 1. Verificar Base de Datos y Servidores (y su proveedor externo de forma silenciosa)
  const dbStart = Date.now()
  let dbStatus: 'ok' | 'degradado' | 'error' = 'ok'
  let dbDetails = 'Conexión establecida.'
  let dbMantenimiento: string | undefined
  // Separado de dbStatus a propósito: dbStatus puede terminar en 'degradado'
  // solo porque el PROVEEDOR se autoreporta así en su propia página, aunque
  // nuestra conexión local sí funcionó — en ese caso sí se puede seguir
  // escribiendo en la base de datos (y por lo tanto sí se puede autoreportar
  // el incidente). Solo se bloquea si la conexión local en sí falló.
  let dbConexionLocalOk = true
  try {
    const { error } = await adminClient.from('profiles').select('id').limit(1)
    if (error) {
      dbStatus = 'error'
      dbConexionLocalOk = false
      dbDetails = error.message.replace(/supabase/gi, 'proveedor de base de datos')
    } else {
      // Si la conexión local está bien, consultamos el estado del proveedor en segundo plano
      try {
        const spRes = await fetchWithTimeout('https://status.supabase.com/api/v2/summary.json', {}, 4000)
        if (spRes.ok) {
          const spData = await spRes.json()
          const indicator = spData.status?.indicator // 'none', 'minor', 'major', 'critical'
          const description = (spData.status?.description || '').replace(/supabase/gi, 'proveedor de base de datos')
          dbMantenimiento = extraerMantenimiento(spData)?.replace(/supabase/gi, 'proveedor de base de datos')
          if (indicator === 'minor' || indicator === 'major') {
            dbStatus = 'degradado'
            dbDetails = `Problema de infraestructura: ${description || 'Degradación parcial en el proveedor de base de datos.'}`
          } else if (indicator === 'critical') {
            dbStatus = 'error'
            dbDetails = `Corte de infraestructura: ${description || 'El proveedor de base de datos experimenta caídas de servicio.'}`
          }
        }
      } catch {
        // Ignoramos fallos al consultar la API externa para no bloquear si no hay internet o falla el DNS
      }
    }
  } catch (err) {
    dbStatus = 'error'
    dbConexionLocalOk = false
    const errMsg = err instanceof Error ? err.message : 'Error de red.'
    dbDetails = errMsg.replace(/supabase/gi, 'proveedor de base de datos')
  }
  const dbLatency = Date.now() - dbStart

  // 2. Verificar Google Gemini API
  const geminiStart = Date.now()
  let geminiStatus: 'ok' | 'error' = 'ok'
  let geminiDetails = 'API operacional.'
  try {
    const key = process.env.GEMINI_KEY
    if (!key) throw new Error('GEMINI_KEY no configurada.')
    const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {}, 4000)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    geminiStatus = 'error'
    geminiDetails = err instanceof Error ? err.message : 'Error al consultar Gemini.'
  }
  const geminiLatency = Date.now() - geminiStart

  // 3. Verificar Groq API (groqstatus.com + ping fallback)
  const groqStart = Date.now()
  let groqStatus: 'ok' | 'degradado' | 'error' = 'ok'
  let groqDetails = 'API operacional.'
  let groqMantenimiento: string | undefined
  try {
    const res = await fetchWithTimeout('https://groqstatus.com/api/v2/summary.json', {}, 4000)
    if (res.ok) {
      const data = await res.json()
      const indicator = data.status?.indicator // 'none', 'minor', 'major', 'critical'
      groqMantenimiento = extraerMantenimiento(data)
      if (indicator === 'minor' || indicator === 'major') {
        groqStatus = 'degradado'
        groqDetails = data.status.description || 'Degradación parcial en Groq.'
      } else if (indicator === 'critical') {
        groqStatus = 'error'
        groqDetails = data.status.description || 'Groq fuera de servicio.'
      } else {
        groqDetails = 'Groq operando normalmente (groqstatus.com).'
      }
    } else {
      // Fallback a ping directo si falla su página de estatus
      const key = process.env.GROQ_KEY
      if (!key) throw new Error('GROQ_KEY no configurada.')
      const pingRes = await fetchWithTimeout('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      }, 3000)
      if (!pingRes.ok) throw new Error(`HTTP ${pingRes.status}`)
    }
  } catch (err) {
    groqStatus = 'error'
    groqDetails = err instanceof Error ? err.message : 'Error al consultar Groq.'
  }
  const groqLatency = Date.now() - groqStart

  // 4. Verificar OpenRouter & Qwen-VL 8B
  const orStart = Date.now()
  let orStatus: 'ok' | 'error' = 'ok'
  let orDetails = 'API operacional.'
  let qwenStatus: 'ok' | 'degradado' | 'error' = 'error'
  let qwenUptime = 0
  let qwenDetails = 'Sin proveedores activos.'

  try {
    const res = await fetchWithTimeout('https://openrouter.ai/api/v1/models/qwen/qwen3-vl-8b-instruct/endpoints', {}, 4000)
    if (!res.ok) {
      orStatus = 'error'
      orDetails = `HTTP ${res.status}`
      qwenStatus = 'error'
      qwenDetails = 'Gateway de OpenRouter desconectado o inaccesible.'
    } else {
      const data = await res.json() as { data?: { endpoints?: { name: string; status: number; uptime_last_5m: number }[] } }
      const endpoints = data.data?.endpoints ?? []
      if (endpoints.length > 0) {
        const healthyProvider = endpoints.find(e => e.status === 0)
        qwenStatus = healthyProvider ? 'ok' : 'degradado'
        qwenDetails = healthyProvider 
          ? `Operacional en ${endpoints.length} proveedor(es). Proveedor top: ${healthyProvider.name.split(' | ')[0]}`
          : 'Proveedores experimentando degradación temporal.'
        
        const totalUptime = endpoints.reduce((sum, e) => sum + e.uptime_last_5m, 0)
        qwenUptime = totalUptime / endpoints.length
      } else {
        qwenDetails = 'El modelo no tiene endpoints disponibles en OpenRouter.'
      }
    }
  } catch (err) {
    orStatus = 'error'
    orDetails = err instanceof Error ? err.message : 'Error de red.'
    qwenStatus = 'error'
    qwenDetails = 'Error al consultar OpenRouter.'
  }
  const orLatency = Date.now() - orStart

  // 5. Verificar Resend (Servicio de Correo) de forma silenciosa
  let resendStatus: 'ok' | 'degradado' | 'error' = 'ok'
  let resendDetails = 'Servicio operacional.'
  let resendMantenimiento: string | undefined
  try {
    const res = await fetchWithTimeout('https://status.resend.com/api/v2/summary.json', {}, 4000)
    if (res.ok) {
      const data = await res.json()
      const indicator = data.status?.indicator // 'none', 'minor', 'major', 'critical'
      const description = (data.status?.description || '').replace(/resend/gi, 'proveedor de correo')
      resendMantenimiento = extraerMantenimiento(data)?.replace(/resend/gi, 'proveedor de correo')
      if (indicator === 'minor' || indicator === 'major') {
        resendStatus = 'degradado'
        resendDetails = `Degradación en proveedor: ${description}`
      } else if (indicator === 'critical') {
        resendStatus = 'error'
        resendDetails = `Interrupción en proveedor: ${description}`
      }
    }
  } catch {
    // Si falla el fetch de estado, no bloqueamos el flujo principal
  }

  // 6. Verificar Vercel (Servidor Web) de forma silenciosa
  let vercelStatus: 'ok' | 'degradado' | 'error' = 'ok'
  let vercelDetails = 'Servicio operacional.'
  let vercelMantenimiento: string | undefined
  try {
    const res = await fetchWithTimeout('https://www.vercel-status.com/api/v2/summary.json', {}, 4000)
    if (res.ok) {
      const data = await res.json()
      const indicator = data.status?.indicator // 'none', 'minor', 'major', 'critical'
      const description = (data.status?.description || '').replace(/vercel/gi, 'proveedor de hosting')
      vercelMantenimiento = extraerMantenimiento(data)?.replace(/vercel/gi, 'proveedor de hosting')
      if (indicator === 'minor' || indicator === 'major') {
        vercelStatus = 'degradado'
        vercelDetails = `Degradación en proveedor: ${description}`
      } else if (indicator === 'critical') {
        vercelStatus = 'error'
        vercelDetails = `Interrupción en proveedor: ${description}`
      }
    }
  } catch {
    // Si falla el fetch de estado, no bloqueamos el flujo principal
  }

  const results = {
    supabase: { status: dbStatus, latency: dbLatency, details: dbDetails, origen: 'externo' as const, mantenimientoProgramado: dbMantenimiento },
    gemini: { status: geminiStatus, latency: geminiLatency, details: geminiDetails, origen: 'externo' as const },
    groq: { status: groqStatus, latency: groqLatency, details: groqDetails, origen: 'externo' as const, mantenimientoProgramado: groqMantenimiento },
    openrouter: { status: orStatus, latency: orLatency, details: orDetails, origen: 'externo' as const },
    qwen: { status: qwenStatus, latency: orLatency, details: qwenDetails, uptime: qwenUptime, origen: 'externo' as const },
    correo: { status: resendStatus, latency: 0, details: resendDetails, origen: 'externo' as const, mantenimientoProgramado: resendMantenimiento },
    hosting: { status: vercelStatus, latency: 0, details: vercelDetails, origen: 'externo' as const, mantenimientoProgramado: vercelMantenimiento }
  }

  // Auto-reportar fallos y auto-resolver recuperaciones, siempre que la
  // conexión local a la base de datos funcione (si no funciona, ni intentar
  // escribir). "supabase" ya está incluido aquí — antes se excluía por error,
  // que era la causa real de que un incidente en la propia base de datos
  // nunca quedara registrado (bug real reportado).
  if (dbConexionLocalOk) {
    try {
      const reportables = [
        { key: 'supabase', label: 'Base de Datos y Servidores', status: dbStatus, details: dbDetails, sev: 'critico' as const },
        { key: 'gemini', label: 'Google Gemini API', status: geminiStatus, details: geminiDetails, sev: 'mayor' as const },
        { key: 'groq', label: 'Groq Cloud (LLaMA 3.3)', status: groqStatus, details: groqDetails, sev: 'mayor' as const },
        { key: 'openrouter', label: 'OpenRouter Gateway', status: orStatus, details: orDetails, sev: 'mayor' as const },
        { key: 'qwen', label: 'Qwen-VL 8B (OpenRouter)', status: qwenStatus, details: qwenDetails, sev: 'mayor' as const },
        { key: 'correo', label: 'Servicio de Correo Electrónico', status: resendStatus, details: resendDetails, sev: 'menor' as const },
        { key: 'hosting', label: 'Servidor de Distribución Web', status: vercelStatus, details: vercelDetails, sev: 'critico' as const }
      ]

      for (const item of reportables) {
        if (item.status === 'error' || item.status === 'degradado') {
          // Consultar si ya hay un incidente activo (no resuelto) para este componente
          const { data: existente } = await adminClient
            .from('dpp_incidencias')
            .select('id')
            .eq('componente', item.key)
            .eq('tipo', 'incidente')
            .neq('estado', 'resuelto')
            .limit(1)

          if (!existente || existente.length === 0) {
            const { error: insertError } = await adminClient.from('dpp_incidencias').insert({
              titulo: item.status === 'error'
                ? `Interrupción detectada en ${item.label}`
                : `Rendimiento degradado en ${item.label}`,
              descripcion: `El sistema ha detectado de forma automática un problema de conexión o fallo en el proveedor de servicio. Detalle: ${item.details || 'Timeout o fallo de red.'}`,
              componente: item.key,
              estado: item.status === 'error' ? 'investigando' : 'monitoreando',
              severidad: item.status === 'error' ? item.sev : 'menor',
              origen: 'sistema',
            })
            // 23505 = choque contra el índice único de "una sola activa por
            // componente" (sql/091) — significa que otra visita casi
            // simultánea ya la insertó un instante antes. Es el resultado
            // correcto, no un error real, por eso no se loguea como falla.
            if (insertError && insertError.code !== '23505') {
              console.error('[status-checker] error al insertar incidencia automática:', insertError)
            }
          }
        } else {
          // Se recuperó — cierra sola cualquier incidencia que el propio
          // sistema haya creado para este componente (nunca una creada a
          // mano por un super_admin, esa la cierra él).
          await adminClient
            .from('dpp_incidencias')
            .update({ estado: 'resuelto', resolved_at: new Date().toISOString() })
            .eq('componente', item.key)
            .eq('tipo', 'incidente')
            .eq('origen', 'sistema')
            .neq('estado', 'resuelto')
        }
      }
    } catch (autoErr) {
      console.error('Error al intentar auto-reportar/resolver fallos en servicios:', autoErr)
    }
  }

  return results
}

export async function getCachedStatus() {
  const now = Date.now()
  if (statusCache && now - statusCache.ts < CACHE_TTL) {
    return { ...statusCache.data, cached: true }
  }

  const results = await runChecks()
  statusCache = { data: results, ts: now }

  return { ...results, cached: false }
}
