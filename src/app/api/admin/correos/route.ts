import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarCorreoAdmin } from '@/lib/email'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: perfil } = await supabase
      .from('profiles')
      .select('rol')
      .eq('user_id', user.id)
      .single()

    if (perfil?.rol !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const adminClient = await createAdminClient()
    const { data: correos, error } = await adminClient
      .from('admin_correos_enviados')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      // Si la tabla aún no existe en supabase, retornamos lista vacía sin romper
      console.warn('Advertencia al consultar admin_correos_enviados:', error.message)
      return NextResponse.json({ correos: [] })
    }

    return NextResponse.json({ correos: correos ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: perfil } = await supabase
      .from('profiles')
      .select('rol, nombre, apellido')
      .eq('user_id', user.id)
      .single()

    if (perfil?.rol !== 'super_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const {
      asunto,
      preheader,
      subtituloHeader,
      saludo,
      cuerpoHtml,
      tipo = 'comunicado',
      segmento,
      empresaId,
      manualEmails,
      incluirDesuscripcion = true,
      esPrueba = false,
    } = body

    if (!asunto || !asunto.trim()) {
      return NextResponse.json({ error: 'El asunto es obligatorio.' }, { status: 400 })
    }
    if (!cuerpoHtml || !cuerpoHtml.trim()) {
      return NextResponse.json({ error: 'El contenido del correo es obligatorio.' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    let destinatarios: { email: string; nombre?: string | null; empresaNombre?: string | null; unsubscribeToken?: string | null }[] = []

    if (esPrueba) {
      // Envío de prueba exclusivo al superadmin conectado
      destinatarios = [{
        email: user.email!,
        nombre: [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || 'Superadmin (Prueba)',
        empresaNombre: 'Calculadora de Reúso',
        unsubscribeToken: 'demo-test-token',
      }]
    } else if (segmento === 'manual') {
      const raw = typeof manualEmails === 'string' ? manualEmails : ''
      const emails = raw
        .split(/[,;\n\s]+/)
        .map(e => e.trim().toLowerCase())
        .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

      const unique = Array.from(new Set(emails))
      if (unique.length === 0) {
        return NextResponse.json({ error: 'No se indicaron correos válidos para el envío manual.' }, { status: 400 })
      }
      destinatarios = unique.map(email => ({
        email,
        nombre: email.split('@')[0],
        empresaNombre: null,
        unsubscribeToken: 'manual',
      }))
    } else if (segmento === 'leads') {
      const { data: leads } = await adminClient
        .from('leads')
        .select('email, nombre, empresa')
        .not('email', 'is', null)

      const uniqueMap = new Map<string, { email: string; nombre: string; empresaNombre: string | null }>()
      for (const l of leads ?? []) {
        if (l.email && !uniqueMap.has(l.email.toLowerCase())) {
          uniqueMap.set(l.email.toLowerCase(), {
            email: l.email.toLowerCase(),
            nombre: l.nombre || l.email.split('@')[0],
            empresaNombre: l.empresa || null,
          })
        }
      }
      destinatarios = Array.from(uniqueMap.values()).map(d => ({ ...d, unsubscribeToken: 'lead' }))
    } else {
      let query = adminClient
        .from('profiles')
        .select('email, nombre, apellido, rol, empresa_id, empresas(nombre)')
        .not('email', 'is', null)

      if (segmento === 'empresa_admin') {
        query = query.eq('rol', 'empresa_admin')
      } else if (segmento === 'empleado') {
        query = query.eq('rol', 'empleado')
      } else if (segmento === 'usuario_libre') {
        query = query.eq('rol', 'usuario_libre')
      } else if (segmento === 'empresa_especifica' && empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      const { data: perfiles } = await query

      const uniqueMap = new Map<string, { email: string; nombre: string; empresaNombre: string | null }>()
      for (const p of perfiles ?? []) {
        if (p.email && !uniqueMap.has(p.email.toLowerCase())) {
          const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(' ') || p.email.split('@')[0]
          const emp = (p.empresas as unknown as { nombre: string }[] | { nombre: string } | null)
          const empresaNombre = Array.isArray(emp) ? emp[0]?.nombre : emp?.nombre

          uniqueMap.set(p.email.toLowerCase(), {
            email: p.email.toLowerCase(),
            nombre: nombreCompleto,
            empresaNombre: empresaNombre || null,
          })
        }
      }
      destinatarios = Array.from(uniqueMap.values()).map(d => ({ ...d, unsubscribeToken: 'user' }))
    }

    if (destinatarios.length === 0) {
      return NextResponse.json({ error: 'No hay destinatarios que coincidan con el segmento seleccionado.' }, { status: 400 })
    }

    let correoId: string | null = null
    let destinatariosConTokens: Array<{
      email: string
      nombre?: string | null
      empresaNombre?: string | null
      unsubscribeToken?: string | null
      trackToken?: string | null
    }> = destinatarios

    if (!esPrueba) {
      // 1. Crear registro maestro en admin_correos_enviados
      try {
        const { data: nuevoCorreo } = await adminClient
          .from('admin_correos_enviados')
          .insert({
            asunto,
            preheader: preheader || null,
            cuerpo_html: cuerpoHtml,
            tipo,
            segmento: segmento || 'manual',
            empresa_id: empresaId || null,
            destinatarios_count: destinatarios.length,
            destinatarios_lista: destinatarios.map(d => d.email).slice(0, 100),
            enviado_por: user.id,
            estado: 'enviando',
          })
          .select('id')
          .single()

        correoId = nuevoCorreo?.id ?? null

        if (correoId) {
          // 2. Generar tokens de tracking y guardar cada destinatario
          destinatariosConTokens = destinatarios.map(d => {
            const trackToken = `${correoId}_${Math.random().toString(36).substring(2, 12)}`
            return {
              ...d,
              trackToken,
              unsubscribeToken: trackToken,
            }
          })

          const registrosDestinatarios = destinatariosConTokens.map(d => ({
            correo_id: correoId,
            email: d.email,
            nombre: d.nombre || null,
            empresa_nombre: d.empresaNombre || null,
            track_token: d.trackToken,
            estado: 'entregado',
          }))

          // Insertar en lotes de 100
          for (let i = 0; i < registrosDestinatarios.length; i += 100) {
            await adminClient
              .from('admin_correos_destinatarios')
              .insert(registrosDestinatarios.slice(i, i + 100))
          }
        }
      } catch (dbErr) {
        console.error('Error al inicializar registro de correos:', dbErr)
      }
    }

    // 3. Despacho vía Resend
    const resultado = await enviarCorreoAdmin({
      destinatarios: destinatariosConTokens,
      asunto: esPrueba ? `[PRUEBA] ${asunto}` : asunto,
      preheader,
      subtituloHeader,
      saludo,
      cuerpoHtml,
      tipo,
      incluirDesuscripcion,
    })

    // 4. Actualizar estado final en base de datos si no fue prueba
    if (!esPrueba && correoId) {
      try {
        const estadoFinal = resultado.fallidos === 0 ? 'enviado' : resultado.exitosos > 0 ? 'parcial' : 'fallido'
        await adminClient
          .from('admin_correos_enviados')
          .update({
            estado: estadoFinal,
            error_mensaje: resultado.errores.length > 0 ? resultado.errores.join(' | ') : null,
          })
          .eq('id', correoId)

        // Log de auditoría
        await adminClient.from('logs_auditoria').insert({
          user_id: user.id,
          accion: 'admin_correo_masivo_enviado',
          detalle_json: {
            correo_id: correoId,
            asunto,
            tipo,
            segmento,
            total_destinatarios: destinatarios.length,
            exitosos: resultado.exitosos,
            fallidos: resultado.fallidos,
          },
        })
      } catch (logErr) {
        console.error('Error al actualizar estado y log:', logErr)
      }
    }

    return NextResponse.json({
      ok: true,
      esPrueba,
      total: destinatarios.length,
      exitosos: resultado.exitosos,
      fallidos: resultado.fallidos,
      errores: resultado.errores,
    })
  } catch (err: unknown) {
    console.error('Error en POST /api/admin/correos:', err)
    const msg = err instanceof Error ? err.message : 'Error al enviar correo'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
