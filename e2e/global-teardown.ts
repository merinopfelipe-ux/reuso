import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const EFIMEROS_PATH = path.join('playwright/.auth', 'efimeros.json')

// Borra las cuentas efímeras (usuario_libre, empleado, empresa_admin) creadas
// por e2e/auth.setup.ts al arrancar la suite. Corre automáticamente al
// terminar `npx playwright test`, sin que haya que acordarse de limpiar a mano.
export default async function globalTeardown() {
  if (!fs.existsSync(EFIMEROS_PATH)) return

  const cuentas: Record<string, { userId: string; email: string; empresaId?: string }> = JSON.parse(fs.readFileSync(EFIMEROS_PATH, 'utf-8'))
  const entradas = Object.values(cuentas)
  if (entradas.length === 0) return

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  for (const { userId, email, empresaId } of entradas) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) console.error('No se pudo borrar cuenta efímera', email, error.message)
    // La empresa de empresa_admin (ver auth.setup.ts) no la borra el cascade
    // del usuario — hay que borrarla aparte o queda huérfana en la base real.
    if (empresaId) {
      const { error: errorEmpresa } = await supabaseAdmin.from('empresas').delete().eq('id', empresaId)
      if (errorEmpresa) console.error('No se pudo borrar empresa efímera', empresaId, errorEmpresa.message)
    }
  }

  fs.unlinkSync(EFIMEROS_PATH)
}
