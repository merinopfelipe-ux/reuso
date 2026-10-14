// Prueba de borrado completo de una empresa, SOLO en staging, con datos temporales.
// Se salta si no se activa con PRUEBA_BORRADO_STAGING=1 y la URL no es la de staging.
// Crea sus datos con nombres "PRUEBA" y los borra al final, aunque la prueba falle.
// Lo que no se pueda borrar se registra en consola con su id para limpiarlo a mano.
//
// Requiere sql/148 aplicada en staging. Con sql/147 la prueba se detiene con un aviso.
//
// Ejecutar desde el repo:
//   cd /Users/merinop/Documents/Automatizaciones/Reuso && PRUEBA_BORRADO_STAGING=1 node --env-file=.env.local ./node_modules/.bin/vitest run src/lib/storage/borrado-empresa.staging.test.ts

import { describe, it, expect } from 'vitest'
import { manifiestoEmpresa, ejecutarBorradoStorage, listarTodo } from './empresa-storage'

const STAGING_REF = 'rjcfqcqgqxoblisuyapq'
const activa = process.env.PRUEBA_BORRADO_STAGING === '1'

const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe.skipIf(!activa)('borrado completo de empresa (staging)', () => {
  it(
    'borra archivos y filas de la empresa, no toca la ajena y deja el catálogo',
    async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
      if (!url.includes(STAGING_REF)) throw new Error('Esta prueba solo corre en staging.')

      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = await createAdminClient()
      const ts = Date.now()

      // Sonda: la función existe. Con un id inexistente sql/147 y sql/148 responden igual,
      // por eso la comprobación que distingue las dos versiones es el paso 1, más abajo.
      const sonda = await admin.rpc('eliminar_empresa_definitiva', {
        p_empresa: '00000000-0000-4000-8000-000000000000',
        p_solo_contar: true,
      })
      expect(sonda.error?.message ?? '', 'Falta aplicar sql/148 en staging').toMatch(/no existe/i)

      const crearEmpresa = async (nombre: string) => {
        const { data, error } = await admin
          .from('empresas')
          .insert({ nombre, slug: `prueba-${nombre.replace(/\W+/g, '-').toLowerCase()}-${ts}`, plan: 'free' })
          .select('id')
          .single()
        if (error) throw new Error(`crear empresa: ${error.message}`)
        return data.id as string
      }

      // Lo creado, para limpiarlo aunque la prueba falle.
      const creados: { E?: string; OTRA?: string; userId?: string; item?: string } = {}

      try {
        const E = await crearEmpresa(`PRUEBA borrado ${ts}`)
        creados.E = E
        const OTRA = await crearEmpresa(`PRUEBA ajena ${ts}`)
        creados.OTRA = OTRA

        // Miembro de E. El trigger de la base crea su perfil; se espera a que exista y se asigna a E.
        const { data: creado, error: errUsuario } = await admin.auth.admin.createUser({
          email: `prueba.borrado.${ts}@calculadoradereuso.com`,
          password: `Prueba-${ts}-Aa1!`,
          email_confirm: true,
        })
        if (errUsuario || !creado.user) throw new Error(`crear usuario: ${errUsuario?.message}`)
        const userId = creado.user.id
        creados.userId = userId
        let perfil: { id: string } | null = null
        for (let intento = 0; intento < 20 && !perfil; intento++) {
          await esperar(500)
          const { data } = await admin.from('profiles').update({ empresa_id: E }).eq('user_id', userId).select('id').maybeSingle()
          perfil = data
        }
        expect(perfil, 'el trigger debe crear el perfil del usuario de prueba').not.toBeNull()

        // Activo DPP con su ciclo.
        const { data: activo, error: errActivo } = await admin
          .from('dpp_activos')
          .insert({ empresa_id: E, codigo_dpp: `PRB-${ts}`, nombre: 'Activo prueba', imagen_url: `dpp/imagenes/legacy-${ts}.webp` })
          .select('id')
          .single()
        if (errActivo || !activo) throw new Error(`activo: ${errActivo?.message}`)
        const { error: errCiclo } = await admin.from('dpp_ciclos').insert({ activo_id: activo.id, numero_ciclo: 1 })
        expect(errCiclo, 'ciclo de prueba').toBeNull()

        // Archivos: nuevos, legados, huérfanos y ajenos.
        const subir = async (bucket: string, path: string, contentType: string) => {
          const { error } = await admin.storage.from(bucket).upload(path, Buffer.from('prueba'), { contentType, upsert: true })
          if (error) throw new Error(`subir ${bucket}/${path}: ${error.message}`)
        }
        await subir('dpp', `dpp/imagenes/legacy-${ts}.webp`, 'image/webp')
        await subir('dpp', `dpp/ingestas/${E}/${activo.id}/doc-${ts}.txt`, 'text/plain')
        await subir('dpp', `empresas/${E}/dpp/imagenes/huerfano-${ts}.webp`, 'image/webp')
        await subir('cotizador', `empresas/${E}/cotizador/nuevo-${ts}.webp`, 'image/webp')
        await subir('cotizador', `cotizador/${E}/viejo-${ts}.webp`, 'image/webp')
        await subir('logos', `logos-admin/${E}/logo-${ts}.svg`, 'image/svg+xml')
        await subir('documentos', `informes/empresa/${E}/inf-${ts}.pdf`, 'application/pdf')
        await subir('documentos', `empresas/${E}/informes/nuevo-${ts}.pdf`, 'application/pdf')
        // Ajenos: NUNCA deben borrarse.
        await subir('cotizador', `empresas/${OTRA}/cotizador/ajeno-${ts}.webp`, 'image/webp')
        await subir('cotizador', `cotizador/${OTRA}/ajeno-${ts}.webp`, 'image/webp')

        // Filas: informe con archivo legado, ticket con mensaje, cliente y un ítem del catálogo.
        const { error: errInforme } = await admin.from('informes').insert({
          tipo: 'informe',
          user_id: userId,
          empresa_id: E,
          fecha_inicio: '2026-01-01',
          fecha_fin: '2026-01-31',
          co2_total: 1,
          agua_total: 1,
          pdf_url: `informes/empresa/${E}/inf-${ts}.pdf`,
        })
        expect(errInforme, 'informe de prueba').toBeNull()
        const { data: ticket, error: errTicket } = await admin
          .from('tickets')
          .insert({ titulo: `prueba ${ts}`, empresa_id: E, user_id: userId })
          .select('id')
          .single()
        if (errTicket || !ticket) throw new Error(`ticket de prueba: ${errTicket?.message}`)
        const { error: errMensaje } = await admin
          .from('tickets_mensajes')
          .insert({ ticket_id: ticket.id, mensaje_html: 'hola', user_id: userId })
        expect(errMensaje, 'mensaje de prueba').toBeNull()
        const { error: errCliente } = await admin.from('crm_clientes').insert({ empresa_id: E, nombre: 'Cliente prueba' })
        expect(errCliente, 'cliente de prueba').toBeNull()
        const { data: categoria } = await admin.from('categorias').select('id').limit(1).maybeSingle()
        if (!categoria) throw new Error('Staging no tiene categorías: la prueba necesita una para crear un ítem.')
        const { data: item, error: errItem } = await admin
          .from('items')
          .insert({ categoria_id: categoria.id, nombre: `PRUEBA item ${ts}`, peso_kg: 1, co2_por_unidad: 1, creado_por_empresa_id: E })
          .select('id')
          .single()
        if (errItem || !item) throw new Error(`ítem de prueba: ${errItem?.message}`)
        creados.item = item.id

        // 1. Versión y cierre: tickets_mensajes solo llega a la empresa pasando por tickets
        // (sql/147 no lo cuenta). dpp_ciclos tiene dos caminos y mi ciclo solo usa el de activo_id.
        const { data: conteo, error: errConteo } = await admin.rpc('eliminar_empresa_definitiva', { p_empresa: E, p_solo_contar: true })
        expect(errConteo?.message ?? null, 'Error al contar con eliminar_empresa_definitiva').toBeNull()
        expect(conteo?.filas?.tickets_mensajes ?? 0, 'Falta aplicar sql/148 en staging: el conteo no incluye tickets_mensajes').toBeGreaterThan(0)
        expect(conteo?.filas?.dpp_ciclos ?? 0, 'sql/148 desactualizada en staging: el conteo no suma todos los caminos de dpp_ciclos').toBeGreaterThan(0)

        // 2. Manifiesto: encuentra los legados y nada de la empresa ajena.
        const manifiesto = await manifiestoEmpresa(admin, E, [userId])
        expect(manifiesto.exactos.some(x => x.path === `informes/empresa/${E}/inf-${ts}.pdf`), 'informe legado en el manifiesto').toBe(true)
        expect(manifiesto.exactos.some(x => x.path === `dpp/imagenes/legacy-${ts}.webp`), 'imagen legada en el manifiesto').toBe(true)
        expect(manifiesto.exactos.some(x => x.path.includes(OTRA)), 'la empresa ajena no entra al manifiesto').toBe(false)

        // 3. Storage: borrar y comprobar que no queda nada de la empresa.
        const resultado = await ejecutarBorradoStorage(admin, manifiesto)
        expect(resultado.errores, 'errores al borrar Storage').toEqual([])
        expect(resultado.ok).toBe(true)
        const existe = async (bucket: string, ruta: string) => (await admin.storage.from(bucket).download(ruta)).data !== null
        expect(await existe('dpp', `dpp/imagenes/legacy-${ts}.webp`), 'imagen legada suelta').toBe(false)
        for (const [bucket, prefijo] of [
          ['cotizador', `empresas/${E}/`],
          ['cotizador', `cotizador/${E}/`],
          ['logos', `logos-admin/${E}/`],
          ['documentos', `empresas/${E}/`],
          ['documentos', `informes/empresa/${E}/`],
          ['dpp', `empresas/${E}/`],
          ['dpp', `dpp/ingestas/${E}/`],
        ] as const) {
          expect(await listarTodo(admin, bucket, prefijo), `${bucket}/${prefijo} debe quedar vacío`).toEqual([])
        }
        // La ajena sigue en su sitio.
        expect(await listarTodo(admin, 'cotizador', `empresas/${OTRA}/`), 'archivo ajeno (ruta nueva)').toHaveLength(1)
        expect(await listarTodo(admin, 'cotizador', `cotizador/${OTRA}/`), 'archivo ajeno (ruta legada)').toHaveLength(1)

        // 4. Base: borrar la empresa en una sola transacción y, después, su cuenta de acceso.
        const { data: borrado, error: errBorrado } = await admin.rpc('eliminar_empresa_definitiva', { p_empresa: E, p_solo_contar: false })
        expect(errBorrado, 'borrar la empresa en la base').toBeNull()
        expect(borrado?.usuarios ?? [], 'el miembro debe aparecer en la lista de cuentas').toContain(userId)
        creados.E = undefined
        const { error: errCuenta } = await admin.auth.admin.deleteUser(userId)
        expect(errCuenta, 'borrar la cuenta de acceso').toBeNull()
        creados.userId = undefined

        // 5. Nada de la empresa queda en la base. El ítem del catálogo sobrevive sin vínculo.
        const cuenta = async (tabla: string, columna: string) =>
          (await admin.from(tabla).select('*', { count: 'exact', head: true }).eq(columna, E)).count
        expect(await cuenta('empresas', 'id')).toBe(0)
        expect(await cuenta('profiles', 'empresa_id')).toBe(0)
        expect(await cuenta('dpp_activos', 'empresa_id')).toBe(0)
        expect(await cuenta('informes', 'empresa_id')).toBe(0)
        expect(await cuenta('tickets', 'empresa_id')).toBe(0)
        expect(await cuenta('crm_clientes', 'empresa_id')).toBe(0)
        const { data: itemTras } = await admin.from('items').select('id, creado_por_empresa_id').eq('id', item.id).maybeSingle()
        expect(itemTras, 'el ítem del catálogo debe sobrevivir').not.toBeNull()
        expect(itemTras?.creado_por_empresa_id, 'el ítem queda sin vínculo a la empresa').toBeNull()
      } finally {
        // Limpieza en el mismo orden seguro: Storage, base y cuentas. Cada paso sigue aunque otro falle.
        const pendientes: string[] = []
        if (creados.E) {
          const manifiestoLimpieza = await manifiestoEmpresa(admin, creados.E, creados.userId ? [creados.userId] : []).catch(() => null)
          if (manifiestoLimpieza) {
            const r = await ejecutarBorradoStorage(admin, manifiestoLimpieza).catch(() => null)
            if (!r?.ok) pendientes.push(`Storage de ${creados.E}`)
          } else {
            pendientes.push(`Storage de ${creados.E}`)
          }
          const { error } = await admin.rpc('eliminar_empresa_definitiva', { p_empresa: creados.E, p_solo_contar: false })
          if (error) pendientes.push(`empresa ${creados.E}: ${error.message}`)
        }
        if (creados.userId) {
          const { error } = await admin.auth.admin.deleteUser(creados.userId)
          if (error) pendientes.push(`cuenta ${creados.userId}: ${error.message}`)
        }
        if (creados.OTRA) {
          const { error: errArchivos } = await admin.storage.from('cotizador').remove([
            `empresas/${creados.OTRA}/cotizador/ajeno-${ts}.webp`,
            `cotizador/${creados.OTRA}/ajeno-${ts}.webp`,
          ])
          if (errArchivos) pendientes.push(`archivos ajenos: ${errArchivos.message}`)
          const { error } = await admin.rpc('eliminar_empresa_definitiva', { p_empresa: creados.OTRA, p_solo_contar: false })
          if (error) pendientes.push(`empresa ajena ${creados.OTRA}: ${error.message}`)
        }
        if (creados.item) {
          const { error } = await admin.from('items').delete().eq('id', creados.item)
          if (error) pendientes.push(`ítem ${creados.item}: ${error.message}`)
        }
        if (pendientes.length > 0) {
          console.error(`[borrado-staging] Quedó sin limpiar: ${pendientes.join(' | ')}`)
        }
      }
    },
    5 * 60 * 1000
  )
})
