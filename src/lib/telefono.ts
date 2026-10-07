// Reglas de longitud de celular por indicativo — SOLO para países con dato
// verificado, para no bloquear a nadie con una regla inventada. Hoy el
// negocio real opera únicamente en Colombia (ver skill modelo-negocio-reuso
// y Etapa 2 del plan de escalabilidad), así que es la única regla dura.
// Agregar otro país aquí requiere confirmar su formato real, no adivinarlo.
const REGLA_POR_INDICATIVO: Record<string, { digitos: number; empiezaCon?: string; pais: string }> = {
  '+57': { digitos: 10, empiezaCon: '3', pais: 'Colombia' },
}

/** null si es válido, o el mensaje de error a mostrar. */
export function validarTelefono(telefono: string, indicativo: string): string | null {
  const soloDigitos = telefono.replace(/\D/g, '')
  const regla = REGLA_POR_INDICATIVO[indicativo]
  if (!regla) return null // sin regla verificada para este indicativo todavía

  if (soloDigitos.length !== regla.digitos) {
    return `El celular de ${regla.pais} debe tener exactamente ${regla.digitos} dígitos.`
  }
  if (regla.empiezaCon && !soloDigitos.startsWith(regla.empiezaCon)) {
    return `El celular de ${regla.pais} debe empezar en ${regla.empiezaCon}.`
  }
  return null
}

export function formatTelefonoVista(telefono: string | null | undefined, indicativo: string | null | undefined): string {
  if (!telefono) return ''
  const ind = indicativo || '+57'
  const soloDigitos = telefono.replace(/\D/g, '')
  
  if (ind === '+57' && soloDigitos.length === 10) {
    return `${ind} (${soloDigitos.slice(0, 3)}) ${soloDigitos.slice(3, 6)} ${soloDigitos.slice(6)}`
  }
  
  return `${ind} ${soloDigitos}`
}

/**
 * Normaliza cualquier formato de teléfono a una representación canónica legible:
 * - Colombia: +57 XXX XXX XXXX (móvil o fijo 60X, resuelve ceros iniciales 03/0, 57 sin +, etc.)
 * - Internacionales: +CC XXX XXX... con espaciado limpio y legible.
 * - Fijo local (7 dígitos): XXX XXXX
 */
export function normalizarTelefono(valor: string | null | undefined): string {
  if (!valor) return ''
  const crudo = String(valor).trim()
  if (!crudo) return ''

  let texto = crudo
  if (texto.startsWith('00')) texto = '+' + texto.slice(2)

  // Si contiene letras o símbolos como @ (nombre de usuario / alfanumérico), preservar el texto tal cual
  if (/[a-zA-Z]/.test(texto) || texto.startsWith('@')) {
    return texto
  }

  const digitos = texto.replace(/\D/g, '')
  if (!digitos) return texto

  // 1. Detección y normalización de números de Colombia
  let digitosCol: string | null = null

  if (digitos.length === 10 && (digitos.startsWith('3') || digitos.startsWith('60'))) {
    digitosCol = digitos
  } else if (digitos.length === 11 && digitos.startsWith('0') && (digitos[1] === '3' || digitos.slice(1, 3) === '60')) {
    digitosCol = digitos.slice(1)
  } else if (digitos.length === 12 && digitos.startsWith('57') && (digitos[2] === '3' || digitos.slice(2, 4) === '60')) {
    digitosCol = digitos.slice(2)
  } else if (digitos.length === 13 && digitos.startsWith('570') && (digitos[3] === '3' || digitos.slice(3, 5) === '60')) {
    digitosCol = digitos.slice(3)
  }

  if (digitosCol && digitosCol.length === 10) {
    return `+57 ${digitosCol.slice(0, 3)} ${digitosCol.slice(3, 6)} ${digitosCol.slice(6)}`
  }

  // Fijo local de 7 dígitos sin indicativo
  if (digitos.length === 7 && !texto.startsWith('+')) {
    return `${digitos.slice(0, 3)} ${digitos.slice(3)}`
  }

  // Si ya venía con '+' y contiene espacios intencionales, conservar el espaciado
  if (texto.startsWith('+') && /\s/.test(texto)) {
    return texto.replace(/\s+/g, ' ').trim()
  }

  // 2. Números internacionales sin espacios o con longitud extendida
  const prefijos2 = ['44', '34', '52', '54', '55', '56', '58', '51', '33', '49', '39', '31', '32', '41', '43', '46', '47', '48', '30', '36', '20', '27', '81', '82', '86', '91', '90']
  const prefijos3 = ['502', '503', '504', '505', '506', '507', '591', '593', '595', '598']

  let codigoPais = ''
  let resto = digitos

  if (digitos.startsWith('1') && digitos.length === 11) {
    codigoPais = '1'
    resto = digitos.slice(1)
  } else {
    for (const p of prefijos3) {
      if (digitos.startsWith(p) && digitos.length > p.length + 4) {
        codigoPais = p
        resto = digitos.slice(p.length)
        break
      }
    }
    if (!codigoPais) {
      for (const p of prefijos2) {
        if (digitos.startsWith(p) && digitos.length > p.length + 4) {
          codigoPais = p
          resto = digitos.slice(p.length)
          break
        }
      }
    }
  }

  if (codigoPais) {
    if (codigoPais === '1' && resto.length === 10) {
      return `+1 ${resto.slice(0, 3)} ${resto.slice(3, 6)} ${resto.slice(6)}`
    }
    const partes: string[] = []
    const primerBloqueTam = resto.length > 8 ? 4 : 3
    partes.push(resto.slice(0, primerBloqueTam))
    let i = primerBloqueTam
    while (i < resto.length) {
      const fin = Math.min(i + 3, resto.length)
      partes.push(resto.slice(i, fin))
      i = fin
    }
    return `+${codigoPais} ${partes.join(' ')}`
  }

  if (digitos.length >= 11) {
    const cc = digitos.slice(0, 2)
    const r = digitos.slice(2)
    const partes: string[] = []
    for (let i = 0; i < r.length; i += 3) {
      partes.push(r.slice(i, Math.min(i + 3, r.length)))
    }
    return `+${cc} ${partes.join(' ')}`
  }

  return `+${digitos}`
}

/**
 * Separa un teléfono completo en indicativo (ej. '+57') y número local para usar en InputTelefono.
 */
export function separarTelefonoEIndicativo(valor?: string | null): { indicativo: string; numero: string } {
  if (!valor) return { indicativo: '+57', numero: '' }
  const limpio = String(valor).trim()
  if (!limpio) return { indicativo: '+57', numero: '' }

  // Si tiene +, buscar si coincide con un indicativo común
  if (limpio.startsWith('+')) {
    // Indicativos de 1 a 4 caracteres: +1, +57, +593...
    const match = limpio.match(/^(\+\d{1,4})\s*(.*)$/)
    if (match) {
      return {
        indicativo: match[1],
        numero: match[2].trim(),
      }
    }
  }

  // Si contiene letras o arroba (ej. @usuario o nombre), no forzar indicativo
  if (/[a-zA-Z]/.test(limpio) || limpio.startsWith('@')) {
    return { indicativo: '', numero: limpio }
  }

  const digitos = limpio.replace(/\D/g, '')
  if (digitos.length === 12 && digitos.startsWith('57')) {
    return { indicativo: '+57', numero: digitos.slice(2) }
  }
  if (digitos.length === 11 && digitos.startsWith('03')) {
    return { indicativo: '+57', numero: digitos.slice(1) }
  }
  if (digitos.length === 10 && (digitos.startsWith('3') || digitos.startsWith('60'))) {
    return { indicativo: '+57', numero: digitos }
  }

  // Si no tiene '+' ni coincide con formato móvil colombiano, no forzar indicativo
  return { indicativo: '', numero: limpio }
}
