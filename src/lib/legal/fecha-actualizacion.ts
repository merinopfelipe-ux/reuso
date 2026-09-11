import fs from 'fs'
import path from 'path'
import { createAdminClient } from '@/lib/supabase/admin'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

function getFsLatestMtime(): number {
  try {
    const dir = path.join(process.cwd(), 'src/app/(public)/legal')
    let maxTime = 0

    const scan = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return
      const items = fs.readdirSync(currentDir, { withFileTypes: true })
      for (const item of items) {
        const p = path.join(currentDir, item.name)
        if (item.isDirectory()) {
          scan(p)
        } else if (item.isFile()) {
          const s = fs.statSync(p)
          if (s.mtimeMs > maxTime) maxTime = s.mtimeMs
        }
      }
    }

    scan(dir)
    return maxTime
  } catch {
    return 0
  }
}

/**
 * Obtiene de forma completamente automática la fecha más reciente de modificación
 * de cualquiera de las páginas o contenidos legales (analizando tanto los archivos
 * locales del código fuente como la base de datos contenido_legal).
 */
export async function getFechaActualizacionLegal(): Promise<string> {
  let latestMs = getFsLatestMtime()

  try {
    const admin = await createAdminClient()
    const { data } = await admin
      .from('contenido_legal')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (data && data.length > 0 && data[0]?.updated_at) {
      const dbTime = new Date(data[0].updated_at).getTime()
      if (dbTime > latestMs) {
        latestMs = dbTime
      }
    }
  } catch {
    // Si la BD no está disponible o falla, usamos el mtime del filesystem
  }

  const d = latestMs > 0 ? new Date(latestMs) : new Date()
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}
