// Ejecuta la migración de Storage cuando se lo pides, con variables de entorno.
// No corre en la suite normal (se salta si falta MIGRAR_STORAGE).
//
//   MIGRAR_STORAGE=plan     MIGRAR_EMPRESAS=todas|id1,id2  MIGRAR_REGISTRO=ruta.json
//     → escribe el plan en MIGRAR_REGISTRO. No cambia nada. Revísalo.
//   MIGRAR_STORAGE=aplicar  MIGRAR_PLAN=ruta-del-plan.json  MIGRAR_REGISTRO=ruta-registro.json
//     → aplica EXACTAMENTE ese plan y escribe el registro para revertir.
//   MIGRAR_STORAGE=revertir MIGRAR_REGISTRO=ruta-registro.json
//     → deshace lo aplicado con ese registro.
//
// Ejecutar con: node --env-file=.env.local ./node_modules/.bin/vitest run src/lib/storage/migracion-empresas.run.test.ts

import { describe, it } from 'vitest'
import fs from 'fs'
import { planificarMigracion, aplicarMigracion, revertirMigracion, type Plan, type Registro } from './migracion-empresas'

const modo = process.env.MIGRAR_STORAGE

describe.skipIf(!modo)('migración de Storage (manual)', () => {
  it(
    'ejecuta el modo pedido',
    async () => {
      // Import dinámico: solo cuando de verdad se migra (valida variables de entorno al cargar).
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = await createAdminClient()
      const registroPath = process.env.MIGRAR_REGISTRO

      if (modo === 'plan') {
        const lista = process.env.MIGRAR_EMPRESAS ?? ''
        let empresas: string[]
        if (lista === 'todas') {
          const { data } = await admin.from('empresas').select('id')
          empresas = (data ?? []).map(e => e.id as string)
        } else {
          empresas = lista.split(',').map(s => s.trim()).filter(Boolean)
        }
        const plan = await planificarMigracion(admin, empresas)
        if (!registroPath) throw new Error('Falta MIGRAR_REGISTRO para guardar el plan.')
        fs.writeFileSync(registroPath, JSON.stringify(plan, null, 2))
        console.log(`Plan de ${empresas.length} empresa(s): ${plan.movimientos.length} archivo(s) a mover, ` +
          `${plan.actualizaciones.length} fila(s) a actualizar, ${plan.sinRegla.length} sin regla, ` +
          `${plan.rechazados.length} rechazado(s). Guardado en ${registroPath}.`)
        return
      }

      if (modo === 'aplicar') {
        const planPath = process.env.MIGRAR_PLAN
        if (!planPath || !registroPath) throw new Error('Faltan MIGRAR_PLAN y MIGRAR_REGISTRO.')
        const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as Plan
        const registro = await aplicarMigracion(admin, plan)
        fs.writeFileSync(registroPath, JSON.stringify(registro, null, 2))
        const ok = registro.movimientos.filter(m => m.ok).length
        const fallos = registro.movimientos.length - ok
        console.log(`Aplicado: ${ok} archivo(s) movido(s), ${fallos} con error. Registro en ${registroPath}.`)
        return
      }

      if (modo === 'revertir') {
        if (!registroPath) throw new Error('Falta MIGRAR_REGISTRO.')
        const registro = JSON.parse(fs.readFileSync(registroPath, 'utf8')) as Registro
        const r = await revertirMigracion(admin, registro)
        console.log(`Revertido: ${r.restaurados} fila(s) restauradas. Errores: ${r.errores.length}.`)
        if (r.errores.length) console.log(r.errores.join('\n'))
        return
      }

      throw new Error(`Modo desconocido: ${modo}`)
    },
    30 * 60 * 1000
  )
})
